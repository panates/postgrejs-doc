---
sidebar_position: 8
---

# Cursors

A server-side cursor lets you stream a large result set a batch at a time instead of loading every row into memory at once. Opt in by passing `cursor: true` to [`connection.query()`](./extended-query.md):

```ts
const result = await connection.query('select * from customers order by id', {
  objectRows: true,
  cursor: true,
});

const cursor = result.cursor!;
```

`result.rows` is not populated when `cursor: true` — rows are fetched on demand through the returned [`Cursor`](../api/classes/cursor.md) instead.

## Reading rows

`cursor.next()` returns one row at a time (or `undefined` once exhausted):

```ts
let row;
while ((row = await cursor.next())) {
  console.log(row);
}
```

`cursor.fetch(n)` reads up to `n` rows in one call, returning fewer than `n` once the result set runs out:

```ts
const rows = await cursor.fetch(50); // up to 50 rows
```

`cursor.rowType` reports `'array'` or `'object'`, matching the `objectRows` option the query was opened with.

## Batch size: `fetchCount`

`fetchCount` controls how many rows the cursor asks the server for per internal round trip (its execute-portal batch size), independent of how many rows you request from `next()`/`fetch()`:

```ts
const result = await connection.query('select * from customers', {
  cursor: true,
  fetchCount: 500, // fetch 500 rows per round trip from the server
});
```

It defaults to `100` and must be between `0` and `4294967295`.

## Events

A cursor emits:

- `'fetch'` — whenever a new batch is pulled from the server, with the batch of rows.
- `'close'` — when the cursor closes, whether explicitly or because the result set was exhausted.

```ts
cursor.on('fetch', rows => console.log(`fetched ${rows.length} rows`));
cursor.on('close', () => console.log('cursor closed'));
```

A cursor closes itself automatically once `next()`/`fetch()` reaches the end of the result set.

## Closing

Always close a cursor you don't drain to completion, to release the underlying portal:

```ts
await cursor.close();
```

`Cursor` implements `AsyncDisposable`, so `await using` closes it automatically at the end of a block:

```ts
{
  const result = await connection.query('select * from customers', { cursor: true });
  await using cursor = result.cursor!;
  const row = await cursor.next();
  // cursor.close() runs automatically here
}
```

See [Resource Management](./resource-management.md) for more on `await using` and disposal in postgrejs.

## Why use a cursor

Without `cursor: true`, `query()` buffers the entire result set in memory before resolving. For queries returning millions of rows, that defeats streaming and can exhaust memory. A cursor keeps only `fetchCount` rows in memory at a time, fetching more from the server as you consume them.

## See also

- [`Cursor`](../api/classes/cursor.md) reference
- [Extended Query](./extended-query.md)
- [Resource Management](./resource-management.md)
