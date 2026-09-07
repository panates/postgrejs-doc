---
sidebar_position: 15
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
| `float4` | `number` | |
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

Some types lose precision or information when decoded to their native JS type — `numeric` decodes through `parseFloat`, which cannot represent values beyond `number`'s precision, and `date`/`time`/`timestamp`/`timestamptz` collapse Postgres's `infinity`/`-infinity` into JS `Infinity`. Use `fetchAsString` (on `DataMappingOptions`, inherited by `QueryOptions`) to force specific OIDs to decode as their raw string representation instead:

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

## See also

- [API: DataTypeMap](../api/classes/data-type-map.md)
- [Query Parameters](./query-parameters.md)
