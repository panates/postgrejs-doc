---
sidebar_position: 1
---

# Connection

Represents a single connection to a PostgreSQL server. A `Connection` can be created standalone (`new Connection(...)`) or obtained from a [Pool](./pool.md) via `pool.acquire()`. It implements `AsyncDisposable`, so it can be used with `await using`.

## Constructor

`new Connection(config?: ConnectionConfiguration | string)`

| Argument | Type                                                                              | Default | Description                                          |
|----------|------------------------------------------------------------------------------------|---------|-------------------------------------------------------|
| config   | [DatabaseConnectionParams](../interfaces/database-connection-params.md) \| `string` |         | Connection configuration object or a connection string |

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
```

:::note
A connection acquired from a `Pool` is constructed internally (`new Connection(pool, intlCon)`) and returned to you already wrapped — you never call that overload directly.
:::

## Properties

| Key               | Type                                                                | Readonly | Description                                             |
|-------------------|:---------------------------------------------------------------------|----------|-----------------------------------------------------------|
| config            | [DatabaseConnectionParams](../interfaces/database-connection-params.md) | true     | Returns the configuration object                          |
| inTransaction     | `boolean`                                                             | true     | Returns `true` if the connection is currently in a transaction |
| state             | `ConnectionState`                                                     | true     | Returns the current state of the connection                |
| processID         | `number \| undefined`                                                 | true     | Returns the process ID of the current session               |
| secretKey         | `number \| undefined`                                                 | true     | Returns the secret key of the current session (used for `cancel()`) |
| sessionParameters | `Record<string, string>`                                              | true     | Returns the `ParameterStatus` values reported by the server for the current session |
| runningQueryCount | `number`                                                              | true     | Returns the number of queries currently running on this connection |

## Methods

### connect()

Connects to the server.

`connect(): Promise<void>`

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
// ...
```

### close()

For a standalone connection this call closes the connection permanently. For a connection acquired from a `Pool`, it sends the connection back to the pool instead of closing the socket.

You can define how long the connection will wait for active queries before closing. At the end of that time, it forces the socket closed and emits the `terminate` event.

`close(terminateWait?: number): Promise<void>`

| Argument      | Type     | Default | Description                                                                     |
|---------------|----------|---------|-----------------------------------------------------------------------------------|
| terminateWait | `number` |         | Time in ms to wait for active queries to finish before forcing the connection closed |

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
connection.on('close', () => {
  console.log('Connection closed');
});
connection.on('terminate', () => {
  console.warn('Connection forced to terminate!');
});
// ...
await connection.close(30000); // will wait 30 secs before terminating the connection
```

`Connection` supports
the [TC39 Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) proposal, so it can be closed automatically.

```ts
import { Connection } from 'postgrejs';

