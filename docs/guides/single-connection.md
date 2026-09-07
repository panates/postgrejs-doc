---
sidebar_position: 3
---

# Single Connection

A [`Connection`](../api/classes/connection.md) represents one physical socket to a PostgreSQL server. It is the
lowest-level object in postgrejs — a [`Pool`](../api/classes/pool.md) simply hands out `Connection` instances that
share the same underlying wiring.

Requires `node >= 20.x`.

## Creating a Connection

A `Connection` can be built from a configuration object or a connection string:

```ts
import { Connection } from 'postgrejs';

// Configuration object
const connection = new Connection({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'secret',
  database: 'my_db',
});

// Connection string
const connection2 = new Connection(
  'postgres://postgres:secret@localhost:5432/my_db',
);
```

Neither form opens a socket by itself — the constructor only prepares the configuration. See
[Connection Strings](./connection-strings.md) for the full URI syntax, and
[Environment Variables](./environment-variables.md) for the `PG*` fallback used when no config or string is
given at all.

A complete example using a connection string:

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://postgres:secret@localhost:5432/my_db');
await connection.connect();
try {
  const result = await connection.query('select 1');
  console.log(result.rows);
} finally {
  await connection.close();
}
```

## Connect / Close Lifecycle

Call `connect()` to open the socket and run the startup/authentication handshake, and `close()` to shut it down:

```ts
const connection = new Connection({ host: 'localhost', database: 'my_db' });
await connection.connect();
try {
  const result = await connection.query('select 1');
  console.log(result.rows);
} finally {
  await connection.close();
}
```

`connect()` resolves once the server reports the session is ready (`ConnectionState.READY`). Calling it again while
already connected is a no-op.

## Key Connection Options

The most commonly used fields are:

| Key        | Type                                    | Default     | Description                                     |
| :--------- | :--------------------------------------- | :---------- | :----------------------------------------------- |
| `host`     | `string`                                 | `localhost` | Server hostname or IP address.                    |
| `port`     | `number`                                 | `5432`      | Server port.                                      |
| `user`     | `string`                                 | -           | Database user.                                    |
| `password` | `string \| (() => string \| Promise<string>)` | -    | Password, or a (sync/async) function returning one. |
| `database` | `string`                                 | -           | Database name.                                    |
| `ssl`      | `tls.ConnectionOptions`                  | -           | Enables TLS; forwarded to Node's `tls` module.    |
| `timezone` | `string`                                 | -           | Sent as `SET timezone` right after connecting.    |
| `schema`   | `string`                                 | -           | Sent as `SET search_path` right after connecting. |

This is only a subset. See [DatabaseConnectionParams](../api/interfaces/database-connection-params.md) for the full
field list, including multi-host failover, SSL negotiation modes, channel binding, and error-handling options. For
TLS specifics see [SSL/TLS](./ssl-tls.md), and for multi-host failover see [Multi-Host](./multi-host.md).

## Lifecycle Events

A `Connection` emits events as it moves through its lifecycle:

```ts
connection.on('connecting', () => console.log('opening socket...'));
connection.on('ready', () => console.log('ready to query'));
connection.on('close', () => console.log('socket closed'));
connection.on('error', err => console.error('connection error', err));
connection.on('terminate', () => console.log('forced closed with queries pending'));

await connection.connect();
```

- **`connecting`** → **`ready`** — emitted during `connect()`: `connecting` when the socket starts dialing, `ready`
  once the startup handshake finishes and the session can accept queries.
- **`close`** — emitted whenever the underlying socket actually closes, whether triggered by `close()`, a server-side
  disconnect, or a network failure.
- **`error`** — emitted for a socket-level error that occurs *after* the connection has reached `ready`. Errors during
  the initial handshake instead reject the `connect()` promise.
- **`terminate`** — emitted only by the graceful-shutdown path described below, when `close()` gives up waiting for
  in-flight queries and forces the socket shut.

See [API: Connection](../api/classes/connection.md) for the complete event and method list, including
`notification`, `query`, `execute`, and `debug`.

## Graceful Shutdown

```ts
await connection.close(terminateWait?: number): Promise<void>
```

By default — `close()` called with no argument — the connection closes immediately: it rolls back any open
transaction, sends the socket a `Terminate` message, and closes it, without waiting for queries that might still be
in flight.

Passing `terminateWait` (milliseconds) makes the shutdown graceful: if the connection still has queries running,
`close()` polls every 50ms for up to `terminateWait` ms hoping they finish on their own. If they haven't finished by
the deadline, it emits `'terminate'` and then forces the socket closed anyway. If they finish before the deadline,
the socket is closed quietly and `'terminate'` is never emitted.

```ts
// Wait up to 5 seconds for running queries to finish, then force-close
await connection.close(5000);

// Close immediately, queries in flight or not (the default)
await connection.close();
// equivalent to:
await connection.close(0);
```

`terminateWait` is measured against how many operations are currently in flight on the connection (queries, copy
streams, prepare calls, etc.) — it has no effect if the connection is already idle, since there is nothing to wait
for.

## See Also

- [Connection Strings](./connection-strings.md)
- [Environment Variables](./environment-variables.md)
- [Connection Pooling](./pooling.md)
- [Multi-Host & Failover](./multi-host.md)
- [Resource Management](./resource-management.md)
- [API: Connection](../api/classes/connection.md)
