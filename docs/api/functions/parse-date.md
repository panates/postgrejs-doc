---
sidebar_position: 6
---

# parseDate

Parses PostgreSQL's text `date` output into a JavaScript `Date` (or `Infinity`/`-Infinity` for PostgreSQL's `infinity`/`-infinity` values).

## parseDate(str, utc?)

| Parameter | Type      | Default | Description                                              |
|-----------|-----------|---------|--------------------------------------------------------------|
| str       | `string`  |         | A `date`-formatted string, e.g. `2024-01-31`                 |
| utc       | `boolean` | `false` | If true, the value is interpreted/constructed as UTC          |

Returns: `Date | number`

Returns a `number` (`Infinity`/`-Infinity`) for PostgreSQL's `infinity`/`-infinity` special values, or an invalid `Date` if the string does not match the expected pattern; otherwise a `Date`.
