---
sidebar_position: 1
---

# Introduction

**postgrejs** is a PostgreSQL driver for Node.js built from the wire protocol up: no `libpq`, no native
bindings, just strictly-typed TypeScript talking directly to PostgreSQL. It ships as ESM (Node 20.19+/22.12+
can also `require()` it from CommonJS code), exposes a fully promise-based API, and covers everything from a
single connection to pooling, cursors, COPY streams, logical replication and two-phase commit in one package.

## Features

- **Connection management** — single `Connection` for scripts, `Pool` for concurrent workloads.
- **Full binary wire protocol** for every supported data type, with per-column format selection (text or binary).
- **Prepared statements** — explicit, named, reusable across executions.
- **Server-side cursors** for streaming large result sets without buffering everything in memory.
- **LISTEN/NOTIFY** with a high-level notification API.
- **Extensible type mapping** via `DataTypeMap`/`GlobalTypeMap` for custom or overridden data types.
- **Parameter binding** by OID through `BindParam`, for precise, efficient query execution.
- **Multidimensional array support** with fast binary encoding/decoding.
- **Authentication** — cleartext, MD5, and SCRAM-SHA-256, including channel binding (`-PLUS`).
- **Bulk import/export** — `COPY TO STDOUT` / `COPY FROM STDIN` as Node streams, with backpressure.
- **Query pipelining** — opt-in per call, so a burst of pooled queries isn't capped by pool size.
- **`sql` template tag** for composable, parameterized SQL.
- **Multi-host connections** with `targetSessionAttrs` failover across a cluster.
- **Large objects** — file-like access to binary data stored outside the row.
- **Logical replication** — consume `pgoutput` changes as an async iterable.
- **Two-phase commit** — `prepareTransaction()` / `commitPrepared()` / `rollbackPrepared()`.
- **Cancellation** — every call accepts an `AbortSignal`, including per-query timeouts via `AbortSignal.timeout()`.
- **Object or array row modes** to suit different data processing needs.
- **TC39 Explicit Resource Management** — `using`/`await using` for automatic connection and statement cleanup.

## Why no native bindings

postgrejs implements the PostgreSQL wire protocol entirely in TypeScript, so there's no `libpq`, no
`node-gyp`, and no native build step to install or ship. It's also not a tradeoff made for convenience:
libpq-native drivers that swap in native bindings for speed can lose features in the process — cursors,
row streaming, and COPY support are known to become incompatible once the pure-JS protocol layer is
replaced. postgrejs never has to make that choice.

## Installation

```bash
npm install postgrejs
```

## Quick Example

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost/mydb');
await connection.connect();

const result = await connection.query(
  'select * from cities where name like $1',
  { params: ['%york%'] },
);
console.log(result.rows);

await connection.close();
```

See [Getting Started](getting-started/installation.md) for setup details, [Features](getting-started/features.md)
for the full feature list and comparison against `pg`/`postgres.js`, and the [Guides](guides/single-connection.md) for
connection pooling, cursors, transactions, and more.

## Node.js Compatibility

`node >= 20.x` (see the package's `engines` field).

## License

postgrejs is available under the [BSD-3-Clause](license.md) license.
