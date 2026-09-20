---
sidebar_position: 2
---

# Features

## Library Overview

- **Language** — Pure JavaScript, with no native/binary dependencies to compile or ship.
- **Strictly typed** — Written entirely in TypeScript, with types shipped alongside the package.
- **Modern module format** — Ships as ESM; Node 20.19+/22.12+ can `require()` it from CommonJS code as well.
- **Promise-based API** — Every asynchronous operation returns a promise, no callbacks to wrangle.
- **Rigorously tested** — A test suite covering the wire protocol, every data type, and connection-handling edge case, run on every push against PostgreSQL 12 through 18.

## Features

- **Connection Management** — Supports both single connection and advanced pooling, providing scalability and efficient resource management. See [Single Connection](../connecting/single-connection.md) and [Connection Pooling](../connecting/pooling.md).
- **Binary Wire Protocol** — Implements the full binary wire protocol for all PostgreSQL data types, ensuring robust and efficient data handling. See [Data Types & Type Mapping](../querying/data-types.md).
- **Prepared Statements** — Named prepared statements for optimized query execution, plus a per-connection cache that reuses one automatically for SQL the connection has run before — a repeated query costs `Bind`/`Execute` instead of parsing again, worth 3.2x on fifty concurrent calls and 2.9x again on a query inside an open transaction. On by default, `prepare: false` to opt out. See [Prepared Statements](../querying/prepared-statements.md) and [Extended Query: Automatic Statement Caching](../querying/extended-query.md#automatic-statement-caching).
- **Statement-Level Rollback** — Inside a transaction, each statement runs under a savepoint of its own by default, so a failed statement leaves the transaction usable instead of aborting the whole block — and the `SAVEPOINT`/`RELEASE` pair rides in the statement's own round trip rather than costing one each. `rollbackOnError: false` to opt out. See [Transactions & Savepoints](../transactions/transactions-and-savepoints.md#error-handling-rollbackonerror).
- **Scoped Transactions** — `transaction(fn)` commits when the callback returns and rolls back when it throws, on a connection or straight from the pool; a nested call takes a savepoint instead of a second `BEGIN`. See [Scoped Transactions](../transactions/transactions-and-savepoints.md#scoped-transactions-transactionfn).
- **Complete Results** — `query()` returns every row a statement produces by default. An explicit `fetchCount` is a real limit rather than a silent cap: the result carries `suspended: true` when the server stopped there, so a prefix is never mistaken for the whole answer. See [`fetchCount` and suspended results](../querying/extended-query.md#fetchcount-and-suspended-results).
- **Cursors** — Fast double-linked cache cursors for efficient data retrieval, iterable a row at a time with `for await` and closed automatically when the loop ends. See [Cursors](../querying/cursors.md).
- **Batch Execution** — `executeBatch()` runs one prepared statement over many parameter sets under a single `Sync`, reporting each set's row count — 1000 updates in 20ms where the same calls pipelined individually take 188ms. See [Prepared Statements](../querying/prepared-statements.md#batch-execution).
- **Notifications** — High-level implementation for PostgreSQL notifications (LISTEN/NOTIFY), enabling real-time data updates. Channel names are quoted and case-folded to match what the server actually delivers, rather than restricted to a pattern. See [Notifications](../realtime/notifications.md).
- **Values as Text** — `fetchAsString` asks the server for specific columns in its own text format and hands the bytes back unparsed — any OID, exact and never reconstructed from a decoded value. See [Fetching as String](../querying/data-types.md#fetching-as-string).
- **Extensibility** — Extensible data types and type mapping to accommodate custom requirements; a type can opt out of parameter type inference with `inferrable: false` while still decoding its own columns. See [Data Types & Type Mapping](../querying/data-types.md).
- **Parameter Binding** — Bind parameters with OID mappings for precise and efficient query execution. See [Query Parameters](../querying/query-parameters.md).
- **Array Handling** — Supports multidimensional arrays with fast binary encoding/decoding.
- **Performance Optimization** — Low memory utilization and boosted performance through the use of shared buffers. See [Benchmarks](./benchmarks.md).
- **Authorization** — Supports various password algorithms including cleartext, MD5, and SASL (SCRAM-SHA-256), ensuring secure authentication. See [SSL/TLS & Authentication](../connecting/ssl-tls.md).
- **Bulk Import/Export** — `COPY TO STDOUT` and `COPY FROM STDIN` as Node streams, with backpressure in both directions, plus `copyFromRows()`, which encodes rows straight into binary `COPY` — around 4x faster than the CSV equivalent and no text escaping to get wrong. Takes arrays or objects from anything iterable, so a file larger than memory streams in. See [COPY TO / COPY FROM](../bulk-data/copy.md).
- **Query Pipelining** — Pooled queries can share connections so a burst isn't capped by pool size, opt-in per call. `pipeline()` goes further for a known set of statements: several different ones travel under a single `Sync`, so they cost one round trip instead of one each and commit or roll back together — around 2x faster than the same calls through `Promise.all()`, which is already pipelined. Statements the connection has run before bind to their cached prepared names, so a repeated set sends no `Parse` at all — worth 2.5x on twenty statements. See [Connection Pooling](../connecting/pooling.md#pipelining) and [Extended Query: Multi-Statement Pipelines](../querying/extended-query.md#multi-statement-pipelines).
- **Dynamic SQL** — A `sql` tag builds statements from composable fragments: values become parameters, names are quoted, and `sql.values()`/`sql.set()` write INSERT and UPDATE clauses from objects. See [The sql Template Tag](../querying/sql-tag.md).
- **Multiple Hosts** — A connection can list several servers and pick one by role (`targetSessionAttrs`), so a cluster that has failed over is found on the next connect. See [Multi-Host & Failover](../connecting/multi-host.md).
- **Large Objects** — File-like access to binary data stored outside the row: seek, partial reads, streams, for values past what a `bytea` column can hold. See [Large Objects](../bulk-data/large-objects.md).
- **Logical Replication** — `LogicalReplication` streams committed row changes as an async iterable, decoding `pgoutput` itself, with client-side filtering and positions confirmed as you consume. See [Logical Replication](../bulk-data/logical-replication.md).
- **Channel Binding** — SCRAM authentication binds itself to the TLS channel when the server offers it, the way libpq does by default, so a relayed login is detected even where the certificate isn't verified. See [SSL/TLS & Authentication](../connecting/ssl-tls.md).
- **Two-Phase Commit** — `prepareTransaction()` leaves a transaction waiting under a name for `commitPrepared()`/`rollbackPrepared()`, from any connection. See [Two-Phase Commit](../transactions/two-phase-commit.md).
- **Cancellation** — Any call takes an `AbortSignal`, which also gives per-query timeouts via `AbortSignal.timeout()`. See [Cancellation & Timeouts](../reliability/cancellation.md).
- **Flexible Data Retrieval** — Can return both array and object rows to suit different data processing needs.
- **Resource Management** — Auto disposal of resources with the `using` syntax ([TC39 Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)), ensuring efficient resource cleanup. See [Resource Management](../reliability/resource-management.md).
- **Long Cancel Key** — Opt in to protocol 3.2 (PostgreSQL 18+) with `longCancelKey`, so a `cancel()` in progress can't be forged by an attacker guessing a short secret key. See [Cancellation & Timeouts](../reliability/cancellation.md#long-cancellation-keys-postgresql-18).
- **Legacy Function Call Protocol** — `callFunction()` calls a function by OID directly over the wire, bypassing SQL entirely, kept for protocol completeness even though `SELECT func(...)` covers the same ground. See [Function Call Protocol](../realtime/function-call.md).
- **Graceful Protocol Renegotiation** — A server that doesn't recognize a requested protocol version or startup option reports back instead of erroring out, surfaced on `Connection.protocolNegotiation`. See [Cancellation & Timeouts](../reliability/cancellation.md#long-cancellation-keys-postgresql-18).

## Feature Comparison

How postgrejs compares to [`pg`](https://github.com/brianc/node-postgres) (node-postgres) and [`postgres`](https://github.com/porsager/postgres) (postgres.js) — versions compared: **postgrejs 3.6.0, pg 8.23.0, postgres.js 3.4.9**. ✅ built in · 🟡 partial or needs a separate package · ❌ not supported.

| Feature | postgrejs | pg | postgres.js |
|:---|:---:|:---:|:---:|
| ***Packaging*** | | | |
| Packages to install | 1 | 4 | 1 |
| Module system | ESM | ESM/CJS | ESM/CJS |
| Language | TS | JS | JS |
| ***Wire protocol*** | | | |
| Protocol version | 3.2 | 3.0 | 3.0 |
| Simple Query protocol | ✅ | ✅ | ✅ |
| Extended Query protocol | ✅ | ✅ | ✅ |
| Text wire format | ✅ | ✅ | ✅ |
| Binary wire format | ✅ | 🟡 | ❌ |
| Per-column format selection | ✅ | ❌ | ❌ |
| Long cancel key (opt-in) | ✅ | ❌ | ❌ |
| Legacy Function Call protocol | ✅ | ❌ | ❌ |
| Graceful protocol renegotiation | ✅ | ❌ | ❌ |
| ***High-level API*** | | | |
| Object and array row modes | ✅ | ✅ | ✅ |
| Dynamic SQL helpers | ✅ `sql` tag | ❌ | ✅ |
| Per-query type mapping | ✅ | ❌ | ❌ |
| Query cancellation | ✅ AbortSignal | ✅ | ✅ |
| Per-query timeout | ✅ AbortSignal | ✅ | ❌ |
| Reference counters | Connection · Statement | ❌ | ❌ |
| Caller kept in async error stacks | ✅ | 🟡 | 🟡 |
| Error located in the SQL text | ✅ line and mark | 🟡 offset | 🟡 offset |
| TC39 Explicit Resource Management | ✅ | ❌ | ❌ |
| ***Querying*** | | | |
| Query parameters | ✅ | ✅ | ✅ |
| Parameter type casting | ✅ | 🟡 | ✅ |
| Prepared statements | ✅ automatic | ✅ manual | ✅ automatic |
| Batch execution | ✅ | ❌ | ❌ |
| Multi-statement round trip | ✅ | ❌ | ❌ |
| Multi-statement scripts | ✅ | ✅ | ✅ |
| Server-side cursors | ✅ | 🟡 | ✅ |
| `COPY TO` / `COPY FROM` | ✅ | 🟡 | ✅ |
| Binary COPY encoding | ✅ | ❌ | ❌ |
| Row count after a COPY | ✅ | ✅ | ❌ |
| ***Transaction management*** | | | |
| Transaction API | ✅ | ❌ | ✅ |
| Savepoints | ✅ | ❌ | ✅ |
| Statement-level rollback | ✅ automatic | ❌ | 🟡 manual |
| Scoped transaction helper | ✅ nests | ❌ | ✅ |
| Two-phase commit API | ✅ | ❌ | 🟡 |
| ***Session management*** | | | |
| Built-in connection pool | ✅ | ✅ | ✅ implicit |
| Pipelining on one connection | ✅ opt-in/call | ✅ opt-in/client | ✅ automatic |
| Graceful shutdown | ✅ | ❌ | ✅ |
| Multiple hosts | ✅ | ❌ | ✅ |
| LISTEN/NOTIFY | ✅ | 🟡 | ✅ |
| ***Data types*** | | | |
| Text encoders | 56 | generic | 14 |
| Text decoders | 56 | 44 | 12 |
| Binary encoders | 56 | ❌ | ❌ |
| Binary decoders | 56 | 16 | ❌ |
| Multidimensional arrays | ✅ binary | 🟡 text | 🟡 text |
| ***Security*** | | | |
| SSL/TLS | ✅ | ✅ | ✅ |
| Direct TLS negotiation (PG17) | ✅ | ✅ | ✅ |
| Cleartext, MD5, SCRAM-SHA-256 | ✅ | ✅ | ✅ |
| SCRAM channel binding (`-PLUS`) | ✅ default | ✅ opt-in | ❌ |
| ***Beyond querying*** | | | |
| Logical replication | ✅ | 🟡 | ✅ |
| Large object API | ✅ | ❌ | ✅ |
| Native libpq bindings | ❌ | 🟡 | ❌ |

Every row was checked against each library's own source rather than its documentation. For the full footnotes explaining each 🟡/❌ (e.g. exactly what `pg`'s binary decoder is missing, or why postgres.js has no per-query timeout), see the [Feature Comparison section of the postgrejs README](https://github.com/panates/postgrejs#feature-comparison).

For real-world performance numbers backing up "Performance Optimization" above, see [Benchmarks](./benchmarks.md).
