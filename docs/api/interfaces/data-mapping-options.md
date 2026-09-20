---
sidebar_position: 9
---

# DataMappingOptions

| Key           | Type     | Default | Description                                                                          |
|---------------|----------|---------|-----------------------------------------------------------------------------------------|
| utcDates      | `boolean`| `false` | If true, UTC time is used for date decoding, else the system time offset is used       |
| fetchAsString | `OID[]`  |         | OIDs whose columns are requested from the server in its own text format and returned unparsed, instead of being decoded to their mapped JS type. A wire-level request, not a reformatting of an already-decoded value — the string can never drift from what PostgreSQL itself would print. Works for any OID; an array column is selected by its own array OID (e.g. `_timestamptz`, never `timestamptz`) and comes back as the whole array literal. See [Fetching as String](../../querying/data-types.md#fetching-as-string) |
| unknownTypesAsString | `boolean` | `false` | Ask the server for text on any column this client has no registered `DataType` for (the `reg*` family, `money`, an enum, a composite, an extension type, ...), instead of handing back a `Buffer` nothing can interpret. Off by default and not free: the column types have to be known before the `Bind`, so a statement not yet prepared is prepared on first sight. A registered type is unaffected. See [Types That Can't Be Decoded](../../querying/data-types.md#types-that-cant-be-decoded) |
