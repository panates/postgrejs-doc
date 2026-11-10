---
sidebar_position: 1
slug: /guides/tracing-channels
---

# Tracing Channels

Since 3.15.0, postgrejs reports what it does on Node's
[`diagnostics_channel`](https://nodejs.org/api/diagnostics_channel.html): every query, script,
prepared statement, pipeline, cursor fetch, COPY, transaction command, pool acquire and connection
attempt, plus the pool's own activity. Any code in the process can subscribe and build logs, metrics
or traces from it. Nothing is patched, so it works the same whether postgrejs was loaded as ESM,
from CommonJS or through a bundler, and the order of imports doesn't matter.

For OpenTelemetry you don't have to write a subscriber yourself:
[`postgrejs-otel`](./opentelemetry.md) turns these channels into spans and metrics. This page is for
everything else: a slow-query log, your own metrics, a comment in front of every statement, or an
APM agent that consumes the channels directly.

Nothing is published, and nothing is allocated for it, while a channel has no subscribers.

## Subscribing

The channels are found by name, so a subscriber doesn't need to import postgrejs at all:

```ts
import diagnosticsChannel from 'node:diagnostics_channel';

diagnosticsChannel.tracingChannel('postgrejs:query').subscribe({
  start(ctx) {
    console.log('query', ctx.sql, ctx.paramCount);
  },
  asyncEnd(ctx) {
    console.log('rows', ctx.result?.rows?.length);
  },
  error(ctx) {
    console.log('failed', ctx.error);
  },
});
```

postgrejs also exports the same channel objects, typed with their context, as
[`tracingChannels`](../api/channels/tracing-channels.md) and
[`poolChannels`](../api/channels/pool-channels.md) (the API pages list each channel's key):

```ts
import { tracingChannels } from 'postgrejs';

tracingChannels.query.subscribe({
  start(ctx) {
    // ctx is a QueryTraceContext
  },
});
```

Each tracing channel is a Node `TracingChannel`. A subscriber can listen to any of its five events,
and all five receive the same context object for one operation:

| Event        | When                                                                     |
|:-------------|:-------------------------------------------------------------------------|
| `start`      | Before the operation begins. Statement text can still be changed here.  |
| `end`        | When the call returns its promise, before any result.                    |
| `asyncStart` | When the promise settles, before your code sees the result.              |
| `asyncEnd`   | After the promise settles, on success and on failure.                    |
| `error`      | When the operation fails, before `asyncEnd`. `ctx.error` holds the error. |

`result` is set on the context once the operation succeeds, `error` once it fails. An
`AsyncLocalStorage` bound to the `start` channel with `bindStore()` is active for the whole
operation, which is how a tracer keeps the operation's span current while it runs.

## The tracing channels

| Channel                       | Published for                                                                                     | Context                                                                                     |
|:------------------------------|:--------------------------------------------------------------------------------------------------|:--------------------------------------------------------------------------------------------|
| `postgrejs:query`             | one `query()`, on a connection or a pool                                                          | [`QueryTraceContext`](../api/channels/tracing-channels.md#querytracecontext)                 |
| `postgrejs:execute`           | one `execute()` (Simple Query, a whole script), and each transaction command                      | [`ExecuteTraceContext`](../api/channels/tracing-channels.md#executetracecontext)             |
| `postgrejs:prepare`           | one `prepare()`, and the column lookup of a `copyFromRows()`                                      | [`PrepareTraceContext`](../api/channels/tracing-channels.md#preparetracecontext)             |
| `postgrejs:statement:execute` | one `execute()` or `executeBatch()` of a prepared statement                                       | [`StatementExecuteTraceContext`](../api/channels/tracing-channels.md#statementexecutetracecontext) |
| `postgrejs:pipeline`          | one `pipeline()`, all of its statements                                                           | [`PipelineTraceContext`](../api/channels/tracing-channels.md#pipelinetracecontext)           |
| `postgrejs:cursor:fetch`      | each batch a cursor reads                                                                         | [`CursorFetchTraceContext`](../api/channels/tracing-channels.md#cursorfetchtracecontext)     |
| `postgrejs:copy`              | one `copyTo()`, `copyFrom()` or `copyFromRows()`                                                  | [`CopyTraceContext`](../api/channels/tracing-channels.md#copytracecontext)                   |
| `postgrejs:pool:acquire`      | the wait for a pooled connection, opening a new one included                                      | [`PoolAcquireTraceContext`](../api/channels/tracing-channels.md#poolacquiretracecontext)     |
| `postgrejs:connect`           | opening a connection: socket, TLS, authentication, startup                                        | [`ConnectTraceContext`](../api/channels/tracing-channels.md#connecttracecontext)             |

Parameter values are never published, only how many there are (`paramCount`). The `connect`
context does carry the connection configuration, password included, so don't log `ctx.config` as it
is.

### Queries and scripts

`pool.query()` and `pool.execute()` publish through the connection they land on, so a pooled query
shows up as a `postgrejs:pool:acquire` followed by a `postgrejs:query`, not as one event.

A `query()` that prepares a statement for itself, as it does to return a cursor, is published on
`postgrejs:query` only. The statement it prepares is part of that query.

### Transaction commands

The commands a transaction method sends, from `startTransaction()`, `commit()`, `rollback()`,
`transaction()`, the savepoint methods and [two-phase commit](../transactions/two-phase-commit.md),
are published on `postgrejs:execute` with `ctx.command` set to one of `BEGIN`, `COMMIT`,
`ROLLBACK`, `SAVEPOINT`, `RELEASE SAVEPOINT`, `ROLLBACK TO SAVEPOINT`, `PREPARE TRANSACTION`,
`COMMIT PREPARED` or `ROLLBACK PREPARED`.

A transaction method publishes only when it sends something. A nested `startTransaction()` or
`commit()` that only moves the depth count publishes nothing. The `BEGIN` that a statement run with
`autoCommit: false` opens for itself, and the savepoint that
[`rollbackOnError`](../transactions/transactions-and-savepoints.md#error-handling-rollbackonerror)
puts around a statement, travel with that statement and aren't published on their own.

### Prepared statements

`prepare()` publishes on `postgrejs:prepare` (the `Parse`/`Describe` round trip), and each
`execute()` or `executeBatch()` of the statement on `postgrejs:statement:execute`. A batch is one
event, with `batchSize` set to the number of parameter sets, since every set goes out in one round
trip.

`copyFromRows()` that isn't given its columns and their types first describes a query on the table
the same way. That lookup is published on `postgrejs:prepare` with `ctx.table` set, and with no
`result`, since no prepared statement is left behind.

### Pipelines

A [`pipeline()`](../querying/extended-query.md#multi-statement-pipelines) is one event for all of
its statements, which are sent together and answered together. `ctx.statements` lists each
statement's `sql` and `paramCount`. When the server rejects one, `ctx.error.failedIndex` says which,
counting from 0.

### Cursors

Opening a [cursor](../querying/cursors.md) reads no rows: the `query()` or prepared statement
execution that opens it is over before the first row arrives. Each batch the cursor then reads is
its own `postgrejs:cursor:fetch` event, asking for `fetchCount` rows and setting `rowCount` to how
many came back. The last one comes back empty and sets `done: true`, as the cursor closes itself.

### COPY

A COPY is published from the moment the statement is sent until the server reports it finished, not
until `copyTo()` or `copyFrom()` resolves. Those resolve as soon as the server accepts the copy, and
the data moves afterwards, so a consumer that reads a large export slowly keeps the operation open
for as long as it holds the server. `rowCount` and `bytes` are set by the time it ends, on failure
too. A `copyTo()` stream destroyed by its consumer before the end isn't an error: the server still
finishes the copy, its output is discarded, and `ctx.aborted` is `true`.

### Pool acquire and connect

`postgrejs:pool:acquire` covers the time a caller waits for a pooled connection, the wait a query
span alone would hide. When the pool has to open a new connection for it, that
`postgrejs:connect` happens inside the acquire. A caller that gives up after `acquireTimeoutMillis`
ends the acquire with an error.

`postgrejs:connect` sets `processID` once the connection is ready, and `host` and `port` when the
attempt ends. With [several hosts](../connecting/multi-host.md) configured, that's the one the
connection reached, or the last one tried if none was. The same values are on the connection
afterwards as `connection.host` and `connection.port`.

## Changing the SQL that is sent

A subscriber may replace `ctx.sql` in its `start` handler on `postgrejs:query`,
`postgrejs:execute`, `postgrejs:prepare` and `postgrejs:copy`, and each `ctx.statements[i].sql` on
`postgrejs:pipeline`. postgrejs then sends the replaced text. This is how a comment is put in front
of every statement for database monitoring:

```ts
import { tracingChannels } from 'postgrejs';

tracingChannels.query.subscribe({
  start(ctx) {
    ctx.sql = `/* app='billing' */ ${ctx.sql}`;
  },
});
```

The server then sees the comment in `pg_stat_activity` and in its logs. A few things follow from
changing the text:

- Error positions the server reports refer to the text it received, comment included.
- postgrejs reuses a [cached prepared statement](../querying/extended-query.md#automatic-statement-caching)
  only while the text stays the same. A fixed comment costs nothing, but one that changes on every
  call (a request id, a trace id) makes the server parse every query again.
- On `postgrejs:prepare`, the replaced text is what the statement is prepared with, and every later
  execution runs it. A comment added there is fixed for the statement's lifetime.
- `postgrejs:statement:execute` and `postgrejs:cursor:fetch` send no statement text, so their `sql`
  is only for reading.

A transaction command behind such a comment is still recognized as one: since 3.15.0, postgrejs
skips leading whitespace and comments when it decides whether a statement starts, ends or configures
a transaction.

## Pool channels

Pools also report on five plain (non-tracing) channels, for metrics on how full a pool is and how
long its connections are held:

| Channel                   | Published when                                                                 | Message                                                                       |
|:--------------------------|:-------------------------------------------------------------------------------|:------------------------------------------------------------------------------|
| `postgrejs:pool:create`   | a pool is constructed                                                          | [`PoolEventMessage`](../api/channels/pool-channels.md#pooleventmessage)       |
| `postgrejs:pool:close`    | a pool has closed                                                              | [`PoolEventMessage`](../api/channels/pool-channels.md#pooleventmessage)       |
| `postgrejs:pool:checkout` | a pooled connection is handed out, by `acquire()` or to a pipelined `pool.query()` | [`PoolCheckoutMessage`](../api/channels/pool-channels.md#poolcheckoutmessage) |
| `postgrejs:pool:checkin`  | it comes back                                                                  | [`PoolCheckoutMessage`](../api/channels/pool-channels.md#poolcheckoutmessage) |
| `postgrejs:pool:timeout`  | a caller gave up waiting, after `acquireTimeoutMillis`                         | [`PoolEventMessage`](../api/channels/pool-channels.md#pooleventmessage)       |

A checkout and the checkin that ends it carry the same `resource` object, so the time between them
is how long the connection was out of the pool:

```ts
import { poolChannels } from 'postgrejs';

const checkedOut = new WeakMap<object, number>();

poolChannels.checkout.subscribe(({ resource }) => {
  checkedOut.set(resource, performance.now());
});
poolChannels.checkin.subscribe(({ pool, resource }) => {
  const ms = performance.now() - checkedOut.get(resource)!;
  console.log(`held for ${ms.toFixed(1)} ms; ${pool.pendingAcquires} callers waiting`);
});
```

`resource` stands for the pooled connection but isn't a `Connection`; use it only as a key. For the
pool's current state at any moment, read its [properties](../connecting/pooling.md#pool-properties)
(`acquiredConnections`, `idleConnections`, `totalConnections`, `pendingAcquires`).

## Example: a slow-query log

```ts
import { tracingChannels } from 'postgrejs';

const SLOW_MS = 200;
const started = new WeakMap<object, number>();

for (const channel of [tracingChannels.query, tracingChannels.execute]) {
  channel.subscribe({
    start(ctx) {
      started.set(ctx, performance.now());
    },
    asyncEnd(ctx) {
      const ms = performance.now() - started.get(ctx)!;
      if (ms >= SLOW_MS) {
        const status = ctx.error ? 'failed' : 'ok';
        console.warn(`slow statement, ${ms.toFixed(0)} ms, ${status}: ${ctx.sql}`);
      }
    },
  });
}
```

`asyncEnd` fires whether the statement succeeded or not, so one handler sees both. The context
object itself is the key that ties `start` to `asyncEnd`, and a `WeakMap` lets it go once the
operation is over.

## Runtimes

The channels work wherever `node:diagnostics_channel` does: Node.js, and Bun, which implements
tracing channels too.

## See also

- [OpenTelemetry](./opentelemetry.md) — spans and metrics from these channels with `postgrejs-otel`
- [Tracing channels API](../api/channels/tracing-channels.md) and
  [pool channels API](../api/channels/pool-channels.md)
- [Connection Pooling](../connecting/pooling.md)
