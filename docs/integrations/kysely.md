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

A parameter carrying a declared type is one PostgreSQL won't coerce. Declare a string `varchar`
and it can't go into a `json` column; declare a number `int4` and it can't be coalesced with a
`varchar` column, compared against `jsonb`, or assigned into one:

```
COALESCE types character varying and integer cannot be matched
operator does not exist: jsonb = integer
subscripted assignment to "data" requires type jsonb but expression is of type double precision
```

`pg` sends type `0` — unspecified — for everything and lets the server resolve each parameter from
where it appears, so none of that surfaces there. The dialect does the same for strings, numbers,
booleans, bigints and `null`s — the same trade [strings and Dates pay generally](../querying/query-parameters.md#strings-dates-and-numeric-arrays-go-out-unspecified).
Dates, buffers, arrays and objects keep `postgrejs`'s own typed binary encoders, since their text
form isn't something the server could parse without one.

The cost is a parameter with no context at all — with neither a declared type nor anything to
resolve against, PostgreSQL settles on `text`:

```ts
await sql`select ${5} as v`.execute(db); // '5'
await sql`select ${5} + 1 as v`.execute(db); // 6 — the context decides
```

That's the trade, and the three errors above are what the other side of it looks like. Turn it
back off with `inferParameterTypes: false` to get declared types again.

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

Pass a signal, and choose what happens to the statement already running on the server — neither
strategy queues behind the pool:

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

The default, `'ignore query'`, just stops waiting and leaves the statement running — no dialect
support is involved.

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

## Kysely's own test suite

Kysely holds its dialects to a suite of several hundred tests. A script checks Kysely out at a
known version, points its `postgres` variant at this dialect instead of the built-in `pg` one, and
runs all of it — against Kysely v0.29.6: **684 passing, nothing failing**, the same number
Kysely's own `pg` dialect scores on that checkout, with nothing skipped; against v0.30.0-beta.2,
the other end of the peer range: **728 passing, nothing failing**. A weekly CI job re-runs both.

Two of those tests name the `pg` driver rather than describe behavior — one asserts the error is
an instance of `pg`'s `DatabaseError`, one stubs `PostgresDriver.prototype` and expects the stub to
be called — so the suite patches both to point at this dialect's equivalents; left alone, they'd
pass over the behavior without exercising it. The suite also runs with
`fetchAsString: [DataTypeOIDs.int8]`, since every expectation in it is written against `pg`'s
string bigints.

The suite is also what settled two design questions here: transaction and savepoint commands go
through `connection.executeQuery` rather than `postgrejs`'s own transaction primitives, because
that's the seam Kysely wraps its logging around — two dozen tests assert the exact statements a
transaction runs — and parameter types are left to the server, because a declared type breaks
every context PostgreSQL would otherwise have inferred (see above).

## Full documentation

See the [`kysely-postgrejs` README](https://github.com/panates/postgrejs-kysely#readme) for the
full test-suite methodology, and [kysely.dev](https://kysely.dev) for the query builder itself —
none of that is `postgrejs`-specific.
