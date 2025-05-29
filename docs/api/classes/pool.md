---
sidebar_position: 2
---

# Pool

`new Pool([config: String | PoolConfiguration)`

## Properties

| Key                 | Type                                                   | Readonly | Description                                                                                   | 
|---------------------|--------------------------------------------------------|----------|-----------------------------------------------------------------------------------------------|
| config              | [PoolConfiguration](../interfaces/pool-configuration)] | true     | Returns configuration object                                                                  | 
| acquiredConnections | `number`                                               | true     | Returns number of connections that are currently acquired                                     | 
| idleConnections     | `number`                                               | true     | Returns number of unused connections in the pool                                              | 
| acquiredConnections | `number`                                               | true     | Returns number of connections that are currently acquired                                     | 
| totalConnections    | `number`                                               | true     | Returns total number of connections in the pool regardless of whether they are idle or in use | 

## Methods

### acquire()

Obtains a connection from the connection pool

`acquire(): Promise<PoolConnection>`

- Returns [Connection](./connection)

````ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost');
const connection = await pool.acquire();
// ...
await connection.close();
````

### close()

Shuts down the pool and destroys all resources.

`close(terminateWait?: number): Promise<void>`

````ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost');
const connection = await pool.acquire();
// ...
await pool.close(5000);
````

### execute()

Acquires a connection from the pool and executes single or multiple SQL scripts
using [Simple Query](https://www.postgresql.org/docs/current/protocol-flow.html#id-1.10.5.7.4) protocol.

`execute(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument | Type                                                         | Default | Description                      | 
|----------|--------------------------------------------------------------|---------|----------------------------------|
| sql      | string                                                       |         | SQL script that will be executed | 
| options  | [ScriptExecuteOptions](../interfaces/script-execute-options) |         | Execute options                  | 

- Returns [ScriptResult](../interfaces/script-result)

```ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost');
const executeResult = await pool.execute(
    'BEGIN; update my_table set ref=1 where id=1; END;');
// ...
await pool.close();
```

### query()

Acquires a connection from the pool and executes single SQL script
using [Extended Query](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY) protocol.

`query(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument | Type                                        | Default | Description                      | 
|----------|---------------------------------------------|---------|----------------------------------|
| sql      | string                                      |         | SQL script that will be executed | 
| options  | [QueryOptions](../interfaces/query-options) |         | Execute options                  | 

- Returns [QueryResult](../interfaces/query-result)

```ts
import { Pool } from 'postgrejs';

const pool = new Pool('postgres://localhost');
const queryResult = await pool.query(
    'select * from my_table', {
      cursor: true,
      utcDates: true
    });
let row;
while ((row = await queryResult.cursor.next())) {
  // ....
}
await pool.close();
```

### prepare()

Acquires a connection from the pool and creates a [PreparedStatement](./prepared-statement) instance.

`prepare(sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument | Type                                                               | Default | Description                      | 
|----------|--------------------------------------------------------------------|---------|----------------------------------|
| sql      | string                                                             |         | SQL script that will be executed | 
| options  | [StatementPrepareOptions](../interfaces/statement-prepare-options) |         | Options                          | 

- Returns [PreparedStatement](./prepared-statement)

```ts
import { Pool, DataTypeOIDs } from 'postgrejs';

const pool = new Pool('postgres://localhost');
const statement = await pool.prepare(
    'insert into my_table (ref_number) ($1)', {
      paramTypes: [DataTypeOIDs.Int4]
    });
// Bulk insert 100 rows
for (let i = 0; i < 100; i++) {
  await statement.execute({params: [i]});
}
await statement.close();
```

### release()

Releases a connection

`release(connection: Connection): Promise<void>`

### listen()

Registers the pool as a listener on the notification channel.

`listen(channel: string, callback: NotificationCallback): Promise<void>`

| Argument | Type                 | Default | Description                | 
|----------|----------------------|---------|----------------------------|
| channel  | string               |         | Name of the channel        | 
| callback | NotificationCallback |         | Listener callback function | 

```ts
await pool.listen('my_event', (msg: NotificationMessage) => {
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
await pool.unListen('my_event');
```

### unListenAll()

Removes existing registration for NOTIFY events for all channels.

`unListenAll(): Promise<void>`

```ts
await pool.unListenAll();
```
