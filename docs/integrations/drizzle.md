---
sidebar_position: 3
---

# Drizzle ORM

[`drizzle-postgrejs`](https://github.com/panates/postgrejs-drizzle) is a
[Drizzle ORM](https://orm.drizzle.team) driver for `postgrejs` — run a Drizzle schema, query
builder, relational queries and migrations on `postgrejs`'s wire-protocol client instead of `pg`.
Drizzle is built so the driver is a pluggable seam: `drizzle(client)` names the PostgreSQL client,
and everything above it — the query builder, relational queries, schema, migrations — is the same
either way. What changes is underneath.

## Installation

```bash
npm install drizzle-postgrejs drizzle-orm postgrejs
```

`drizzle-orm` (`>=0.44.6 <0.46.0`) and `postgrejs` (`>=3.10.1`) are peer dependencies.

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
queries need the schema, as usual:

```ts
const db = drizzle(pool, { schema });

await db.query.users.findMany({ with: { posts: true } });
```

Transactions hold one connection for the whole block and give it back however it ends; a nested
`db.transaction()` call is a savepoint:

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

## Config

Drizzle's own options (`schema`, `logger`, `casing`, `cache`) work as on any driver. This driver
adds:

| Option | Default | What it does |
|:---|:---|:---|
| `unknownTypesAsString` | `true` | Ask the server for text on any column `postgrejs` has no decoder for |
| `fetchAsString` | `[]` | Extra OIDs to fetch as text, on top of the ones Drizzle needs |
| `prepare` | `postgrejs`'s own | `false` keeps statements out of `postgrejs`'s prepared-statement cache |

The defaults are set so every column reaches Drizzle in the shape its own column mappers were
written for — see [Why some values are fetched as text](#why-some-values-are-fetched-as-text) below
— and so PostgreSQL types each parameter from where it lands rather than from the JavaScript
value's own shape.

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

## What you get

**Large columns arrive about twice as fast, on a fraction of the memory.** `postgrejs` reads
results in PostgreSQL's binary format where `pg` reads them as text. Measured through Drizzle, on
the same server, alternating between the two drivers in one run:

| Scenario | node-postgres | this driver | Peak heap |
|:---|:---|:---|:---|
| `int4[]` of 100k, one array column | 26.4 ms | **12.5 ms** | 73.4 MB → **6.0 MB** |
| `bytea` of 4MB, one binary column | 89.9 ms | **31.5 ms** | 0.6 MB → 0.4 MB |

**Half the bytes on the wire for binary columns.** `pg` reads a `bytea` as `\x`-prefixed hex, two
characters per byte, so a 4MB column costs 8MB of network. Here it costs 4MB — on metered egress
that's the same saving again, on every row that carries one.

**Ordinary queries cost you nothing.** A point read, a page of two hundred mixed-type rows, an
insert with parameters, twenty reads at once over a pool — on each of those the two drivers land
inside one another's run-to-run spread, and which one leads changes between runs.

**Your statements are prepared and reused without being asked for.** `postgrejs` keeps a cache of
named statements per connection (64 by default, least-recently-used closed), so the SQL Drizzle
sends is parsed once and executed by name after that. Run three queries and the connection holds
one prepared statement; the same three through `drizzle-orm/node-postgres` leave none, because
`pg` only prepares a query it was given a name for, and Drizzle doesn't give it one. Drizzle's own
`.prepare(name)` still works as it always did — it's just no longer the only way to get a
statement prepared.

**A client that can do what Drizzle has no way to ask for.** All of it on the pool you passed in,
or on `db.$client`, over the same connections your queries use:

- **cursors and streaming** through real portals, and `COPY` in and out — including PostgreSQL's
  binary `COPY` format, which needs a binary encoder per type that `pg` has no equivalent for;
- **`LISTEN`/`NOTIFY`**, large objects, and logical replication;
- **pipelining**, which closes a batch of statements with one round trip.

**Types that arrive as types.** A range comes back as a [`Range`](../api/classes/range.md), and
`path`, `polygon`, `circle`, `box` and `lseg` as their own classes, where `pg` leaves you the text
and the parser to write. Drizzle has no column for any of these, so they reach you through a raw
`db.execute()` — and through `db.$client`, where `postgrejs`'s own options are open to you:
[Temporal values](../querying/data-types.md#temporal-values) that keep the microseconds a `Date`
cannot hold, and [exact decimal strings](../querying/data-types.md#exact-decimal-strings-decimalasstring)
for `numeric` and `money` built while decoding rather than re-parsed afterwards.

**More to go on when something goes wrong.** `db.execute()` results carry the server's whole
command tag, so a `CREATE INDEX` says so rather than `CREATE`. A
[`DatabaseError`](../api/classes/database-error.md) carries the line of SQL the server objected to
and its position as a number. A pooled connection that dies arrives as a
[`ConnectionLostError`](../api/classes/connection-lost-error.md) — SQLSTATE `08006`, carrying the
backend's process id and the socket error as its `cause`.

**Held to Drizzle's own suite**, with nothing to change to try it — the same four `drizzle()`
forms, the same `DATABASE_URL`, the same schema and queries. See below, and the differences list
after it, for everything that isn't identical.

## Differences from `drizzle-orm/node-postgres`

Small, and all of them measured:

- **`db.execute()` results carry a `commandTag`.** `pg` keeps only the first word of the server's
  command tag, so four kinds of `CREATE` and four kinds of `DROP` are one word each. `command`
  matches `pg` for compatibility; `commandTag` is the whole tag — `CREATE INDEX`, not `CREATE`.
- **`fields` is `postgrejs`'s own [`FieldInfo`](../api/interfaces/field-info.md)** shape
  (`fieldName`/`dataTypeId`, plus the JS type and array-ness) rather than `pg`'s `name`/`dataTypeID`.
- **Errors are [`DatabaseError`](../api/classes/database-error.md).** Every field worth branching
  on matches (`code`, `severity`, `detail`, `hint`, `schema`, `table`, `column`, `constraint`), but
  `position` is a number where `pg` gives a string, `line` means a different thing on each side —
  `pg`'s is PostgreSQL's own C source line, `postgrejs`'s is the line of SQL — and `instanceof`
  against `pg`'s error class doesn't hold.
- **Some types decode where `pg` hands back text.** Ranges come back as `postgrejs`'s
  [`Range`](../api/classes/range.md), `money` as a number rather than `"$12.34"`, and
  `path`/`polygon`/`circle`/`box`/`lseg` as their own classes. Drizzle has no column for any of
  these, so nothing it owns reads them either way — they only reach you through a raw
  `db.execute()`, where the decoded value is usually the more useful one. `point` and `line`, which
  Drizzle *does* have columns for, are asked for as text (see above) and come out exactly as under
  `pg`.
- **`connectionString` is accepted.** It's `pg`'s option spelling, not `postgrejs`'s, so this
  driver translates it rather than letting it fall through to the default `localhost:5432/postgres`
  — an existing `DATABASE_URL` and `node-postgres` setup move over unchanged.

Multi-statement `db.execute()` still works: `pg`'s driver runs several statements in one call over
the simple protocol, because a parameterless query happens to choose that protocol; `postgrejs`'s
`query()` is always extended, so this driver reaches the same place through `execute()`
(`postgrejs`'s Simple Query method), switching to it on the server's own word — which the server
gives while parsing, before anything has run, so the fallback costs nothing and risks nothing.

## Drizzle's own test suite

`integration-tests/tests/pg/pg-common.ts` from the drizzle-orm repository is a shared suite every
driver Drizzle ships points at itself, declaring what it can't pass through `skipTests()`. This
driver runs it with no skips at all, twice — once against itself and once against
`drizzle-orm/node-postgres` as a control — and only fails on a test this driver loses that the
control wins:

```
node-postgres (control)  183 / 183
drizzle-postgrejs        183 / 183
```

The control run is the point. The suite asserts row order in three places without writing an
`ORDER BY`, so its score moves with the PostgreSQL version — 183 of 183 on the version its own
Docker setup pins, 180 of 183 on a newer one, for both drivers alike. A fixed expected-failure
count would be wrong on one of them. On drizzle-orm 0.44.6, the other end of the peer range, the
suite is 179 tests and both drivers score 179. A weekly CI job runs the matrix of both Drizzle
versions against two PostgreSQL versions.

## Status

Pre-1.0, and complete enough to use. Selects, inserts, updates, deletes, `RETURNING`, relational
queries, joins, transactions, savepoints, prepared statements and `db.execute()` all work against a
live server, and Drizzle's own suite passes in full on the PostgreSQL version it's written for,
with nothing skipped.

Drizzle itself is pre-1.0, and its 1.0 line rewrites the driver seam — `PgPreparedQuery` becomes
`PgBasePreparedQuery`, row mode moves from a flag to a method, and type handling becomes a
per-driver codec table. This driver targets the 0.45 line; a 1.0 driver will be a rewrite rather
than an adaptation.

## Full documentation

See the [`drizzle-postgrejs` README](https://github.com/panates/postgrejs-drizzle#readme) for the
full benchmark method, the migration checklist, and development/testing details, and
[orm.drizzle.team](https://orm.drizzle.team) for the query builder and schema APIs — none of that
is `postgrejs`-specific.
