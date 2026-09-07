---
sidebar_position: 8
---

# LogicalReplication

Streams row-level changes out of PostgreSQL as they are committed, using the `pgoutput` logical decoding plugin. It owns its own connection rather than borrowing one from a [Pool](./pool.md): a connection that has run `START_REPLICATION` is in a streaming mode it never leaves, so none of [Connection](./connection.md)'s own API works on it afterwards.

It is an async iterable: iterating it starts replication automatically.

```ts
import { LogicalReplication } from 'postgrejs';

const sub = new LogicalReplication({
  host: 'localhost',
  database: 'my_database',
  publication: 'my_pub',
});
for await (const change of sub) {
  if (change.command === 'insert') await index.add(change.row);
}
```

The loop is the backpressure: nothing is read from the socket while the loop body is running, so a slow consumer slows the stream instead of filling memory. Leaving the loop — by `break`, by throwing, or by calling `close()` — ends the subscription cleanly.

Each change is confirmed to the server when the *next* one is pulled, not when it is handed over. A consumer that crashes half way through therefore sees that change again on the next run rather than losing it, and no caller has to remember to call `ack()` themselves.

## Constructor

`new LogicalReplication(options: LogicalReplicationOptions)`

| Argument | Type                                              | Default | Description        |
|----------|----------------------------------------------------|---------|--------------------------|
| options  | [LogicalReplicationOptions](#logicalreplicationoptions) |    | Subscription options      |

### LogicalReplicationOptions

Extends [DatabaseConnectionParams](../interfaces/database-connection-params.md).

| Property             | Type                          | Default                | Description                                                                                                                    |
|-----------------------|-------------------------------|-------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| publication           | `string \| string[]`           |                          | Publication(s) to subscribe to; must already exist on the server                                                                    |
| slot                   | `string`                       | a random `postgrejs_*` name | Replication slot name. A slot is what makes the server keep WAL until it is confirmed; the default is temporary and dropped when the connection ends |
| permanent              | `boolean`                      | `false`                 | Keep the slot after disconnecting. A permanent slot outlives the process and keeps WAL piling up until it is read or dropped        |
| commands               | `ChangeCommand[]`               |                          | Only these commands are yielded (`'insert' \| 'update' \| 'delete' \| 'truncate'`)                                                    |
| tables                 | `string[]`                     |                          | Only these tables are yielded, as `users` or `public.users`                                                                          |
| filter                 | `(change: Change) => boolean`  |                          | Anything the two options above cannot express                                                                                        |
| keepAliveIntervalMs    | `number`                       | `10000`                 | How often to tell the server where we are, in ms                                                                                      |

## Properties

| Key          | Type     | Readonly | Description                                       |
|--------------|----------|----------|--------------------------------------------------------|
| options      | `LogicalReplicationOptions` | true | The options this subscription was constructed with |
| slot         | `string` | true     | The replication slot this subscription is reading from  |
| confirmedLsn | `string` | true     | The last WAL position confirmed to the server, formatted as PostgreSQL's `X/X` LSN notation |

## Methods

### start()

Opens the connection, creates the replication slot if needed, and starts streaming. Iterating the subscription calls this automatically, so it is only needed to start streaming early.

`start(): Promise<void>`

### close()

Ends the subscription and closes its connection. Drops the replication slot first if it was created for this subscription and `permanent` is not set.

`close(): Promise<void>`

```ts
await sub.close();
```

### ack()

Confirms everything up to the last change handed out. Called automatically the next time a change is pulled from the iterator; call it directly only to confirm sooner than that.

`ack(): Promise<void>`

### Symbol.asyncIterator()

Makes `LogicalReplication` usable with `for await...of`. Starts the subscription (via `start()`) if it has not been started yet, and calls `close()` when the loop ends for any reason.

`[Symbol.asyncIterator](): AsyncIterableIterator<Change>`

## Change

Shape of each value yielded by the async iterator.

| Property  | Type                              | Description                                                                                          |
|-----------|-----------------------------------|-----------------------------------------------------------------------------------------------------------|
| command   | `'insert' \| 'update' \| 'delete' \| 'truncate'` | The kind of change                                                                     |
| table     | `string`                          | Schema-qualified table name, e.g. `public.users`                                                           |
| schema    | `string`                          | Schema name                                                                                                 |
| relation  | `PgOutputRelation`                | The decoded relation (table) metadata from `pgoutput`                                                       |
| row       | `TupleValues \| undefined`        | The row after the change; absent for `delete` and `truncate`                                                |
| oldRow    | `TupleValues \| undefined`        | The row before the change, for `update` and `delete`. How much of it is present depends on the table's `REPLICA IDENTITY` — by default, only the primary key |
| lsn       | `bigint`                          | Where this change sits in the write-ahead log                                                                |
| timestamp | `Date \| undefined`                | Commit time of the transaction this change belongs to                                                        |
