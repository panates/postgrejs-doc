---
sidebar_position: 5
---

# Prisma

[`prisma-postgrejs`](https://github.com/panates/postgrejs-prisma) is a
[Prisma](https://www.prisma.io) driver adapter for `postgrejs`. Swap it in where
`@prisma/adapter-pg` goes and everything above it stays the same — your schema, your queries, your
migrations.

It's faster where it counts, and asks the runtime for far less memory doing it. A 4MB `bytea`
comes back in 50.756 ms against 108.827 ms, and one call allocates 21.6 MB against 69.2 MB — `pg`
asks for that column as `\x`-prefixed hex, two characters a byte, so it pulls 8.0 MB off the socket
where this adapter pulls 4.0 MB, then holds it as a string off the JS heap where a heap figure
alone can't see it. An `int4[]` of 100k values runs 3.28x, at 13.4 MB against 27.3 MB. Ordinary
queries gain less and gain it repeatably: a point read is the faster of the two in 99 of 101
alternated pairs. All of it through an unmodified `PrismaClient`, against `@prisma/adapter-pg` on
the same server in the same run — and two values the reference adapter gets silently wrong come
back right.

## Installation

```bash
npm install prisma-postgrejs postgrejs @prisma/driver-adapter-utils
```

`postgrejs` (`>=3.11.0 <4`) and `@prisma/driver-adapter-utils` (`>=7.10.0 <9`) are peer
dependencies — the second one because `@prisma/client` doesn't bring it along. Node `>=22`.

## Quick start

At Prisma 7 the adapter is how a client connects, so the datasource block carries no `url`:

```prisma
datasource db {
  provider = "postgresql"
}
```

```ts
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPostgreJS } from 'prisma-postgrejs';

const adapter = new PrismaPostgreJS('postgresql://user:secret@localhost:5432/mydb');
const prisma = new PrismaClient({ adapter });

await prisma.user.findMany({ where: { active: true } });
```

That's the whole change.

## Usage

### Connecting

Three ways to say where the database is:

```ts
new PrismaPostgreJS('postgresql://user:secret@localhost:5432/mydb'); // a connection string
new PrismaPostgreJS({ host: 'localhost', database: 'mydb', max: 10 }); // postgrejs's pool options
new PrismaPostgreJS(pool); // a Pool you made yourself
```

`prisma.$disconnect()` closes a pool this package opened. A `Pool` passed in stays yours — it's
left open, so it can go on serving whatever else is using it.

### Options

```ts
new PrismaPostgreJS('postgresql://user:secret@localhost:5432/mydb', {
  schema: 'my_schema',
  pipeline: true,
  onPoolError: err => logger.error(err),
});
```

| Option | Default | What it does |
|:---|:---|:---|
| `schema` | `?schema=` on the connection string | The schema the engine qualifies its SQL with |
| `pipeline` | `true` | Lets a statement share a pooled connection with statements already in flight instead of waiting for one of its own — this is what the concurrency rows below measure. `false` gives each statement the connection to itself |
| `onPoolError` | | Called when a pooled connection is lost or one couldn't be opened. Prisma has nowhere to report either, so without this they're only visible as the failure of whatever query was in flight |

### Migrations

`prisma migrate` and `prisma db push` connect with the CLI's own built-in connector rather than
through the adapter, so they need a URL of their own in `prisma.config.ts`:

```ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
```

## Why

It's a drop-in swap for `@prisma/adapter-pg`: the same `PrismaClient({ adapter })`, the same
schema, the same queries, the same migrations. What that buys:

- **Faster where the payload is large** — 2.14x on a 4MB `bytea`, and 3.28x on a 100k-element
  `int4[]` whose values use the whole type, because the values arrive in PostgreSQL's binary format
  rather than as text to be parsed.
- **And lighter on the same rows** — one call allocates 21.6 MB against 69.2 MB on that `bytea`,
  and 984 KB against 3.6 MB on an array of 5000 `float8`. On rows too narrow to carry a payload the
  two are within a few percent, and on the smallest of them this adapter asks for slightly more.
- **Slightly faster on ordinary round trips**, repeatably — statements are prepared and reused
  without anyone asking for it.
- **Two values the reference adapter gets wrong** — `timetz` on any offset but zero, and `money`
  outside a narrow range — come back right. [What changes when you switch](#what-changes-when-you-switch)
  is the full list.
- **A client that can do what Prisma has no way to ask for** — cursors, `COPY`, `LISTEN`/`NOTIFY`,
  large objects, logical replication and pipelining, on the same pool your queries use.
- **Checked against Prisma's own functional suite** — 1251 of its tests pass, with
  `@prisma/adapter-pg` run over the same server in the same invocation as the control.

| Workload | `@prisma/adapter-pg` | `prisma-postgrejs` | Speedup / memory |
|:---|:---|:---|:---|
| Primary-key lookup | 0.326 ms / 59 KB | **0.289 ms** / 63 KB | **1.13x**, +6% |
| 10k rows, mixed scalars | 25.165 ms / 13.2 MB | **17.019 ms** / **10.7 MB** | **1.48x**, **−19%** |
| 10k rows, `int8`/`numeric`/`timestamp` | 27.552 ms / 17.0 MB | **20.146 ms** / **14.9 MB** | **1.37x**, **−12%** |
| Point read | 0.641 ms / 65 KB | **0.560 ms** / 69 KB | **1.15x**, +7% |
| Page of 200 | 1.845 ms / 582 KB | **1.506 ms** / **480 KB** | **1.23x**, **−17%** |
| `uuid` of 5k rows | 6.591 ms / 3.4 MB | **5.149 ms** / **3.3 MB** | **1.28x**, **−3%** |
| `float8` of 5k rows | 6.131 ms / 3.4 MB | **4.420 ms** / **3.2 MB** | **1.39x**, **−4%** |
| `float8[]` of 5k in one row | 5.819 ms / 3.6 MB | **1.865 ms** / **984 KB** | **3.12x**, **−73%** |
| `int4[]` of 100k in one row | 64.125 ms / 27.3 MB | **19.561 ms** / **13.4 MB** | **3.28x**, **−51%** |
| `bytea` of 4MB | 108.827 ms / 69.2 MB | **50.756 ms** / **21.6 MB** | **2.14x**, **−69%** |
| 20 inserts in one transaction | 16.008 ms / 1.1 MB | **14.091 ms** / 1.1 MB | **1.14x**, +6% |
| 32 concurrent `count()`, pool of 4 | 16.786 ms / 1.3 MB | **10.173 ms** / 1.3 MB | **1.65x**, +3% |
| 32 concurrent `findFirst`, pool of 4 | 11.908 ms / 1.6 MB | **4.454 ms** / **1.6 MB** | **2.67x**, **−3%** |
| 32 concurrent `findMany`, pool of 4 | 10.062 ms / 1.3 MB | **4.266 ms** / **1.3 MB** | **2.36x**, **−3%** |

`@prisma/client` 7.10.0, `@prisma/adapter-pg` 7.10.0, `postgrejs` 3.12.1, `pg` 8.23.0, PostgreSQL
18.6, Node 24.15.0, on loopback. Medians per call; the second figure in each cell is what one call
asks the runtime for (`heapUsed` and `external` together).

**The gain follows the shape of the workload, not its size.** The same 5000 `float8` values read as
5000 rows gain 1.39x; packed into one array column in one row, 3.12x — the protocol's per-row cost
is paid by both adapters, so binary decoding is worth what the rows are wide. Large payloads gain
most: 2.14x on a 4MB `bytea`, and 3.28x on an `int4[]` of 100k values that use the whole type. And
once there's more concurrency than pool, up to 2.67x — which is what a web application under load
actually looks like.

## How the numbers were measured

Both adapters run in one process and alternate on every iteration, so neither gets a warmer machine
than the other. Each figure is the median of 101 iterations, or 61 where one of them costs more.
Memory is a pass of its own, one child process per adapter, so what a client allocates once and
keeps is inside the window rather than under it. Everything above is through a real `PrismaClient`.

The medians alone wouldn't be worth much — this was a shared machine, and the absolute figures
drift by up to 25% between runs. What doesn't drift is *which* of the two won each iteration, so
that's counted separately:

| Workload | Iterations | `prisma-postgrejs` faster in | Odds of that by luck |
|:---|:---|:---|:---|
| Primary-key lookup | 101 | 96 | < 1 in 10²² |
| 10k rows, mixed scalars | 101 | 101 | < 1 in 10³⁰ |
| 10k rows, `int8`/`numeric`/`timestamp` | 101 | 98 | < 1 in 10²⁴ |
| Point read | 101 | 99 | < 1 in 10²⁶ |
| Page of 200 | 101 | 92 | < 1 in 10¹⁷ |
| `uuid` of 5k rows | 101 | 101 | < 1 in 10³⁰ |
| `float8` of 5k rows | 101 | 101 | < 1 in 10³⁰ |
| `float8[]` of 5k in one row | 101 | 101 | < 1 in 10³⁰ |
| `int4[]` of 100k in one row | 61 | 61 | < 1 in 10¹⁸ |
| `bytea` of 4MB | 61 | 61 | < 1 in 10¹⁸ |
| 20 inserts in one transaction | 101 | 96 | < 1 in 10²² |
| 32 concurrent `count()`, pool of 4 | 61 | 60 | < 1 in 10¹⁶ |
| 32 concurrent `findFirst`, pool of 4 | 61 | 61 | < 1 in 10¹⁸ |
| 32 concurrent `findMany`, pool of 4 | 61 | 61 | < 1 in 10¹⁸ |

That last column is a [sign test](https://en.wikipedia.org/wiki/Sign_test): two adapters of equal
speed would split the iterations evenly, so it gives the probability of a split this lopsided from
a fair coin. It says the differences are real, and nothing about their size — that's what the
speedup column is for.

Result columns arrive in PostgreSQL's binary format and are decoded per type, where `pg` asks for
text and parses it. On bulk that's the whole difference: a 100k-element `int4[]` costs 19.561 ms
and 13.4 MB here against 64.125 ms and 27.3 MB, because the text path has to materialize the array
literal as one string before it can parse it. It's cheaper on the wire too, where the text is
longer than the value: the 4MB `bytea` costs 8.0 MB of network under `@prisma/adapter-pg` and 4.0
MB here, counted at the socket — 2.0 times.

`postgrejs` names and caches a statement per connection — 64 by default, least-recently-used
closed — so each distinct SQL string is parsed and planned once rather than on every call. Counted
from the backend: 4 queries through this adapter leave 4 prepared statements behind, and the same 4
through `@prisma/adapter-pg` leave 0 — a default rather than a limitation, since the reference
adapter only names a statement when given a `statementNameGenerator`, and without one `pg` sends it
unnamed and the server parses it again every time. It's what most of the ordinary rows' margin is
made of.

Prisma's query engine sits on both sides of every call, so it compresses these ratios rather than
causing them. Measured again through the `SqlDriverAdapter` alone, on the same SQL the engine
emits, the 4MB `bytea` is 2.30x and allocates 4.2 MB against 52.0 MB, and the `int4[]` 4.94x. The
table above is the smaller of the two numbers on purpose — it's the one a caller actually gets.

Where Prisma wants PostgreSQL's own text — `numeric`, the date and time family, and their array
forms — `postgrejs` asks the *server* for it, as a Bind format code, rather than decoding the value
and printing it again. So the string is PostgreSQL's own and nothing on this side has to track the
session's `DateStyle`, `IntervalStyle` or `TimeZone` to produce it. The reference adapter reaches
the same place by switching `pg`'s parsers off one at a time.

## Tested against Prisma's own suite

`prisma-postgrejs` is run against the functional suite from the `prisma/prisma` repository at the
version it targets — the same suite Prisma runs its own adapters through — with
`@prisma/adapter-pg` over the same server in the same invocation as the control. Tag 7.10.0,
PostgreSQL 18.4, 191 suite files selected for `provider=postgresql`:

| | `@prisma/adapter-pg` | `prisma-postgrejs` |
|:---|:---|:---|
| Tests | 1251 | 1251 |
| Passed | 1251 | 1251 |

Same tests, and both pass every one of them — not a single test `prisma-postgrejs` loses that
`@prisma/adapter-pg` wins. There's no expected-failure list either: the control run measures the
baseline on the machine it's run on, so that's the only thing the comparison can fail on. Left out
of the table: 81 more that fail identically on both sides and so judge neither adapter — a local
clone of the Prisma repository doesn't have the `/client/…` path its inline snapshots were recorded
against.

On top of that, 360 tests of this package's own — including a differential suite that runs every
case through `@prisma/adapter-pg` as well and compares the two; every divergence below was found by
running it.

## What changes when you switch

Measured against `@prisma/adapter-pg@7.10.0` on the same schema and the same server.

### Values

| Case | `@prisma/adapter-pg` | `prisma-postgrejs` |
|:---|:---|:---|
| `timetz` on any offset but zero | wrong instant, silently | correct — see below |
| `money` below zero in a `$queryRaw`, e.g. `-$0.05` | throws `DecimalError` | `-0.05` |
| `money` at or above 1000 in a `$queryRaw` | throws `DecimalError` | `1234.5` |
| Any temporal type on a server whose `DateStyle` isn't `ISO` | throws `Invalid time value` | correct |
| `timestamptz` on a session whose `TimeZone` isn't UTC | wrong instant, silently | correct |
| `"char"[]` | the raw literal `"{a}"` | `["a"]` |

The `money` rows say `$queryRaw` deliberately: on a **model** read the query compiler emits
`"m"::numeric`, so the column arrives as a `numeric` and neither adapter's `money` handling is
reached.

Everywhere else the two agree — including the cases where the raw values differ but the engine
converts them to the same thing, checked through a real `PrismaClient` rather than at the adapter
boundary. Where Prisma can't carry a type at all they agree exactly: 23 of 74 PostgreSQL types
raise `UnsupportedNativeDataType` in both.

### `timetz`

A `timetz` carries an offset and that offset is the column's data. Prisma appends a `Z` to
whatever it's handed for a `Time`, so the value has to arrive already at UTC with no offset on it.
`@prisma/adapter-pg` drops the offset and keeps the wall clock; `prisma-postgrejs` moves the clock
to UTC first. On a `DateTime @db.Timetz` field holding `10:20:30+03` — the instant `07:20:30Z`:

| | Model read | `$queryRaw` |
|:---|:---|:---|
| `@prisma/adapter-pg` | `10:20:30Z` — out by the offset | `10:20:30Z` — out by the offset |
| `prisma-postgrejs` | `07:20:30Z` | `07:20:30Z` |

Only offset zero agrees. Everywhere else the reference is out by it, and `10:20:30+03` and
`10:20:30-05` arrive there as the same value.

### Several statements in one `$executeRaw`

Both run them; the row count differs:

```ts
// t holds 1, 2, 3
await prisma.$executeRawUnsafe(`update t set a = a + 1; delete from t where a = 2`);
// @prisma/adapter-pg -> 0
// prisma-postgrejs   -> 4   (3 rows updated, then 1 deleted)
```

The count is what the contract asks for — "the number of affected rows" — summed over the script.
The reference answers `0` for any script, which is a consequence rather than a decision: `pg`
returns an *array* of results for a multi-command query, and an array has no `rowCount`.

Inside an interactive transaction it works the same way, on that transaction's own connection — so
a rollback takes the script with it.

### Errors

The two produce the same `PrismaClientKnownRequestError` for the same failure — `P2002` for a
unique violation, `P2010` with the same `kind` and SQLSTATE for a raw query. Getting there took one
thing `@prisma/adapter-pg` doesn't have to do: `postgrejs` appends a source excerpt to
`Error.message` wherever the server reported a position, so the mapping reads
[`DatabaseError.serverMessage`](../api/classes/database-error.md) — the text exactly as PostgreSQL
sent it — and a port that missed that would lose the column name from every `ColumnNotFound`.

### Transactions

Both report `usePhantomQuery: false` and drive Prisma's savepoints, so nested interactive
transactions, all four isolation levels and the `SNAPSHOT` rejection behave identically, and
`COMMIT` and `ROLLBACK` appear in `PrismaClient`'s `query` event and tracing spans exactly as they
do with `@prisma/adapter-pg`. (Neither adapter's `BEGIN` appears there: both send it themselves,
and the engine logs only the statements it issues.)

The difference is the `BEGIN`: PostgreSQL accepts `BEGIN ISOLATION LEVEL SERIALIZABLE` as a single
statement, so an isolated transaction opens in one round trip where the reference sends `BEGIN`
and then `SET TRANSACTION ISOLATION LEVEL`.

### `executeRaw` on a `SELECT`

`pg` reports the number of rows a `SELECT` returned as its `rowCount` and `@prisma/adapter-pg`
passes that through; `postgrejs` reports `rowsAffected` only for `INSERT`/`UPDATE`/`DELETE`/`MERGE`.
This adapter falls back to the row count so the number `$executeRaw` gives back doesn't change when
you switch.

## Full documentation

See the [`prisma-postgrejs` README](https://github.com/panates/postgrejs-prisma#readme) and its
[full benchmark report](https://github.com/panates/postgrejs-prisma/blob/main/doc/BENCHMARKS.md)
for the complete method and every figure behind the tables above, and [prisma.io](https://www.prisma.io)
for Prisma itself — none of that is `postgrejs`-specific.
