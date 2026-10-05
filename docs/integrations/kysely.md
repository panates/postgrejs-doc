---
sidebar_position: 2
---

# Kysely

[`kysely-postgrejs`](https://github.com/panates/postgrejs-kysely) is a [Kysely](https://kysely.dev)
dialect for `postgrejs`. Put it where Kysely's own `PostgresDialect` goes and everything above it
stays the same — your schema types, your queries, your migrations.

It's faster where it counts, and allocates far less doing it. A 4MB `bytea` comes back in 15.6 ms
against 34.2 ms, on 4.1 MB a call against 51.7 MB — `pg` reads that column as hex text, twice the
size, off the JS heap where a heap figure alone can't see it. A 100k-element `int4[]` runs 3.3x, on
2.2 MB against 22.7 MB. Ordinary queries gain less and gain it repeatably: a point read is the
faster of the two in 92 of 101 alternated pairs. All of it measured through Kysely against Kysely's
own `PostgresDialect` over `pg`, on the same server. And the client underneath can do things Kysely
has no way to ask for.

## Installation

```bash
npm install kysely-postgrejs kysely postgrejs
```

`kysely` (`>=0.29 <0.31`) and `postgrejs` (`>=3.11 <4`) are peer dependencies. Node `>=22`,
PostgreSQL 14 or later — 16 and 18 are what CI runs.

Only the driver is `postgrejs`-specific. The adapter, the introspector and the query compiler are
Kysely's own `Postgres*` implementations, so the SQL is the same either way.

## Quick start

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

That's the whole change.

## Usage

### Connecting

`pool` takes a `postgrejs` `Pool`, or an async function returning one — it's called once, when the
driver initializes, which is where a factory belongs if the connection details have to be fetched
first:

```ts
new PostgrejsDialect({ pool: new Pool('postgres://…') });
new PostgrejsDialect({ pool: async () => new Pool(await secrets()) });
```

`db.destroy()` closes the pool. The pool passed in is still yours to `acquire()` from directly.

### Queries

Everything the query builder does works as it does on any PostgreSQL dialect. A transaction holds
one connection for the whole block and gives it back however it ends, and `trx.savepoint()` is a
savepoint:

```ts
await db.transaction().execute(async trx => {
  await trx.insertInto('person').values({ name: 'ada' }).execute();
});
```

Every one of those statements goes out through `executeQuery`, which is the seam Kysely wraps its
logging around — so `log` and `db.on('query')` see the `BEGIN`, the `SAVEPOINT` and the `COMMIT`,
not only the queries between them.

### Streaming

Streaming goes through a server-side cursor, with Kysely's chunk size as the cursor's batch size:

```ts
for await (const person of db.selectFrom('person').selectAll().stream(100)) {
  // one round trip per 100 rows; the cursor closes when the loop ends,
  // whether it runs out, breaks, or throws
}
```

### Aborting a query

Pass a signal, and pick what should happen to the statement already running on the server:

```ts
const controller = new AbortController();

await db.selectFrom('person').selectAll().execute({
  signal: controller.signal,
  inflightQueryAbortStrategy: 'cancel query', // or 'kill session'
});
```

Both strategies are supported, and neither queues behind the pool:

- **`'cancel query'`** sends a `CancelRequest` over a connection of its own — the statement rejects
  with PostgreSQL's `57014` and the original connection stays usable. Kysely's `pg` dialect instead
  has to run `pg_cancel_backend()` from a second connection, either a dedicated client or one it
  waits for the pool to free.
- **`'kill session'`** runs `pg_terminate_backend()` from a session opened for the occasion — the
  query, its transaction and its locks go with the backend, and the pool notices the closed
  connection and replaces it.

The default, `'ignore query'`, stops waiting and leaves the statement running — no dialect support
is involved.

### Options

| Option | Default | What it does |
|:---|:---|:---|
| `pool` | (required) | A `postgrejs` `Pool`, or a function returning one |
| `fetchAsString` | | OIDs to hand back as the server's own text — `[DataTypeOIDs.int8]` is how to get `pg`'s bigints |
| `fetchCount` | `4294967295` | How many rows a statement may return before the portal suspends — see below |
| `inferParameterTypes` | `true` | Whether parameters go to the server untyped, for PostgreSQL to resolve from context |
| `prepare` | connection's own | Whether statements are cached as server-side prepared statements. `false` for PgBouncer |
| `rollbackOnError` | `false` | Whether a failed statement leaves the rest of the transaction usable — see below |
| `typeMap` | `GlobalTypeMap` | A custom `DataTypeMap`, to override how individual PostgreSQL types are decoded |
| `onCreateConnection` | | Called once per physical connection, before it's first handed to Kysely |
| `onReserveConnection` | | Called every time a connection is acquired from the pool |

#### Complete results by default

`fetchCount` is set to the protocol maximum, so every row a statement produces comes back in one
result and a row count is a row count. Lower it when you want a statement to stop early and you
know what a short result means for your queries (see
[`fetchCount` and suspended results](../querying/extended-query.md#fetchcount-and-suspended-results)).
Streaming is unaffected: `streamQuery` works from Kysely's `chunkSize`, which becomes the cursor's
batch size.

#### PostgreSQL's own transaction semantics

Inside a transaction a failed statement aborts the transaction, the way PostgreSQL and `pg` behave,
so code written against either keeps working unchanged. `postgrejs` can instead wrap each statement
in a savepoint of its own and leave the transaction usable afterward — `rollbackOnError: true` opts
into that.

#### Getting `pg`'s bigints

`postgrejs` decodes `int8` as a number inside the safe integer range and a `BigInt` beyond it,
where `pg` hands back a string — which is what Kysely's generated types and most code ported from
`pg` expect, `count(*)` and `sum(...)` above all. One line asks for the same thing:

```ts
import { DataTypeOIDs } from 'postgrejs';

new PostgrejsDialect({ pool, fetchAsString: [DataTypeOIDs.int8] });
```

The server renders those columns as text and the dialect hands them over untouched, so a value
past 2^53 keeps every digit. Any OID works — `numeric`, `date`, `json` — and nothing else is
affected.

### Reaching the client underneath

`COPY`, `LISTEN`/`NOTIFY`, large objects, logical replication and pipelining are all a method call
away: the two hooks hand you the `postgrejs` connection, with its full API intact.

```ts
new PostgrejsDialect({
  pool,
  onCreateConnection: async connection => {
    const postgrejs = (connection as PostgrejsConnection).connection;
    await postgrejs.query(`set application_name = 'reports'`);
  },
});
```

## Why

It's a drop-in swap for Kysely's own `PostgresDialect`: the same `new Kysely({ dialect })` call,
the same schema types, the same queries, the same migrations. What that buys:

- **Faster where the payload is large** — 2.2x on a 4MB `bytea` and 3.3x on a 100k-element
  `int4[]`, on a fraction of the memory, because the values arrive in PostgreSQL's binary format
  rather than as text to be parsed.
- **Slightly faster on ordinary round trips**, repeatably — statements are prepared and reused
  without anyone asking for it.
- **A client that can do what Kysely has no way to ask for** — cursors, `COPY`, `LISTEN`/`NOTIFY`,
  large objects, logical replication and pipelining, on the same pool your queries use.
- **Checked against Kysely's own dialect suite** — every test, no skips, with Kysely's `pg` dialect
  run over the same checkout as the control.

| Scenario | node-postgres | `kysely-postgrejs` | Speedup / memory |
|:---|:---|:---|:---|
| Point read — 1 row of 9 columns | 0.313 ms / 27 KB | **0.268 ms** / 30 KB | **1.17x**, +13% |
| Point read through the builder (`selectFrom().where()`) | 0.311 ms / 29 KB | **0.267 ms** / 33 KB | **1.16x**, +14% |
| Page of 200 — 200 rows of 9 columns, mixed types | 1.452 ms / 479 KB | **1.267 ms** / **348 KB** | **1.15x**, **−27%** |
| Concurrent reads — 20 at once, pool of 10 | 1.673 ms / 433 KB | **1.494 ms** / 511 KB | **1.12x**, +18% |
| `int4[]` of 100k, full width | 26.082 ms / 22.7 MB | **7.879 ms** / **2.2 MB** | **3.31x**, **−90%** |
| `float8` of 5k rows, full width | 1.241 ms / 1.4 MB | **0.788 ms** / **1.2 MB** | **1.57x**, **−13%** |
| `float8[]` of 5k in one row | 2.286 ms / 2.9 MB | **0.664 ms** / **228 KB** | **3.44x**, **−92%** |
| `uuid` of 5k rows | 1.447 ms / 1.5 MB | **1.067 ms** / 1.5 MB | **1.36x**, level |
| `box` of 5k rows | 2.543 ms / 1.9 MB | **1.358 ms** / 1.9 MB | **1.87x**, level |
| `bytea` of 4MB | 34.175 ms / 51.7 MB | **15.566 ms** / **4.1 MB** | **2.20x**, **−92%** |
| Insert one row — 6 parameters | 0.336 ms / 22 KB | **0.291 ms** / 30 KB | **1.16x**, +33% |
| Insert 500 rows — 1 statement, 2500 parameters | 4.149 ms / 1.4 MB | **3.383 ms** / 1.5 MB | **1.23x**, +9% |
| Insert a 4MB `bytea` — binary both sides | 19.470 ms / 3.3 MB | **17.370 ms** / 4.1 MB | **1.12x**, +24% |
| Insert a 100k `int4[]` — text both sides | 18.573 ms / 27.3 MB | **13.414 ms** / **1.7 MB** | **1.38x**, **−94%** |
| Twenty inserts in a transaction | 6.633 ms / 289 KB | **5.884 ms** / 406 KB | **1.13x**, +40% |

`kysely` 0.29.6, `postgrejs` 3.12.1, `pg` 8.23.0, PostgreSQL on loopback, Node 24.15.0. Medians;
the second figure in each cell is what one call allocates.

**The gain follows the payload, not the query.** An ordinary read or write gains a little and gains
it consistently; a column that carries bulk — an array, a `bytea`, anything large in a single
row — gains twice over, in time and in memory. A schema of text, integers and timestamps sees the
top of that table, not the bottom.

## How the numbers were measured

Both drivers run in one process and alternate inside every pair, with the order swapped each time,
so neither gets a warmer machine than the other. Each figure above is a median of 101 pairs, or 61
and 41 for the heavier workloads.

The medians alone wouldn't be worth much — this is a shared machine, and the absolute figures
drift. What doesn't drift is *which* of the two won each pair, so that's counted separately:

| Scenario | Pairs | `postgrejs` faster in | Odds of that by luck |
|:---|:---|:---|:---|
| Point read | 101 | 92 | < 1 in 10¹⁷ |
| Point read through the builder | 101 | 95 | < 1 in 10²⁰ |
| Page of 200 | 101 | 78 | < 1 in 10⁷ |
| Concurrent reads | 61 | 46 | < 1 in 10⁴ |
| `int4[]` of 100k, full width | 41 | 41 | < 1 in 10¹² |
| `float8` of 5k rows, full width | 61 | 60 | < 1 in 10¹⁶ |
| `float8[]` of 5k in one row | 61 | 61 | < 1 in 10¹⁸ |
| `uuid` of 5k rows | 61 | 54 | < 1 in 10⁹ |
| `box` of 5k rows | 61 | 61 | < 1 in 10¹⁸ |
| `bytea` of 4MB | 41 | 41 | < 1 in 10¹² |
| Insert one row | 101 | 90 | < 1 in 10¹⁵ |
| Insert 500 rows | 61 | 55 | < 1 in 10¹⁰ |
| Insert a 4MB `bytea` | 41 | 36 | < 1 in 10⁶ |
| Insert a 100k `int4[]` | 41 | 40 | < 1 in 10¹⁰ |
| Twenty inserts in a transaction | 61 | 58 | < 1 in 10¹³ |

That's a [sign test](https://en.wikipedia.org/wiki/Sign_test) — only which driver won counts, and
by how much is thrown away, which is exactly what makes it survive a noisy machine. Two drivers of
equal speed would split the pairs evenly, so the last column is the probability of seeing a split
that lopsided from a fair coin. It says which differences are real; it says nothing about their
size, which is what the ratio column is for. A split a coin would produce is printed as level
rather than rounded into a win.

Result columns arrive in PostgreSQL's binary format and are decoded per type, where `pg` asks for
text and parses it. On bulk that's the whole difference: a 100k-element `int4[]` costs 7.9 ms and
2.2 MB here against 26.1 ms and 22.7 MB, because the text path has to materialize the array
literal as one string before it can parse it.

`postgrejs` names and caches a statement per connection — 64 by default, least-recently-used
closed — so each distinct SQL string is parsed and planned once rather than on every call. `pg`
prepares only a query it was given a name for, and Kysely doesn't give it one, so the same
statement is parsed again on every call there. That's what the point read's 92 pairs of 101 is made
of.

The query builder itself costs 2.5 KB a call over a `sql` tag here and 1.9 KB on `pg`, and nothing
that separates from drift on the clock — Kysely's own compiler runs on both sides, so it's the same
work paid once per driver rather than a difference between them. The same read is 1.17x through the
tag and 1.16x through the builder.

Memory is measured in a child process per driver, because it can't be measured in a shared one: the
baseline would be taken with both clients already up, so what a client allocates once and keeps
would sit under the window rather than in it. The figure is `heapUsed + external`, since a `bytea`
arrives as a `Buffer` and lives outside the JS heap entirely.

Run it yourself with `npm run bench` in the `kysely-postgrejs` repo; its
[`doc/BENCHMARKS.md`](https://github.com/panates/postgrejs-kysely/blob/main/doc/BENCHMARKS.md) has
the held-memory and high-water figures, the wire counts, and the rest of the method.

## Tested against Kysely's own suite

Kysely holds its dialects to a suite of several hundred tests. A script checks Kysely out at a
known version, points its `postgres` variant at this dialect instead of the built-in `pg` one, and
runs all of it:

- Against Kysely v0.29.6: **684 passing, nothing failing** — the same score Kysely's own `pg`
  dialect gets on that checkout, measured the same way on the same machine, with no test skipped.
- Against v0.30.0-beta.2, the other end of the peer range: **728 passing, nothing failing**, and
  again the same for `pg`.

Two of those tests name the `pg` driver itself: one asserts the error is an instance of `pg`'s
`DatabaseError`, and one stubs `PostgresDriver.prototype` and expects the stub to be called. The
patch points both at this dialect's equivalents, so they exercise the same behavior here that they
exercise for `pg`. The suite also runs with `fetchAsString: [DataTypeOIDs.int8]`, since every
expectation in it is written against `pg`'s string bigints. A weekly CI job re-runs both and fails
if either count moves in either direction.

The suite is also what settled two design decisions. Transaction and savepoint commands go through
`connection.executeQuery`, the seam Kysely wraps its logging around, so `log` and `db.on('query')`
see every `BEGIN`, `SAVEPOINT` and `COMMIT` — two dozen tests assert the exact statements a
transaction runs. And parameter types are left to the server, which is what keeps a parameter
usable in every context PostgreSQL can infer a type from.

## What changes when you switch

Everything above the driver is Kysely's own code, so the SQL, the types and the query builder are
unchanged. What differs is what the client underneath makes of a value on its way back — and the
package runs every row of the table below through both dialects in a test, so it's checked rather
than asserted.

### Values

`pg` hands most of the less common types back as the server's own text. `postgrejs` decodes them:

| Case | Kysely + `pg` | `kysely-postgrejs` |
|:---|:---|:---|
| `int8`, so `count` and `sum` | `"2"` | `2`, and a `BigInt` past 2^53 |
| `numeric` | `"12.34"` | `12.34` |
| `money` | `"$12.34"` | `12.34` |
| `time` | `"10:20:30"` | a `Date` |
| `int4range` and the rest of the family | `"[1,5)"` | a [`Range`](../api/classes/range.md) |
| `point`, `circle` | plain objects | `Point`, `Circle` — same fields |
| `box`, `line`, `lseg`, `path`, `polygon` | the text literal | their own classes |

Everywhere else the two agree, which is the stronger half of the table: `text`, `boolean`,
`float8`, `date`, `timestamptz`, `json`, `jsonb`, `uuid`, `bytea`, arrays, `inet` and `bit` all
arrive identically.

`int8` is the one worth deciding about rather than discovering, since `count(*)` is in everyone's
code: `fetchAsString: [DataTypeOIDs.int8]` gives you `pg`'s strings back, and the test asserts the
two then match exactly.

### Parameters take their type from where they appear

Strings, numbers, booleans, bigints and `null`s go to the server untyped, exactly as `pg` sends
them, so PostgreSQL resolves each one from the position it appears in. The same value is a
`varchar` next to a `varchar` column, a `jsonb` next to a `jsonb` one, and an `int4` in
arithmetic — which is what keeps `coalesce`, `json`/`jsonb` operators, string concatenation,
overloaded functions and subscripted assignment working with a plain JavaScript argument:

```ts
await sql`select coalesce(nickname, ${'anonymous'}) from person`.execute(db);
```

Dates, buffers, arrays and objects keep `postgrejs`'s typed binary encoders, which is what makes
them compact on the wire — the same trade [strings and Dates pay generally](../querying/query-parameters.md#strings-dates-and-numeric-arrays-go-out-unspecified).

A parameter standing on its own has nothing to resolve against, and PostgreSQL settles on `text`
there:

```ts
await sql`select ${5} as v`.execute(db); // '5'
await sql`select ${5} + 1 as v`.execute(db); // 6 — the context decides
```

`inferParameterTypes: false` declares each type from the JavaScript value instead.

### Errors

Errors are [`DatabaseError`](../api/classes/database-error.md), not `pg`'s. The PostgreSQL `code`
(`23505`, `42P01`) is the same and is what to match on; `instanceof` against `pg`'s class doesn't
hold.

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

## Full documentation

See the [`kysely-postgrejs` README](https://github.com/panates/postgrejs-kysely#readme) and its
[full benchmark report](https://github.com/panates/postgrejs-kysely/blob/main/doc/BENCHMARKS.md)
for the complete method and every figure behind the tables above, and [kysely.dev](https://kysely.dev)
for the query builder itself — none of that is `postgrejs`-specific.
