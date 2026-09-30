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

## Strings, Dates, and numeric arrays go out unspecified

Three shapes are the exception to automatic type detection: a plain `string`, a `Date`, and an
array of numbers or `bigint`s (nested arrays included) — and an array of a string or a `Date` —
are sent with **no declared type at all**, as text, for PostgreSQL to resolve from whatever the
parameter's context calls for. Declaring one is actively wrong for all three:

- A string can't say which of PostgreSQL's many text-input types it's meant for. Declaring
  `varchar` (what `determine()` answers for a bare string) stops the server inferring anything from
  context — a `json`/`jsonb` column, a `uuid` comparison, an enum column, `coalesce($1, 1)`, and an
  array-typed column all fail with "expression is of type character varying" if a type is declared.
- A `Date` is either an instant (`timestamptz`) or a wall clock (`timestamp`) depending only on the
  column it lands in — no single OID is right for both, and declaring either one moves the value by
  the client's UTC offset when it lands in the other.
- `[1, 2]` is `int2[]`, `int4[]`, `int8[]`, `numeric[]`, `float4[]` or `float8[]` depending on where
  it lands, and unlike their scalars those array types have **no operators or implicit casts
  between them** — a declared `int4[]` sent to an `int8[]` column fails outright
  (`42883 operator does not exist: bigint[] = integer[]`), it isn't merely imprecise the way a
  scalar guess would be.

```ts
await connection.query('insert into settings (value) values ($1)', {
  params: ['{"a":1}'], // lands in a jsonb column — works, where a declared varchar would not
});

await connection.query('insert into events (happened_at) values ($1)', {
  params: [new Date()], // timestamptz stores the instant, timestamp keeps the wall clock — either way, correctly
});

await connection.query('select array[1,2]::int8[] = $1', {
  params: [[1, 2]], // resolves against int8[] here, and just as correctly against numeric[] elsewhere
});
```

A scalar number, a boolean, a `Buffer`, and an array of anything else (booleans, `Buffer`s, this
client's own value classes) keep their declared type and binary encoding — each of those has only
one type it could be, so declaring it isn't a guess and keeps what a text literal gives up. An empty
array is untouched too: `determine()` still answers `unknown` for it, same as before.

Going out unspecified has a real, measured cost for a large numeric array — inserting the same
value over a loopback connection, alternating text against a named `BindParam` within each round,
medians of nine:

| | as text (unspecified) | as `BindParam` | |
| :--- | :--- | :--- | :--- |
| `float8[]`, 1,000 elements | 2.33ms | 0.91ms | 2.6x |
| `float8[]`, 10,000 elements | 17.34ms | 3.75ms | 4.6x |
| `float8[]`, 100,000 elements | 143.0ms | 26.9ms | 5.3x |
| `int4[]`, 100,000 elements | 24.5ms | 15.5ms | 1.6x |

It grows with the array and with how wide an element's text is against its binary — a `float8` is 8
bytes against about 19 characters, an `int4` is 4 against up to 11, and most of what a `float8[]`
costs is the server's own parse of that text rather than the writing of it. It's a real price paid
for a correctness the client can't buy any other way before the server has resolved the parameter:
a caller who knows the column — and for a large numeric array that's worth knowing — names the type
directly and gets the binary encoding back with nothing given up:

```ts
import { BindParam, DataTypeOIDs } from 'postgrejs';

await connection.query('insert into readings (samples) values ($1)', {
  params: [new BindParam(DataTypeOIDs._float8, values)],
});
```

A prepared statement that's already been described knows exactly which type the server resolved
for a reused parameter — see [`PreparedStatement.resolvedParamTypes`](../api/classes/prepared-statement.md#properties)
— which is the type to hand `BindParam` here instead of guessing at it.

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

Once a value is actually headed through a numeric encoder — typically because its type was pinned
with `BindParam`, as [`copyFromRows()`](../bulk-data/copy.md#binary-copy-from-loading-js-rows-directly-with-copyfromrows)
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

For the whole-number types (`int2`, `int4`, `int8`, `oid`, `xid`, `xid8`, `cid`), the rule is
stricter than it once was: **a fractional value is refused, not floored.** `3.7` into an `int4`
column used to silently encode as `3` (and `-1.5` as `-2`, a floor rather than a truncation) — the
same value sent as *text* has always raised PostgreSQL's own `22P02`, so which behavior a caller
got depended on which wire format the parameter happened to take, not on anything they controlled.
Binary encoding now refuses exactly what text would:

```ts
await connection.query('select $1::int4', {
  params: [new BindParam(DataTypeOIDs.int4, 1.5)],
});
// TypeError: Cannot encode 1.5 as int4: it is not an integer

await connection.query('select $1::int4', {
  params: [new BindParam(DataTypeOIDs.int4, '0x10')],
});
// TypeError: Cannot encode "0x10" as int4: it is not an integer
```

A caller who does mean 3 rounds or truncates before the call, or casts and lets the server do it
(`$1::int4` against a `float8` parameter). A string is read the way PostgreSQL's own `int4in()`
reads one — optional sign, digits, surrounding whitespace trimmed, nothing else — so `' -42 '` and
`'42'` still work but `'1e3'` and `''` don't. A `bigint` is now accepted for every one of these
types (previously refused for anything narrower than `int8`), and each type's own range is checked
here rather than left to `Buffer`, so an out-of-range value names both the type and the value
(`Cannot encode 40000 as int2: it is out of range (-32768 to 32767)`) instead of a generic
`RangeError`.

`float4`, `float8` and `numeric` are unaffected by any of this: they still truncate nothing (there's
nothing to truncate), and `NaN`/`Infinity` are left alone, since PostgreSQL stores those as values
distinct from `NULL` rather than rejecting them.

## See also

- [`BindParam`](../api/classes/bind-param.md) reference
- [Extended Query](./extended-query.md)
- [Data Types & Type Mapping](./data-types.md)