{
  // connection will be automatically closed when this scope ends
  await using connection = new Connection('postgres://localhost');
  await connection.connect();
}
```

### execute()

Executes single or multiple SQL scripts
using the [Simple Query](https://www.postgresql.org/docs/current/protocol-flow.html#id-1.10.5.7.4) protocol.

`execute(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>`

| Argument | Type                                                           | Default | Description                        |
|----------|------------------------------------------------------------------|---------|---------------------------------------|
| sql      | `string`                                                          |         | SQL script that will be executed      |
| options  | [ScriptExecuteOptions](../interfaces/script-execute-options.md)  |         | Execute options                       |

- Returns [ScriptResult](../interfaces/script-result.md)

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const executeResult = await connection.execute(
    'BEGIN; update my_table set ref=1 where id=1; END;');
// ...
await connection.close();
```

### query()

Executes a single SQL script
using the [Extended Query](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY) protocol.

`query(sql: string, options?: QueryOptions): Promise<QueryResult>`

| Argument | Type                                          | Default | Description                      |
|----------|-------------------------------------------------|---------|-------------------------------------|
| sql      | `string`                                        |         | SQL script that will be executed    |
| options  | [QueryOptions](../interfaces/query-options.md)  |         | Query options                       |

- Returns [QueryResult](../interfaces/query-result.md)

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const queryResult = await connection.query(
    'select * from my_table', {
      cursor: true,
      objectRows: true
    });
let row;
while ((row = await queryResult.cursor.next())) {
  // ....
}
await connection.close();
```

### copyTo()

Runs a `COPY ... TO STDOUT` statement and returns its output as a stream of the raw bytes the server sends. Resolves as soon as the server accepts the copy, so a large export is never held in memory.

`copyTo(sql: string): Promise<CopyToStream>`

| Argument | Type     | Default | Description                     |
|----------|----------|---------|-------------------------------------|
| sql      | `string` |         | A `COPY ... TO STDOUT` statement   |

- Returns [CopyToStream](./copy-stream.md#copytostream)

```ts
import { Connection } from 'postgrejs';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const out = await connection.copyTo(`COPY users TO STDOUT (FORMAT csv)`);
await pipeline(out, fs.createWriteStream('users.csv'));
console.log(out.rowCount);
await connection.close();
```

### copyFrom()

Runs a `COPY ... FROM STDIN` statement and returns a stream to feed it. Whatever is written is forwarded verbatim, so the statement's own `FORMAT` decides the encoding.

`copyFrom(sql: string): Promise<CopyFromStream>`

| Argument | Type     | Default | Description                       |
|----------|----------|---------|---------------------------------------|
| sql      | `string` |         | A `COPY ... FROM STDIN` statement    |

- Returns [CopyFromStream](./copy-stream.md#copyfromstream)

```ts
import { Connection } from 'postgrejs';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const inp = await connection.copyFrom(`COPY users FROM STDIN (FORMAT csv)`);
await pipeline(fs.createReadStream('users.csv'), inp);
console.log(inp.rowCount);
await connection.close();
```

### prepare()

Creates a [PreparedStatement](./prepared-statement.md) instance.

`prepare(sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument | Type                                                                | Default | Description                        |
|----------|------------------------------------------------------------------------|---------|----------------------------------------|
| sql      | `string`                                                                |         | SQL script that will be executed       |
| options  | [StatementPrepareOptions](../interfaces/statement-prepare-options.md)  |         | Prepare options                        |

- Returns [PreparedStatement](./prepared-statement.md)

```ts
import { Connection, DataTypeOIDs } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const statement = await connection.prepare(
    'insert into my_table (ref_number) values ($1)', {
      paramTypes: [DataTypeOIDs.int4]
    });
// Bulk insert 100 rows
for (let i = 0; i < 100; i++) {
  await statement.execute({params: [i]});
}
await statement.close();
```

### createLargeObject()

Creates a large object and opens it for reading and writing. If the connection is not already in a transaction, one is started and committed by the returned object's `close()`.

`createLargeObject(mode?: number): Promise<LargeObject>`

| Argument | Type     | Default                     | Description                                       |
|----------|----------|------------------------------|-------------------------------------------------------|
| mode     | `number` | `LargeObjectMode.readWrite`  | Open mode, one of the `LargeObjectMode` constants     |

- Returns [LargeObject](./large-object.md)

```ts
import { Connection } from 'postgrejs';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const lo = await connection.createLargeObject();
await pipeline(fs.createReadStream('video.mp4'), lo.writable());
await lo.close();
await connection.query('insert into videos (video_oid) values ($1)', {params: [lo.oid]});
await connection.close();
```

### openLargeObject()

Opens an existing large object by its OID. Transaction handling is the same as `createLargeObject()`.

`openLargeObject(oid: number, mode?: number): Promise<LargeObject>`

| Argument | Type     | Default              | Description                                    |
|----------|----------|-----------------------|-----------------------------------------------------|
| oid      | `number` |                       | OID of an existing large object                     |
| mode     | `number` | `LargeObjectMode.read`| Open mode, one of the `LargeObjectMode` constants   |

- Returns [LargeObject](./large-object.md)

### unlinkLargeObject()

Deletes a large object and its data.

`unlinkLargeObject(oid: number): Promise<void>`

| Argument | Type     | Default | Description                     |
|----------|----------|---------|-------------------------------------|
| oid      | `number` |         | OID of the large object to delete   |

### cancel()

Asks the server to cancel whatever this connection is currently running. Travels on its own short-lived connection. It is a request, not a guarantee — the cancelled call rejects with SQLSTATE `57014` if the server acted on it. Prefer the per-call `signal` option of `query()`/`execute()`, which does this and reports the abort to the right caller.

`cancel(): Promise<void>`

### startTransaction()

Starts a transaction, or — if one is already open — marks a nested level of
it. Calls are reference-counted: only the outermost call (the one that
finds the connection not already in a transaction) actually sends `BEGIN`.
A matching number of [`commit()`](#commit) calls is then needed to actually
commit. See [Transactions & Savepoints](../../guides/transactions.md#reference-counting)
for the full explanation and a worked example.

`startTransaction(): Promise<void>`

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
    'update my_table set ref=1 where id=1');
// ...... commit or rollback
await connection.close();
```

### commit()

Commits the current transaction. Reference-counted against
[`startTransaction()`](#starttransaction): if more than one `startTransaction()`
call is still unmatched, this just unwinds one nesting level without
sending anything on the wire — the actual `COMMIT` is only sent once the
count reaches zero.

`commit(immediate?: boolean): Promise<void>`

| Argument  | Type      | Default | Description                                                        |
|-----------|-----------|---------|----------------------------------------------------------------------|
| immediate | `boolean` | `false` | When `true`, ignores the nesting count and commits right away, regardless of how many `startTransaction()` calls are still unmatched. |

```ts
await connection.startTransaction();
await connection.execute('update my_table set ref=1 where id=1');
await connection.commit();
```

### rollback()

Rolls back the current transaction. Unlike [`commit()`](#commit), this is
**not** reference-counted — it always ends the transaction outright
immediately, regardless of how many nested `startTransaction()` calls are
still open.

`rollback(): Promise<void>`

```ts
await connection.startTransaction();
await connection.execute('update my_table set ref=1 where id=1');
await connection.rollback();
```

### prepareTransaction()

Ends the current transaction as a prepared one, for two-phase commit. The transaction stops belonging to this session and waits under `name` until it is finished by `commitPrepared()` or `rollbackPrepared()` — which may run on another connection, in another process. Requires `max_prepared_transactions` to be set above zero on the server.

`prepareTransaction(name: string): Promise<void>`

| Argument | Type     | Default | Description                        |
|----------|----------|---------|-----------------------------------------|
| name     | `string` |         | Name to identify the prepared transaction |

```ts
await connection.startTransaction();
await connection.query('insert into t values (1)');
await connection.prepareTransaction('tx1');
// ...later, anywhere:
await otherConnection.commitPrepared('tx1');
```

### commitPrepared()

Commits a transaction left waiting by `prepareTransaction()`, by name. Runs outside any transaction and needs no connection to the session that prepared it.

`commitPrepared(name: string): Promise<void>`

| Argument | Type     | Default | Description                             |
|----------|----------|---------|---------------------------------------------|
| name     | `string` |         | Name of the previously prepared transaction |

### rollbackPrepared()

Discards a transaction left waiting by `prepareTransaction()`, by name.

`rollbackPrepared(name: string): Promise<void>`

| Argument | Type     | Default | Description                             |
|----------|----------|---------|---------------------------------------------|
| name     | `string` |         | Name of the previously prepared transaction |

### savepoint()

Starts a transaction (if not already in one) and creates a savepoint — or,
if a savepoint under the same `name` is already open, marks a nested level
of it. Only the outermost call for a given name actually sends `SAVEPOINT`;
see [releaseSavepoint()](#releasesavepoint).

`savepoint(name: string): Promise<void>`

| Argument | Type   | Default | Description           |
|----------|--------|---------|-----------------------|
| name     | `string` |       | Name of the savepoint |

```ts
await connection.savepoint('my_save_point');
const executeResult = await connection.execute(
    'update my_table set ref=1 where id=1');
await connection.rollbackToSavepoint('my_save_point');
```

### rollbackToSavepoint()

Rolls back the current transaction to the given savepoint. Like
[`rollback()`](#rollback), this is **not** reference-counted — regardless of
how many nested [`savepoint()`](#savepoint) calls are open for `name`, it
discards the savepoint (and everything done after it) outright and clears
that name's nesting count. A [`releaseSavepoint(name)`](#releasesavepoint)
call still pending further up the call stack is then not a safe no-op: it
will unconditionally send `RELEASE SAVEPOINT` again for a savepoint the
server no longer has, which the server rejects with an error.

`rollbackToSavepoint(name: string): Promise<void>`

| Argument | Type     | Default | Description           |
|----------|----------|---------|-----------------------|
| name     | `string` |         | Name of the savepoint |

### releaseSavepoint()

Releases (destroys) the given savepoint without rolling back the changes made since it was created. Reference-counted
per name against [`savepoint()`](#savepoint): only the call that unwinds the last remaining nested level for that
name actually sends `RELEASE SAVEPOINT`.

`releaseSavepoint(name: string, immediate?: boolean): Promise<void>`

| Argument  | Type      | Default | Description           |
|-----------|-----------|---------|-----------------------|
| name      | `string`  |         | Name of the savepoint |
| immediate | `boolean` | `false` | When `true`, ignores the nesting count for this name and releases right away. |

### listen()

Registers the connection as a listener on the given `NOTIFY` channel.

`listen(channel: string, callback: NotificationCallback): Promise<void>`

| Argument | Type                    | Default | Description                |
|----------|--------------------------|---------|---------------------------------|
| channel  | `string`                 |         | Name of the channel              |
| callback | `NotificationCallback`   |         | Listener callback function       |

```ts
await connection.listen('my_event', (msg) => {
  console.log(msg.channel + ' event fired!. processId:', msg.processId, '  payload:', msg.payload);
});
```

### unListen()

Removes the existing registration for `NOTIFY` events on the given channel.

`unListen(channel: string): Promise<void>`

| Argument | Type     | Default | Description         |
|----------|----------|---------|----------------------|
| channel  | `string` |         | Name of the channel  |

```ts
await connection.unListen('my_event');
```

### unListenAll()

Removes existing registration for `NOTIFY` events on all channels.

`unListenAll(): Promise<void>`

```ts
await connection.unListenAll();
```

### Symbol.asyncDispose()

Implements `AsyncDisposable`; calls `close()`. Lets a `Connection` be used with `await using`, as shown under `close()` above.

`[Symbol.asyncDispose](): Promise<void>`

## Events

### ready

Triggered once the connection has finished start-up (after `connect()` resolves any `search_path`/`timezone` setup statements).

`() => void`

### connecting

Triggered when the connection begins establishing its socket.

`() => void`

### close

Triggered after the connection's socket has closed.

`() => void`

### terminate

Triggered when `close(terminateWait)` forces the socket closed because active queries did not finish in time.

`() => void`

### release

Triggered when a pooled connection is returned to its `Pool` by `close()`. Never fires on a standalone connection.

`() => void`

### error

Triggered when an error occurs on an already-established (ready) connection.

`(err: Error) => void`

| Argument | Type    | Default | Description    |
|----------|---------|---------|-----------------|
| err      | `Error` |         | Error instance  |

### notification

Triggered when a notification is received on a channel this connection has `listen()`-ed to.

`(msg: NotificationMessage) => void`

| Argument | Type                    | Default | Description                    |
|----------|--------------------------|---------|----------------------------------|
| msg      | `NotificationMessage`   |         | Notification message instance    |

### execute

Triggered right before `execute()`, `copyTo()` or `copyFrom()` sends its SQL to the server.

`(sql: string, options?: ScriptExecuteOptions) => void`

| Argument | Type                                                              | Default | Description               |
|----------|----------------------------------------------------------------------|---------|--------------------------------|
| sql      | `string`                                                              |         | SQL that is about to be sent    |
| options  | [ScriptExecuteOptions](../interfaces/script-execute-options.md)      |         | Options passed to `execute()`   |

### query

Triggered right before `query()` sends its SQL to the server.

`(sql: string, options?: QueryOptions) => void`

| Argument | Type                                          | Default | Description               |
|----------|-------------------------------------------------|---------|--------------------------------|
| sql      | `string`                                         |         | SQL that is about to be sent    |
| options  | [QueryOptions](../interfaces/query-options.md)  |         | Options passed to `query()`     |

### debug

Triggered for internal protocol-level tracing (only computed while at least one listener is attached).

`(event: { location: string; message: string; sql?: string; [key: string]: any }) => void`

| Argument | Type     | Default | Description                                                  |
|----------|----------|---------|--------------------------------------------------------------------|
| event    | `object` |         | Debug payload; always has `location` and `message`, sometimes `sql` |
