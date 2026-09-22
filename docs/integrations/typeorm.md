---
sidebar_position: 4
---

# TypeORM

[`typeorm-postgrejs`](https://github.com/panates/postgrejs-typeorm) brings `postgrejs` to
[TypeORM](https://typeorm.io) by changing one line. TypeORM only ever talks to PostgreSQL through
[`pg`](https://node-postgres.com) — there's no pluggable dialect seam, so this package is a
`pg`-compatible **facade**: it reimplements the 18 `pg` members TypeORM actually uses, backed by
`postgrejs` underneath. No entity, query or migration changes.

## Installation

```bash
npm install typeorm-postgrejs postgrejs
```

`postgrejs` (`>=3.10.0`) is a required peer dependency; `typeorm` (`>=0.3.0 <2`) is an optional one
— the facade doesn't import TypeORM itself.

## Usage

```ts
import { DataSource } from 'typeorm';
import * as pgjs from 'typeorm-postgrejs';

export const dataSource = new DataSource({
  type: 'postgres',
  host: '127.0.0.1',
  database: 'postgres',
  username: 'postgres',
  password: 'postgres',
  driver: pgjs, // the whole integration
  entities: [/* ... */],
});
```

`driver` is TypeORM's own option — its doc comment reads *"defaults to `require('pg')`"* — and this
package is a drop-in for that default: same members, same values back, different client
underneath. That's the entire migration.

## Why a facade instead of a driver

TypeORM doesn't take a pluggable dialect the way Kysely and Drizzle do — `DriverFactory` is a
closed `switch`, and a custom `Driver` class can't be registered at all. The only seam is
`driver?: any`, so the job isn't "implement TypeORM's interface", it's "be the `pg` module" — and
that surface has been **18 public members, unchanged since TypeORM 0.2.39** (November 2021) through
1.1.1 today. The same facade was run against 0.3.31 and 1.1.1 with identical results. A seam that
small and that still is one you can upgrade TypeORM across without thinking about it.

## Your reads get faster, and you change nothing to get it

`pg` asks PostgreSQL for everything as text and parses it in JavaScript. `postgrejs` reads the
binary wire format, where an `int8` is eight bytes rather than a string to scan and a
`timestamptz` is an integer rather than a date to parse. That difference shows up as soon as rows
have to be decoded — median milliseconds, through TypeORM:

| | `pg` | facade | delta |
|:---|:---|:---|:---|
| find 5000 entities | 16.611 | 13.868 | **−16.5%** |
| find 100 entities | 0.864 | 0.739 | **−14.5%** |
| `findOneBy` | 0.605 | 0.547 | **−9.6%** |
| `queryBuilder` + `where` (500 rows) | 2.472 | 2.152 | **−12.9%** |
| save one entity | 0.937 | 0.977 | +4.2% |

Reads land **10–17% faster**; writes are inside the noise and swing either way between runs, so
read them as unchanged. The gain scales with how much there is to decode, which is the honest way
to read the table — and the reason it includes a shape that must *not* move:

| raw `pool.query()` | `pg` | facade | delta |
|:---|:---|:---|:---|
| select 100 rows | 0.665 | 0.567 | **−14.7%** |
| count + filter (one row, after a scan) | 1.450 | 1.490 | +2.7% |

`count` returns a single row after a scan the server dominates — neither driver can win it, and it
comes out level, which is what makes the rest of the table worth believing.

Node 24, PostgreSQL 18.4, `pg` 8.23.0, `postgrejs` 3.10.0, TypeORM 1.1.1, on an M1 Pro against a
local server, alternating the two drivers call by call inside one run — running all of one driver
and then all of the other would measure the page cache and the JIT rather than the driver. Over a
real network the share of time spent decoding is smaller, so expect less.

## Your rows keep their `pg` values

Zero runtime dependencies, and nothing is rewritten after decoding — there's no fixup table
translating `postgrejs`'s values into `pg`'s behind your back. The contract is that code written
against `pg` sees what it expects: `numeric` and `int8` stay strings, `money` keeps the server's
`$12.34`, ranges are strings, dates are `Date`s — `pg`'s answers. Nothing in your application has
to learn a new type.

That's not a claim, it's the test suite: a 64-type decoding matrix and a 32-case parameter matrix
run against a live server with `pg` as the live oracle rather than a table of expected values, so a
change on *either* side is reported instead of quietly agreeing with something stale.

## Some rows come back more correct

This came out of the testing rather than the design. Set a session's `DateStyle` to anything but
ISO — a `German` or `SQL` locale is an ordinary thing for a European deployment — and ask `pg` for
a date:

```ts
await client.query(`set datestyle to 'German, DMY'`);
await client.query(`select '2024-03-05'::date as d, '2024-03-05 06:07'::timestamptz as ts`);

// pg      { d: null, ts: null }
// facade  { d: 2024-03-05, ts: 2024-03-05T06:07:00.000Z }
```

`pg` 8.23.0 hands back `null` for both, because it only parses PostgreSQL's ISO rendering and has
nowhere else to go. The binary format carries no formatting at all, so the facade is simply immune.

## Your values can go back the way they came

`interval`, `point` and `circle` arrive as `postgrejs` classes. They read exactly like `pg`'s
objects — same keys, same values, same `JSON.stringify` — and they can do one thing more:

```ts
const { rows } = await client.query(`select '(1,2)'::point as p`);
await client.query('insert into shapes (p) values ($1)', [rows[0].p]); // writes itself back
```

Through `pg` that second call fails with `22P02`: its plain object has no way to render itself
into a `point` again, so a value you just read isn't a value you can pass on.

## Opting into `postgrejs`'s own richer types

If you know the code reading your rows, take the richer values instead — [`Interval`](../api/classes/interval.md),
[`Range`](../api/classes/range.md), [`Numeric`](../api/classes/numeric.md), a class per geometric
type:

```ts
new DataSource({
  // ...
  driver: pgjs,
  extra: { postgrejs: { decoding: 'native' } },
});
```

`extra` is TypeORM's own passthrough to the pool config, which is where the facade reads its
options — the full list is `PgjsFacadeOptions`. Behind PgBouncer in transaction pooling mode, the
same place takes `{ postgrejs: { prepare: false } }`.

## How far it's tested

- **806 of 806** on TypeORM's own functional suite, across 127 files — with a `pg` control run
  over the same files, on the same server, in the same invocation.
- **275 tests** of its own, at 99.9% coverage: unit tests, the live matrices above, and 20 TypeORM
  programs run through both drivers and deep-compared.

Running `pg` as a live control, rather than against a table of expected values, is what found the
things nobody thought to assert — that TypeORM reads `rows` and `rowCount` through
`hasOwnProperty`, so a class with accessors would make every query silently return nothing; that
`money` had no parser in `pg` at all, so the day `postgrejs` gained one the answers moved; that
TypeORM's own catalog query has no `ORDER BY`, so `getTable().columns` comes back in a
plan-dependent order for *both* drivers. Each became a fix in `postgrejs` or in this package on the
day it was measured, which is why there's no compatibility code here to read around.

## Requirements

- Node.js `>= 22`
- `postgrejs >= 3.10.0`
- `typeorm >= 0.3.0 < 2` (optional peer — the facade doesn't import TypeORM)
- `pg-query-stream`, only for `QueryRunner.stream()` — TypeORM loads it itself

Built for TypeORM, and knex's entry point is covered too: `driver.Client`, the query-config call
form and `pg-query-stream` all answer.

## Full documentation

See the [`typeorm-postgrejs` README](https://github.com/panates/postgrejs-typeorm#readme) for the
full benchmark methodology, the complete `PgjsFacadeOptions` reference, and what the differential
testing against `pg` actually caught, and [typeorm.io](https://typeorm.io) for TypeORM itself —
none of that is `postgrejs`-specific.
