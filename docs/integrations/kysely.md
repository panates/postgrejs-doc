---
sidebar_position: 2
---

# Kysely

[`kysely-postgrejs`](https://github.com/panates/postgrejs-kysely) is a [Kysely](https://kysely.dev)
dialect for `postgrejs` — run Kysely's query builder on `postgrejs`'s wire-protocol client instead
of `pg`. Only the driver is `postgrejs`-specific: the SQL adapter, introspector and query compiler
are Kysely's own `Postgres*` implementations, so everything Kysely itself does works exactly the
same either way.

## Installation

```bash
npm install kysely-postgrejs kysely postgrejs
```

`kysely` (`>=0.29 <0.31`) and `postgrejs` (`>=3.6`) are peer dependencies.

## Usage

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

`pool` takes a `Pool` instance, or an async function returning one, called once when the driver
initializes. `db.destroy()` closes the pool.

## Streaming

Kysely's `.stream()` goes through a `postgrejs` server-side cursor, with the chunk size Kysely
was given as the cursor's `fetchCount` batch size:

```ts
for await (const person of db.selectFrom('person').selectAll().stream(100)) {
  // one round trip per 100 rows; the cursor closes when the loop ends,
  // whether it runs out, breaks, or throws
}
```

## Reaching the connection underneath

Kysely's interface doesn't cover everything `postgrejs` can do — `COPY`, `LISTEN`/`NOTIFY`, large
objects, logical replication. `onCreateConnection` hands you the underlying `postgrejs`
connection to run those directly:

```ts
new PostgrejsDialect({
  pool,
  onCreateConnection: async connection => {
    const postgrejs = (connection as PostgrejsConnection).connection;
    await postgrejs.query(`set application_name = 'reports'`);
  },
});
```

The `Pool` passed in at construction is still yours to `acquire()` from directly as well, for
anything that needs a connection outside of a Kysely query.

## Full documentation

See the [`kysely-postgrejs` README](https://github.com/panates/postgrejs-kysely#readme) for the
complete config reference, and [kysely.dev](https://kysely.dev) for the query builder itself —
none of that is `postgrejs`-specific.
