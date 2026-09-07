---
sidebar_position: 4
---

# Connection Pooling

A [`Pool`](../api/classes/pool.md) manages a set of physical [`Connection`](./single-connection.md)s to a single server and
hands them out on demand, so an application does not pay the cost of a fresh TCP handshake and authentication round
trip for every query.

## Creating a Pool

Like `Connection`, a `Pool` accepts either a configuration object or a connection string:

```ts
import { Pool } from 'postgrejs';

const pool = new Pool({
  host: 'localhost',
  database: 'my_db',
  user: 'postgres',
  password: 'secret',
  max: 10,
});
```

The pool does not open any sockets until the first connection is needed — either an explicit `acquire()`, a direct
`query()`/`execute()` call, or `pool.start()` to warm it up ahead of time.

## Pool Properties

A `Pool` exposes its current state through a few read-only getters, useful for health checks, metrics, or
deciding whether it's safe to shut down:

| Property              | Type                                                   | Description                                                    |
| :--------------------- | :------------------------------------------------------ | :--------------------------------------------------------------- |
| `config`               | [PoolConfiguration](../api/interfaces/pool-configuration.md) | The configuration the pool was created with.               |
| `acquiredConnections`  | `number`                                                 | How many connections are currently checked out (in use).        |
| `idleConnections`      | `number`                                                 | How many connections are open but sitting unused, ready to be handed out. |
| `totalConnections`     | `number`                                                 | `acquiredConnections + idleConnections` — every connection the pool currently holds open. |

```ts
console.log(`${pool.acquiredConnections}/${pool.totalConnections} connections in use`);
```

`totalConnections` can momentarily exceed `max` while the pool is replacing a destroyed connection; it settles
back down once the replacement completes or the old one finishes closing.

## What a Pool Can Do

Besides `acquire()`/`release()` and the `query()`/`execute()` convenience methods below, a `Pool` mirrors most
of what a single [`Connection`](./single-connection.md) can do, transparently acquiring and releasing a
connection around each call:

- **`start()`** — opens the minimum number of connections (`min`) up front. Optional; the pool starts itself
  lazily on the first `acquire()`/`query()`/`execute()` otherwise.
- **`query()` / `execute()`** — run a one-off statement (see below).
- **`prepare(sql, options?)`** — acquires a connection and creates a [`PreparedStatement`](../api/classes/prepared-statement.md)
  on it; the connection stays checked out until `statement.close()` is called. See [Prepared Statements](./prepared-statements.md).
- **`listen()` / `unListen()` / `unListenAll()`** — subscribe to `NOTIFY` channels. The pool keeps one dedicated
  connection open for all of its listened channels and reconnects it automatically if it drops, so
  subscriptions survive independently of any `acquire()`/`release()` cycle. See [Notifications](./notifications.md).
