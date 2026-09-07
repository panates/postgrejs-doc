---
sidebar_position: 8
---

# parseDateTimeTz

Parses PostgreSQL's text `timestamptz` output into a JavaScript `Date` (or `Infinity`/`-Infinity` for PostgreSQL's `infinity`/`-infinity` values).

## parseDateTimeTz(str, utc?)

| Parameter | Type      | Default | Description                                                                |
|-----------|-----------|---------|-------------------------------------------------------------------------------|
| str       | `string`  |         | A `timestamptz`-formatted string, e.g. `2024-01-31 10:20:30.123+03`            |
| utc       | `boolean` | `false` | If true and no explicit offset is present, the value is constructed as UTC     |

Returns: `Date | number`

Parses a timestamp with time zone. When the string carries an explicit `+HH:MM`/`-HH:MM` offset, that offset is applied and the result is normalized to UTC regardless of the `utc` argument.
