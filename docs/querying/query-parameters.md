---
sidebar_position: 3
slug: /guides/query-parameters
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
  params: [['DE', 'US', 'TR']], // an array of strings — see below, sent unspecified rather than "detected"
});
```

`null` is always sent as `NULL` regardless of position.

## Strings and Dates go out unspecified

Two JS types are the exception to automatic type detection: a plain `string` and a `Date` — and an
array of either — are sent with **no declared type at all**, as text, for PostgreSQL to resolve
from whatever the parameter's context calls for. Declaring one is actively wrong for both:

- A string can't say which of PostgreSQL's many text-input types it's meant for. Declaring
  `varchar` (what `determine()` answers for a bare string) stops the server inferring anything from
  context — a `json`/`jsonb` column, a `uuid` comparison, an enum column, `coalesce($1, 1)`, and an
  array-typed column all fail with "expression is of type character varying" if a type is declared.
- A `Date` is either an instant (`timestamptz`) or a wall clock (`timestamp`) depending only on the
  column it lands in — no single OID is right for both, and declaring either one moves the value by
  the client's UTC offset when it lands in the other.

```ts
await connection.query('insert into settings (value) values ($1)', {
  params: ['{"a":1}'], // lands in a jsonb column — works, where a declared varchar would not
});

await connection.query('insert into events (happened_at) values ($1)', {
  params: [new Date()], // timestamptz stores the instant, timestamp keeps the wall clock — either way, correctly
});
```

This is also what `pg` sends for both, and it costs one specific thing: a parameter with **no
context to resolve a type from** — `$1 is null`, `array_agg($1)`, `concat($1, 1)` — now raises
`could not determine data type of parameter $1`, exactly as it does under `pg`. A cast (`$1::text`)
or an explicit `BindParam` (see below) names the type for those:

```ts
import { BindParam, DataTypeOIDs } from 'postgrejs';

await connection.query('select $1 is null', { params: ['x'] });
// error: could not determine data type of parameter $1

await connection.query('select $1 is null', {
  params: [new BindParam(DataTypeOIDs.varchar, 'x')], // works
});
```

Numbers, booleans and `Buffer`s are unaffected by any of this — they keep their declared types and
binary encoding, since those are already right almost everywhere.

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
typically because its type was pinned with `BindParam`, as [`copyFromRows()`](../bulk-data/copy.md#binary-copy-from-loading-js-rows-directly-with-copyfromrows)
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
