---
sidebar_position: 1
---

# sql

A tagged-template function that builds a `QueryRequest` from a template literal, turning every interpolated value into a bind parameter. Interpolated values are never written into the SQL text, so this is not string building with extra steps — there is no way for a value to be read as SQL.

```ts
import { sql } from 'postgrejs';

const result = await connection.query(
  sql`select * from t where id = any(${[1, 3]})`,
);
```

A nested `QueryRequest` is spliced in as a fragment with its parameters renumbered, so a statement can be assembled from pieces:

```ts
const filter = city ? sql`where city = ${city}` : sql``;
await connection.query(sql`select * from t ${filter} order by id`);
```

## sql.ident(name)

| Parameter | Type     | Description                     |
|-----------|----------|----------------------------------|
| name      | `string` | Table, column or schema name     |

Returns: `QueryRequest`

Quotes a table, column or schema name for use inside a `sql` template, the way PostgreSQL's own `quote_ident()` does. Values become parameters, but names cannot — `$1` is always a value, so `` sql`select ${col} from t` `` selects the string, not the column. This writes the name into the statement instead.

```ts
await connection.query(sql`select ${sql.ident(col)} from ${sql.ident(table)}`);
```

## sql.values(data, columns?)

| Parameter | Type                                              | Description                                                                      |
|-----------|-----------------------------------------------------|-----------------------------------------------------------------------------------|
| data      | `Record<string, any> \| Record<string, any>[]`       | An object, or an array of objects for a multi-row insert                          |
| columns   | `string[]`                                          | Restricts and orders which keys are written — pass it whenever `data` comes from outside |

Returns: `QueryRequest`

Builds the column list and `VALUES` clause of an `INSERT` from an object.

```ts
await connection.query(sql`insert into users ${sql.values(user)}`);
// insert into users ("id","name") values ($1,$2)
```

## sql.set(data, columns?)

| Parameter | Type                     | Description                                                     |
|-----------|--------------------------|---------------------------------------------------------------------|
| data      | `Record<string, any>`    | An object of column/value assignments                              |
| columns   | `string[]`               | Restricts which keys are written, for the same reason as `sql.values()` |

Returns: `QueryRequest`

Builds the assignment list of an `UPDATE` from an object.

```ts
await connection.query(
  sql`update users set ${sql.set({ city })} where id = ${id}`,
);
// update users set "city" = $1 where id = $2
```

## QueryRequest

The object returned by `sql`, `sql.ident()`, `sql.values()` and `sql.set()`.

| Key    | Type     | Description                        |
|--------|----------|---------------------------------------|
| sql    | `string` | The statement text with `$1`, `$2`, … placeholders |
| params | `any[]`  | The extracted parameter values         |

### stringify(options?)

| Parameter | Type                                             | Description                    |
|-----------|-----------------------------------------------------|-----------------------------------|
| options   | [`DataMappingOptions`](../interfaces/data-mapping-options.md) `& { typeMap?: DataTypeMap }` | Options controlling literal encoding |

Returns: `string`

Writes the request's values in as literals, for use with the Simple Query protocol (`connection.execute()`), which carries no out-of-band parameters. Every value is encoded by its own data type and given an explicit cast; a value whose type has no text encoding throws rather than falling back to a generic conversion. Parameters (via `query()`) are safe by construction — literals are only as safe as the encoder, which is why `stringify()` refuses to guess instead of producing something that looks plausible.

See the [The sql Template Tag](../../guides/sql-tag.md) guide for a fuller walkthrough.
