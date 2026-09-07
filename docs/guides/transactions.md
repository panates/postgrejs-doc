---
sidebar_position: 10
---

# Transactions & Savepoints

`Connection` exposes typed methods for `BEGIN`/`COMMIT`/`ROLLBACK` and for
savepoints, instead of requiring you to write the raw SQL yourself.

## Starting, Committing, Rolling Back

```ts
await connection.startTransaction();
try {
  await connection.query('insert into accounts(id, balance) values ($1, $2)', {
    params: [1, 100],
  });
  await connection.query('update accounts set balance = balance - 10 where id = $1', {
    params: [1],
  });
  await connection.commit();
} catch (e) {
  await connection.rollback();
  throw e;
}
```

- `startTransaction()` issues `BEGIN` — it is a no-op on the wire if the
  connection is already inside a transaction (see [Reference Counting](#reference-counting)
  below for what it does instead).
- `commit()` issues `COMMIT` once every open `startTransaction()` call has a
  matching `commit()` — see [Reference Counting](#reference-counting).
- `rollback()` issues `ROLLBACK` immediately, ending the transaction
  outright regardless of nesting, and is a no-op outside a transaction.
- `connection.inTransaction` is a boolean getter that reflects the connection's
  current transaction status.

## Auto-Commit Behavior

Every query normally commits on its own, the same as running it directly in
`psql` — this is the default when the connection's `autoCommit` option is left
unset. You can change this at the connection level:

```ts
const connection = new Connection({ autoCommit: false });
```

With `autoCommit: false` on the connection config, the first statement you run
outside of an explicit `startTransaction()` implicitly opens a transaction
(`BEGIN`) before it runs — and that transaction is **not** committed
automatically, so it stays open across subsequent calls until you call
`commit()`/`rollback()` yourself, or pass `autoCommit: true` on a specific call
to close it out:

```ts
const connection = new Connection({ autoCommit: false });
await connection.connect();

await connection.query('insert into accounts(id, balance) values (1, 100)');
connection.inTransaction; // true - opened implicitly, still open

await connection.query('update accounts set balance = 90 where id = 1', {
  autoCommit: true, // commit and close the transaction after this call
});
connection.inTransaction; // false
```

`autoCommit` can also be passed per-call in [QueryOptions](../api/interfaces/query-options.md),
overriding the connection's own setting for that one call.

## Error Handling: rollbackOnError

| Key | Type | Default | Description |
|:---|:---|:---|:---|
| `rollbackOnError` | `boolean` | `true` | When `true` and a statement inside a transaction throws, postgrejs rolls the transaction back to a savepoint taken just before the statement, so the transaction survives the error. When `false`, an error aborts the entire transaction, matching plain PostgreSQL behavior. |

This can be set on the connection config or overridden per-call via
[QueryOptions](../api/interfaces/query-options.md).

## Savepoints

`Connection` supports named savepoints within a transaction:

| Method | Description |
|:---|:---|
| `savepoint(name)` | Creates a savepoint named `name`, starting a transaction first if one is not already open. |
| `rollbackToSavepoint(name)` | Rolls the transaction back to the given savepoint, without ending the transaction. |
| `releaseSavepoint(name)` | Releases (discards) the given savepoint. |

Savepoint names must start with a letter and contain only letters, digits, and
underscores.

```ts
await connection.savepoint('before_update');
try {
  await connection.query('update accounts set balance = balance - 1000 where id = 1');
  await connection.releaseSavepoint('before_update');
} catch (e) {
  await connection.rollbackToSavepoint('before_update');
}
await connection.commit();
```

## Reference Counting

`startTransaction()`/`commit()`, and `savepoint()`/`releaseSavepoint()` for a
given name, are all reference-counted, not just idempotent: the connection
tracks how many calls are currently unmatched, and only sends the
corresponding SQL on the wire at the outermost level.

**Transactions:**

- Each `startTransaction()` call increments a nesting count. Only the
  *first* call — the one that finds the connection not already in a
  transaction — actually sends `BEGIN`.
- Each `commit()` call decrements that count. Only the call that brings it
  back down to zero actually sends `COMMIT`; the others just unwind their own
  level and return.
- `commit(true)` ignores the count and commits immediately, regardless of
  how many nested levels are still open.
- `rollback()` is **not** reference-counted — it always resets the count to
  zero and rolls the whole transaction back immediately. This is
  deliberate: a rollback ends the transaction outright, so there is nothing
  left for a still-pending `commit()` to unwind.

This makes it safe for a helper function to open and close its own
transaction without knowing whether its caller already started one:

```ts
async function debit(connection: Connection, accountId: number, amount: number) {
  await connection.startTransaction();
  try {
    await connection.query(
      'update accounts set balance = balance - $1 where id = $2',
      { params: [amount, accountId] },
    );
    await connection.commit();
  } catch (e) {
    await connection.rollback();
    throw e;
  }
}

// Called standalone: debit() opens and closes its own transaction.
await debit(connection, 1, 50);

// Called from within a caller-managed transaction: debit()'s
// startTransaction()/commit() calls are absorbed into the outer one —
// only the outer commit() actually sends COMMIT.
await connection.startTransaction();
await debit(connection, 1, 50);
await debit(connection, 2, 50);
await connection.commit();
```

**Savepoints:** the same pattern applies per savepoint name — nesting
`savepoint('x')` calls only sends `SAVEPOINT x` once, and
`releaseSavepoint('x')` only sends `RELEASE SAVEPOINT x` once every call for
that name has been released (`releaseSavepoint(name, true)` releases
immediately, ignoring the count). This makes a helper safe to call
repeatedly under the same savepoint name, from anywhere, without it knowing
whether an outer caller already opened that savepoint:

```ts
async function withRetrySavepoint(connection: Connection, work: () => Promise<void>) {
  await connection.savepoint('sp_retry');
  try {
    await work();
    await connection.releaseSavepoint('sp_retry');
  } catch (e) {
    await connection.rollbackToSavepoint('sp_retry');
    throw e;
  }
}

// Nested calls under the same name only issue SAVEPOINT/RELEASE once,
// at the outermost level:
await connection.startTransaction();
await withRetrySavepoint(connection, async () => {
  await withRetrySavepoint(connection, async () => {
    await connection.query('update accounts set balance = balance - 10 where id = 1');
  });
});
await connection.commit();
```

Like `rollback()`, `rollbackToSavepoint(name)` is **not** reference-counted
either — regardless of how many nested `savepoint(name)` calls are open, it
discards the savepoint (and everything done after it) outright and clears
that name's nesting count. A still-pending `releaseSavepoint(name)` further
up the call stack is then **not** a safe no-op: since the count was
cleared, it will unconditionally send `RELEASE SAVEPOINT` again for a
savepoint the server no longer has, which the server rejects with an error.
In practice this means a `rollbackToSavepoint(name)` call should only
happen at the same level that would otherwise have released that name — not
underneath a `try`/`catch` that still expects to call
`releaseSavepoint(name)` afterwards on the success path.

## Full Example

```ts
await connection.startTransaction();
try {
  await connection.query('insert into orders(id, total) values ($1, $2)', {
    params: [42, 199.99],
  });

  await connection.savepoint('sp_items');
  try {
    await connection.query(
      'insert into order_items(order_id, sku) values ($1, $2)',
      { params: [42, 'widget-1'] },
    );
  } catch (e) {
    await connection.rollbackToSavepoint('sp_items');
  }

  await connection.commit();
} catch (e) {
  await connection.rollback();
  throw e;
}
```

For coordinating a transaction across multiple connections or systems, see
[Two-Phase Commit](./two-phase-commit.md). Full method signatures are in
[API: Connection](../api/classes/connection.md).
