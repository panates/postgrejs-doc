---
sidebar_position: 1
---

# Connection

## Constructor

`new Connection([config: String | ConnectionConfiguration)`

## Properties

| Key               | Type                                                              | Readonly | Description                                        |
|-------------------|:------------------------------------------------------------------|----------|----------------------------------------------------|
| config            | [ConnectionConfiguration](../interfaces/connection-configuration) | true     | Returns configuration object                       |
| inTransaction     | `boolean`                                                         | true     | Returns true if connection is in a transaction     |
| state             | `ConnectionState`                                                 | true     | Returns current state of the connection            |
| processID         | `number`                                                          | true     | Returns processId of current session               |
| secretKey         | `number`                                                          | true     | Returns secret key of current session              |
| sessionParameters | `object`                                                          | true     | Returns information parameters for current session |

## Methods

### connect()

Connects to the server

`connect(): Promise<void>`

````ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
// ...
````

### close()

For a single connection this call closes connection permanently.
For a pooled connection it sends the connection back to the pool.

You can define how long time the connection will wait for active queries before closing.
At the end of time, it forces to close/release and emits `terminate` event.

`close(terminateWait?: number): Promise<void>`

- terminateWait: On the end of the given time, it forces to close the socket and than emits `terminate` event.

| Argument      | Type     | Default | Description                                                                    |
|---------------|----------|---------|--------------------------------------------------------------------------------|
| terminateWait | `number` | 10000   | Time in ms that the connection will wait for active queries before terminating |

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
connection.on('close', () => {
  console.log('Connection closed');
});
connection.on('terminate', () => {
  console.warn('Connection forced to terminate!');
});
// ...
await connection.close(30000); // will wait 30 secs before terminate the connection
```

`Connection` already
supports [TC30 Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) proposal.

```ts
import { Connection } from 'postgrejs';

{
  // connection will be automatically closed when this scope ends
      await using connection = new Connection('postgres://localhost');
  await connection.connect();
}

```

### execute()

Executes single or multiple SQL scripts
using [Simple Query](https://www.postgresql.org/docs/current/protocol-flow.html#id-1.10.5.7.4) protocol.

`execute(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument | Type                                                         | Default | Description                      |
|----------|--------------------------------------------------------------|---------|----------------------------------|
| sql      | string                                                       |         | SQL script that will be executed |
| options  | [ScriptExecuteOptions](../interfaces/script-execute-options) |         | Execute options                  |

- Returns [ScriptResult](../interfaces/script-result)

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const executeResult = await connection.execute(
    'BEGIN; update my_table set ref=1 where id=1; END;');
// ...
await connection.close();
```

### query()

Executes single SQL script
using [Extended Query](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY) protocol.

`query(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument | Type                                        | Default | Description                      |
|----------|---------------------------------------------|---------|----------------------------------|
| sql      | string                                      |         | SQL script that will be executed |
| options  | [QueryOptions](../interfaces/query-options) |         | Execute options                  |

- Returns [QueryResult](../interfaces/query-result)

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const queryResult = await connection.query(
    'select * from my_table', {
      cursor: true,
      utcDates: true
    });
let row;
while ((row = await queryResult.cursor.next())) {
  // ....
}
await connection.close();
```

### prepare()

Creates a [PreparedStatement](./prepared-statement) instance

`prepare(sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument | Type                                                               | Default | Description                      |
|----------|--------------------------------------------------------------------|---------|----------------------------------|
| sql      | string                                                             |         | SQL script that will be executed |
| options  | [StatementPrepareOptions](../interfaces/statement-prepare-options) |         | Options                          |

- Returns [PreparedStatement](./prepared-statement)

```ts
import { Connection, DataTypeOIDs } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const statement = await connection.prepare(
    'insert into my_table (ref_number) ($1)', {
      paramTypes: [DataTypeOIDs.Int4]
    });
// Bulk insert 100 rows
for (let i = 0; i < 100; i++) {
  await statement.execute({params: [i]});
}
await statement.close();
```

### startTransaction()

Starts a transaction

`startTransaction(): Promise<void>`

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
    'update my_table set ref=1 where id=1');
// ...... commit or rollback
await connection.close();
```

### commit()

Commits current transaction

`commit(): Promise<void>`

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
    'update my_table set ref=1 where id=1');
await connection.commit();
await connection.close();
```

### rollback()

Rolls back current transaction

`commit(): Promise<void>`

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
    'update my_table set ref=1 where id=1');
await connection.commit();
await connection.close();
```

### savepoint()

Starts transaction and creates a savepoint

`savepoint(name: string): Promise<void>`

| Argument | Type   | Default | Description           |
|----------|--------|---------|-----------------------|
| name     | string |         | Name of the savepoint |

### rollbackToSavepoint()

Rolls back current transaction to given savepoint

`savepoint(name: string): Promise<void>`

| Argument | Type   | Default | Description           |
|----------|--------|---------|-----------------------|
| name     | string |         | Name of the savepoint |

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.savepoint('my_save_point');
const executeResult = await connection.execute(
    'update my_table set ref=1 where id=1');
await connection.rollbackToSavepoint('my_save_point');
await connection.close();
```

### listen()

Registers the connection as a listener on the notification channel.

`listen(channel: string, callback: NotificationCallback): Promise<void>`

| Argument | Type                 | Default | Description                |
|----------|----------------------|---------|----------------------------|
| channel  | string               |         | Name of the channel        |
| callback | NotificationCallback |         | Listener callback function |

```ts
await connection.listen('my_event', (msg: NotificationMessage) => {
  console.log(msg.channel + ' event fired!. processId:', msg.processId, '  payload:', msg.payload);
});
```

### unListen()

Removes existing registration for NOTIFY events for given channel.

`unListen(channel: string): Promise<void>`

| Argument | Type   | Default | Description         |
|----------|--------|---------|---------------------|
| channel  | string |         | Name of the channel |

```ts
await connection.unListen('my_event');
```

### unListenAll()

Removes existing registration for NOTIFY events for all channels.

`unListenAll(): Promise<void>`

```ts
await connection.unListenAll();
```

## Events

### error

Triggered when an error occurs.

`(err: Error) => void`

| Argument | Type  | Default | Description    |
|----------|-------|---------|----------------|
| err      | Error |         | Error instance |

### close

Triggered when after connection closed.

`() => void`

### connecting

Triggered when establishing a connection.

    `() => void`

### ready

Triggered when connection is ready.

    `() => void`

### terminate

Triggered when the connection is terminated unintentionally.

`() => void`

### notification

Triggered when notification is received from a registered channel.

    `(msg: NotificationMessage) => void`

| Argument | Type                | Default | Description                   |
|----------|---------------------|---------|-------------------------------|
| msg      | NotificationMessage |         | Notification message instance |
