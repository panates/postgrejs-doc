---
sidebar_position: 7
---

# parseDateTime

Parses PostgreSQL's text `timestamp` output into a JavaScript `Date` (or `Infinity`/`-Infinity` for PostgreSQL's `infinity`/`-infinity` values).

## parseDateTime(str, utc?)

| Parameter | Type      | Default | Description                                                    |
|-----------|-----------|---------|------------------------------------------------------------------|
| str       | `string`  |         | A `timestamp`-formatted string, e.g. `2024-01-31 10:20:30.123`  |
| utc       | `boolean` | `false` | If true, the value is interpreted/constructed as UTC. If false, native `Date` parsing is tried first |

Returns: `Date | number`