- **`close(terminateWait?)`** — shuts the whole pool down (see [Reference Counting](#reference-counting) below).

## acquire()/release() vs. query()/execute()

A `Connection` can be checked out explicitly and returned when done:

```ts
const connection = await pool.acquire();
try {
  const result = await connection.query('select 1');
  console.log(result.rows);
} finally {
  await connection.close(); // returns the connection to the pool
}
```

Use this form when several statements must run on the *same* session — a transaction, a cursor, a prepared
statement, or `LISTEN`/`NOTIFY`.

For a single one-off statement, `Pool` also offers `query()` and `execute()` directly, which acquire a connection,
run the statement, and release it back automatically:

```ts
const result = await pool.query('select * from users where id = $1', {
  params: [1],
});
```

```ts
const result = await pool.execute('select 1; select 2;');
```

These behave like `Connection.query()`/`Connection.execute()` (see [Simple Query](./simple-query.md) and
[Extended Query](./extended-query.md)) but never leave a connection acquired after the call resolves or rejects.

## Pool Sizing

`Pool` is built on top of [lightning-pool](https://www.npmjs.com/package/lightning-pool) and exposes its sizing
knobs directly: `min`, `max`, `minIdle`, `idleTimeoutMillis`, `acquireTimeoutMillis`, `acquireMaxRetries`,
`acquireRetryWait`, `maxQueue`, and `validation`. `max` defaults to `10`.

See [PoolConfiguration](../api/interfaces/pool-configuration.md) for the full list and defaults. See
[Pool Properties](#pool-properties) above for the runtime counters that reflect these settings in practice.

## Pipelining

By default, a query dispatched through `Pool.query()`/`Pool.execute()` holds its connection exclusively until it
resolves — `max` is a ceiling on concurrent queries as well as on connections.

Pipelining relaxes that: PostgreSQL correlates each response to its request by order, so several statements can be
in flight on the same physical connection at once, each still getting its own error boundary via its own `Sync`.
Opting in per call lets a burst of queries fan out without being serialized behind the pool's connection count:

```ts
// Without pipelining: capped at `max` concurrent queries
const results = await Promise.all(
  ids.map(id => pool.query('select * from users where id = $1', { params: [id] })),
);

// With pipelining: multiple queries share connections, in flight at once
const results = await Promise.all(
  ids.map(id =>
    pool.query('select * from users where id = $1', {
      params: [id],
      pipeline: true,
    }),
  ),
);
```

Pipelining is opt-in per call (`{ pipeline: true }` on `query()`/`execute()`) and only applies to `Pool`'s own
convenience methods — a connection obtained via `acquire()` is never shared, so transactions, cursors, and prepared
statements are unaffected. It is also silently skipped for statements that start a transaction or a `COPY`, and for
any call that passes `autoCommit: false` or an abort `signal`.

Two pool options govern how far pipelining can fan out:

| Key                     | Type     | Default            | Description                                                                 |
| :---------------------- | :------- | :------------------ | :---------------------------------------------------------------------------- |
| `pipelineMaxQueries`    | `number` | `100`               | How many one-shot queries may share a single pooled connection at once.       |
| `pipelineMaxConnections`| `number` | the pool's own `max`| How many pooled connections the pipelined path may borrow at once.            |

Setting `pipelineMaxQueries` to `1` restores the older, non-pipelined behavior even when `pipeline: true` is passed.

## Reference Counting

Each physical connection tracks how many operations are currently running on it (queries, copy streams, prepared
statement calls, and so on). This internal count is what powers graceful shutdown — both
[`Connection.close(terminateWait)`](./single-connection.md#graceful-shutdown) and `Pool.close(terminateWait)` poll it to
decide whether a connection is still busy — and it is unrelated to how many callers currently hold the connection
checked out from the pool.

Checking a connection in and out of the pool itself works differently: `pool.acquire()` hands out a `Connection`
wrapping one pooled physical connection, and `pool.release(connection)` (or `pool.close()`) returns it. Calling
`.close()` directly on a `Connection` obtained from a `Pool` does **not** close the socket — it detects that it
belongs to a pool and releases it back instead, leaving the underlying connection open and idle for the next
`acquire()`:

```ts
const connection = await pool.acquire();
// ... use it ...
await connection.close(); // returns it to the pool; the socket stays open
```

This means the same `try { ... } finally { await connection.close(); }` pattern is safe to use whether `connection`
came from `new Connection(...)` or from `pool.acquire()` — in the first case it closes the socket, in the second it
releases the connection back to the pool.

`Pool.close(terminateWait?)` shuts the whole pool down: it closes the shared notification connection (if one was
opened for `listen()`/`unListen()`), then drains and destroys every pooled connection, waiting up to `terminateWait`
ms (default `10000`) for connections still in use before forcing them closed.

## Pool Events

```ts
pool.on('acquire', connection => console.log('acquired', connection.processID));
pool.on('release', connection => console.log('released', connection.processID));
pool.on('destroy', connection => console.log('destroyed', connection.processID));
pool.on('error', err => console.error('pool error', err));
```

- **`acquire`** — a connection was checked out (from `acquire()` or an internal `query()`/`execute()`/`prepare()`
  call).
- **`release`** — a connection was returned to the pool.
- **`destroy`** — a connection was removed from the pool (idle timeout, validation failure, or shutdown).
- **`error`** — an error occurred that isn't tied to a specific in-flight call.

`Pool` also forwards `'debug'`, `'execute'`, and `'query'` from each connection it acquires, as long as a listener
for that event was already registered on the pool — useful for centralized logging without attaching a listener to
every individual `Connection`.

A pool can also be pointed at a cluster of several servers instead of one — see
[Multi-Host & Failover](./multi-host.md) for `hosts`/`targetSessionAttrs`, which work the same way on a `Pool` as
on a single `Connection`.

## See Also

- [Single Connection](./single-connection.md)
- [Connection Strings](./connection-strings.md)
- [Multi-Host & Failover](./multi-host.md)
- [API: Pool](../api/classes/pool.md)
