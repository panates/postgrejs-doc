---
sidebar_position: 5
---

# Prisma

[`prisma-postgrejs`](https://github.com/panates/postgrejs-prisma) is a
[Prisma](https://www.prisma.io) driver adapter for `postgrejs` — a Prisma schema runs on
`postgrejs`'s wire-protocol client instead of `pg`, through Prisma's own driver adapter interface.

## Installation

```bash
npm install prisma-postgrejs postgrejs
```

`postgrejs` (`>=3.10.0`) and `@prisma/driver-adapter-utils` (`>=7.10.0 <9`) are peer dependencies.

## Usage

```ts
import { PrismaPostgreJS } from 'prisma-postgrejs';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPostgreJS({ host: 'localhost', database: 'app' });
const prisma = new PrismaClient({ adapter });
```

Takes the same configuration `new Pool()` does, a connection string, or a `Pool` already
constructed — in which case closing it stays the caller's job, and `PrismaClient.$disconnect()`
leaves it open.

:::note Migrations don't go through the adapter
`prisma migrate` and `prisma db push` connect with Prisma's own built-in connector, reading
`datasource.url` from `prisma.config.ts` — no driver adapter is involved at all at Prisma 7.10.0.
A connection URL in `prisma.config.ts` is still needed for migrations, separate from the adapter
passed to `PrismaClient`.
:::

## Why this adapter, given Prisma converts every value anyway

Prisma's query engine converts whatever an adapter returns into its own values, so `postgrejs`'s
richer decoding — `Interval`, `Range`, `Numeric`, the geometric classes — buys nothing here: 23 of
74 PostgreSQL types measured raise `UnsupportedNativeDataType` in both this adapter and
`@prisma/adapter-pg`, because Prisma's own `ColumnType` has no member for them. The case for this
adapter is protocol throughput, not richer values — reading the binary wire format instead of text,
pooled queries sharing a connection instead of one each, prepared statements reused across calls,
and a transaction's isolation level taken on the `BEGIN` itself instead of a separate `SET
TRANSACTION`. Measured against `@prisma/adapter-pg` 7.10.0: 1.15x on a bulk read of mixed scalars,
1.44x on a small transaction, up to 2.5x on concurrent reads past the pool size.

## Where this adapter is more correct, not just faster

A handful of cases aren't a speed difference — the two adapters hand Prisma **different** values,
found by a differential test suite comparing every case against `@prisma/adapter-pg`:

| Case | `@prisma/adapter-pg` | `prisma-postgrejs` |
|:---|:---|:---|
| `timetz` on any non-zero offset | wrong instant, silently | correct |
| `money` below zero in `$queryRaw` (e.g. `-$0.05`) | throws `DecimalError` | `-0.05` |
| Any temporal type when the session's `DateStyle` isn't ISO | throws `Invalid time value` | correct |
| `timestamptz` when the session's `TimeZone` isn't UTC | wrong instant, silently | correct |
| `"char"[]` | the raw literal `'{a}'` | `['a']` |

Each traces back to the same root: `@prisma/adapter-pg` decodes PostgreSQL's *text* rendering and
re-normalizes it by hand (with regexes that assume ISO, UTC, and a specific format), where
`postgrejs` reads the binary wire format, which carries no formatting to misread and no offset to
drop. See the [full differential results](https://github.com/panates/postgrejs-prisma#how-it-differs-from-prismaadapter-pg)
for exactly which cases and why.

## What's different, deliberately

- **Several statements in one `$executeRaw` throw** (`42601 cannot insert multiple commands into a
  prepared statement`) rather than silently running, since Prisma's own adapter contract draws that
  line itself — a script belongs on `executeScript()`, not `executeRaw()`. `@prisma/adapter-pg` only
  allows it as a side effect of `pg` choosing the Simple Query protocol when a call has no
  parameters.
- **Error mapping reads `DatabaseError.serverMessage`**, not the decorated `message` — `pg`'s own
  adapter extracts detail with regexes anchored against an undecorated message
  (`/^column (.+) does not exist$/`), which `postgrejs`'s appended source excerpt would break.
- **`executeRaw` on a `SELECT` reports the row count**, matching `pg`'s `rowCount` behavior, rather
  than `postgrejs`'s own `rowsAffected` (which is only ever set for `INSERT`/`UPDATE`/`DELETE`/`MERGE`)
  — found by the differential suite, so the number doesn't change when switching adapters.

## Options

| Option | Default | What it does |
|:---|:---|:---|
| `schema` | from `?schema=` on the connection string | The schema the engine qualifies generated SQL with |
| `pipeline` | `true` | Whether a statement may share a pooled connection with statements already in flight — `postgrejs`'s own default is off, this adapter turns it on since Prisma issues genuinely concurrent statements. Set `false` for one statement per connection at a time |
| `onPoolError` | | Called when a pooled connection is lost or couldn't be opened — Prisma has nowhere else to report either |

`rollbackOnError` is fixed off (unlike `postgrejs`'s own default) so a failed statement inside a
transaction poisons it exactly the way `pg` does, since an adapter meant to be swapped in must not
change that behavior.

## Full documentation

See the [`prisma-postgrejs` README](https://github.com/panates/postgrejs-prisma#readme) for the
complete benchmark methodology and every differential-testing result, and
[prisma.io](https://www.prisma.io) for Prisma itself — none of that is `postgrejs`-specific.
