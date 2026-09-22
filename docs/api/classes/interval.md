---
sidebar_position: 14
---

# Interval

PostgreSQL's `interval`, as the three independent quantities it actually is: a number of months, a
number of days, and a time. They're kept apart rather than reduced to one total because they're not
convertible — a month is 28 to 31 days and a day is 23 to 25 hours across a DST boundary, so only
the server, holding a calendar and a time zone, can add one to a timestamp.

```ts
const iv = new Interval({ days: 1, hours: 2 });
iv;                    // Interval { days: 1, hours: 2 } - only the fields with a value
iv.minutes;             // undefined, not 0
String(iv);             // '1 day 02:00:00'
iv.toISOString();       // 'P0Y0M1DT2H0M0S'
JSON.stringify(iv);     // '{"days":1,"hours":2}'
```

The field names match `postgres-interval` (`pg`'s interval package), so code ported from it reads
the same values from the same places, including the sparseness: only a field the value actually has
is set, so `interval '1 day'` decodes to `{ days: 1 }` and `iv.hours` on it is `undefined`, not `0`.
Reading a field that might be absent needs to say what that means — `iv.hours ?? 0` — which
TypeScript's optional field types point at directly, and which `iv.hours + 1` gets silently wrong
(`NaN`) without. Everything this class derives — `totalMonths`, `totalMicroseconds`,
`toString()`/`toPostgres()`, and `toISOString()` — already reads an absent field as the zero it
stands for, so those are unaffected.

## Constructor

`new Interval(fields?: IntervalFields)`

Every field is optional and left `undefined` (not defaulted to `0`) unless given:

| Key | Type |
|:---|:---|
| years | `number` |
| months | `number` |
| days | `number` |
| hours | `number` |
| minutes | `number` |
| seconds | `number` — whole seconds; the sub-second part is in `milliseconds` |
| milliseconds | `number` — fractional, since PostgreSQL stores microseconds (`interval '0.000001 seconds'` is `milliseconds: 0.001`) |

A negative interval carries the sign on each field that has one, the way the server prints it:
`interval '-1 day -2 hours'` decodes to `{ days: -1, hours: -2 }`.

## Properties

| Key | Type | Description |
|:---|:---|:---|
| totalMonths | `number` | `(years ?? 0) * 12 + (months ?? 0)`, as the wire format carries it |
| totalMicroseconds | `bigint` | The time part as a signed microsecond count, as the wire format carries it |

## Methods

| Method | Returns | Description |
|:---|:---|:---|
| `toString()` | `string` | As PostgreSQL prints it under the default `IntervalStyle` — casts back through `::interval` and reads the way the value does in `psql` |
| `toPostgres()` | `string` | Same as `toString()` — the `pg`-convention name for "write yourself back" |
| `toJSON()` | `object` | The fields actually present, e.g. `{"days":1,"hours":2}` |
| `toISOString()` | `string` | The interval as an ISO 8601 duration (`P1Y2M3DT4H5M6S`); signs only the components that carry one, so `-1 day -2 hours` is `P0Y0M-1DT-2H0M0S`, not `-0M-0S` |
| `Interval.fromParts(microseconds, days, months)` | `Interval` | Static. Builds one from the three quantities the wire format carries |

See [Data Types & Type Mapping](../../querying/data-types.md#interval) for the full guide.
