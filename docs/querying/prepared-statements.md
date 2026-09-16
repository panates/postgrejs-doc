---
sidebar_position: 5
slug: /guides/prepared-statements
---

# Prepared Statements

A prepared statement parses and plans a SQL script once on the server, then lets
you execute it repeatedly with different parameters. This is the fastest way to
run the same statement shape many times — for example a bulk insert or update
loop — because the server skips re-parsing and re-planning on every call.

:::note
This page covers the *explicit* API: `connection.prepare()` returning a `PreparedStatement` you manage
yourself. Plain `connection.query()`/`execute()` calls also get this benefit *automatically*, with no
`PreparedStatement` object involved — see [Extended Query: Automatic Statement Caching](./extended-query.md#automatic-statement-caching).
:::

## Preparing a Statement

Call `connection.prepare(sql, options?)` to get a [PreparedStatement](../api/classes/prepared-statement.md)
instance:

```ts
const stmt = await connection.prepare(
  'insert into my_table(id, name) values ($1, $2)',
);
try {
  await stmt.execute({ params: [1, 'John'] });
} finally {
  await stmt.close();
}
```

`prepare()` sends the statement to the server immediately (a `Parse` + `Describe`),
so the returned promise only resolves once the server has confirmed the
statement is valid.

## Explicit Parameter Types

By default, PostgreSQL infers each parameter's type from how it is used in the
SQL text. You can override this by passing `paramTypes` in a
[StatementPrepareOptions](../api/interfaces/statement-prepare-options.md) object:

| Key | Type | Default | Description |
|:---|:---|:---|:---|
| `paramTypes` | `OID[]` | _(inferred)_ | Explicit data type for each parameter, in order. |
| `typeMap` | `DataTypeMap` | `GlobalTypeMap` | Data type map used to encode/decode values for this statement. |

```ts
import { DataTypeOIDs } from 'postgrejs';

const stmt = await connection.prepare(
  'insert into my_table(id, name) values ($1, $2)',
  { paramTypes: [DataTypeOIDs.Int4, DataTypeOIDs.Varchar] },
);
```

## Executing Multiple Times

Once prepared, call `.execute(options)` as many times as needed. Each call only
sends `Bind` + `Execute`, reusing the plan and the column description from
`prepare()`. This makes it well suited to bulk operations:

```ts
const stmt = await connection.prepare(
  'insert into my_table(id, name) values ($1, $2)',
);
try {
  for (let i = 0; i < 1000; i++) {
    await stmt.execute({ params: [i, 'name' + i] });
  }
} finally {
  await stmt.close();
}
```

`execute()` accepts the same [QueryOptions](../api/interfaces/query-options.md) as
`connection.query()` — `params`, `objectRows`, `columnFormat`, `cursor`, `signal`,
and so on. See [API: PreparedStatement](../api/classes/prepared-statement.md) for
the full method signature.

## Batch Execution

`execute()` in a loop (or `Promise.all()` of `execute()` calls) sends a `Bind`/`Execute`/`Sync` per parameter
set — each one makes the server close an implicit transaction and answer `ReadyForQuery`, whether or not you
asked for that. `executeBatch(paramSets, options?)` runs the statement once per set the same way, but closes
the whole batch with a single `Sync` instead of one per set:

```ts
const stmt = await connection.prepare(
  'update users set name = $1 where id = $2',
);
try {
  const batch = await stmt.executeBatch([
    ['John', 1],
    ['Jane', 2],
    ['Bob', 3],
  ]);
  batch.results.map(r => r.rowsAffected); // [1, 1, 0] — third id didn't match a row
  batch.totalRowsAffected;                // 2
} finally {
  await stmt.close();
}
```

Collapsing per-set `Sync` into one is the whole mechanism, and it's substantial: 1000 updates through a loop
of `execute()` calls took 194ms in the project's own benchmark, against 21ms through `executeBatch()` — with
socket reads dropping from 972 to 3.

That single `Sync` has three consequences, and they're why this is a separate method instead of an option on
`execute()`:

- **One shared transaction.** Unless an explicit transaction is already open, the whole batch commits or
  rolls back together — unlike a loop of `execute()` calls, where each one commits on its own.
- **A failing set stops the rest.** PostgreSQL discards everything between an error and the `Sync`, so sets
  after a rejected one never run. The thrown [`DatabaseError`](../api/classes/database-error.md) gains
  `failedIndex` (which set was rejected) and `batchResults` (the sets that had already completed):

  ```ts
  try {
    await stmt.executeBatch([[10], [1], [11]]); // set #1 hits a duplicate key
  } catch (e) {
    e.code;          // '23505'
    e.failedIndex;     // 1 — set #1 was the one rejected
    e.batchResults;    // results for set #0, which had already run
    // ...but set #0 is rolled back along with everything else, unless an
    // explicit transaction was already open before executeBatch() was called.
  }
  ```

- **`fetchCount` and `cursor` don't apply.** Every `Execute` in a batch must run to completion — a portal
  suspended mid-batch would answer `PortalSuspended` instead of `CommandComplete` and desynchronize the
  positional mapping from sets to results. `fetchCount` is ignored, and passing `cursor: true` throws.

Sets that return rows get them decoded into `results[i].rows` exactly as `execute()` would, `rowDecoder`
included — a plain `UPDATE`/`INSERT` without `RETURNING` leaves `rows` `undefined` rather than an empty
array.

For a bulk `INSERT` specifically, [`connection.copyFrom()`](../bulk-data/copy.md) is faster still, and a single
`UPDATE ... FROM (VALUES ...)` beats `executeBatch()` for bulk updates of one shape — at the cost of
PostgreSQL's 65535-parameter ceiling. `executeBatch()` is the general answer when neither of those fits.

See [API: PreparedStatement.executeBatch()](../api/classes/prepared-statement.md#executebatch) and
[BatchResult](../api/interfaces/batch-result.md) for the full reference.

## Reference Counting

`PreparedStatement.close()` does not always tear the statement down on the wire
immediately — it decrements an internal reference count and only sends the
server-side `Close` once that count reaches zero.

The count starts at 1 when `prepare()` succeeds, and is bumped by one more each
time `execute({ cursor: true })` opens a [Cursor](../api/classes/cursor.md) against
that statement — a cursor keeps the statement's column description alive while
rows are still being fetched. Closing the cursor (or exhausting it) drops the
count back down; closing the statement itself drops it too. Only when every
outstanding cursor and the statement's own reference have been closed does the
count hit zero and the server-side statement actually get released.

In practice this means:

- Calling `stmt.close()` while a cursor obtained from that same statement is
  still open is safe — it will not invalidate the cursor.
- `close()` is idempotent: calling it more than once on the same instance is a
  harmless no-op after the first call.

```ts
const stmt = await connection.prepare('select * from my_table');
const { cursor } = await stmt.execute({ cursor: true, fetchCount: 200 });

// Safe even though `cursor` is still in use — the statement isn't released
// server-side until the cursor is also closed.
await stmt.close();

let row;
while ((row = await cursor.next())) {
  console.log(row);
}
await cursor.close();
```

Note that this reference counting is per `PreparedStatement` **instance** —
calling `connection.prepare()` again with the same SQL text does not look up or
reuse a previous statement; it always creates a new named statement on the
server.

## Events

`PreparedStatement` emits:

| Event | Payload | Description |
|:---|:---|:---|
| `close` | _(none)_ | Emitted once the statement is actually released server-side (refcount reached zero). |
| `notice` | notice message | Emitted for `NOTICE` messages the server sends while preparing, executing, or closing the statement. |

## Disposal

`PreparedStatement` implements `AsyncDisposable`, so it works with `await using`
for automatic cleanup:

```ts
async function bulkInsert(connection: Connection, rows: [number, string][]) {
  await using stmt = await connection.prepare(
    'insert into my_table(id, name) values ($1, $2)',
  );
  for (const params of rows) {
    await stmt.execute({ params });
  }
} // stmt.close() runs automatically here
```

See [Resource Management](../reliability/resource-management.md) for the broader pattern
across `Connection`, `Cursor`, and other disposable resources, and
[API: PreparedStatement](../api/classes/prepared-statement.md) for the full
reference.
