---
sidebar_position: 7
---

# Query Parameters & Type Casting

`connection.query()` accepts positional parameters (`$1`, `$2`, ...) via the `params` option. Each value is sent to the server out of band from the SQL text, over the Extended Query protocol's Bind message — it is never concatenated into the statement.

```ts
const result = await connection.query(
  'select * from customers where id = $1',
  { params: [1] },
);
```

## Automatic type detection

Every parameter needs a PostgreSQL type (an OID) so the server knows how to decode the bytes on the wire. By default postgrejs infers it from the JS value using `DataTypeMap.determine()` (`GlobalTypeMap` unless you pass your own `typeMap`):

```ts
await connection.query('select * from data_types where f_bool = $1', {
  params: [true],       // detected as bool
});

await connection.query('select * from customers where country_code = ANY($1)', {
  params: [['DE', 'US', 'TR']], // detected as an array type
});
```

`null` is always sent as `NULL` regardless of position.

## Overriding the detected type with `BindParam`

Sometimes a JS value is ambiguous (a `number` could be `int2`, `int4`, `int8`, `float4`, `float8`, ...), or you need a type the automatic detection wouldn't pick. Wrap the value in a `BindParam` to give it an explicit OID:

```ts
export class BindParam {
  constructor(
    public oid: OID,
    public value: any,
  ) {}
}
```

```ts
import { BindParam, DataTypeOIDs } from 'postgrejs';

await connection.query('select lo_unlink($1)', {
  params: [new BindParam(DataTypeOIDs.oid, someOid)],
});

await connection.query('select $1::int4', {
  params: [new BindParam(DataTypeOIDs.int4, 42)],
});
```

`DataTypeOIDs` exposes every built-in PostgreSQL type OID by name (`bool`, `int2`, `int4`, `int8`, `float4`, `float8`, `text`, `varchar`, `uuid`, `json`, `jsonb`, array variants such as `_int4`, and many more) — use it instead of hardcoding numeric OIDs.

You can mix plain values and `BindParam`s freely in the same `params` array:

```ts
await connection.query('insert into t (a, b) values ($1, $2)', {
  params: [new BindParam(DataTypeOIDs.int4, 1), 'plain string'],
});
```

## Values with no numeric reading

Once a value is actually headed through an `int2`/`int4`/`int8`/`float4`/`float8`/`numeric` encoder —
typically because its type was pinned with `BindParam`, as [`copyFromRows()`](./copy.md#loading-js-rows-directly-copyfromrows)
does for every column — something that can't be read as a number (`'abc'`, `{}`, `[]`, `true`) throws a
`TypeError` rather than silently encoding as `0`:

```ts
await connection.query('insert into t (n) values ($1)', {
  params: [new BindParam(DataTypeOIDs.int4, {})],
});
// TypeError: Cannot encode value as int4: it has no integer value
```

A plain, untyped `params: [{}]` doesn't reach this at all — `DataTypeMap.determine()` detects a bare
object as `jsonb` before any int4 encoder sees it, so PostgreSQL itself rejects the mismatch first.

Truncation is unaffected — `3.7` into an integer column still encodes as `3`, and `'42'` still encodes as
`42`; only a value with no numeric reading at all is refused. `NaN`/`Infinity` are also left alone for
`float4`/`float8`/`numeric`, since PostgreSQL stores those as values distinct from `NULL` rather than
rejecting them.

## See also

- [`BindParam`](../api/classes/bind-param.md) reference
- [Extended Query](./extended-query.md)
- [Data Types & Type Mapping](./data-types.md)
