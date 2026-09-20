---
sidebar_position: 15
---

# Range

PostgreSQL's range types — `int4range`, `int8range`, `numrange`, `daterange`, `tsrange`,
`tstzrange`, and their multirange counterparts — all decode to a `Range<T>`, a pair of bounds each
of which may be absent (unbounded) and each of which may or may not be included. The bounds are the
element type's own JS values, so a `tstzrange` holds `Date`s and an `int4range` holds numbers.

```ts
const r = new Range(1, 10);          // default bounds, [1,10)
r.lowerInclusive;                    // true
r.upperInclusive;                    // false
String(r);                           // '[1,10)'

new Range(null, 10);                 // '(,10)' - unbounded below
new Range(1, 10, '[]');              // '[1,10]'
Range.empty();                       // 'empty' - no values at all, not the same as '(,)'
```

A multirange decodes to a plain `Range[]`.

## Constructor

`new Range<T>(lower?, upper?, bounds?, oid?)`

| Argument | Type | Default | Description |
|:---|:---|:---|:---|
| lower | `T \| null` | `null` | Lower bound, or `null` for unbounded below |
| upper | `T \| null` | `null` | Upper bound, or `null` for unbounded above |
| bounds | `'[)' \| '[]' \| '()' \| '(]'` | `'[)'` | Which ends include their bound |
| oid | `OID` |  | Which range type this is — see below |

An absent bound is never inclusive regardless of `bounds`; the server prints `(`/`)` for it whatever
was asked.

## Properties

| Key | Type | Readonly | Description |
|:---|:---|:---|:---|
| lower | `T \| null` | false | |
| upper | `T \| null` | false | |
| lowerInclusive | `boolean` | false | |
| upperInclusive | `boolean` | false | |
| isEmpty | `boolean` | false | `true` for `empty` |

## Methods

| Method | Returns | Description |
|:---|:---|:---|
| `Range.empty<T>(oid?)` | `Range<T>` | Static. The empty range |
| `toString()` | `string` | As PostgreSQL prints it — casts back through the range's own type |
| `toJSON()` | `string` | Same as `toString()` |

## Naming the type: `oid` and `BindParam`

All six range types answer `instanceof Range`, and nothing about a `Range` on its own says which
one it is — a `Range` of numbers could be `int4range` or `numrange`, a `Range` of `Date`s could be
`daterange`, `tsrange` or `tstzrange`. A `Range` decoded from a query already carries the OID it
came from (internally, invisibly — it just works when passed back as a parameter without naming it
again):

```ts
const r = (await connection.query('select int4range(1,10) as r')).rows[0][0];
await connection.query('select $1::int4range', { params: [r] }); // r already knows it's int4range
```

A `Range` you build yourself needs the OID given explicitly — either as the constructor's fourth
argument or via [`BindParam`](./bind-param.md) at the call site — otherwise it throws rather than
being silently sent as JSON:

```ts
import { Range, DataTypeOIDs, BindParam } from 'postgrejs';

new Range(1, 10, '[)', DataTypeOIDs.int4range);
// or:
await connection.query('select $1', { params: [new BindParam(DataTypeOIDs.int4range, new Range(1, 10))] });
```

Note what a discrete element type does to the bounds: PostgreSQL normalizes `int4range(1,10,'[]')`
to `[1,11)`, since those describe the same set of integers — so `upperInclusive` comes back `false`
for every `int4range`/`int8range`/`daterange`, which is the server normalizing, not this class
losing information.

See [Data Types & Type Mapping](../../querying/data-types.md#range-and-multirange-types) for the full guide.
