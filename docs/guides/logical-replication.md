---
sidebar_position: 20
---

# Logical Replication

PostgreSQL's logical replication protocol streams row-level changes
(inserts, updates, deletes, truncates) out of the server as they are
committed. `postgrejs` wraps it in the `LogicalReplication` class, which can
be consumed directly with `for await...of`.

`LogicalReplication` owns its own dedicated connection - it is not acquired
from a `Pool` and does not share a `Connection` with regular queries. Once a
connection issues `START_REPLICATION` it enters a streaming mode it never
leaves, so none of the normal query API would work on it afterwards.

## Server prerequisites

Logical replication requires:

- `wal_level = logical` in `postgresql.conf` (requires a server restart to
  change).
- A publication describing which tables to replicate:

```sql
CREATE PUBLICATION my_pub FOR TABLE users, orders;
-- or, for every table:
CREATE PUBLICATION my_pub FOR ALL TABLES;
```

`LogicalReplication` creates its own replication slot by default (see
below), so you generally do not need to create one yourself.

## Creating a subscription

```ts
import { LogicalReplication, type Change } from 'postgrejs';

const sub = new LogicalReplication({
  host: 'localhost',
  database: 'mydb',
  user: 'postgres',
  password: 'secret',
  publication: 'my_pub',
});

for await (const change of sub) {
  console.log(change.command, change.table, change.row);
}
```

Iterating calls `start()` for you if it has not been called yet. The loop
itself provides backpressure: nothing more is read from the socket while the
loop body is running, so a slow consumer slows the replication stream
instead of letting changes pile up in memory. Leaving the loop - by `break`,
by an uncaught throw, or by calling `close()` - ends the subscription
cleanly and drops any temporary slot it created.

### `LogicalReplicationOptions`

`LogicalReplicationOptions` extends the same connection parameters as
`Connection`/`Pool` (`host`, `port`, `user`, `password`, `database`, ...),
plus:

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `publication` | `string \| string[]` | - | Required. Publication(s) to subscribe to; must already exist on the server. |
| `slot` | `string` | random `postgrejs_<id>` | Replication slot name. A slot is what makes the server retain WAL until it is confirmed read. |
| `permanent` | `boolean` | `false` | Whether a newly-created slot is a permanent (non-temporary) one at the PostgreSQL level. A permanent slot outlives the process and keeps WAL accumulating until it is read or dropped. |
| `commands` | `ChangeCommand[]` | all | Only yield these commands (`'insert' \| 'update' \| 'delete' \| 'truncate'`). |
| `tables` | `string[]` | all | Only yield changes for these tables, as `users` or `public.users`. |
| `filter` | `(change: Change) => boolean` | - | Arbitrary client-side predicate, applied after `commands`/`tables`. |
| `keepAliveIntervalMs` | `number` | `10000` | How often to report the current position back to the server. |

`commands`, `tables` and `filter` are applied on the client, on top of
whatever the publication itself already restricts.

**Slot creation and cleanup:** a slot is created by `start()` whenever no
`slot` name is given, or `permanent` is explicitly `false`. When `slot` is
given and `permanent` is not `false`, an existing slot with that name is
assumed and is left untouched by `close()` - it can be resumed later. When
this instance did create the slot, `close()` drops it again if it was
temporary (the server does this on disconnect for a slot created without a
name), or explicitly issues `DROP_REPLICATION_SLOT` if it created a
permanent one with an auto-generated name (there being no way to reference
it again otherwise). In short: give an explicit `slot` name and leave
`permanent` unset/`true` if you want the slot to survive across runs.

## The `Change` object

```ts
interface Change {
  command: 'insert' | 'update' | 'delete' | 'truncate';
  table: string; // schema-qualified, e.g. "public.users"
  schema: string;
  relation: PgOutputRelation; // decoded table metadata (columns, replica identity, ...)
  row?: TupleValues; // the row after the change; absent for delete/truncate
  oldRow?: TupleValues; // the row before the change, for update/delete
  lsn: bigint; // position in the write-ahead log
  timestamp?: Date; // commit time of the transaction it belongs to
}
```

`TupleValues` is `Record<string, string | null>` - column values arrive as
text, decoded by `pgoutput`, not as the driver's usual typed JS values.

How much of `oldRow` is populated depends on the table's `REPLICA IDENTITY`;
by default only the primary key columns are included. Set
`REPLICA IDENTITY FULL` on a table to get the entire previous row on
update/delete.

```ts
for await (const change of sub) {
  switch (change.command) {
    case 'insert':
      await index.add(change.row);
      break;
    case 'update':
      await index.update(change.oldRow, change.row);
      break;
    case 'delete':
      await index.remove(change.oldRow);
      break;
    case 'truncate':
      await index.clear(change.table);
      break;
  }
}
```

## Filtering

```ts
const sub = new LogicalReplication({
  publication: 'my_pub',
  tables: ['orders'],
  commands: ['insert', 'update'],
  filter: change => change.row?.status === 'paid',
});
```

## Acknowledging position

Each change is confirmed to the server when the *next* one is pulled from
the subscription, not when it is handed to the loop body - so a consumer
that crashes mid-iteration sees that change again on the next run rather
than losing it. Call `ack()` directly to confirm sooner than that, for
example right after successfully processing a change without waiting for
the next one to arrive:

```ts
for await (const change of sub) {
  await process(change);
  await sub.ack();
}
```

`sub.confirmedLsn` reports the last position confirmed to the server, as a
formatted LSN string (e.g. `'0/1634E38'`).

## Lifecycle

| Method | Description |
| :--- | :--- |
| `start(): Promise<void>` | Opens the connection, creates the slot if needed, and starts streaming. Called for you by the async iterator if not already started. |
| `close(): Promise<void>` | Ends the subscription and closes its connection, dropping a temporary slot. |
| `ack(): Promise<void>` | Confirms everything up to the last change handed out. |

```ts
const sub = new LogicalReplication({ publication: 'my_pub' });
try {
  await sub.start();
  for await (const change of sub) {
    if (change.command === 'insert') console.log(change.row);
  }
} finally {
  await sub.close();
}
```

See [API: LogicalReplication](../api/classes/logical-replication.md) for the
full class reference.
