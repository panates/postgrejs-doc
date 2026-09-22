---
sidebar_position: 2
---

# Kysely

[`kysely-postgrejs`](https://github.com/panates/postgrejs-kysely) is a [Kysely](https://kysely.dev)
dialect for `postgrejs` — run Kysely's query builder on `postgrejs`'s wire-protocol client instead
of `pg`. Only the driver is `postgrejs`-specific: the SQL adapter, introspector and query compiler
are Kysely's own `Postgres*` implementations, so everything Kysely itself does works exactly the
same either way.

## Installation

```bash
npm install kysely-postgrejs kysely postgrejs
```

`kysely` (`>=0.29 <0.31`) and `postgrejs` (`>=3.7`) are peer dependencies.

## Usage

```ts
import { Kysely } from 'kysely';
import { Pool } from 'postgrejs';
import { PostgrejsDialect } from 'kysely-postgrejs';

const db = new Kysely<Database>({
  dialect: new PostgrejsDialect({
    pool: new Pool('postgres://localhost:5432/mydb'),
  }),
});
```

`pool` takes a `Pool` instance, or an async function returning one, called once when the driver
initializes. `db.destroy()` closes the pool.

## Streaming

Kysely's `.stream()` goes through a `postgrejs` server-side cursor, with the chunk size Kysely
was given as the cursor's `fetchCount` batch size:

```ts
for await (const person of db.selectFrom('person').selectAll().stream(100)) {
  // one round trip per 100 rows; the cursor closes when the loop ends,
  // whether it runs out, breaks, or throws
}
```

## Config

| Option | Default | What it does |
|:---|:---|:---|
| `pool` | (required) | A `postgrejs` `Pool`, or a function returning one |
| `fetchAsString` | | OIDs to hand back as the server's own text — `[DataTypeOIDs.int8]` is how to get `pg`'s bigints, see below |
| `fetchCount` | `4294967295` | How many rows a statement may return before the portal suspends — see below |
| `inferParameterTypes` | `true` | Whether a `null` parameter is left for PostgreSQL to type from context |
| `prepare` | connection's own | Whether statements are cached as server-side prepared statements. `false` for PgBouncer |
| `rollbackOnError` | `false` | Whether a failed statement leaves the rest of the transaction usable — see below |
| `typeMap` | `GlobalTypeMap` | A custom `DataTypeMap`, to override how individual PostgreSQL types are decoded |
| `onCreateConnection` | | Called once per physical connection, before it's first handed to Kysely |
| `onReserveConnection` | | Called every time a connection is acquired from the pool |

### Why `fetchCount` defaults to "everything"

The dialect asks for the protocol maximum rather than leaving the limit unsaid. Kysely's
`QueryResult` has nowhere to report that rows were left behind, so a truncated result would reach
the caller as a short answer with nothing wrong about it — `postgrejs` flags one with `suspended`
(see [`fetchCount` and suspended results](../querying/extended-query.md#fetchcount-and-suspended-results)),
and that flag has no way through Kysely's own result shape. Lower it only if a short result is
acceptable for your queries; `streamQuery` ignores it and uses Kysely's own `chunkSize` as the
cursor's batch size instead.

### Why parameter types are left to the server

A parameter carrying a declared type is one PostgreSQL won't coerce — a string declared `varchar`
can't go into a `json` column, a number declared `int4` can't be coalesced with a `varchar` column
or compared against `jsonb`. `pg` sends every parameter as type `0` (unspecified) and lets the
server resolve each one from where it lands, so this dialect does the same for strings, numbers,
booleans, bigints and `null`. Dates, buffers, arrays and objects keep `postgrejs`'s own typed
binary encoders, since their text form isn't something the server could parse without one.

The cost is the same one [strings and Dates pay generally](../querying/query-parameters.md#strings-dates-and-numeric-arrays-go-out-unspecified):
a parameter with no context to resolve against settles on `text` rather than raising. Turn it back
off with `inferParameterTypes: false` to get declared types again.

### Getting `pg`'s bigints

`postgrejs` decodes `int8` as a number inside the safe integer range and a `BigInt` beyond it,
where `pg` hands back a string — what Kysely's generated types and most code ported from `pg`
expect, `count(*)` and `sum(...)` above all:

```ts
import { DataTypeOIDs } from 'postgrejs';

new PostgrejsDialect({ pool, fetchAsString: [DataTypeOIDs.int8] });
```

The server renders those columns as text and the dialect hands them over untouched, so a value
past 2^53 keeps every digit. Any OID works the same way — `numeric`, `date`, `json` — and nothing
else is affected.

### Why `rollbackOnError` defaults to `false`

`postgrejs` wraps every statement inside a transaction in a savepoint of its own by default, so a
failed statement leaves the transaction usable — not what PostgreSQL does on its own, nor what
`pg` (and therefore every existing Kysely user) expects. The dialect turns it off; set it back to
`true` to opt into `postgrejs`'s own behavior.

## Aborting a query

Pass a signal, and choose what happens to the statement already running on the server:

```ts
const controller = new AbortController();

await db.selectFrom('person').selectAll().execute({
  signal: controller.signal,
  inflightQueryAbortStrategy: 'cancel query', // or 'kill session'
});
```

- **`'cancel query'`** sends a `CancelRequest` over a connection of its own — the statement rejects
  with PostgreSQL's `57014` and the original connection stays usable. Kysely's `pg` dialect instead
  has to run `pg_cancel_backend()` from a second connection, either a dedicated client or one it
  waits for the pool to free.
- **`'kill session'`** runs `pg_terminate_backend()` from a session opened for the occasion — the
  query, its transaction and its locks go with the backend, and the pool notices the closed
  connection and replaces it.

The default, `'ignore query'`, just stops waiting and leaves the statement running.

## Reaching the connection underneath

Kysely's interface doesn't cover everything `postgrejs` can do — `COPY`, `LISTEN`/`NOTIFY`, large
objects, logical replication. `onCreateConnection` hands you the underlying `postgrejs`
connection to run those directly:

```ts
new PostgrejsDialect({
  pool,
  onCreateConnection: async connection => {
    const postgrejs = (connection as PostgrejsConnection).connection;
    await postgrejs.query(`set application_name = 'reports'`);
  },
});
```

The `Pool` passed in at construction is still yours to `acquire()` from directly as well, for
anything that needs a connection outside of a Kysely query.

## Differences from Kysely's `pg` dialect

- **`int8` is a number, not a string, unless you ask** — see [Getting `pg`'s bigints](#getting-pgs-bigints) above.
- **Errors are `postgrejs`'s [`DatabaseError`](../api/classes/database-error.md)**, not `pg`'s. The
  PostgreSQL `code` (`23505`, `42P01`) is the same and is what to match on; `instanceof` against
  `pg`'s class doesn't hold.

## Use from a MikroORM driver

MikroORM's SQL layer runs on Kysely, so a custom driver only has to hand this dialect over:

```ts
import { PostgrejsDialect } from 'kysely-postgrejs';

class PostgrejsSqlConnection extends AbstractSqlConnection {
  createKyselyDialect() {
    return new PostgrejsDialect({ pool }); // pool being whichever postgrejs pool the driver manages
  }
}
```

Nothing the dialect needs is behind a deep import — `PostgrejsDialect`, `PostgrejsDriver`,
`PostgrejsConnection` and the config types are all exported from the package root.

## How far it's tested

Kysely holds its dialects to a suite of several hundred tests; this dialect passes all of it against
Kysely's `pg` dialect checked out at the same version — 684/684 on Kysely v0.29.6, 728/728 on
v0.30.0-beta.2 — with a weekly CI job re-running both ends of the peer range.

## Full documentation

See the [`kysely-postgrejs` README](https://github.com/panates/postgrejs-kysely#readme) for the
full test-suite methodology, and [kysely.dev](https://kysely.dev) for the query builder itself —
none of that is `postgrejs`-specific.
