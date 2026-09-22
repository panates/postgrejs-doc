---
sidebar_position: 5
---

# Prisma

[`prisma-postgrejs`](https://github.com/panates/postgrejs-prisma) is a
[Prisma](https://www.prisma.io) driver adapter for `postgrejs` — a Prisma schema runs on
`postgrejs`'s wire-protocol client instead of `pg`, through Prisma's own driver adapter interface.
It's a drop-in swap for `@prisma/adapter-pg`: the same `PrismaClient({ adapter })` call, the same
schema, the same queries.

## Installation

```bash
npm install prisma-postgrejs postgrejs @prisma/driver-adapter-utils
```

`postgrejs` (`>=3.10.0 <4`) and `@prisma/driver-adapter-utils` (`>=7.10.0 <9`) are peer
dependencies — the second one because `@prisma/client` doesn't bring it along. Node `>=22`.

## Usage

At Prisma 7 a driver adapter is how a client connects, so there's no `url` in the datasource block:

```prisma
datasource db {
  provider = "postgresql"
}
```

Pass the adapter where you'd have passed `PrismaPg`:

```ts
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPostgreJS } from 'prisma-postgrejs';

const adapter = new PrismaPostgreJS('postgresql://user:secret@localhost:5432/mydb');
const prisma = new PrismaClient({ adapter });

await prisma.user.findMany({ where: { active: true } });
```

Three ways to say where the database is:

```ts
new PrismaPostgreJS('postgresql://user:secret@localhost:5432/mydb'); // a connection string
new PrismaPostgreJS({ host: 'localhost', database: 'mydb', max: 10 }); // postgrejs's pool options
new PrismaPostgreJS(pool); // a Pool you made yourself
```

`prisma.$disconnect()` closes a pool this package opened. A `Pool` you passed in stays yours — it's
left open, so it can go on serving whatever else is using it.

:::note Migrations don't go through the adapter
`prisma migrate` and `prisma db push` connect with Prisma's own built-in connector — nothing in
`prisma` or `@prisma/client` calls `connectToShadowDb` — so they need a URL of their own in
`prisma.config.ts`, separately from the adapter `PrismaClient` gets:

```ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
```
:::

## Options

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
| `pipeline` | `true` | Lets a statement share a pooled connection with statements already in flight — `postgrejs`'s own default is off, this adapter turns it on since Prisma issues genuinely concurrent statements. `false` gives each statement the connection to itself |
| `onPoolError` | | Called when a pooled connection is lost or one couldn't be opened — Prisma has nowhere else to report either, so without this they're only visible as the failure of whatever query was in flight |

`rollbackOnError` is fixed off (unlike `postgrejs`'s own default), so a failed statement inside a
transaction poisons it exactly the way `pg` does — an adapter meant to be swapped in must not
change that behavior.

## Why this adapter

- **Faster queries**, measured end to end through a real `PrismaClient` — most of all where an
  application spends its time, on round trips and on concurrency.
- **Correct values in two places the reference adapter gets silently wrong** — a `timetz` on any
  non-zero offset, and `money` in raw SQL. See [How it differs](#how-it-differs-from-prismaadapter-pg).
- **Checked against Prisma's own functional suite** — 1250 of its tests pass, with
  `@prisma/adapter-pg` run over the same server in the same invocation as the control.

| Workload | `@prisma/adapter-pg` | `prisma-postgrejs` | Speedup |
|:---|:---|:---|:---|
| Primary-key lookup | 0.788 ms | 0.555 ms | **1.42x** |
| 10k rows, mixed scalars | 17.006 ms | 14.828 ms | **1.15x** |
| 10k rows, `int8`/`numeric`/`timestamp` | 18.793 ms | 15.066 ms | **1.25x** |
| 20 inserts in one transaction | 14.179 ms | 9.878 ms | **1.44x** |
| 32 concurrent `count()`, pool of 4 | 8.46 ms | 5.88 ms | **1.44x** |
| 32 concurrent `findFirst`, pool of 4 | 4.84 ms | 1.95 ms | **2.48x** |
| 32 concurrent `findMany`, pool of 4 | 4.47 ms | 1.90 ms | **2.35x** |

Prisma 7.10.0, PostgreSQL 18.4, loopback, Node 24. Medians.

The gain grows with the shape of the workload: a bulk read of ordinary scalars gains 1.15x, a
round-trip-bound query 1.4x, and once there's more concurrency than pool, 2.5x — that last one is
what a web application under load actually looks like.

### How the numbers were measured

Both adapters run in one process and alternate on every iteration, so neither gets a warmer machine
than the other. Each figure above is the median of 101 iterations, or 61 for the concurrent
workloads.

The medians alone wouldn't be worth much — measured on a shared machine, the absolute figures
drift by up to 25% between runs; the same `@prisma/adapter-pg` baseline came out at both 0.613 ms
and 0.788 ms in one session. What doesn't drift is *which* adapter won each iteration, so that's
counted separately, as a [sign test](https://en.wikipedia.org/wiki/Sign_test):

| Workload | Iterations | `prisma-postgrejs` faster in | Odds of that by luck |
|:---|:---|:---|:---|
| Primary-key lookup | 101 | 90 | < 1 in 10¹⁶ |
| 10k rows, mixed scalars | 101 | 85 | < 1 in 10¹² |
| 10k rows, `int8`/`numeric`/`timestamp` | 101 | 86 | < 1 in 10¹² |
| 20 inserts in one transaction | 101 | 87 | < 1 in 10¹³ |
| 32 concurrent `count()`, pool of 4 | 61 | 61 | < 1 in 10¹⁸ |
| 32 concurrent `findFirst`, pool of 4 | 61 | 60 | < 1 in 10¹⁶ |
| 32 concurrent `findMany`, pool of 4 | 61 | 61 | < 1 in 10¹⁸ |

Only which adapter won counts; by how much is thrown away, which is exactly what makes it survive
a noisy machine. Two adapters of equal speed would split the iterations evenly, so the last column
is the probability of seeing a split that lopsided from a fair coin — it says the differences are
real, and says nothing about their size, which is what the speedup column is for.

### Where the speed comes from

Five things, each measured on its own. All five are properties of how the client talks to
PostgreSQL rather than of how it decodes values, so the gain holds whatever column types your
schema uses, and it's largest exactly where an application is slowest: waiting on the network.

**It reads the wire format, not a rendering of it.** Values arrive in PostgreSQL's binary format
and are decoded per type — which is why `prisma-postgrejs` is the only one of the two that survives
a server whose `DateStyle` isn't ISO, since there's no text to misread. Where Prisma genuinely wants
the server's own text, `postgrejs` asks the *server* for it as a Bind format code, rather than
decoding the value and re-rendering it. That lever is used sparingly, because measurement said to —
asking for text costs 10–14% on a bulk read, since the payload is bigger and the binary decoders
are faster than not decoding. It's set for exactly five OIDs — `int8`, `numeric`, `json`, `jsonb`
and `timetz` — each a type whose decoded form Prisma would reject outright or silently round.

**It can put more than one statement on a connection at a time.** A pooled query may share a
connection with statements already in flight instead of waiting for one of its own; `pg` takes the
other approach and serializes statements per client. This is what the concurrent rows above
measure: with 32 statements over a pool of four, `findFirst` goes from 4.10 ms unshared to 1.95 ms
shared, against 4.84 ms for the same workload through `@prisma/adapter-pg`. Sharing is safe here
because nothing `prisma-postgrejs` runs outside a transaction carries session state, and a
transaction holds a connection of its own that's never shared — verified with five concurrent
statements on one shared connection and two of them failing, each caller got its own result or its
own error, and the connection stayed usable.

**It keeps prepared statements.** `postgrejs` names and caches a statement per connection (64 by
default) and reuses it, so the server parses and plans each distinct SQL once rather than on every
call — counted from the backend after five identical queries, `prisma-postgrejs` leaves 2 prepared
statements behind. Isolated on a repeated parameterized query, the cache alone is worth **1.26x**
(faster in 184 of 201 alternated iterations); Prisma sends the same handful of SQL strings over and
over, which is the shape that benefits most.

**It takes the transaction's modes on the `BEGIN`.** PostgreSQL accepts
`BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY` as one statement, and `prisma-postgrejs` uses that
form, so an isolated transaction opens in one round trip instead of the two a separate
`SET TRANSACTION` needs — opening and closing one: **1.48x** (0.740 ms to 0.500 ms, faster in 195
of 201).

**It asks the server rather than guessing.** `money`'s scale and decimal separator come from
`lc_monetary`, which a client can't know. `postgrejs` probes it once per connection, and only on
the first result that actually contains a `money` column, so a `money` value is decoded exactly
instead of being read off a rendering meant for a human. `pg` has no equivalent and hands back the
rendering.

## Prisma's own test suite

`prisma-postgrejs` is run against the functional suite from the `prisma/prisma` repository, at the
version it targets — the same suite Prisma runs its own adapters through — with
`@prisma/adapter-pg` over the same server in the same invocation as the control. Tag 7.10.0,
PostgreSQL 18.4, 191 suite files selected for `provider=postgresql`:

| | `@prisma/adapter-pg` | `prisma-postgrejs` |
|:---|:---|:---|
| Passed | 1251 | 1250 |
| Failed | 81 | 83 |

The 81 failures both share are the checkout's own — inline snapshots that expect the CI's
`/client/…` path. There's no expected-failure list: the control run measures the baseline, and the
only thing that fails the comparison is a test `prisma-postgrejs` loses that the reference wins.
One does: a test whose setup puts two statements in one `$executeRawUnsafe` — a deliberate
difference, explained below.

## How it differs from `@prisma/adapter-pg`

Measured against `@prisma/adapter-pg@7.10.0`, same schema, same server, by a differential test
suite that runs every case through both and compares the results.

### Values

Every row here is a case where the two hand Prisma different values:

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
reached. It's raw SQL selecting a bare `money` column where it shows, and there
`@prisma/adapter-pg`'s normalization — a plain `text.slice(1)` over the server's `-$1,234.50` —
takes the minus sign rather than the symbol and leaves the separators in.

The rest trace back to the same two causes: the engine parsing a non-ISO date string it can't read,
where `prisma-postgrejs` decodes from the binary form that no `DateStyle` can affect; and `pg`
having no array parser registered for OID 1002, so the `"char"[]` literal leaks through where the
column type promised an array.

Everywhere else the two agree, including cases where the raw values differ but the engine converts
them to the same thing (`int8[]`, `numeric[]`, `json[]`, the temporal arrays) — checked through a
real `PrismaClient` rather than at the adapter boundary, since the raw value isn't what a user
sees. Where Prisma can't carry a type at all, the two agree exactly: 23 of 74 PostgreSQL types —
`interval`, the range family, the geometric family, `tsvector`, `macaddr` and the rest — raise
`UnsupportedNativeDataType` in both, because Prisma's `ColumnType` has no member for them.

### `timetz`, where this adapter is right and the reference is not

PostgreSQL writes a `timetz` as `10:20:30+03`, and the offset is the column's data. Prisma appends
a `Z` to whatever it's handed for a `Time`, on both paths it reads one — so the value has to arrive
already at UTC, with no offset on it. `@prisma/adapter-pg` drops the offset and keeps the wall
clock; `prisma-postgrejs` moves the clock to UTC first. Measured end to end on a
`DateTime @db.Timetz` field holding `10:20:30+03` — the instant `07:20:30Z`:

| | Model read | `$queryRaw` |
|:---|:---|:---|
| `@prisma/adapter-pg` | `10:20:30Z` — out by the offset | `10:20:30Z` — out by the offset |
| `prisma-postgrejs` | `07:20:30Z` | `07:20:30Z` |

Only the offset-zero case agrees. Everywhere else the reference is out by it, and `10:20:30+03` and
`10:20:30-05` become the same value there.

### Several statements in one `$executeRaw`

`prisma-postgrejs` raises `42601 cannot insert multiple commands into a prepared statement`;
`@prisma/adapter-pg` runs them. Prisma's own adapter contract draws that line itself —
`executeRaw(params: Query)` is *"Execute a query"* and `executeScript(script: string)` is
*"Execute multiple SQL statements separated by semicolon"* — so a script belongs on the second, and
`$executeRaw` is the first. It only works on the reference adapter because `pg` chooses its wire
protocol from whether the call happened to have parameters: with none it sends a simple `Query`
instead of Parse/Bind/Execute, so the same statement quietly loses its prepared statement and its
per-statement error boundary, and gains the right to carry several commands.
`prisma-postgrejs` doesn't do that — send the statements one at a time.

### Errors

The two produce the same `PrismaClientKnownRequestError` for the same failure — `P2002` for a
unique violation, `P2010` with the same `kind` and SQLSTATE for a raw query — which took one thing
this adapter has to do differently. `postgrejs` appends a source excerpt to `Error.message`
wherever the server reported a position, and `@prisma/adapter-pg` extracts detail from `message`
with patterns, one of them anchored (`message.match(/^column (.+) does not exist$/)`, which never
matches a decorated message). So the mapping reads
[`DatabaseError.serverMessage`](../api/classes/database-error.md) — the text exactly as PostgreSQL
sent it — rather than `message`. A port that missed that would lose the column name from every
`ColumnNotFound` and show users a caret diagram inside a `P2010`.

### Transactions

Both report `usePhantomQuery: false` and drive Prisma's savepoints, so nested interactive
transactions, all four isolation levels and the `SNAPSHOT` rejection behave identically, and
`BEGIN`, `COMMIT` and `ROLLBACK` appear in `PrismaClient`'s `query` event and tracing spans exactly
as they do with `@prisma/adapter-pg`. The one difference is the `BEGIN` itself — see
[Where the speed comes from](#where-the-speed-comes-from) above.

### `executeRaw` on a `SELECT`

`pg` reports the number of rows a `SELECT` returned as its `rowCount`, and `@prisma/adapter-pg`
passes that through. `postgrejs` reports `rowsAffected` only for `INSERT`/`UPDATE`/`DELETE`/`MERGE`,
where the two agree exactly. This adapter falls back to the row count so the number `$executeRaw`
gives back doesn't change when you switch — found by the differential suite, not by reading either
implementation.

## Requirements

- Node.js `>= 22`
- `postgrejs >= 3.10.0`. The adapter is built on six things that release carries: `money` decoding,
  `DatabaseError.serverMessage`, opt-in pooled pipelining, `fetchAsString` naming an array column
  by its element type, a `postgresql://` connection string keeping its database, and an array
  parameter going out with no declared element type. Five of the six exist because this adapter's
  reconnaissance round measured them and reported them upstream.
- `@prisma/client` / `@prisma/driver-adapter-utils >= 7.10.0`

## Full documentation

See the [`prisma-postgrejs` README](https://github.com/panates/postgrejs-prisma#readme) for the
complete benchmark methodology and every differential-testing result, and
[prisma.io](https://www.prisma.io) for Prisma itself — none of that is `postgrejs`-specific.
