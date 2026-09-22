---
sidebar_position: 9
---

# DataMappingOptions

Every field here can be set once on a [`Connection`](../classes/connection.md)/[`Pool`](../classes/pool.md)
config instead of repeated on each call — a value given on a specific call still wins. See
[Per-query type mapping](../../querying/data-types.md#per-query-type-mapping) for an example.

| Key           | Type     | Default | Description                                                                          |
|---------------|----------|---------|-----------------------------------------------------------------------------------------|
| utcDates      | `boolean`| `false` | If true, UTC time is used for date decoding, else the system time offset is used       |
| temporalTypes | `boolean \| OID[]` | `false` | Decode `date`/`time`/`timestamp`/`timestamptz`/`interval` into `Temporal.PlainDate`/`PlainTime`/`PlainDateTime`/`ZonedDateTime`/`Duration` instead of `Date`/`Interval`. `true` takes all five; an array names only the ones wanted. Needs a `Temporal` polyfill imported before connecting — no runtime ships one yet. See [Temporal Values](../../querying/data-types.md#temporal-values) |
| timeZone      | `string` |         | The zone a `timestamptz` is given when decoded as a `Temporal.ZonedDateTime` (see `temporalTypes`). Filled in from the server's own `TimeZone` by default |
| decimalAsString | `boolean \| OID[]` | `false` | Decode `numeric`/`money` into the exact decimal string they carry — no currency symbol, no grouping, the server's own scale. `true` takes both; an array names only `DataTypeOIDs.numeric`/`.money`. See [Exact Decimal Strings](../../querying/data-types.md#exact-decimal-strings-decimalasstring) |
| moneyFormat   | `{ scale: number; decimalSeparator: string }` |  | The scale and decimal separator `money` is stored at — a connection asks the server for this once, the first time it sees a `money` column, and caches it. Set it to skip that round trip, or to read a value rendered by a different server. See [Money](../../querying/data-types.md#money) |
| fetchAsString | `(OID \| { oid: OID; arrays?: boolean })[]` | | OIDs whose columns are requested from the server in its own text format and returned unparsed, instead of being decoded to their mapped JS type. A wire-level request, not a reformatting of an already-decoded value — the string can never drift from what PostgreSQL itself would print. Works for any OID. A scalar's own OID asks for that column *and* array columns of it, as an array of element strings; the array's own OID (`_timestamptz`, never `timestamptz`) asks for the whole array literal as one string instead. `{ oid, arrays: false }` narrows a scalar's entry to just the scalar columns, leaving its arrays decoded normally. See [Fetching as String](../../querying/data-types.md#fetching-as-string) |
| unknownTypesAsString | `boolean` | `false` | Ask the server for text on any column this client has no registered `DataType` for — an enum, a composite, or an extension type — instead of handing back a `Buffer` nothing can interpret. Off by default and not free: the column types have to be known before the `Bind`, so a statement not yet prepared is prepared on first sight. A registered type is unaffected. See [Enum, Extension, and Other Unregistered Types](../../querying/data-types.md#enum-extension-and-other-unregistered-types) |
