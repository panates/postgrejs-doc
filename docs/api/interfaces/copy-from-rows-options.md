---
sidebar_position: 15
---

# CopyFromRowsOptions

Options for [`Connection.copyFromRows()`](../classes/connection.md#copyfromrows). Extends [DataMappingOptions](./data-mapping-options.md).

| Key         | Type                          | Default | Description                                                                                          |
|-------------|--------------------------------|---------|----------------------------------------------------------------------------------------------------------|
| typeMap     | `DataTypeMap`                  | `GlobalTypeMap` | Type registry used to encode values                                                                   |
| columns     | `string[]`                     | every column, in table order | Destination columns, in the order the rows supply them                                  |
| columnTypes | `OID[]`                        |         | Type OIDs for those columns, skipping the round trip that would otherwise probe the server for them — see below |
| chunkSize   | `number`                       | `131072` (128KB) | Bytes to accumulate before sending a `CopyData` message                                            |
| onInvalidValue | `'throw' \| 'null' \| 'skip'` | `'throw'` | What to do with a value the destination column's type can't encode — see below                       |

### `columnTypes`

Only worth setting to skip the probe on a hot path, and only when the OIDs are known to match the table: binary `COPY` does no conversion, so a wrong OID here isn't a mismatch the server can reconcile — it either rejects the stream or, for two types that happen to share a width, stores the bytes as the wrong value.

### `onInvalidValue`

`'throw'` (default) aborts the copy, naming the row and column. The other two exist for a load big enough that abandoning it over one bad record costs more than the record is worth: `'null'` writes `NULL` in that column and keeps the row, `'skip'` drops the row entirely. Both report how many they touched on the result, so a tolerant load still says what it swallowed.

None of the three apply to `NaN`/`Infinity` in a `float`/`numeric` column — PostgreSQL stores those as values distinct from `NULL`, so they encode normally and are never "invalid".

## `CopyFromRowsResult`

What `copyFromRows()` resolves with.

| Key          | Type     | Description                                                                 |
|--------------|----------|---------------------------------------------------------------------------------|
| rowCount     | `number` | Rows actually sent to the server                                                |
| skippedRows  | `number` | Rows dropped under `onInvalidValue: 'skip'` — `0` otherwise                     |
| nulledValues | `number` | Values replaced with `NULL` under `onInvalidValue: 'null'`                      |

## `CopyRowSource`

```ts
type CopyRow = any[] | Record<string, any>;
type CopyRowSource = Iterable<CopyRow> | AsyncIterable<CopyRow> | Readable;
```

A row is either a positional array (matching `columns`) or an object keyed by column name. The source is pulled from rather than pushed to, so a `Readable`/generator far larger than memory streams in with backpressure being the pull loop pausing rather than a queue growing.

See [COPY TO / COPY FROM: Binary COPY FROM](../../bulk-data/copy.md#binary-copy-from-loading-js-rows-directly-with-copyfromrows) for the full guide.
