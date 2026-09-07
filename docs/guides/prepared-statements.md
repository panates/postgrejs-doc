---
sidebar_position: 9
---

# Prepared Statements

A prepared statement parses and plans a SQL script once on the server, then lets
you execute it repeatedly with different parameters. This is the fastest way to
run the same statement shape many times — for example a bulk insert or update
loop — because the server skips re-parsing and re-planning on every call.

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

See [Resource Management](./resource-management.md) for the broader pattern
across `Connection`, `Cursor`, and other disposable resources, and
[API: PreparedStatement](../api/classes/prepared-statement.md) for the full
reference.
