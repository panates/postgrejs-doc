---
sidebar_position: 6
---

# Extended Query

`connection.query(sql, options?)` runs a single SQL statement using PostgreSQL's **Extended Query** protocol (Parse/Bind/Execute). This is the protocol to use for application queries: it supports bind parameters, per-column format selection, and server-side cursors.

```ts
import { Connection } from 'postgrejs';

const connection = new Connection();
await connection.connect();

const result = await connection.query(
  'select * from customers where id = $1',
  { params: [1], objectRows: true },
);

console.log(result.command);   // 'SELECT'
console.log(result.rows);      // [{ id: 1, given_name: 'Wynne', ... }]
console.log(result.rowsAffected);
```

The result is a [`QueryResult`](../api/interfaces/query-result.md) — it extends [`CommandResult`](../api/interfaces/command-result.md) (`command`, `fields`, `rows`, `rowType`, `executeTime`, `rowsAffected`) and adds an optional `cursor`, present only when `options.cursor` is `true`.

## Parameters

Positional parameters (`$1`, `$2`, ...) are supplied via `params`, sent out of band from the SQL text — values can never be interpreted as SQL:

```ts
await connection.query('select * from customers where id = ANY($1)', {
  params: [[1, 2, 3]],
});
```

See [Query Parameters & Type Casting](./query-parameters.md) for how parameter types are detected and how to override them with `BindParam`.

## `objectRows`

Controls the row shape: array-of-values (default) or array-of-objects keyed by field name.

```ts
await connection.query('select id, name from countries'); // rows: [['CA', 'Canada'], ...]

await connection.query('select id, name from countries', { objectRows: true });
// rows: [{ id: 'CA', name: 'Canada' }, ...]
```

## `columnFormat`

Selects the wire format(s) PostgreSQL uses to send column values — text or binary — via the `DataFormat` enum. It accepts either a single value applied to every column, or an array with one entry per column:

```ts
import { DataFormat } from 'postgrejs';

await connection.query('select blob, name from files', {
  columnFormat: DataFormat.binary, // default
});
```

Binary is the default (`DataFormat.binary`) and is generally faster to decode. postgrejs decodes both formats into the same JS values, so switching format doesn't change what you get back — it only changes what's sent on the wire.

## `QueryOptions` reference

The full option list — `params`, `objectRows`, `columnFormat`, `cursor`, `fetchCount`, `autoCommit`, `rollbackOnError`, `utcDates`, `signal`, `typeMap`, `fetchAsString`, `asyncErrorHandling` — is documented in [`QueryOptions`](../api/interfaces/query-options.md). Notable ones:

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `autoCommit` | `boolean` | `true` | Whether to run the statement in auto-commit mode. |
| `cursor` | `boolean` | `false` | Return a [`Cursor`](../api/classes/cursor.md) on `result.cursor` instead of eagerly fetching all rows. |
| `fetchCount` | `number` | `100` | Rows fetched per round trip; for a cursor, rows fetched per batch. |
| `rollbackOnError` | `boolean` | `true` | Whether an error inside a transaction aborts it or is ignored so the transaction continues. |
| `utcDates` | `boolean` | `false` | Decode dates/timestamps in UTC instead of system time offset. |
| `signal` | `AbortSignal` | — | Cancels the running statement on the server when the signal fires. |

See [`QueryOptions`](../api/interfaces/query-options.md) for the complete table.

## Cursors

Pass `cursor: true` to get back a [`Cursor`](../api/classes/cursor.md) instead of eagerly buffering every row — essential for large result sets. See [Cursors](./cursors.md).

## See also

- [`QueryResult`](../api/interfaces/query-result.md), [`QueryOptions`](../api/interfaces/query-options.md) reference
- [Simple Query](./simple-query.md)
- [Query Parameters & Type Casting](./query-parameters.md)
- [Cursors](./cursors.md)
