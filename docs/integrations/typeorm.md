---
sidebar_position: 4
---

# TypeORM

[`typeorm-postgrejs`](https://github.com/panates/postgrejs-typeorm) brings `postgrejs` to
[TypeORM](https://typeorm.io) — not as a dialect, but as a **`pg`-compatible facade**: TypeORM only
ever talks to PostgreSQL through [`pg`](https://node-postgres.com), so this package reimplements the
18 `pg` members TypeORM actually uses, backed by `postgrejs` underneath. No entity, query or
migration changes.

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

`driver` is TypeORM's own option, documented as defaulting to `require('pg')` — this package is a
drop-in for that default. That's the entire migration; nothing else in a TypeORM project changes.

## Why a facade instead of a driver

TypeORM doesn't take a pluggable dialect the way Kysely and Drizzle do — `DriverFactory` is a
closed `switch`, and a custom `Driver` class can't be registered at all. The only seam is
`driver?: any`, so the job isn't "implement TypeORM's interface" but "be the `pg` module": 18
public members, unchanged since TypeORM 0.2.39 (2021) through 1.1.1.

## Values stay `pg`-shaped by default

The facade's contract is that code written against `pg` keeps working: `numeric`/`int8` stay
strings, `interval` is a `PostgresInterval`-shaped object, `point` is `{x, y}`, ranges are strings —
`pg`'s answers, not `postgrejs`'s richer ones, verified by a 64-type decoding matrix and a 32-case
parameter matrix run against a live server with `pg` as the oracle. Opt into `postgrejs`'s own
richer types (`Interval`, `Range`, `Numeric`, a class per geometric type) only if you know the code
reading the rows:

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

## What's different from `pg`

- **Reads are measurably faster** — 10–17% on decoding-heavy workloads (`find`, `queryBuilder`,
  bulk selects), inside the noise on writes — since `postgrejs` reads the binary wire format
  instead of parsing text.
- **Non-ISO `DateStyle` sessions decode correctly.** `pg` only parses PostgreSQL's ISO date
  rendering and returns `null` for anything else (a `German`/`SQL` locale, ordinary for a
  European deployment); the binary format carries no formatting to misread, so the facade is
  immune.
- **`interval`, `point` and `circle` come back as a class, not a plain object** — same keys, same
  values, same `JSON.stringify`, plus a `toPostgres()` so one can be passed straight back as a
  parameter, which a plain `pg`-shaped object can't (`22P02`).
- **`pg-query-stream`** is needed only if `QueryRunner.stream()` is actually called — TypeORM loads
  it itself, so this facade doesn't bundle a dependency on it.

## How far it's tested

806/806 on TypeORM's own functional suite (127 files), with a `pg` control run over the same files,
same server, same invocation — plus 266 of the facade's own tests (unit, live, and 20 TypeORM
programs run through both drivers and deep-compared).

## Full documentation

See the [`typeorm-postgrejs` README](https://github.com/panates/postgrejs-typeorm#readme) for the
full benchmark methodology, the complete `PgjsFacadeOptions` reference, and what the differential
testing against `pg` actually caught, and [typeorm.io](https://typeorm.io) for TypeORM itself —
none of that is `postgrejs`-specific.
