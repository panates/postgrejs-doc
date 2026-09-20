---
sidebar_position: 13
---

# Numeric

The exact decimal a `numeric` column holds, for values a JavaScript `number` cannot carry without
losing digits. `numeric` decodes to a plain `number` whenever a double round-trips it faithfully —
prints back the same digits — and to a `Numeric` instance otherwise, the same contract `int8` has
with `number`/`BigInt`. See [Data Types & Type Mapping](../../querying/data-types.md#numeric-exact-decimals)
for when each happens and why.

```ts
const r = await connection.query("select 12345678901234567.89::numeric as v");
r.rows[0][0];                    // Numeric { value: '12345678901234567.89' }
r.rows[0][0].toString();         // '12345678901234567.89' - exact
r.rows[0][0].toNumber();         // 12345678901234568 - lossy, on purpose
```

## Constructor

`new Numeric(value: string | number | bigint)`

| Argument | Type | Description |
|:---|:---|:---|
| value | `string \| number \| bigint` | Stored as-is if a string, otherwise stringified |

## Properties

| Key | Type | Readonly | Description |
|:---|:---|:---|:---|
| value | `string` | true | The decimal exactly as PostgreSQL wrote it |

## Methods

| Method | Returns | Description |
|:---|:---|:---|
| `toString()` | `string` | The exact decimal; casts back through `::numeric` |
| `toJSON()` | `string` | Same as `toString()` |
| `toNumber()` | `number` | The value as a double — lossy, which is the point of this class |

There is deliberately no `valueOf()`. `Numeric` implements `Symbol.toPrimitive`, returning the
exact text for every hint — so `String(n)`/`` `${n}` `` are lossless, and `n + 1` concatenates
rather than silently rounding through an implicit number coercion. Reach for `toNumber()` when a
lossy double is actually what's wanted.

`Numeric` is a class rather than a bare string so it can be told apart from one: `determine()`
types a bare string as `varchar`, which PostgreSQL then refuses to store in a `numeric` column — a
`Numeric` round-trips as a parameter the same way it decoded.
