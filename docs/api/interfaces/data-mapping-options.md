---
sidebar_position: 9
---

# DataMappingOptions

| Key           | Type     | Default | Description                                                                          |
|---------------|----------|---------|-----------------------------------------------------------------------------------------|
| utcDates      | `boolean`| `false` | If true, UTC time is used for date decoding, else the system time offset is used       |
| fetchAsString | `OID[]`  |         | OIDs whose columns are requested from the server in its own text format and returned unparsed, instead of being decoded to their mapped JS type. A wire-level request, not a reformatting of an already-decoded value — the string can never drift from what PostgreSQL itself would print. Works for any OID; an array column is selected by its own array OID (e.g. `_timestamptz`, never `timestamptz`) and comes back as the whole array literal. See [Fetching as String](../../querying/data-types.md#fetching-as-string) |
