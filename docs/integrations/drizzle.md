---
sidebar_position: 3
---

# Drizzle ORM

[`drizzle-postgrejs`](https://github.com/panates/postgrejs-drizzle) is a
[Drizzle ORM](https://orm.drizzle.team) driver for `postgrejs`. Put it where
`drizzle-orm/node-postgres` goes and everything above it stays the same — your schema, your
queries, your migrations.

It's faster where it counts, and holds far less memory doing it. A 4MB `bytea` comes back in
13.6&nbsp;ms against 30.4&nbsp;ms, at 4.5&nbsp;MB against 51.7&nbsp;MB — `pg` holds that column as
hex text, twice the size, off the JS heap where a heap figure alone can't see it. A 100k-element
`int4[]` runs 3.9x, at 2.3&nbsp;MB against 33.6&nbsp;MB. Ordinary queries gain less and gain it
repeatably: a point read is the faster of the two in 100 of 101 alternated pairs. And the client
underneath can do things Drizzle has no way to ask for.

## Installation

```bash
npm install drizzle-postgrejs drizzle-orm postgrejs
```

`drizzle-orm` (`>=0.44.6 <0.46.0`) and `postgrejs` (`>=3.11.0 <4`) are peer dependencies. Node
`>=22`, PostgreSQL 14 or later — 14 and 18 are what CI runs.

The 0.45 line is what this targets. Drizzle's own 1.0 rewrites the driver seam — `PgPreparedQuery`
becomes `PgBasePreparedQuery`, row mode moves from a flag to a method, type handling becomes a
per-driver codec table — so a 1.0 driver will be a rewrite rather than an adaptation.

## Quick start

```ts
import { drizzle } from 'drizzle-postgrejs';

const db = drizzle('postgres://localhost:5432/mydb');

await db.select().from(users).where(eq(users.name, 'ada'));
```

That's the whole change.

## Usage

### Connecting

Four ways to say where the database is — the same four `drizzle-orm/node-postgres` takes:

```ts
drizzle('postgres://localhost:5432/mydb'); // a connection string
drizzle({ connection: 'postgres://…' }); // the same, named
drizzle({ connection: { host, port, database } }); // postgrejs's own options
drizzle(pool); // a Pool you made yourself
```

A pool this package opened is on `db.$client`, closed with `await db.$client.close()`. A
`Connection` works in place of a `Pool` when a single connection is what's wanted.

### Queries

Relational queries need the schema, as usual:

```ts
const db = drizzle(pool, { schema });

await db.query.users.findMany({ with: { posts: true } });
```

Transactions hold one connection for the whole block and give it back however it ends; a nested
transaction is a savepoint:

```ts
await db.transaction(async tx => {
  await tx.insert(users).values({ name: 'ada' });
  await tx.transaction(async inner => {
    await inner.insert(posts).values({ userId: 1, title: 'one' });
  });
});
```

Everything Drizzle's interface doesn't reach — `COPY`, `LISTEN`/`NOTIFY`, cursors, large objects,
logical replication — is still there on the `postgrejs` pool passed in, or on `db.$client`.

### Options

Drizzle's own options (`schema`, `logger`, `casing`, `cache`) work as on any driver. These are this
driver's:

| Option | Default | What it does |
|:---|:---|:---|
| `unknownTypesAsString` | `true` | Ask the server for text on any column `postgrejs` has no decoder for |
| `fetchAsString` | `[]` | Extra OIDs to fetch as text, on top of the ones Drizzle needs |
| `prepare` | `postgrejs`'s own | `false` keeps statements out of `postgrejs`'s prepared-statement cache |

The defaults are set so every column reaches Drizzle in the shape its own column mappers were
written for, and so PostgreSQL types each parameter from where it lands rather than from the
JavaScript value's own shape. See the
[`drizzle-postgrejs` driver-design notes](https://github.com/panates/postgrejs-drizzle/blob/main/doc/DRIVER-DESIGN.md)
for the measurement behind each default.

### Migrations

`drizzle-kit generate` needs nothing from this package — it reads your schema files and writes
SQL. Applying them is `migrate()`, the same call `drizzle-orm/node-postgres/migrator` exposes,
reaching Drizzle's own runner through this driver:

```ts
import { migrate } from 'drizzle-postgrejs';

await migrate(db, { migrationsFolder: './drizzle' });
```

`drizzle-kit migrate` and `drizzle-kit push` are the other way to apply them, and they connect on
their own rather than through a driver — `drizzle-kit` reaches for `pg` for a `postgresql` dialect
and has no seam a third-party driver can enter. So they need their own `dbCredentials` in
`drizzle.config.ts`, unchanged by which driver the application uses.

## Why

It's a drop-in swap for `drizzle-orm/node-postgres`: the same `drizzle(client)` call, the same
schema, the same queries, the same migrations. What that buys:

- **Faster where the payload is large** — 2.2x on a 4MB `bytea`, and 3.9x on a 100k-element
  `int4[]` whose values use the whole type, on a fraction of the memory, because values arrive in
  PostgreSQL's binary format rather than as text to be parsed.
- **Slightly faster on ordinary round trips**, repeatably — statements are prepared and reused
  without anyone asking for it.
- **A client that can do what Drizzle has no way to ask for** — cursors, `COPY`, `LISTEN`/`NOTIFY`,
  large objects, logical replication and pipelining, on the same pool your queries use.
- **Checked against Drizzle's own integration suite** — 183 of its tests pass, with
  `drizzle-orm/node-postgres` run over the same server in the same invocation as the control.

| Scenario | node-postgres | `drizzle-postgrejs` | Speedup / memory |
|:---|:---|:---|:---|
| Point read — 1 row of 9 columns | 0.283 ms / 28 KB | **0.248 ms** / 31 KB | **1.14x**, +11% |
| Page of 200 — 200 rows of 9 columns, mixed types | 0.721 ms / 398 KB | **0.632 ms** / **298 KB** | **1.14x**, **−25%** |
| Concurrent reads — 20 at once, pool of 10 | 1.105 ms / **472 KB** | **1.013 ms** / 543 KB | **1.09x**, +15% |
| `int4[]` of 100k, full width | 22.135 ms / 33.6 MB | **5.616 ms** / **2.3 MB** | **3.94x**, **−93%** |
| `float8` of 5k rows, full width | 1.104 ms / **1.4 MB** | **0.728 ms** / 1.5 MB | **1.52x**, +1% |
| `float8[]` of 5k in one row | 2.231 ms / 2.8 MB | **0.579 ms** / **232 KB** | **3.85x**, **−92%** |
| `uuid` of 5k rows | 1.202 ms / **1.5 MB** | **0.875 ms** / 1.6 MB | **1.37x**, +3% |
| `box` of 5k rows | 2.006 ms / 2.0 MB | **1.036 ms** / 2.0 MB | **1.94x**, level |
| `bytea` of 4MB | 30.371 ms / 51.7 MB | **13.625 ms** / **4.5 MB** | **2.23x**, **−91%** |
| Insert one row — 6 parameters | 0.308 ms / **28 KB** | **0.272 ms** / 35 KB | **1.13x**, +23% |
| Insert 500 rows — 1 statement, 2500 parameters | 4.605 ms / **3.7 MB** | **4.370 ms** / 4.0 MB | **1.05x**, +7% |
| Insert a 4MB `bytea` — binary both sides | 14.267 ms / 5.2 MB | **13.873 ms** / **4.0 MB** | **1.03x**, **−22%** |
| Insert a 100k `int4[]` — text both sides | 16.765 ms / 27.3 MB | **12.800 ms** / **1.8 MB** | **1.31x**, **−93%** |
| Twenty inserts in a transaction | 5.997 ms / **370 KB** | **5.203 ms** / 470 KB | **1.15x**, +27% |

`drizzle-orm` 0.45.3, `postgrejs` 3.12.1, PostgreSQL on loopback, Node 24.15.0. Medians — how that
was measured is below.

**The gain follows the payload, not the query.** An ordinary read or write gains a little and gains
it consistently; a column that carries bulk — an array, a `bytea`, anything large in a raw
`db.execute()` — gains twice over, in time and in memory. A schema of text, integers and
timestamps sees the top of this table, not the bottom.

## How the numbers were measured

Both drivers run in one process and alternate inside every pair, with the order swapped each time,
so neither gets a warmer machine than the other. Each figure above is a median of 101 pairs, or 61
and 41 for the heavier workloads.

The medians alone wouldn't be worth much — this is a shared machine, and the absolute figures
drift (the same `node-postgres` point read came out at 0.270 ms and 0.521 ms in two runs an hour
apart). What doesn't drift is *which* driver won each pair, so that's counted separately:

| Scenario | Pairs | `drizzle-postgrejs` faster in | Odds of that by luck |
|:---|:---|:---|:---|
| Point read | 101 | 100 | < 1 in 10²⁸ |
| Page of 200 | 101 | 81 | < 1 in 10⁹ |
| Concurrent reads | 61 | 52 | < 1 in 10⁷ |
| `int4[]` of 100k, full width | 41 | 41 | < 1 in 10¹² |
| `float8` of 5k rows, full width | 61 | 61 | < 1 in 10¹⁸ |
| `float8[]` of 5k in one row | 61 | 61 | < 1 in 10¹⁸ |
| `uuid` of 5k rows | 61 | 61 | < 1 in 10¹⁸ |
| `box` of 5k rows | 61 | 61 | < 1 in 10¹⁸ |
| `bytea` of 4MB | 41 | 41 | < 1 in 10¹² |
| Insert one row | 101 | 100 | < 1 in 10²⁸ |
| Insert 500 rows | 61 | 43 | p = 0.002 |
| Insert a 4MB `bytea` | 41 | 29 | p = 0.012 |
| Insert a 100k `int4[]` | 41 | 41 | < 1 in 10¹² |
| Twenty inserts in a transaction | 61 | 61 | < 1 in 10¹⁸ |

That's a [sign test](https://en.wikipedia.org/wiki/Sign_test) — only which driver won counts, and
by how much is thrown away, which is exactly what makes it survive a noisy machine. Two drivers of
equal speed would split the pairs evenly, so the last column is the probability of seeing a split
that lopsided from a fair coin. Two rows say "not distinguishable" and are reported that way rather
than rounded into a win.

Result columns arrive in PostgreSQL's binary format and are decoded per type, where `pg` asks for
text and parses it — on bulk that's the whole difference: a 100k-element `int4[]` costs 5.6 ms and
2.3 MB here against 22.1 ms and 33.6 MB, because the text path has to materialize the array literal
as one string before it can parse it. It's cheaper on the wire too — a `bytea` in text is
`\x`-prefixed hex, two characters per byte, so the 4MB column costs 8MB of network under `pg` and
4MB here.

`postgrejs` names and caches a statement per connection — 64 by default, least-recently-used
closed — so each distinct SQL string is parsed and planned once rather than on every call. Counted
from the backend: three queries through this driver leave one prepared statement behind, and the
same three through `drizzle-orm/node-postgres` leave none, because `pg` prepares only a query it
was given a name for and Drizzle doesn't give it one — that's what the point read's 100 of 101
pairs is. Drizzle's own `.prepare(name)` still works as it always did; it's no longer the only way
to get a statement prepared.

Where Drizzle's column mappers want PostgreSQL's own text — `numeric`, the date and time family,
and their array forms — `postgrejs` asks the *server* for text, as a Bind format code, rather than
decoding the value and printing it again. So the string is PostgreSQL's own and can't drift from
what `pg` received, and nothing on this side has to track the session's `DateStyle`,
`IntervalStyle` or `TimeZone` to produce it.

`postgrejs` can put several statements on one connection at a time. This driver doesn't ask it
to — every query gets a connection to itself, exactly as under `pg` — and the concurrency row above
is level because of that, not despite it. The headroom is real and unclaimed.

Run it yourself with `npm run bench` in the `drizzle-postgrejs` repo; its
[`doc/BENCHMARKS.md`](https://github.com/panates/postgrejs-drizzle/blob/main/doc/BENCHMARKS.md)
has the peak-heap figures and the rest of the method.

## Tested against Drizzle's own suite

`integration-tests/tests/pg/pg-common.ts` in the drizzle-orm repository is a shared suite every
driver Drizzle ships points at itself, declaring what it can't pass through `skipTests()`. This
driver runs it with no skips at all, twice — once on itself and once on
`drizzle-orm/node-postgres` over the same server in the same invocation, as the control:

```
node-postgres (control)  183 / 183
drizzle-postgrejs        183 / 183
```

Same tests, and both pass every one of them — not a single test this driver loses that
`node-postgres` wins. There's no expected-failure list either: the control run measures the
baseline on the machine it's run on, so that's the only thing the comparison can fail on. It has to
be a control rather than a fixed number, because the suite asserts row order in three places
without writing an `ORDER BY`, so its score moves with the PostgreSQL version — 183 of 183 on the
14 its own Docker setup pins, 180 of 183 on 18, for both drivers alike. On drizzle-orm 0.44.6, the
other end of the peer range, the suite is 179 tests and both score 179. A weekly CI job runs the
matrix of both Drizzle versions against PostgreSQL 14 and 18.

On top of that, 212 tests of this package's own — including a differential suite that runs every
case through `drizzle-orm/node-postgres` as well and compares the two.

## What changes when you switch

Measured against `drizzle-orm/node-postgres` on the same schema and the same server.

### Values

Drizzle has a column for none of these, so they reach you only through a raw `db.execute()`:

| Case | `node-postgres` | `drizzle-postgrejs` |
|:---|:---|:---|
| `money` | `"$12.34"` | `12.34` |
| `int4range` and the rest of the range family | `"[1,5)"` | a [`Range`](../api/classes/range.md) |
| `path`, `polygon`, `box`, `lseg` | the text literal | their own classes |
| `circle` | `{ x, y, radius }` | a `Circle` — same fields |
| `point` | `{ x, y }` | the text `"(1,2)"` |
| `line` | `"{1,2,3}"` | the same |

`point` is the one that runs the other way, and on purpose: Drizzle's own `point` column hands the
driver's value back untouched, so a class instance would reach the caller where `pg` gives a plain
object. It's asked for as text instead and Drizzle parses it — so **through Drizzle's own columns
both drivers answer `[1, 2]` and `[1, 2, 3]`**, identically, and the difference above exists only in
a raw `execute()`.

Everywhere else the two agree, checked by a differential suite that runs the same Drizzle calls
through both drivers and deep-compares the rows — including the awkward cases: `numeric` keeps
every digit, `timestamp` is the same instant, `date` in string mode doesn't shift a day, and an
array keeps its empty-string elements. Enums work with nothing registered anywhere.

### Results

`db.execute()` results carry a `commandTag` as well as `command`. `pg` keeps only the first word of
the server's command tag, so four kinds of `CREATE` and four kinds of `DROP` are one word each;
`command` matches `pg` for compatibility and `commandTag` is the whole tag — `CREATE INDEX` rather
than `CREATE`.

`fields` is `postgrejs`'s own [`FieldInfo`](../api/interfaces/field-info.md), with `fieldName` and
`dataTypeId` rather than `pg`'s `name` and `dataTypeID`, plus the JS type and whether the column is
an array. `pg`'s other `Result` properties (`oid`, `_parsers`, `_types`, `RowCtor`) aren't there.

### Errors

Errors are [`DatabaseError`](../api/classes/database-error.md), and Drizzle still wraps them in
`DrizzleQueryError` with the driver error as `cause`. Every field worth branching on matches —
`code`, `severity`, `detail`, `hint`, `schema`, `table`, `column`, `constraint` — but `position` is
a number where `pg` gives a string, `line` means a different thing on each side (`pg`'s is
PostgreSQL's own C source line, `postgrejs`'s is the line of SQL), `file`/`routine` are absent
(`lineNr`/`colNr` instead), and `instanceof` against `pg`'s class doesn't hold.

### Several statements in one `db.execute()`

It works here too, and it's worth knowing how. `pg` accepts several statements in one call because
a parameterless query goes over PostgreSQL's simple protocol — a guess from whether the call
happens to carry parameters. `postgrejs`'s `query()` is always the extended protocol and its
`execute()` is the simple-protocol counterpart, so the driver has to choose: it asks
[`isMultiStatement()`](../api/functions/is-multi-statement.md), a scanner over everything a `;` can
hide inside, and sends the right one first time.

A multi-statement call still gets the server's own error if it carries parameters, since a simple
query has nowhere to put them. And if the scanner is ever wrong the other way, the `42601` fallback
is still behind it — the server raises that while parsing, before any statement has run, so the
retry costs nothing and risks nothing. The result is a bare array, one entry per statement, as `pg`
returns it.

### `connectionString`

Accepted. `pg`'s spelling is translated into `postgrejs`'s own options, so a `DATABASE_URL` and the
rest of an existing `node-postgres` setup move over unchanged — `new Pool({ connectionString })`
alone would otherwise open on the default `localhost:5432/postgres` without complaint, since
`connectionString` isn't `postgrejs`'s own spelling.

## Full documentation

See the [`drizzle-postgrejs` README](https://github.com/panates/postgrejs-drizzle#readme) for the
full benchmark method and more on what's ahead, its
[migration checklist](https://github.com/panates/postgrejs-drizzle/blob/main/doc/MIGRATING-FROM-NODE-POSTGRES.md)
for a closer look at what to check when switching, and
[orm.drizzle.team](https://orm.drizzle.team) for the query builder and schema APIs — none of that
is `postgrejs`-specific.
