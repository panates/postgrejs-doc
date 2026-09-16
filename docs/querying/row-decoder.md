---
sidebar_position: 7
slug: /guides/row-decoder
---

# Custom Row Decoding

Every query result has to turn each row's raw wire bytes into some JS value — by default, an array of decoded column values (or, with `objectRows: true`, a field-name-keyed object). `rowDecoder` lets you replace that step entirely with your own logic, for every row-producing call: `query()`, `execute()`, and cursors.

```ts
import { Connection } from 'postgrejs';

const result = await connection.query('select * from customers', {
  rowDecoder: 'object', // same as objectRows: true
});
```

`rowDecoder` accepts three kinds of value:

| Value | Behavior |
| --- | --- |
| `'array'` | Rows as `Row` arrays — the default. |
| `'object'` | Rows as `<fieldName, value>` objects — same as `objectRows: true`. |
| a [`RowDecoder`](../api/classes/row-decoder.md) instance | Your own decoding logic, replacing both of the above. |

An explicit `rowDecoder` wins over `objectRows` if both are set. `objectRows` still works exactly as before — it's deprecated only in the sense that `rowDecoder: 'object'` now says the same thing.

## Writing a custom decoder

Subclass [`RowDecoder`](../api/classes/row-decoder.md) and implement `decode()`, which receives the row's parsers, raw buffer, column count, mapping options, and field metadata — the same inputs the built-in array/object decoders use:

```ts
import { Connection, RowDecoder } from 'postgrejs';
import type { AnyParseFunction, DataMappingOptions, FieldInfo } from 'postgrejs';

class UppercaseKeysDecoder extends RowDecoder {
  decode(
    parsers: AnyParseFunction[],
    data: Buffer,
    columnCount: number,
    options: DataMappingOptions,
    fields: FieldInfo[],
  ) {
    const row: Record<string, any> = {};
    let offset = 0;
    for (let i = 0; i < columnCount; i++) {
      // Each column is a 4-byte length prefix (-1 for NULL) followed by
      // that many bytes of value - the same layout parseRow()/
      // parseObjectRow() walk internally.
      const len = data.readInt32BE(offset);
      offset += 4;
      const value = len < 0 ? null : parsers[i](data, offset, len, options);
      if (len >= 0) offset += len;
      row[fields[i].fieldName.toUpperCase()] = value;
    }
    return row;
  }
}

const connection = new Connection();
await connection.connect();
const result = await connection.query('select id, name from customers', {
  rowDecoder: new UppercaseKeysDecoder(),
});
console.log(result.rows[0]); // { ID: 1, NAME: 'Ada' }
console.log(result.rowType); // 'custom'
```

`rowType` (on `QueryResult`/`Cursor`) reports `'custom'` whenever a `RowDecoder` subclass was supplied — there's no way for postgrejs to know what shape it returns, unlike `'array'`/`'object'` for the built-ins.

## Why: deferring work per row

The built-in decoders always decode every column of every row eagerly. A custom decoder doesn't have to — `data` is safe to retain a reference to (or a `Buffer.subarray()` of it) for as long as you want, since postgrejs never writes to or reuses it once `decode()` returns. That makes lazy, per-cell decoding possible: return an object that only calls a column's parser the first time that property is actually read, which matters when a query selects columns a caller may not end up using.

The only cost of holding onto `data` is memory: it's a zero-copy view into the socket's own read buffer (up to ~64KB), so retaining even one row's `data` keeps that entire chunk — and every other row's bytes packed into it — alive until released.

## Works with cursors too

`rowDecoder` applies to cursor-fetched rows the same way:

```ts
const result = await connection.query('select * from customers', {
  cursor: true,
  rowDecoder: new UppercaseKeysDecoder(),
});
const cursor = result.cursor!;
let row;
while ((row = await cursor.next())) {
  console.log(row); // decoded by UppercaseKeysDecoder
}
```

## See also

- [`RowDecoder`](../api/classes/row-decoder.md), [`ArrayRowDecoder`, `ObjectRowDecoder`](../api/classes/row-decoder.md) reference
- [Extended Query](./extended-query.md)
- [Cursors](./cursors.md)
