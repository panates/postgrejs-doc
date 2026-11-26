---
sidebar_position: 3
title: Knex
hide_title: true
---

import IntegrationLogo from '@site/src/components/IntegrationLogo';

<IntegrationLogo alt="Knex.js" light="/img/knex-full-light.svg" dark="/img/knex-full-dark.svg" />

# Knex

[`knex-postgrejs`](https://github.com/panates/postgrejs-knex) is a [Knex](https://knexjs.org)
client for `postgrejs`. It is maintained alongside `postgrejs` rather than by the Knex project —
Knex's own extension point for this is a client, and this is one. Put it where `client: 'pg'` goes
and everything above it stays the same: your queries, your migrations, your seeds, and any
[Objection](https://vincit.github.io/objection.js/) models on top of them.

The client subclasses Knex's PostgreSQL client and replaces only the methods that open connections,
run statements and stream rows. The SQL — the query compiler, the schema and table compilers, the
`$n` placeholder rewriting, the transaction class — is still Knex's own, so it speaks whatever
PostgreSQL dialect the installed Knex speaks and keeps tracking its releases.

## Installation

```bash
npm install knex-postgrejs knex postgrejs
```

`knex` (`>=3.0.1 <4`) and `postgrejs` (`>=3.15.0 <4`) are peer dependencies. Node `>=22`,
PostgreSQL 14 or later — 16 and 18 are what CI runs.

Nothing in the package imports `pg` or `pg-query-stream`, so both can be uninstalled.

## Quick start

```ts
import knex from 'knex';
import { PostgrejsClient } from 'knex-postgrejs';

const db = knex({
  client: PostgrejsClient,
  connection: 'postgres://localhost:5432/mydb',
});

await db('users').where('active', true).select('id', 'name');
```

That is the whole change.

## Usage

### Connecting

`connection` takes a connection string, an object, or a function returning either. The familiar
`pg` spellings work, and anything the client does not recognize is passed through to `postgrejs`,
so a PostgreJS-only setting goes in the same object:

```ts
const db = knex({
  client: PostgrejsClient,
  connection: {
    host: 'localhost',
    database: 'mydb',
    user: 'app',
    password: process.env.PGPASSWORD,
    hosts: [{ host: 'replica-1' }, { host: 'replica-2' }],
    targetSessionAttrs: 'read-write',
    channelBinding: 'require',
  },
  pool: { min: 2, max: 10 },
});
```

`hosts` and `targetSessionAttrs` are how a connection finds the current primary after a failover
(see [Multi-host](../connecting/multi-host.md)). `schema`, `timezone`, `keepAlive`,
`sslNegotiation`, `preparedStatementCacheSize` and `asyncErrorHandling` are available in the same
place — everything a PostgreJS
[`Connection`](../api/interfaces/database-connection-params.md) takes.

Knex's own version check costs nothing here. PostgreSQL sends `server_version` as a startup
parameter and `postgrejs` keeps it, where Knex's `pg` client spends a round trip on
`select version()` for every pool.

### A pool your application already owns

Knex pools connections itself, with tarn, and that is the default. If a `postgrejs`
[`Pool`](../api/classes/pool.md) already exists in the process, hand Knex that instead:

```ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost:5432/mydb');
const db = knex({ client: PostgrejsClient, connectionPool: pool });
```

Knex borrows connections from it and never closes it; `db.destroy()` leaves the pool to you. This
needs Knex 3.3 or later, where `connectionPool` was added.

### Streaming

`.stream()` and `.pipe()` run over a [server-side cursor](../querying/cursors.md) rather than
`pg-query-stream`:

```ts
for await (const row of db('events').stream({ batchSize: 500 })) {
  // 500 rows per round trip, and never more than that in memory
}
```

`batchSize` is how many rows one round trip fetches, `highWaterMark` how many the readable side
buffers, and `rowMode: 'array'` hands each row back as an array of values. Breaking out of the loop
closes the cursor and releases the connection.

### Cancelling a query

```ts
await db('events').select('*').timeout(1000, { cancel: true });
```

PostgreSQL's cancel request travels on a connection of its own, which `postgrejs` opens for exactly
this. Knex's `pg` client instead takes a second connection out of the pool, runs
`pg_cancel_backend()` on it and closes it again, so a timeout here costs one short-lived connection
rather than two, and never waits on a full pool. See
[Cancellation](../reliability/cancellation.md).

### Reaching the driver underneath

The connection Knex hands you is a `postgrejs` `Connection`, so everything Knex has no way to ask
for is reachable through it — [`COPY`](../bulk-data/copy.md),
[`LISTEN`/`NOTIFY`](../realtime/notifications.md),
[large objects](../bulk-data/large-objects.md),
[logical replication](../bulk-data/logical-replication.md):

```ts
const connection = await db.client.acquireConnection();
try {
  await connection.listen('order_placed', msg => console.log(msg.payload));
} finally {
  await db.client.releaseConnection(connection);
}
```

### Options

Everything this client adds goes under one key:

```ts
knex({
  client: PostgrejsClient,
  connection: '…',
  postgrejs: { prepare: false },
});
```

| Option | Default | What it does |
|:---|:---|:---|
| `decoding` | `'native'` | `'pg'` asks for the narrower set of types the older driver produces — see [What changes when you switch](#what-changes-when-you-switch) |
| `inferParameterTypes` | `true` | Whether each parameter's type is left to the server to resolve from where its placeholder appears |
| `normalizeErrors` | `true` | Strips the caret diagram from an error's `message` and reports `position` as a string |
| `rollbackOnError` | `false` | PostgreSQL's own rule: a failed statement aborts the transaction |
| `prepare` | connection's own | `false` turns off the per-connection prepared statement cache |
| `typeMap` | `GlobalTypeMap` | A [`DataTypeMap`](../api/classes/data-type-map.md), to change how one type is decoded |
| `fetchAsString` | | Further OIDs to have the server render as text |

Three are worth a sentence beyond the table.

#### Parameters take their type from where they appear

`inferParameterTypes` leaves each parameter untyped on the wire, so PostgreSQL resolves it from
where the placeholder appears. That is what makes `where('meta', { role: 'eng' })` match a `jsonb`
column and `where('reference', 42)` match a `text` one — which is what every piece of Knex code in
existence was written against, because it is what `pg` does.

The cost is the one `pg` already pays: a parameter with no context at all resolves to `text`, so
`db.raw('select ?', [5])` answers `'5'`.

```ts
await db.raw('select ?', [5]); // '5'
await db.raw('select ? + 1', [5]); // 6 — the context decides
```

Turning it off hands every value to `postgrejs` to type from the value itself, keeping its binary
encoders in play. That is stricter than most Knex code expects, and it is the same trade
[strings and Dates pay generally](../querying/query-parameters.md#strings-dates-and-numeric-arrays-go-out-unspecified).

#### PostgreSQL's own transaction semantics

`rollbackOnError` defaults to PostgreSQL's own behaviour, which is what Knex — and `pg` under
it — has always given: a failed statement aborts the transaction and nothing but a rollback is
accepted after it. `postgrejs` defaults the other way, wrapping each statement in a savepoint of
its own; `true` opts into that.

#### Prepared statements and PgBouncer

`prepare` follows the connection's own setting unless you set it. `false` is what PgBouncer in
transaction pooling mode needs before 1.21, where a named statement does not survive to the next
call.

## Objection

Objection depends on Knex alone, so there is nothing else to configure:

```ts
import { Model } from 'objection';
import knex from 'knex';
import { PostgrejsClient } from 'knex-postgrejs';

Model.knex(knex({ client: PostgrejsClient, connection: '…' }));
```

## Tested against Knex's own suite

`scripts/run-knex-suite.sh` checks Knex out at a known version, points its `postgres` variant at
this client and runs the whole thing on Knex's own database. On Knex 3.3.0 it passes **all 494 of
them, with 56 pending** — the full count that suite scores. A weekly workflow runs the same thing,
to notice a change in Knex rather than in this repository.

It runs in `decoding: 'pg'`, because the suite's assertions spell out the JavaScript types the
older driver produces. What the suite is there to check is the SQL and the behaviour; which type a
`bigint` decodes to is this package's own question, and its own tests answer it.

## What changes when you switch

Everything above the driver is Knex's own code, so the SQL, the migrations and the query builder
are unchanged. What differs is what the client underneath makes of a value on its way back, and two
details of what a raw query reports.

### Values

`pg` hands back a narrow set of JavaScript types, flattening anything that does not fit a `number`
into a string. `postgrejs` keeps the value:

| Column | Knex + `pg` | `knex-postgrejs` |
|:---|:---|:---|
| `int8`, so `count` and `sum` | `'15'` | `15`, and a `BigInt` past 2^53 |
| `numeric` | `'12.34'` | `12.34`, and a [`Numeric`](../api/classes/numeric.md) when precision asks |
| `money` | `'$12.34'` | `12.34` |
| `int4range` and the rest of the family | `'[1,5)'` | a [`Range`](../api/classes/range.md) |
| `point`, `circle` | plain objects | `Point`, `Circle` — same fields |
| `interval` | `PostgresInterval` | an [`Interval`](../api/classes/interval.md) — same seven fields |

`date`, `timestamptz`, `bytea`, `json`, `jsonb`, the array types and everything else are unchanged.

`numeric` and `int8` follow one rule: a plain number while that is lossless, and a type that keeps
every digit when it is not. An `int8` inside the safe integer range is a number, so `count()` is
arithmetic-ready, and one beyond it is a `BigInt` rather than a rounded approximation.

If auditing every model is not where you want to start, ask for the narrower set instead:

```ts
knex({
  client: PostgrejsClient,
  connection: '…',
  postgrejs: { decoding: 'pg' },
});
```

That asks the server to render those columns as text, which is what `pg` reads. It is a way to land
the switch in one commit and deal with the types in the next, rather than somewhere to settle: the
text path costs a round of parsing, and it gives up the precision the default keeps.
`test/C-differential/values.spec.ts` runs that mode beside Knex's built-in client over 63 column
types and fails on any difference. Two types stay different even then — `point` and `circle` arrive
as `Point` and `Circle`, `interval` as an `Interval`. The fields are the same under the same names
and `JSON.stringify` gives the identical string; the class also renders itself as `(1,2)` rather
than `[object Object]`.

### Connection options

The familiar host, port, user, password, database and ssl settings work unchanged. Four spellings
differ and are translated for you:

| You may have written | What it becomes |
|:---|:---|
| `application_name` | `applicationName` |
| `fallback_application_name` | `applicationName` |
| `connectionTimeoutMillis` | `connectTimeoutMs` |
| `port` as a string | `port` as a number |

Six have no equivalent, and the client warns on the log rather than dropping them in silence:
`statement_timeout`, `query_timeout`, `idle_in_transaction_session_timeout`, `lock_timeout`,
`options` and `types`. The server-side timeouts belong in `pool.afterCreate`:

```ts
pool: {
  afterCreate(connection, done) {
    connection
      .query("set statement_timeout to '30s'")
      .then(() => done(null, connection), done);
  },
}
```

`types` was `pg`'s way of overriding a type parser. The equivalent here is `postgrejs.typeMap`,
which takes a [`DataTypeMap`](../api/classes/data-type-map.md).

### Result objects

`knex.raw()` answers `command`, `rowCount`, `rows` and `fields`, as before, plus `commandTag` —
the whole command tag, where `pg` keeps only its first word (`CREATE INDEX` rather than `CREATE`).

`fields` carries the familiar `name`, `tableID`, `columnID`, `dataTypeID`, `dataTypeSize`,
`dataTypeModifier` and `format`, and adds `postgrejs`'s own `dataTypeName`, `jsType` and `isArray`.
One value differs: `format` reports `'binary'`, because that is what `postgrejs` asks the server
for.

`rowCount` is the command tag's count, as before: a number for the commands whose tag carries one,
`null` for the rest. `MOVE` and `COPY` are the exception — their count is the one thing `postgrejs`
does not keep, so they report `null`. Neither reaches this path through Knex's own API.

### Errors

Errors are [`DatabaseError`](../api/classes/database-error.md), not `pg`'s, and they are identical
field for field: `code`, `severity`, `constraint`, `detail`, `table`, `column`, `schema`, `hint`,
`where`, and `position` as a string. The PostgreSQL `code` (`23505`, `42P01`) is the same and is
what to match on; `instanceof` against `pg`'s class does not hold.

`line`, `file` and `routine` mean PostgreSQL's own C source location in `pg` and are not filled in
here.

## Full documentation

See the [`knex-postgrejs` README](https://github.com/panates/postgrejs-knex#readme) and its
[migration guide](https://github.com/panates/postgrejs-knex/blob/main/docs/MIGRATION-pg-to-postgrejs.md),
which covers the option spellings that differ, what the decoded values become, and the one setting
that keeps the old ones while you work through your models. [knexjs.org](https://knexjs.org) has
the query builder itself — none of that is `postgrejs`-specific.
