---
sidebar_position: 2
---

# Pool

Manages a pool of pooled connections to a PostgreSQL server (built on top of [`lightning-pool`](https://www.npmjs.com/package/lightning-pool)). `Pool.query()`/`Pool.execute()` acquire a connection, run the statement, and release the connection back automatically — call [acquire()](#acquire) directly when you need to hold a connection across several statements (e.g. a transaction).

## Constructor

`new Pool(config?: PoolConfiguration | string)`

| Argument | Type                                                              | Default | Description                                       |
|----------|----------------------------------------------------------------------|---------|--------------------------------------------------------|
| config   | [PoolConfiguration](../interfaces/pool-configuration.md) \| `string` |         | Pool configuration object or a connection string        |

```ts
import { Pool } from 'postgrejs';

const pool = new Pool({
  host: 'localhost',
  database: 'my_database',
  max: 10,
});
```

## Properties

| Key                 | Type                                                     | Readonly | Description                                                             |
|---------------------|-------------------------------------------------------------|----------|-----------------------------------------------------------------------------|
| config              | [PoolConfiguration](../interfaces/pool-configuration.md)    | true     | Returns the pool's configuration object                                   |
| acquiredConnections | `number`                                                     | true     | Returns the number of connections that are currently acquired              |
| idleConnections     | `number`                                                     | true     | Returns the number of unused (idle) connections in the pool                |
| totalConnections    | `number`                                                     | true     | Returns the total number of connections in the pool, idle or in use        |

## Methods

### start()

Starts the pool. Not required to be called explicitly — the pool starts automatically the first time `acquire()` is called.

`start(): void`

### acquire()

Obtains a connection from the connection pool. The caller is responsible for calling `connection.close()` (or `release()`) when done with it.

`acquire(): Promise<Connection>`

- Returns [Connection](./connection.md)

```ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost/my_database');
const connection = await pool.acquire();
try {
  await connection.startTransaction();
  await connection.query('update my_table set ref=1 where id=1');
  await connection.commit();
} finally {
  await connection.close();
}
```

### release()

Releases an acquired connection back to the pool. Equivalent to calling `connection.close()` on a pooled connection.

`release(connection: Connection): Promise<void>`

| Argument   | Type                       | Default | Description                    |
|------------|------------------------------|---------|-------------------------------------|
| connection | [Connection](./connection.md) |         | The connection to release            |

### close()

Shuts down the pool and destroys all resources.

`close(terminateWait?: number): Promise<void>`

| Argument      | Type     | Default | Description                                                                  |
|---------------|----------|---------|----------------------------------------------------------------------------------|
| terminateWait | `number` | `10000` | Time in ms to wait for active queries per connection before forcing termination |

```ts
await pool.close();
```

### execute()

Acquires a connection, executes a script on it using the Simple Query protocol, and releases the connection.

`execute(sql: string, options?: PoolScriptExecuteOptions): Promise<ScriptResult>`

| Argument | Type                                                              | Default | Description                    |
|----------|------------------------------------------------------------------|---------|-------------------------------------|
| sql      | `string`                                                          |         | SQL script that will be executed     |
| options  | `PoolScriptExecuteOptions`                                        |         | [ScriptExecuteOptions](../interfaces/script-execute-options.md) plus `pipeline` |

- Returns [ScriptResult](../interfaces/script-result.md)

### query()

Acquires a connection, runs a query on it using the Extended Query protocol, and releases the connection (unless `cursor: true` is set, in which case the connection is held until the returned `Cursor` is closed).

`query(sql: string, options?: PoolQueryOptions): Promise<QueryResult>`

| Argument | Type                | Default | Description                    |
|----------|----------------------|---------|-------------------------------------|
| sql      | `string`             |         | SQL script that will be executed     |
| options  | `PoolQueryOptions`   |         | [QueryOptions](../interfaces/query-options.md) plus `pipeline` |

- Returns [QueryResult](../interfaces/query-result.md)

```ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost/my_database');
const result = await pool.query('select * from my_table where id=$1', {
  params: [1],
});
console.log(result.rows);
```

`PoolQueryOptions` and `PoolScriptExecuteOptions` add one option on top of the connection-level options:

| Property | Type      | Default | Description                                                                                                                                                                     |
|----------|-----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| pipeline | `boolean` | `false` | When `true`, lets this one-shot call share an in-flight pooled connection with other pipelined calls instead of acquiring one exclusively — subject to the pool's `pipelineMaxQueries`/`pipelineMaxConnections`. Ignored for statements that start a transaction or a `COPY`, and for `query()` when `cursor: true` is set. |

### prepare()

Acquires a connection and creates a [PreparedStatement](./prepared-statement.md) on it. The connection is held until the statement is closed, and is released back to the pool automatically when `statement.close()` is called.

`prepare(sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument | Type                                                                   | Default | Description                      |
|----------|-------------------------------------------------------------------------|---------|---------------------------------------|
| sql      | `string`                                                                 |         | SQL script that will be executed       |
| options  | [StatementPrepareOptions](../interfaces/statement-prepare-options.md)   |         | Prepare options                        |

- Returns [PreparedStatement](./prepared-statement.md)

### listen()

Registers a listener on the given `NOTIFY` channel. The pool keeps one dedicated connection open for all of its listened channels, reconnecting (and re-issuing `LISTEN`) automatically if that connection drops.

`listen(channel: string, callback: NotificationCallback): Promise<void>`

| Argument | Type                   | Default | Description               |
|----------|-------------------------|---------|--------------------------------|
| channel  | `string`                |         | Name of the channel             |
| callback | `NotificationCallback` |         | Listener callback function      |

```ts
await pool.listen('my_event', (msg) => {
  console.log(msg.channel, msg.payload);
});
```

### unListen()

Removes the existing registration for `NOTIFY` events on the given channel.

`unListen(channel: string): Promise<void>`

| Argument | Type     | Default | Description         |
|----------|----------|---------|----------------------|
| channel  | `string` |         | Name of the channel  |

### unListenAll()

Removes existing registration for `NOTIFY` events on all channels, and closes the pool's dedicated notification connection.

`unListenAll(): Promise<void>`

## Events

### acquire

Triggered when a connection is acquired from the pool (forwarded from the underlying `lightning-pool` instance). The argument is the pool's internal connection resource, not the public [Connection](./connection.md) instance handed back by `acquire()`.

`(resource: object) => void`

### release

Triggered when an acquired connection is returned to the pool (forwarded from the underlying pool's `return` event). Same internal-resource argument as `acquire`.

`(resource: object) => void`

### destroy

Triggered when a connection is destroyed and removed from the pool. Same internal-resource argument as `acquire`.

`(resource: object) => void`

### error

Triggered when the pool fails to create a new connection (e.g. during `acquire()`'s retry loop).

`(err: Error, info: { requestTime: number; tries: number; maxRetries: number }) => void`

| Argument | Type     | Default | Description                                              |
|----------|----------|---------|---------------------------------------------------------------|
| err      | `Error`  |         | The error that occurred while creating the connection          |
| info     | `object` |         | `requestTime`, the attempt count so far, and the configured max retries |

### debug

Forwarded from any connection acquired after this event already had a listener attached on the pool — see [Connection's `debug` event](./connection.md#debug). Because the forwarding is wired up at `acquire()` time, a listener added after a connection was acquired misses that connection's debug events.

`(event: { location: string; message: string; sql?: string; [key: string]: any }) => void`

### execute

Forwarded from any connection acquired after this event already had a listener attached on the pool — see [Connection's `execute` event](./connection.md#execute). Same acquire-time-only caveat as `debug`.

`(sql: string, options?: ScriptExecuteOptions) => void`

### query

Forwarded from any connection acquired after this event already had a listener attached on the pool — see [Connection's `query` event](./connection.md#query). Same acquire-time-only caveat as `debug`.

`(sql: string, options?: QueryOptions) => void`
