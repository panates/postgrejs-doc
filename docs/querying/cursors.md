---
sidebar_position: 6
slug: /guides/cursors
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

### Iterating with `for await`

A `Cursor` is an async iterable — `for await` reads one row at a time and
closes the cursor when the loop ends, whether that's exhaustion, a `break`,
or the body throwing:

```ts
const result = await connection.query('select * from customers order by id', {
  objectRows: true,
  cursor: true,
});

for await (const row of result.cursor!) {
  console.log(row);
  // a `break` here still closes the cursor - no separate cursor.close() needed
}
```

Nothing is decoded ahead of what the loop asks for, so this streams a result
larger than memory the same way `next()` does — it's just the row-at-a-time
equivalent of `next()` in a `while` loop, without having to check for
`undefined` or close the cursor yourself.

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

See [Resource Management](../reliability/resource-management.md) for more on `await using` and disposal in postgrejs.

## Cursors need a stable connection

A cursor reads through a portal, and a portal lives only as long as the
transaction that created it. Outside an explicit `startTransaction()`, that's
the *implicit* transaction — which ends the moment any other statement's
`Sync` runs on the same connection. Running another query on a bare
`Connection` while its cursor is still open destroys the portal:

```ts
const connection = new Connection();
await connection.connect();

const result = await connection.query('select * from big_table', { cursor: true });
await connection.query('select 1'); // ends the cursor's implicit transaction
await result.cursor!.next(); // throws - portal no longer exists
```

Open the cursor inside an explicit transaction if the same connection needs
to run other statements meanwhile, or give the cursor a connection of its
own. `Pool.query()` does the latter automatically: a connection that opens a
cursor is held back from `release()` until the cursor closes (by
exhaustion, `break`, `close()`, or disposal), so nothing else can land on it
and destroy the portal in the meantime — you don't need to `release()` it
yourself.

## Why use a cursor

`query()` (without `cursor: true`) fetches every row into `result.rows` by
default, buffering the whole result in memory before resolving. Passing an
explicit `fetchCount` stops the server at that many rows instead of fetching
everything — but there's no way to ask for the rest afterward: the portal is
discarded by the `Sync` that ends the call, and `result.suspended` is set to
say a prefix came back rather than the whole answer (see
[Extended Query](./extended-query.md#fetchcount-and-suspended-results)).

A cursor is what actually reads a result of any size without buffering it in
full: it keeps only `fetchCount` rows (its batch size) in memory at a time,
fetching more from the server as you consume them — through `next()`,
`fetch()`, or `for await`.

## See also

- [`Cursor`](../api/classes/cursor.md) reference
- [Extended Query](./extended-query.md)
- [Resource Management](../reliability/resource-management.md)
