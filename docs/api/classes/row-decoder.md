---
sidebar_position: 11
---

# RowDecoder

Extension point for turning one row's raw wire data into whatever shape a caller wants. Pass an instance of a `RowDecoder` subclass as the `rowDecoder` option to [`QueryOptions`](../interfaces/query-options.md)/[`ScriptExecuteOptions`](../interfaces/script-execute-options.md) to take over row decoding entirely — for example to decode individual columns lazily, on first access, instead of eagerly decoding the whole row up front.

Two built-in subclasses cover the default behavior: [`ArrayRowDecoder`](#arrayrowdecoder) (rows as `Row` arrays — the default) and [`ObjectRowDecoder`](#objectrowdecoder) (rows as `<fieldName, value>` objects — what `objectRows: true` has always produced). `rowDecoder: 'array'` / `rowDecoder: 'object'` select these by name without importing them.

## Writing a custom decoder

```ts
import { Connection, RowDecoder } from 'postgrejs';
import type { AnyParseFunction, DataMappingOptions, FieldInfo } from 'postgrejs';

class LazyRowDecoder extends RowDecoder {
  decode(
    parsers: AnyParseFunction[],
    data: Buffer,
    columnCount: number,
    options: DataMappingOptions,
    fields: FieldInfo[],
  ) {
    // Retain `data` and decode columns only when they're actually read,
    // instead of parsing every column up front.
    return new LazyRow(parsers, data, columnCount, options, fields);
  }
}

const connection = new Connection();
await connection.connect();
const result = await connection.query('select * from big_table', {
  rowDecoder: new LazyRowDecoder(),
});
console.log(result.rowType); // 'custom'
```

### Data-immutability contract

`data` is never written to or reused by postgrejs once `decode()` is called with it — it's safe to retain a reference to it (or a `Buffer.subarray()` of it) for as long as you want, e.g. to defer decoding a column until it's actually read. The only cost of doing so is memory: `data` is itself a zero-copy view into the socket's own read buffer (up to ~64KB), so holding onto even one row's `data` keeps that whole chunk — and every other row's bytes in it — alive until released.

## `decode()`

`abstract decode(parsers: AnyParseFunction[], data: Buffer, columnCount: number, options: DataMappingOptions, fields: FieldInfo[]): any`

| Argument | Type | Description |
| --- | --- | --- |
| parsers | `AnyParseFunction[]` | One decode function per column, in column order |
| data | `Buffer` | The row's own zero-copy buffer view |
| columnCount | `number` | Number of columns in the row |
| options | `DataMappingOptions` | The query's data-mapping options (`utcDates`, `fetchAsString`, ...) |
| fields | [`FieldInfo[]`](../interfaces/field-info.md) | Column metadata, in column order |

## `ArrayRowDecoder`

The default decoder — decodes a row into a `Row` (array of values), same as `parseRow()`. Used when neither `rowDecoder` nor `objectRows` is set, and by `rowDecoder: 'array'`.

## `ObjectRowDecoder`

Decodes a row into a `<fieldName, value>` object, same as `parseObjectRow()`. Used by `rowDecoder: 'object'` and by the deprecated `objectRows: true`.

## See also

- [`QueryOptions.rowDecoder`](../interfaces/query-options.md), [`ScriptExecuteOptions.rowDecoder`](../interfaces/script-execute-options.md)
- [`CommandResult.rowType`](../interfaces/command-result.md), [`Cursor.rowType`](./cursor.md#properties)
- [Extended Query](../../guides/extended-query.md)
