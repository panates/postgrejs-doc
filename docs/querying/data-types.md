---
sidebar_position: 4
slug: /guides/data-types
---

# Data Types & Type Mapping

postgrejs decodes every PostgreSQL wire value into a native JS type through a `DataType` registry keyed by OID (object identifier). The default registry, `GlobalTypeMap`, covers every commonly used scalar and array type out of the box.

## Built-in scalar types

| Postgres type | JS type | Notes |
| :--- | :--- | :--- |
| `bool` | `boolean` | |
| `bytea` | `Buffer` | |
| `char` | `string` | single-byte "char" type |
| `bpchar` | `string` | blank-padded `character(n)` |
| `name` | `string` | |
| `text` | `string` | |
| `xml` | `string` | |
| `varchar` | `string` | |
| `uuid` | `string` | canonical `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` form |
| `box` | `object` | `{ x1, y1, x2, y2 }` |
| `circle` | `object` | `{ x, y, r }` |
| `lseg` | `object` | `{ x1, y1, x2, y2 }` |
| `point` | `object` | `{ x, y }` |
| `date` | `Date` | |
| `time` | `string` | |
| `timestamp` | `Date` | |
| `timestamptz` | `Date` | |
| `float4` | `number` | decoded as the shortest decimal that reads back as the same value — `1.1` comes back `1.1`, not `1.100000023841858` |
| `float8` | `number` | |
| `int2` | `number` | |
| `int4` | `number` | |
| `numeric` | `number` | decoded via `parseFloat` — see [Fetching as String](#fetching-as-string) for exact precision |
| `oid` | `number` | |
| `int8` | `BigInt` | downgraded to `number` automatically when the value fits in `Number.MAX_SAFE_INTEGER` |
| `json` | `string` \| `object` | parsed with `JSON.parse` unless `fetchAsString` requests the raw text |
| `jsonb` | `string` \| `object` | same as `json` |
| `int2vector` | `number[]` | fixed-size vector type used internally by Postgres catalogs |

## Array types

Every scalar type above has an array counterpart registered under its own `_`-prefixed OID (e.g. `int4` → `_int4`, `timestamptz` → `_timestamptz`). Arrays are:

- Decoded from the binary wire format (dimension count, bounds, and element OID are read directly from the array header).
- Able to represent PostgreSQL's multidimensional arrays — a `_int4` column holding `{{1,2},{3,4}}` decodes to `[[1, 2], [3, 4]]`.
- Detected automatically for parameters: passing a JS array as a query parameter picks the array OID whose `elementsOID` matches the first element's detected type.

```ts
const qr = await connection.query(
  'select array[1, 2, 3]::int4[] as nums',
);
console.log(qr.rows[0][0]); // [1, 2, 3]
```

## `DataTypeMap` and `GlobalTypeMap`

`DataTypeMap` is the registry class that maps an OID to a `DataType` descriptor. `GlobalTypeMap` is the default, process-wide instance every connection uses unless a call overrides it.

```ts
import { GlobalTypeMap, DataTypeOIDs } from 'postgrejs';

const boolType = GlobalTypeMap.get(DataTypeOIDs.bool);
```

| Method | Description |
| :--- | :--- |
| `get(oid)` | Returns the `DataType` registered for an OID, or `undefined`. |
| `register(dataTypes)` | Registers one or more `DataType` descriptors, keyed by their own `oid`. Registering an OID that already exists replaces it. |
| `determine(value)` | Infers the best-matching OID for a plain JS value (used for parameters that are not wrapped in `BindParam`). Arrays are matched against each type's `elementsOID`. |

See [API: DataTypeMap](../api/classes/data-type-map.md) for the full class reference.

### Registering a custom type

To support a Postgres type postgrejs doesn't ship a mapping for (a custom domain, extension type, or one of the catalog types not registered by default), implement the `DataType` interface and register it — either into `GlobalTypeMap` for every connection, or into a private `DataTypeMap` used only for specific calls:

```ts
import { DataTypeMap, GlobalTypeMap, type DataType } from 'postgrejs';

const MyEnumType: DataType = {
  name: 'my_enum',
  oid: 123456, // the type's OID in your database
  jsType: 'string',
  isType: (v: any): boolean => typeof v === 'string',
  decodeText: (v: string) => v,
  encodeText: (v: any) => String(v),
};

// Global — every connection sees it
GlobalTypeMap.register(MyEnumType);

// Or scoped to just the calls that pass this map
const myTypeMap = new DataTypeMap(GlobalTypeMap);
myTypeMap.register(MyEnumType);
```

A `DataType` descriptor at minimum needs `name`, `oid`, `jsType`, `isType`, and a `decodeText`/`decodeBinary` pair matching the wire format(s) you support; add `encodeText`/`encodeBinary` to also send values of that type as query parameters. Set `elementsOID` to register the type as the array element of another OID.

Set `inferrable: false` when a type's `isType` can genuinely match a plain
JS value but no caller actually means that type when they pass one —
PostgreSQL's own single-byte `"char"` is the built-in example: any
one-character string satisfies its `isType`, but a bare `'A'` parameter is
never meant as `"char"`, so `determine()` passes it over during inference
while `"char"` columns still decode normally. Reach the type explicitly
instead with `new BindParam(oid, value)` when it's genuinely what you want.

## Per-query type mapping

Both `QueryOptions` and `StatementPrepareOptions` accept a `typeMap` field that overrides `GlobalTypeMap` for a single `query()`/`execute()` call or a single prepared statement, without touching the global registry:

```ts
import { DataTypeMap, GlobalTypeMap } from 'postgrejs';

const customMap = new DataTypeMap(GlobalTypeMap);
customMap.register(MyEnumType);

const qr = await connection.query('select * from widgets', {
  typeMap: customMap,
});
```

## Text vs Binary Wire Format

PostgreSQL's wire protocol can transfer column values as `text` or `binary`. postgrejs defaults every column to `binary` (`DataFormat.binary`, per `DEFAULT_COLUMN_FORMAT` in the library's constants) since it avoids the cost of formatting/parsing decimal text for every row.

