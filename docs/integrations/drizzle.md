---
sidebar_position: 3
---

# Drizzle ORM

[`drizzle-postgrejs`](https://github.com/panates/postgrejs-drizzle) is a
[Drizzle ORM](https://orm.drizzle.team) driver for `postgrejs` — run a Drizzle schema, query
builder, relational queries and migrations on `postgrejs`'s wire-protocol client instead of `pg`.
Drizzle is built so the driver is a pluggable seam: `drizzle(client)` names the PostgreSQL client,
and everything above it is the same either way.

It's held to Drizzle's own PostgreSQL integration suite, run against this driver and against
`drizzle-orm/node-postgres` on the same server in the same invocation — 183/183 on the PostgreSQL
version the suite is written for, matching the `pg`-backed control run test for test.

## Installation

```bash
npm install drizzle-postgrejs drizzle-orm postgrejs
```

`drizzle-orm` (`>=0.44.6 <0.46.0`) and `postgrejs` (`>=3.6.1`) are peer dependencies.

## Usage

```ts
import { drizzle } from 'drizzle-postgrejs';

const db = drizzle('postgres://localhost:5432/mydb');

await db.select().from(users).where(eq(users.name, 'ada'));
```

Four ways to say where the database is — the same four `drizzle-orm/node-postgres` takes:

```ts
drizzle('postgres://localhost:5432/mydb');            // a connection string
drizzle({ connection: 'postgres://…' });              // the same, named
drizzle({ connection: { host, port, database } });    // postgrejs's own options
drizzle(pool);                                        // a Pool you made yourself
```

A pool this package opened is on `db.$client`, closed with `await db.$client.close()`. A
`Connection` works in place of a `Pool` when a single connection is what's wanted. Relational
queries need the schema, as usual (`drizzle(pool, { schema })`).

Transactions hold one connection for the whole block; a nested `db.transaction()` call is a
savepoint:

```ts
await db.transaction(async tx => {
  await tx.insert(users).values({ name: 'ada' });
  await tx.transaction(async inner => {
    await inner.insert(posts).values({ userId: 1, title: 'one' });
  });
});
```

Everything Drizzle's interface doesn't reach — `COPY`, `LISTEN`/`NOTIFY`, cursors, large objects,
logical replication — is still there on the `Pool`/`Connection` passed in, or on `db.$client`.

## Why some values are fetched as text

Drizzle's column mappers are written against what `pg` hands them — text for most values, since
`pg` decodes very little on its own. `postgrejs` decodes far more, which is an advantage in
general and a problem here: its `numeric` would arrive as a `number` that has already lost digits
before Drizzle's own `numeric` column ever sees it, `timestamp` as a `Date` read in the local zone
rather than UTC, and `interval`/`time` as an `Interval`/`Date` where Drizzle does nothing to them
and a string was expected. So this driver asks the server directly for `int8`, `numeric`, `date`,
`timestamp`, `timestamptz`, `time`, `interval`, `point`, `line` and their array forms via
[`fetchAsString`](../querying/data-types.md#fetching-as-string) — the list is exported as
`FETCH_AS_STRING` — which is exact rather than approximately right, since the string is
PostgreSQL's own rendering and can't drift from what `pg` would have received.

`unknownTypesAsString` (see [Enum, Extension, and Other Unregistered Types](../querying/data-types.md#enum-extension-and-other-unregistered-types))
is on by default for the same reason: a `pgEnum` or other type `postgrejs` has no decoder for would
otherwise arrive as a raw, unreadable `Buffer`.

## Why parameter types are left to the server

`postgrejs` infers a parameter's OID from the JS value it's given — a plain string becomes
`varchar`, which stops PostgreSQL inferring the type from where the parameter lands. That's fatal
here, not just inconvenient: Drizzle stringifies nearly everything itself before the driver ever
sees it (`JSON.stringify` for `json`/`jsonb`, `toISOString()` for dates, `String()` for
`numeric`/`bigint`), so a value declared `varchar` this way fails an ordinary insert with
`column "x" is of type json but expression is of type character varying`. Strings, numbers,
booleans, bigints and nulls go out as [`BindParam`](../api/classes/bind-param.md)`(0, value)` — OID
`0`, "unspecified", the same as `pg` sends — leaving type resolution to context, the way `pg` does.
A `Date`, `Buffer`, array or plain object keep `postgrejs`'s own typed binary encoder, since their
JS text form isn't something the server could parse without it.

## Why `rollbackOnError` is off

`postgrejs` wraps each transaction statement in its own savepoint by default (see
[Error Handling: rollbackOnError](../transactions/transactions-and-savepoints.md#error-handling-rollbackonerror)),
so a failed statement leaves the transaction usable. That's neither PostgreSQL's own default nor
what a Drizzle user coming from `pg` expects, so this driver turns it off — a failed statement
aborts the block, exactly as under `pg`.

## Config

Drizzle's own options (`schema`, `logger`, `casing`, `cache`) work as on any driver. This driver
adds:

| Option | Default | What it does |
|:---|:---|:---|
| `unknownTypesAsString` | `true` | Ask the server for text on any column `postgrejs` has no decoder for |
| `fetchAsString` | `[]` | Extra OIDs to fetch as text, added to `FETCH_AS_STRING` rather than replacing it |
| `prepare` | postgrejs's own | `false` keeps statements out of postgrejs's prepared-statement cache |

## Differences from `drizzle-orm/node-postgres`

Small, and all measured — see [`doc/MIGRATING-FROM-NODE-POSTGRES.md`](https://github.com/panates/postgrejs-drizzle/blob/main/doc/MIGRATING-FROM-NODE-POSTGRES.md)
for the checklist and [`doc/DRIVER-DESIGN.md`](https://github.com/panates/postgrejs-drizzle/blob/main/doc/DRIVER-DESIGN.md)
for the numbers behind it:

- **`db.execute()` results carry a `commandTag`.** `pg` keeps only the first word of the server's
  command tag, so every kind of `CREATE`/`DROP` looks the same. `command` matches `pg` for
  compatibility; `commandTag` is the whole tag (`CREATE INDEX`, not `CREATE`).
- **`fields` is `postgrejs`'s own [`FieldInfo`](../api/interfaces/field-info.md)** shape
  (`fieldName`/`dataTypeId`, plus the JS type and array-ness) rather than `pg`'s `name`/`dataTypeID`.
- **Errors are [`DatabaseError`](../api/classes/database-error.md).** Every field worth branching
  on matches (`code`, `severity`, `detail`, `hint`, `schema`, `table`, `column`, `constraint`), but
  `position` is a number where `pg` gives a string, `line` means a different thing on each side, and
  `instanceof` against `pg`'s error class doesn't hold.
- **Ranges decode.** `int4range` and the rest come back as `postgrejs`'s
  [`Range`](../api/classes/range.md); `pg` gives the text. Drizzle has no range column type, so
  nothing it owns reads either shape.
- **`connectionString` is translated** — it's `pg`'s option spelling, not `postgrejs`'s, so this
  driver maps it through rather than letting it fall through to the default `localhost:5432/postgres`.

Multi-statement `db.execute()` still works: `pg`'s driver runs several statements in one call over
the simple protocol, and `postgrejs`'s `query()` is always extended — this driver falls back to
`execute()` (postgrejs's Simple Query method) whenever the server reports multiple statements while
parsing, before anything has run.

## Full documentation

See the [`drizzle-postgrejs` README](https://github.com/panates/postgrejs-drizzle#readme) for
development/testing details, and [orm.drizzle.team](https://orm.drizzle.team) for the query
builder and schema APIs — none of that is `postgrejs`-specific.
