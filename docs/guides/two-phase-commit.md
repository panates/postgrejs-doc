---
sidebar_position: 11
---

# Two-Phase Commit

Two-phase commit (2PC) splits ending a transaction into two steps: **prepare**,
which asks the server to make the transaction durable and ready to commit
without actually deciding its outcome yet, and **finish**, which later commits
or rolls it back — possibly from a different connection, process, or even host
than the one that prepared it.

This is the mechanism PostgreSQL exposes for coordinating a single distributed
transaction across multiple databases (an XA-style coordinator commits or
aborts every participant's prepared transaction together, so either all of
them apply or none do).

## Methods

| Method | Description |
|:---|:---|
| `prepareTransaction(name)` | Ends the connection's current transaction as a prepared one, filed under `name`. The transaction stops belonging to this session. |
| `commitPrepared(name)` | Commits the transaction previously prepared under `name`. Runs outside any transaction and needs no connection to the session that prepared it. |
| `rollbackPrepared(name)` | Discards the transaction previously prepared under `name`. |

All three take a `string` name and return `Promise<void>`. The name is escaped
internally, so it is safe to pass arbitrary strings.

## Example

```ts
await connection.startTransaction();
await connection.query('insert into orders(id, total) values ($1, $2)', {
  params: [42, 199.99],
});
await connection.prepareTransaction('order-42');

// The transaction is no longer tied to `connection` and is not yet visible
// to other sessions.
connection.inTransaction; // false

// ...later, possibly from a different connection or process:
const other = new Connection();
await other.connect();
try {
  await other.commitPrepared('order-42');
} finally {
  await other.close();
}
```

If the coordinator instead decides to abort, call `rollbackPrepared('order-42')`
in place of `commitPrepared`.

## Server Configuration: `max_prepared_transactions`

PostgreSQL ships with `max_prepared_transactions` set to `0`, which disables
this feature entirely. `prepareTransaction()` fails with a server error
(`prepared transactions are disabled`) until an administrator raises this
setting above zero on the server:

```
max_prepared_transactions = 100
```

This is a common gotcha when adopting 2PC — check `show max_prepared_transactions`
on the target server before relying on it in production.

A prepared transaction left uncommitted also holds locks and prevents
autovacuum from cleaning up until it is finished, so an orphaned
`prepareTransaction()` call (one whose coordinator crashes before calling
`commitPrepared`/`rollbackPrepared`) can affect the whole database — monitor
`pg_prepared_xacts` for transactions that have been sitting for longer than
expected.

<small>
This full prepare/commit/rollback API is a feature `pg` does not expose at all, and `postgres.js` only partially supports — it has a `sql.prepare(name)` helper for the prepare half, but no equivalent for `COMMIT PREPARED`/`ROLLBACK PREPARED`.
</small>

See [Transactions](./transactions.md) for ordinary transaction and savepoint
handling, and [API: Connection](../api/classes/connection.md) for the full
method reference.
