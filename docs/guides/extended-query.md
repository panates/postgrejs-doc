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

## `objectRows` / `rowDecoder`

Controls the row shape: array-of-values (default) or array-of-objects keyed by field name.

```ts
await connection.query('select id, name from countries'); // rows: [['CA', 'Canada'], ...]

await connection.query('select id, name from countries', { objectRows: true });
// rows: [{ id: 'CA', name: 'Canada' }, ...]
```

`rowDecoder: 'object'` does the same thing as `objectRows: true` — `objectRows` is deprecated in its favor, though it keeps working unchanged. `rowDecoder` also accepts a [`RowDecoder`](../api/classes/row-decoder.md) subclass to take over row decoding entirely, e.g. for lazy per-cell decoding. See [Custom Row Decoding](./row-decoder.md).

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

The full option list — `params`, `objectRows`, `rowDecoder`, `columnFormat`, `cursor`, `fetchCount`, `autoCommit`, `rollbackOnError`, `utcDates`, `signal`, `typeMap`, `fetchAsString`, `asyncErrorHandling` — is documented in [`QueryOptions`](../api/interfaces/query-options.md). Notable ones:

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `autoCommit` | `boolean` | `true` | Whether to run the statement in auto-commit mode. |
| `cursor` | `boolean` | `false` | Return a [`Cursor`](../api/classes/cursor.md) on `result.cursor` instead of eagerly fetching rows into `result.rows`. |
| `fetchCount` | `number` | `100` | The hard cap on rows returned in a single round trip — applies whether or not `cursor` is set. Without `cursor: true`, a result set larger than `fetchCount` is silently truncated to `fetchCount` rows, not buffered in full; raise `fetchCount` (or use a cursor) for queries that may return more than 100 rows. |
| `prepare` | `boolean` | the connection's own setting (`true`) | Overrides the connection's `prepare` setting for this call — see [Automatic Statement Caching](#automatic-statement-caching). |
| `rowDecoder` | `'array' \| 'object' \| RowDecoder` | `'array'` | How a row's raw wire data becomes a value — see above. |
| `rollbackOnError` | `boolean` | `true` | Whether an error inside a transaction aborts it or is ignored so the transaction continues. |
| `utcDates` | `boolean` | `false` | Decode dates/timestamps in UTC instead of system time offset. |
| `signal` | `AbortSignal` | — | Cancels the running statement on the server when the signal fires. |

See [`QueryOptions`](../api/interfaces/query-options.md) for the complete table.

## Cursors

Pass `cursor: true` to get back a [`Cursor`](../api/classes/cursor.md) instead of eagerly buffering every row — essential for large result sets. See [Cursors](./cursors.md).

## Automatic Statement Caching

`query()`/`execute()` reuse a server-side prepared statement for SQL a connection has already run, instead of parsing it again every time — turning a repeated query from `Parse`/`Bind`/`Describe`/`Execute` into `Bind`/`Execute`. This is separate from — and happens underneath — the explicit [`connection.prepare()`](./prepared-statements.md) API; you don't have to opt in, and there's no `PreparedStatement` object to manage.

Nothing is cached the first time a piece of SQL text is seen — a query that only ever runs once costs exactly what it always did. The *second* call with the same SQL text is what gets a server-side name and starts being reused:

```ts
await connection.query('select * from customers where id = $1', { params: [1] }); // Parse + Bind + Describe + Execute
await connection.query('select * from customers where id = $1', { params: [2] }); // now prepared: Bind + Execute
await connection.query('select * from customers where id = $1', { params: [3] }); // Bind + Execute
```

It's on by default, controlled by `prepare` on [`DatabaseConnectionParams`](../api/interfaces/database-connection-params.md) (per connection) or [`QueryOptions`](../api/interfaces/query-options.md) (per call, overriding the connection's setting):

```ts
const connection = new Connection({ prepare: false }); // never cache on this connection

await connection.query(sql, { prepare: false }); // skip the cache for just this call
```

Turn it off when named prepared statements can't survive between calls on the same connection — the main case being **PgBouncer in transaction pooling mode before 1.21**, which hands each transaction a different backend server, so a statement prepared on one is simply missing on the next.

The cache is bounded per connection: `preparedStatementCacheSize` (default `64`) caps how many statements it holds, evicting the least-recently-used one — closing it server-side — once full, so an application that builds SQL text dynamically can't accumulate statements on the server without limit. A cached plan that's invalidated underneath it (e.g. an `ALTER TABLE` between two calls, which PostgreSQL answers with `0A000`, "cached plan must not change result type") is dropped from the cache automatically and the query re-runs unprepared — a schema change against a live connection recovers instead of failing every call from then on.

Scoped to the one-shot path `query()`/`execute()` use outside an explicit transaction; a call inside `startTransaction()`/`commit()` still prepares and closes per call.

## Multi-Statement Pipelines

`connection.pipeline(requests, options?)` runs several *different* statements in one round trip: every `Parse`/`Bind`/`Describe`/`Execute` goes out before any response is waited for, and a single `Sync` closes the lot. It's the counterpart to [`PreparedStatement.executeBatch()`](./prepared-statements.md#batch-execution), which runs one statement over many parameter sets — `pipeline()` runs many different statements once each:

```ts
import { sql } from 'postgrejs';

const [renamed, , total] = await connection.pipeline([
  sql`update users set name = ${name} where id = ${id}`,
  sql`insert into audit(msg) values (${msg})`,
  sql`select count(*)::int as n from users`,
]);
renamed.rowsAffected; // 1
total.rows?.[0];      // [42]
```

Statements can be `sql` tag output, plain SQL strings, or `{ sql, params, paramTypes }` objects — mix and match freely in the same array. Results map back to statements by position, decoded the same way `query()` would (`rowDecoder` included).

The single `Sync` carries the same three consequences as `executeBatch()`:

- **One shared transaction.** Unless an explicit transaction is already open, the statements commit or roll back together.
- **A failing statement stops the rest.** PostgreSQL discards everything between an error and the `Sync`, so statements after a rejected one never run. The thrown [`DatabaseError`](../api/classes/database-error.md) carries `failedIndex`, naming which statement the server actually rejected.
- **No statement can see another's results.** They're all sent before any reply arrives, so anything conditional on an earlier statement's output belongs in a separate call.

`fetchCount` doesn't apply and `cursor: true` throws, for the same reason as `executeBatch()`: every statement must run to completion under the shared `Sync`, with no portal left over to fetch from afterward.

This is a different mechanism from [`Pool`'s opt-in pipelining](./pooling.md#pipelining) (`{ pipeline: true }` on `pool.query()`), which lets independent one-shot queries share a connection without waiting on each other but still gives each its own `Sync` — `connection.pipeline()` is what collapses several *known* statements into a single round trip.

## See also

- [`QueryResult`](../api/interfaces/query-result.md), [`QueryOptions`](../api/interfaces/query-options.md) reference
- [Simple Query](./simple-query.md)
- [Query Parameters & Type Casting](./query-parameters.md)
- [Cursors](./cursors.md)
- [Custom Row Decoding](./row-decoder.md)
- [Prepared Statements](./prepared-statements.md), including [Batch Execution](./prepared-statements.md#batch-execution)
- [Connection Pooling](./pooling.md#pipelining) for `Pool`'s own, different pipelining option
