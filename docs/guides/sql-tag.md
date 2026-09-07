---
sidebar_position: 18
---

# The `sql` Template Tag

The `sql` tagged-template helper builds a parameterized statement from a template literal, turning every interpolated value into a bind parameter instead of writing it into the SQL text:

```ts
import { sql } from 'postgrejs';

const id = 1;
const request = sql`select * from users where id = ${id}`;
// request.sql    === 'select * from users where id = $1'
// request.params === [1]
```

The tag never writes a value into the text — the resulting `QueryRequest` can be passed directly to `connection.query()`:

```ts
const result = await connection.query(sql`select * from t where id = any(${[1, 3]})`);
```

`connection.query()` recognizes a `QueryRequest` and forwards `.sql` and `.params` for you; passing `params` yourself alongside a `sql\`\`` value throws, since the statement already carries its own.

## Composing fragments

A `QueryRequest` interpolated inside another `sql\`\`` template is spliced in as a fragment, with its own placeholders renumbered onto the outer statement:

```ts
const filter = city ? sql`where city = ${city}` : sql``;
const request = sql`select * from t ${filter} order by id`;
```

## `sql.ident(name)`

Values become parameters, but identifiers (table/column/schema names) cannot be — `$1` is always a value. `sql.ident()` writes a name into the statement instead, quoted like PostgreSQL's own `quote_ident()`:

```ts
await connection.query(
  sql`select ${sql.ident(column)} from ${sql.ident(table)}`,
);
```

## `sql.values(data, columns?)`

Builds the column list and `VALUES` clause of an `INSERT` from an object, or from an array of objects for a multi-row insert:

```ts
await connection.query(sql`insert into users ${sql.values({ id: 1, name: 'ada' })}`);
// insert into users ("id","name") values ($1,$2)

await connection.query(sql`insert into users ${sql.values([
  { id: 1, name: 'a' },
  { id: 2, name: 'b' },
])}`);
// insert into users ("id","name") values ($1,$2),($3,$4)
```

Pass `columns` to restrict and order which keys are written — always do this when `data` comes from outside (a request body), so a caller can't smuggle in an extra column:

```ts
sql.values(userInput, ['id', 'name']);
```

## `sql.set(data, columns?)`

Builds the assignment list of an `UPDATE` from an object:

```ts
await connection.query(
  sql`update users set ${sql.set({ city })} where id = ${id}`,
);
// update users set "city" = $1 where id = $2
```

As with `sql.values()`, pass `columns` to restrict what gets written when `data` is externally supplied.

## `QueryRequest.stringify(options?)`

Renders the statement as plain SQL text with every parameter written in as a properly encoded, explicitly cast literal — for cases where you need a literal string rather than a parameterized call, such as passing it to [`execute()`](./simple-query.md), which has no `params` option:

```ts
sql`select ${42}`.stringify();          // "select '42'::int4"
sql`select ${true}`.stringify();        // "select 't'::bool"
sql`select ${null}`.stringify();        // "select null"
sql`select ${[1, 2]}`.stringify();      // "select ARRAY['1','2']::_int4"

await connection.execute(sql`select * from accounts where id = ${accountId}`);
```

Each value is encoded through the same type map `query()` uses, so both paths agree on how a value is represented. A value with no text encoding (e.g. an unregistered type) makes `stringify()` throw rather than silently guess — use `query()` instead for values like that.

`sql.ident()` results contain no parameters, so `stringify()` on an identifier fragment just returns the quoted name unchanged.

## See also

- [API: `sql` tag](../api/functions/sql-tag.md)
- [Query Parameters & Type Casting](./query-parameters.md)
- [Simple Query](./simple-query.md)
