---
sidebar_position: 4
---

# TypeORM

[`typeorm-postgrejs`](https://github.com/panates/postgrejs-typeorm) is a `pg`-compatible facade
over `postgrejs` for [TypeORM](https://typeorm.io). Put it where `pg` goes and everything above it
stays the same — your entities, your queries, your migrations. TypeORM only ever talks to
PostgreSQL through [`pg`](https://node-postgres.com), so a facade is the whole integration.

It's faster where it counts and holds far less memory doing it. A 4MB `bytea` comes back in
15.337 ms against 35.207 ms, at 4.1 MB a call against 51.6 MB — `pg` reads that column as hex text,
twice the size, off the JS heap where a heap figure alone can't see it. A 100,000-element `int4[]`
runs 3.89x, at 2.2 MB against 23.8 MB. Ordinary queries gain less and gain it repeatably: a point
read is the faster of the two in 391 of 401 alternated pairs. All of it measured through TypeORM
against `pg` on the same server. And the client underneath can do things TypeORM has no way to
ask for.

## Installation

```bash
npm install typeorm-postgrejs postgrejs
```

`postgrejs` (`>=3.13.0 <4`) is a peer dependency; `typeorm` (`>=0.3.0 <2`) is an optional one,
because this package never imports TypeORM. Node `>=22`. There are no runtime dependencies.

## Quick start

```ts
import { DataSource } from 'typeorm';
import * as pgjs from 'typeorm-postgrejs';

export const dataSource = new DataSource({
  type: 'postgres',
  url: 'postgres://localhost:5432/mydb',
  driver: pgjs, // the whole change
  entities: [
    /* ... */
  ],
});
```

That's the whole change. `driver` is TypeORM's own option — its doc comment reads *"The driver
object. This defaults to `require("pg")`."* — so this goes where that default was.

## Usage

### Connecting

Everything `pg` accepts, accepted the same way:

```ts
new DataSource({ type: 'postgres', driver: pgjs, url: 'postgres://user:secret@host/db' });
new DataSource({ type: 'postgres', driver: pgjs, host: 'localhost', database: 'mydb' });
new DataSource({ type: 'postgres', driver: pgjs, extra: { max: 20, idleTimeoutMillis: 30_000 } });
```

Migrations, the query builder, the schema tools and `QueryRunner.stream()` all work unchanged;
`pg-query-stream` is only needed if you call the last of those, and TypeORM loads it itself.

### Options

This package's own options go under `postgrejs` in TypeORM's `extra`, which
`PostgresDriver.createPool()` merges straight into the object the pool is constructed with:

```ts
new DataSource({
  // ...
  driver: pgjs,
  extra: { postgrejs: { decoding: 'native' } },
});
```

| Option | Default | What it does |
|:---|:---|:---|
| `decoding` | `'pg'` | `'native'` gives `postgrejs`'s own richer values instead of `pg`'s — a [`Numeric`](../api/classes/numeric.md) that keeps every digit, a `BigInt` past 2^53, typed geometric and [`Range`](../api/classes/range.md) classes. Opt in only if you know the code reading those rows: TypeORM has no hydration branch for a `numeric` column, so a `Numeric` reaches the user where a string was expected |
| `fetchAsString` | | Extra OIDs to ask the server for as text, on top of the list `'pg'` mode already uses. An entry is an OID or `{ oid, arrays: false }`, which asks for a scalar without its array columns |
| `prepare` | `postgrejs`'s default | `false` for PgBouncer in transaction pooling mode before 1.21, where a named statement doesn't survive to the next call. It turns off the one mechanism measured separately below |
| `normalizeErrors` | `true` | Makes a caught error look like `pg`'s: the caret diagram out of `message`, `position` as a string. The structured fields are identical either way |
| `suppressRedundantPoolError` | `true` | `postgrejs` reports a dead pooled connection on the pool *and* rejects the in-flight query; `pg` only rejects the query. This drops the duplicate |
| `parseInputDatesAsUTC` | `false` | Mirrors `pg`'s `defaults.parseInputDatesAsUTC`: render a `Date` parameter from its UTC fields rather than its local ones |
| `inferParameterTypes` | `false` | Lets `postgrejs` declare an OID per parameter from the JS value, instead of sending every parameter unspecified the way `pg` does |
| `connection` | | `postgrejs`'s own connection settings, forwarded as given — everything it has that `pg` has no name for, and so no `pg` option to arrive through: `keepAlive`, `schema`, `timezone`, `hosts` and `targetSessionAttrs` for failover, `channelBinding`, `preparedStatementCacheSize`, `buffer`, `pipeline*`, `debugLogger`, `timing`, `asyncErrorHandling`. What this package translates out of the `pg` options is kept out of the type, so it can't fight the translation |

One worth knowing about in that last row. `postgrejs` captures a caller-preserving async stack on
every call (`asyncErrorHandling`, on by default) so a failure points at the line that made it; `pg`
has nothing equivalent. **Through this facade the stack it preserves names this package's own
`client.js` rather than your code**, because the call it reaches back to is the facade's, not
yours — so you're paying for it and not collecting it:

```ts
extra: { postgrejs: { connection: { asyncErrorHandling: false } } }
```

It's left on by default because that's `postgrejs`'s default and this package doesn't quietly
change its behavior. Measured here it's below the noise of the allocation estimator the benchmarks
use (12.90 KB a call against 12.85), so turn it off for tidiness rather than for a number.

## Why

It's a drop-in swap for `pg`: the same `driver` option, the same entities, the same queries, the
same migrations. What that buys:

- **Faster where the payload is large** — 2.30x on a 4MB `bytea` and 3.89x on a 100,000-element
  `int4[]`, on a fraction of the memory, because the values arrive in PostgreSQL's binary format
  rather than as text to be parsed.
- **Slightly faster on ordinary round trips**, repeatably — statements are prepared and reused
  without anyone asking for it.
- **Correct dates on a server whose `DateStyle` isn't `ISO`**, where `pg` hands back `null`.
- **A client that can do what TypeORM has no way to ask for** — cursors, `COPY`, `LISTEN`/`NOTIFY`,
  large objects and logical replication, on the same pool your queries use, through
  `client.connection`.
- **Checked against TypeORM's own functional suite** — 806 of its tests pass, with `pg` run over the
  same files on the same server in the same invocation as the control.

| Scenario | `pg` | `typeorm-postgrejs` | Speedup / memory |
|:---|:---|:---|:---|
| `findOneBy` — 1 entity of 9 columns | 0.308 ms / **63 KB** | **0.263 ms** / 69 KB | **1.17x**, +8% |
| `find` 100 entities | 0.593 ms / 404 KB | **0.516 ms** / **315 KB** | **1.15x**, **−22%** |
| `find` 5000 entities | 9.126 ms / 15.9 MB | **6.116 ms** / **10.9 MB** | **1.49x**, **−31%** |
| `queryBuilder`, 500 entities after a `where` and an `order by` | 1.203 ms / 1.7 MB | **0.997 ms** / **1.1 MB** | **1.21x**, **−38%** |
| `save` one entity — 9 assigned columns, mixed types | 0.738 ms / **102 KB** | **0.659 ms** / 122 KB | **1.12x**, +19% |
| Point read — 1 row of 9 columns | 0.282 ms / **16 KB** | **0.244 ms** / 18 KB | **1.16x**, +9% |
| Page of 100 — 100 rows of 9 columns | 0.553 ms / 234 KB | **0.476 ms** / **155 KB** | **1.16x**, **−34%** |
| Insert one row — returning the key | 0.281 ms / **15 KB** | **0.231 ms** / 19 KB | **1.21x**, +22% |
| `bytea` of 4MB | 35.207 ms / 51.6 MB | **15.337 ms** / **4.1 MB** | **2.30x**, **−92%** |
| `int4[]` of 100k — 1 row | 22.929 ms / 23.8 MB | **5.891 ms** / **2.2 MB** | **3.89x**, **−91%** |

TypeORM 1.1.1, `pg` 8.23.1, `postgrejs` 3.13.0, PostgreSQL 18.6, loopback, Node 24.15.0. Medians per
call, with allocation per call as the second figure.

**The gain follows the payload, not the query.** An ordinary read or write gains a little and gains
it consistently; a column that carries bulk — an array, a `bytea`, anything large — gains twice
over, in time and in memory. It allocates *more* on the smallest calls, where a fixed per-call cost
has nothing to amortize against. A schema of text, integers and timestamps sees the top of that
table, not the bottom.

## How the numbers were measured

Both clients run in one process and alternate on every pair, so neither gets a warmer machine.
Each figure is a median. Memory is a separate pass, one child process per client, because a
baseline taken with both alive has their pools and buffers under it rather than in it.

The medians alone wouldn't be worth much — on a shared machine the absolute figures drift by more
than the differences do — so which of the two won each pair is counted separately. A sign test, so
only which client won counts and by how much is thrown away; the benchmark runs 29 scenarios, and
these are the headline ones:

| Workload | Pairs | `typeorm-postgrejs` faster in | Odds of that by luck |
|:---|:---|:---|:---|
| Point read | 401 | 391 | < 1 in 10¹⁸ |
| Page of 100 | 201 | 182 | < 1 in 10¹⁸ |
| `int4[]` of 100k | 41 | 41 | < 1 in 10¹² |
| `bytea` of 4MB | 41 | 41 | < 1 in 10¹² |
| Insert one row | 401 | 391 | < 1 in 10¹⁸ |
| `findOneBy` | 201 | 197 | < 1 in 10¹⁸ |
| `find` 100 entities | 201 | 174 | < 1 in 10¹⁸ |
| `find` 5000 entities | 61 | 61 | < 1 in 10¹⁸ |
| `queryBuilder`, 500 entities | 101 | 91 | < 1 in 10¹⁶ |
| `save` one entity | 201 | 196 | < 1 in 10¹⁸ |
| Concurrent reads | 61 | 56 | < 1 in 10¹¹ |
| Concurrent finds | 61 | 49 | < 1 in 10⁵ |

**Every scenario is one the client dominates**, and that's a selection rule rather than a
coincidence. A shape where PostgreSQL does most of the work measures PostgreSQL: its ratio is set
by how much scanning or writing was asked for, and a reader takes it for a property of the
workload. The one row whose clock isn't the client's is the 4MB write, where both sides are
pushing bytes through a socket at the same speed — it's kept for its allocation column and says so.

There was a deliberately server-dominated row as a control, on the theory that a shape neither
client can win is the cheapest check on a whole run. It was removed: swept across scan sizes its
speedup read 1.04x, 0.95x, 1.00x and 0.94x, twice significant in opposite directions, so it wasn't
doing that job either. The sign test is the guard instead, and it's the per-row version of the same
check.

Run it yourself with `npm run bench` in the `typeorm-postgrejs` repo; its
[`doc/BENCHMARKS.md`](https://github.com/panates/postgrejs-typeorm/blob/main/doc/BENCHMARKS.md)
has every scenario, what each client holds between calls, which mechanism earns which row, and why
a per-call peak isn't among them.

## Tested against TypeORM's own suite

A script runs TypeORM's own functional suite — the one TypeORM ships and runs its own driver
through — against this facade, with `pg` over the same files, on the same server, in the same
invocation, as the control:

```
pg (control)         806 / 806   (127 files)
typeorm-postgrejs    806 / 806   (127 files)
```

Same tests, and both pass every one — not a single test this facade loses that `pg` wins. There's
no expected-failure list either, and that's deliberate rather than lazy: these tests leave schema
behind and read it back, so the same file scores differently between two runs of the *same*
driver (`create-table.test.js` scored 1/4 and then 5/0 with nothing changed). Only a control
measured in the same invocation is worth comparing against.

The script clones and compiles TypeORM at a pinned tag and patches one function —
`getTypeOrmConfig()`, because an `ormconfig.json` can't carry a `driver` object — then runs every
file twice, each in its own process, on a freshly reset database.

On top of that, **275 tests** of this package's own at 99.9% coverage, including a differential
suite that runs 20 TypeORM programs through `pg` as well and deep-compares the two.

## What changes when you switch

Measured by a 64-type decoding matrix and a 32-case parameter matrix that run every case through
both. Everywhere not listed here the two agree exactly — `numeric` and `int8` are strings, `money`
keeps the server's `$12.34`, ranges are strings, dates are `Date`s.

### Values

| Case | `pg` | `typeorm-postgrejs` |
|:---|:---|:---|
| Any date type on a server whose `DateStyle` isn't `ISO` | `null` | the stored value |
| `interval`, `point`, `circle` | a plain object | the same keys and values, plus `toPostgres()` |
| A connection lost mid-statement | rejects `57P01` | rejects `08006` |
| A pooled connection that dies while **idle** | nothing | `pool.on('error')` with `08006` |

### `DateStyle`, where this package is right and `pg` is not

A `German` or `SQL` locale is an ordinary thing for a European deployment, and `pg` can't read what
the server then writes:

```ts
await client.query(`set datestyle to 'German, DMY'`);
await client.query(`select '2024-03-05'::date as d, '2024-03-05 06:07'::timestamptz as ts`);

// pg                  { d: null, ts: null }
// typeorm-postgrejs   { d: 2024-03-05, ts: 2024-03-05T06:07:00.000Z }
```

`pg` 8.23.0 parses only PostgreSQL's ISO rendering and has nowhere else to go. The binary format
carries no formatting at all. The package's tests hold this across four styles and three field
orders, on both wire formats.

### Values that can be written back

`interval`, `point` and `circle` arrive as `postgrejs` classes. They read exactly like `pg`'s
objects — same keys, same values, same `JSON.stringify` — and they can do one thing more:

```ts
const { rows } = await client.query(`select '(1,2)'::point as p`);
await client.query('insert into shapes (p) values ($1)', [rows[0].p]); // writes itself back
```

Through `pg` that second call fails with `22P02`: its plain object has no way to render itself
into a `point` again, so a value you just read isn't a value you can pass on.

### A lost connection

Both reject the in-flight query and both emit `'error'` on the client, so a handler written for
`pg` keeps working. The SQLSTATE differs — `pg` reports the server's own `57P01`, this reports
`08006` for the connection itself (a [`ConnectionLostError`](../api/classes/connection-lost-error.md))
— and the error here carries `processID`.

The pool is the other half. `pg` raises nothing there; `postgrejs` reports a lost pooled
connection on `pool.on('error')` as well. Where a caller already has the error the duplicate is
dropped (`suppressRedundantPoolError`); where the connection died **idle** and nobody would
otherwise hear about it, it's reported.

### Concurrent `query()` on one client

`pg` queues every `query()` per client and starts the next only when the previous has settled. This
facade does the same, which means it gives up `postgrejs`'s pipelining — worth about 10x on one
connection — on purpose: a `create temp table` and an `insert` into it, issued together, must not
race, and nothing written against `pg` can depend on the other behavior. `client.connection` is the
real `postgrejs` `Connection` and isn't queued.

## Full documentation

See the [`typeorm-postgrejs` README](https://github.com/panates/postgrejs-typeorm#readme), its
[full benchmark report](https://github.com/panates/postgrejs-typeorm/blob/main/doc/BENCHMARKS.md)
and its [driver-design notes](https://github.com/panates/postgrejs-typeorm/blob/main/doc/DRIVER-DESIGN.md)
for the measurement behind every claim, and [typeorm.io](https://typeorm.io) for TypeORM itself —
none of that is `postgrejs`-specific.
