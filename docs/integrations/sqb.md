---
sidebar_position: 1
---

# SQB

[SQB](https://sqb.panates.com) is a multi-dialect database framework from the same team as
`postgrejs` — a query builder, connection pool, ORM and migration tool in one coherent,
TypeScript-first package, working against PostgreSQL, MySQL, MariaDB, SQL Server, Oracle and
SQLite through a shared, dialect-agnostic query model. You write a query once as a plain JS/TS
object and SQB compiles it to the right SQL for whichever database is connected.

`@sqb/postgres`, SQB's PostgreSQL adapter, is built directly on `postgrejs` — not a community
wrapper around it. It uses the connection pool, server-side cursors, and `fetchAsString` (for
returning `date`/`timestamp` columns as raw strings instead of `Date` objects) directly, and
reads `INSERT ... RETURNING`/`UPDATE ... RETURNING` straight from the statement response rather
than issuing a follow-up `SELECT`, since Postgres supports `RETURNING` natively.

## Installation

```bash
npm install @sqb/builder @sqb/connect @sqb/postgres
```

## Usage

```ts
import '@sqb/postgres';
import { SqbClient } from '@sqb/connect';
import { Select, Eq } from '@sqb/builder';

const client = new SqbClient({
  dialect: 'postgres',
  host: 'localhost',
  database: 'mydb',
});

const query = Select('id', 'given_name').from('customers').where(Eq('active', true));
const result = await client.execute(query);
console.log(result.rows);
```

`SqbClient` manages its own `postgrejs` `Pool` underneath — there's no separate `postgrejs` object
to construct or pass in, unlike a thinner dialect adapter for an existing query builder. Prefer
typed entities and repositories over building queries by hand? See the
[SQB documentation](https://sqb.panates.com) for `@sqb/connect`'s ORM layer.

## Full documentation

This page only covers where the two projects meet. For everything else — the query builder's
own API, entities and repositories, migrations, the other database adapters, and the NestJS
module — see [sqb.panates.com](https://sqb.panates.com) and the
[SQB GitHub repository](https://github.com/panates/sqb).
