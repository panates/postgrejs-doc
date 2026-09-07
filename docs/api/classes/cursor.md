---
sidebar_position: 3
---

# Cursor

A server-side cursor over the rows of a query, obtained by calling `query()`/`prepare()`+`execute()` with `{ cursor: true }` — it is never constructed directly. It implements `AsyncDisposable`, so it can be used with `await using`.

## Constructor

Cursor instances are created internally by [PreparedStatement.execute()](./prepared-statement.md#execute) when `cursor: true` is passed, and returned as `QueryResult.cursor`. You do not construct a `Cursor` yourself.

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const result = await connection.query('select * from my_table', { cursor: true });
const cursor = result.cursor!;
```

## Properties

| Key      | Type                                                | Readonly | Description                                                        |
|----------|-------------------------------------------------------|----------|-------------------------------------------------------------------------|
| fields   | [FieldInfo](../interfaces/field-info.md)`[]`         | true     | Information about the fields (columns) of the result set                |
| rowType  | `'array' \| 'object'`                                 | true     | Whether rows are returned as arrays or as `<fieldName, value>` objects, from the query's `objectRows` option |
| isClosed | `boolean`                                             | true     | Returns `true` once the cursor has been closed                          |

## Methods

### next()

Fetches and returns the next row, or `undefined` once the cursor is exhausted. Fetches a new batch from the server (of `fetchCount` rows, default 100) whenever the local buffer is empty.

`next(): Promise<Row | undefined>`

- Returns the next row, or `undefined`

```ts
let row;
while ((row = await cursor.next())) {
  console.log(row);
}
```

### fetch()

Fetches up to `nRows` rows at once, returning fewer if the cursor is exhausted first.

`fetch(nRows: number): Promise<Row[]>`

| Argument | Type     | Default | Description                    |
|----------|----------|---------|-------------------------------------|
| nRows    | `number` |         | Maximum number of rows to fetch     |

- Returns an array of rows

```ts
const rows = await cursor.fetch(50);
```

### close()

Closes the cursor and releases its server-side portal.

`close(): Promise<void>`

```ts
await cursor.close();
```

### Symbol.asyncDispose()

Implements `AsyncDisposable`; calls `close()`.

`[Symbol.asyncDispose](): Promise<void>`

```ts
{
  const result = await connection.query('select * from my_table', { cursor: true });
  await using cursor = result.cursor!;
  let row;
  while ((row = await cursor.next())) {
    // ...
  }
} // cursor closed automatically
```

## Events

### fetch

Triggered whenever a new batch of rows has been fetched from the server.

`(rows: Row[]) => void`

| Argument | Type    | Default | Description               |
|----------|---------|---------|--------------------------------|
| rows     | `Row[]` |         | The rows just fetched            |

### close

Triggered after the cursor has closed.

`() => void`