Override the format with `columnFormat` — a single `DataFormat` for every column, or an array assigning a format per column position:

```ts
import { DataFormat } from 'postgrejs';

// All columns as text
await connection.query('select id, name from customers', {
  columnFormat: DataFormat.text,
});

// Per-column: first column binary, second column text
await connection.query('select id, name from customers', {
  columnFormat: [DataFormat.binary, DataFormat.text],
});
```

## Fetching as String

Some types lose precision or information when decoded to their native JS type — `numeric` decodes through `parseFloat`, which cannot represent values beyond `number`'s precision, and `date`/`time`/`timestamp`/`timestamptz` collapse Postgres's `infinity`/`-infinity` into JS `Infinity`. `fetchAsString` (on `DataMappingOptions`, inherited by `QueryOptions`) asks the server for specific columns in its own text format instead, and hands the bytes back unparsed:

```ts
import { DataTypeOIDs } from 'postgrejs';

const qr = await connection.query(
  'select price from products where id = $1',
  {
    params: [1],
    fetchAsString: [DataTypeOIDs.numeric],
  },
);
console.log(qr.rows[0][0]); // "19.995000" — exact string, not a lossy float
```

This is a wire-level request, not a reformatting of the value postgrejs
would otherwise have decoded — so the string is exactly what PostgreSQL
itself would print, and it takes **any** OID, not just a handful of
numeric/date types:

```ts
const r = await connection.query('select count(*) as n from products', {
  fetchAsString: [DataTypeOIDs.int8],
});
r.rows[0][0]; // '3' — a string, not a decoded int8 (number or BigInt)
```

An array column is selected by its own array OID (`_timestamptz`, not
`timestamptz`), and comes back as the whole array literal rather than one
string per element:

```ts
await connection.query('select tags from products', {
  fetchAsString: [DataTypeOIDs._timestamptz],
});
```

:::note `timestamptz` as a string follows the session's `TimeZone`
Because the string is the server's own rendering, a `fetchAsString`'d
`timestamptz` looks like PostgreSQL's own output (`2020-10-22
23:45:12.123+00`) rather than an ISO 8601 string — it shifts with the
session's `TimeZone` setting, same as `select ... ::text` would in `psql`.
`date`, `time`, `timestamp`, `json`, and `jsonb` render the same either way.
:::

## See also

- [API: DataTypeMap](../api/classes/data-type-map.md)
- [Query Parameters](./query-parameters.md)
