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
iv.minutes;          // 0, not undefined - every field is always present
String(iv);           // '1 day 02:00:00'
iv.toISOString();     // 'P0Y0M1DT2H0M0S'
```

The field names match `postgres-interval` (`pg`'s interval package), so code ported from it reads
the same values from the same places — the difference is that package's objects are sparse
(`interval '1 day'` gives `{days: 1}` and nothing else, so `iv.hours + 1` is `NaN`) and have no
`toString()`.

## Constructor

`new Interval(fields?: IntervalFields)`

| Key | Type | Default |
|:---|:---|:---|
| years | `number` | `0` |
| months | `number` | `0` |
| days | `number` | `0` |
| hours | `number` | `0` |
| minutes | `number` | `0` |
| seconds | `number` | `0` — whole seconds; the sub-second part is in `milliseconds` |
| milliseconds | `number` | `0` — fractional, since PostgreSQL stores microseconds (`interval '0.000001 seconds'` is `milliseconds: 0.001`) |

A negative interval carries the sign on each field that has one, the way the server prints it:
`interval '-1 day -2 hours'` decodes to `{ days: -1, hours: -2 }`.

## Properties

| Key | Type | Description |
|:---|:---|:---|
| totalMonths | `number` | `years * 12 + months`, as the wire format carries it |
| totalMicroseconds | `bigint` | The time part as a signed microsecond count, as the wire format carries it |

## Methods

| Method | Returns | Description |
|:---|:---|:---|
| `toString()` | `string` | As PostgreSQL prints it under the default `IntervalStyle` — casts back through `::interval` and reads the way the value does in `psql` |
| `toJSON()` | `string` | Same as `toString()` |
| `toISOString()` | `string` | The interval as an ISO 8601 duration (`P1Y2M3DT4H5M6S`) |
| `Interval.fromParts(microseconds, days, months)` | `Interval` | Static. Builds one from the three quantities the wire format carries |

See [Data Types & Type Mapping](../../querying/data-types.md#interval) for the full guide.
