---
sidebar_position: 1
---

# tracingChannels

```ts
import { tracingChannels } from 'postgrejs';
```

The `node:diagnostics_channel` tracing channels postgrejs publishes on, since 3.15.0. Each value is
a Node `TracingChannel`, typed with the context it publishes; the same channel is also reachable by
name with `diagnosticsChannel.tracingChannel('postgrejs:query')` and so on. A subscriber gets
`start`, `end`, `asyncStart`, `asyncEnd` and `error` events with the same context object for one
operation. Nothing is published while a channel has no subscribers.

See the [Tracing Channels](../../observability/tracing-channels.md) guide for usage.

| Key                | Channel name                  | Context                                                           |
|--------------------|-------------------------------|-------------------------------------------------------------------|
| `query`            | `postgrejs:query`             | [`QueryTraceContext`](#querytracecontext)                         |
| `execute`          | `postgrejs:execute`           | [`ExecuteTraceContext`](#executetracecontext)                     |
| `prepare`          | `postgrejs:prepare`           | [`PrepareTraceContext`](#preparetracecontext)                     |
| `statementExecute` | `postgrejs:statement:execute` | [`StatementExecuteTraceContext`](#statementexecutetracecontext)   |
| `pipeline`         | `postgrejs:pipeline`          | [`PipelineTraceContext`](#pipelinetracecontext)                   |
| `cursorFetch`      | `postgrejs:cursor:fetch`      | [`CursorFetchTraceContext`](#cursorfetchtracecontext)             |
| `copy`             | `postgrejs:copy`              | [`CopyTraceContext`](#copytracecontext)                           |
| `poolAcquire`      | `postgrejs:pool:acquire`      | [`PoolAcquireTraceContext`](#poolacquiretracecontext)             |
| `connect`          | `postgrejs:connect`           | [`ConnectTraceContext`](#connecttracecontext)                     |

Every context below also has `error?: unknown`, set once the operation fails. Where a context has a
writable `sql`, a subscriber may replace it in `start` and postgrejs sends the replaced text — see
[Changing the SQL that is sent](../../observability/tracing-channels.md#changing-the-sql-that-is-sent).

## QueryTraceContext

Published on `postgrejs:query` for one [`Connection.query()`](../classes/connection.md#query), and
for `pool.query()` through the connection it lands on.

| Key        | Type                                               | Description                                                              |
|------------|----------------------------------------------------|--------------------------------------------------------------------------|
| sql        | `string`                                           | The statement as it will be sent. Writable in `start`                    |
| paramCount | `number`                                           | How many bind parameters it carries. Their values are not published      |
| connection | [`Connection`](../classes/connection.md)           | The connection that runs the statement                                   |
| result     | [`QueryResult`](../interfaces/query-result.md)     | Set once the query resolves                                              |

## ExecuteTraceContext

Published on `postgrejs:execute` for one [`Connection.execute()`](../classes/connection.md#execute)
(the Simple Query protocol, one or more statements in a script), and for each transaction command a
transaction method sends.

| Key        | Type                                                   | Description                                                                 |
|------------|--------------------------------------------------------|-----------------------------------------------------------------------------|
| sql        | `string`                                               | The script as it will be sent. Writable in `start`                          |
| connection | [`Connection`](../classes/connection.md)               | The connection that runs the script                                         |
| command    | [`TransactionCommand`](#transactioncommand)            | Set when a transaction method sent the script, to the command it is        |
| result     | [`ScriptResult`](../interfaces/script-result.md)       | Set once the script resolves                                                |

A transaction method publishes only when it sends something: a nested `startTransaction()` or
`commit()` that only moves the depth count publishes nothing. The `BEGIN` an `autoCommit: false`
statement opens for itself, and the savepoint `rollbackOnError` puts around a statement, are part of
that statement and are not published.

### TransactionCommand

```ts
type TransactionCommand =
  | 'BEGIN'
  | 'COMMIT'
  | 'ROLLBACK'
  | 'SAVEPOINT'
  | 'RELEASE SAVEPOINT'
  | 'ROLLBACK TO SAVEPOINT'
  | 'PREPARE TRANSACTION'
  | 'COMMIT PREPARED'
  | 'ROLLBACK PREPARED';
```

The commands postgrejs sends for `startTransaction()`, `commit()`, `rollback()`, the savepoint
methods and [two-phase commit](../../transactions/two-phase-commit.md).

## PrepareTraceContext

Published on `postgrejs:prepare` for one [`Connection.prepare()`](../classes/connection.md#prepare)
or `pool.prepare()` call: the `Parse`/`Describe` round trip that creates a prepared statement on the
server. `copyFromRows()` publishes here too when it looks up the columns of its table before the
COPY; `table` is set then, and `result` is not, since no prepared statement is left behind.

| Key            | Type                                                    | Description                                                                                                           |
|----------------|---------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| sql            | `string`                                                | The statement as it will be prepared. Writable in `start`; the replaced text is what every later execution runs |
| paramTypeCount | `number`                                                | How many parameter types the caller declared. The server may resolve more                                            |
| connection     | [`Connection`](../classes/connection.md)                | The connection the statement is prepared on                                                                           |
| table          | `string`                                                | The table whose columns `copyFromRows()` is looking up                                                                |
| result         | [`PreparedStatement`](../classes/prepared-statement.md) | The prepared statement, once the server has accepted it                                                              |

## StatementExecuteTraceContext

Published on `postgrejs:statement:execute` for one
[`execute()`](../classes/prepared-statement.md#execute) or
[`executeBatch()`](../classes/prepared-statement.md#executebatch) call on a prepared statement. A
statement that `Connection.query()` prepares and runs for itself, as it does for a cursor, is
published on `postgrejs:query` only.

| Key        | Type                                                                                              | Description                                                                                         |
|------------|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| sql        | `string`                                                                                          | The text the statement was prepared with. Read-only: an execution sends no statement text          |
| statement  | [`PreparedStatement`](../classes/prepared-statement.md)                                           | The prepared statement being run                                                                    |
| connection | [`Connection`](../classes/connection.md)                                                          | The connection the statement runs on                                                                |
| paramCount | `number`                                                                                          | How many bind parameters each execution carries: the length of the first set of a batch            |
| batchSize  | `number`                                                                                          | How many parameter sets an `executeBatch()` runs. Not set for `execute()`                          |
| result     | [`QueryResult`](../interfaces/query-result.md) \| [`BatchResult`](../interfaces/batch-result.md) | A `QueryResult` from `execute()`, a `BatchResult` from `executeBatch()`                             |

## PipelineTraceContext

Published on `postgrejs:pipeline` for one [`Connection.pipeline()`](../classes/connection.md#pipeline)
call: every statement sent before any reply is read, closed by a single `Sync`. When the server
rejects one, `error.failedIndex` says which.

| Key        | Type                                             | Description                                                                                              |
|------------|--------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| statements | `{ sql: string; paramCount: number }[]`          | The statements, in the order they are sent. Each `sql` is writable in `start`; parameter values are not published |
| connection | [`Connection`](../classes/connection.md)         | The connection that runs the pipeline                                                                    |
| result     | [`QueryResult[]`](../interfaces/query-result.md) | One result per statement, by position                                                                    |

## CursorFetchTraceContext

Published on `postgrejs:cursor:fetch` for each batch a [cursor](../classes/cursor.md) reads: one
`Execute` of the portal behind it, for up to `fetchCount` rows, and the decoding of the rows that
come back. The statement that opened the cursor is published on `postgrejs:query` or
`postgrejs:statement:execute`, and is over by the time the first batch is read.

| Key        | Type                                     | Description                                                     |
|------------|------------------------------------------|-----------------------------------------------------------------|
| sql        | `string`                                 | The statement the cursor reads the result of. Read-only         |
| connection | [`Connection`](../classes/connection.md) | The connection the cursor reads from                            |
| cursor     | [`Cursor`](../classes/cursor.md)         | The cursor reading the batch                                    |
| fetchCount | `number`                                 | How many rows were asked for                                    |
| rowCount   | `number`                                 | How many rows came back                                         |
| done       | `boolean`                                | `true` when no rows came back, so the cursor closed itself      |

## CopyTraceContext

Published on `postgrejs:copy` for one COPY, from [`copyTo()`](../classes/connection.md#copyto),
[`copyFrom()`](../classes/connection.md#copyfrom) or
[`copyFromRows()`](../classes/connection.md#copyfromrows). The operation lasts from the moment the
statement is sent until the server reports it finished, not until `copyTo()` or `copyFrom()`
resolves; those resolve as soon as the server accepts the copy. `rowCount` and `bytes` are set by the
time it ends, whether it succeeded or not.

| Key        | Type                                     | Description                                                                                                                  |
|------------|------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| sql        | `string`                                 | The COPY statement as it will be sent. Writable in `start`                                                                   |
| direction  | `'to' \| 'from'`                         | `to` for `COPY ... TO STDOUT`, `from` for `COPY ... FROM STDIN`                                                              |
| connection | [`Connection`](../classes/connection.md) | The connection that runs the copy                                                                                            |
| table      | `string`                                 | The destination table, when `copyFromRows()` was given one by name                                                           |
| rowCount   | `number`                                 | Rows the server reported for the copy                                                                                        |
| bytes      | `number`                                 | Bytes of `CopyData` sent or received                                                                                         |
| aborted    | `boolean`                                | `true` when a `copyTo()` stream was destroyed by its consumer before the end. The server still finishes the copy and its output is discarded, so this is not an error |

## PoolAcquireTraceContext

Published on `postgrejs:pool:acquire` while a caller waits for a connection from a
[pool](../classes/pool.md), including the time it takes to open a new one.

| Key    | Type                                     | Description                   |
|--------|------------------------------------------|-------------------------------|
| pool   | [`Pool`](../classes/pool.md)             | The pool being waited on      |
| result | [`Connection`](../classes/connection.md) | The connection handed out     |

## ConnectTraceContext

Published on `postgrejs:connect` while a new connection is opened: the socket, TLS, authentication
and the startup commands.

| Key       | Type                                                                        | Description                                                                                                                   |
|-----------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| config    | [`ConnectionConfiguration`](../interfaces/database-connection-params.md)    | The configuration being connected with. It includes the password, so don't log it as it is                                   |
| pool      | [`Pool`](../classes/pool.md)                                                | The pool opening the connection, when a pool is                                                                               |
| processID | `number`                                                                    | The server's backend process id, set once the connection is ready                                                            |
| host      | `string`                                                                    | The host connected to, set when the attempt ends: with several hosts configured, the one reached, or the last one tried if none was |
| port      | `number`                                                                    | The port of `host`                                                                                                            |
