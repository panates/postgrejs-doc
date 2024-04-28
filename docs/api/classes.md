---
sidebar_position: 1
---

# Classes

## 2.1. Classes

### 2.1.1. Connection

`new Connection([config: String | ConnectionConfiguration)`

#### Properties

| Key             | Type                  | Readonly | Description        | 
|-----------------|:----------------------| ---------|--------------------|
| config          | [ConnectionConfiguration](#221-connectionconfiguration) | true | Returns configuration object | 
| inTransaction   | `boolean`             | true     | Returns true if connection is in a transaction | 
| state           | `ConnectionState`     | true     | Returns current state of the connection | 
| processID       | `number`              | true     | Returns processId of current session | 
| secretKey       | `number`              | true     | Returns secret key of current session | 
| sessionParameters | `object`            | true     | Returns information parameters for current session | 

#### Methods

##### .connect()

Connects to the server

`connect(): Promise<void>`

````ts
import { Connection } from 'postgresql-client';

const connection = new Connection('postgres://localhost');
await connection.connect();
// ...
````

##### .close()

For a single connection this call closes connection permanently.
For a pooled connection it sends the connection back to the pool.

You can define how long time the connection will wait for active queries before closing.
At the end of time, it forces to close/release and emits `terminate` event.

`close(terminateWait?: number): Promise<void>`

- terminateWait: On the end of the given time, it forces to close the socket and than emits `terminate` event.

| Argument        | Type      | Default | Description                            | 
|-----------------|-----------| --------|--------------------|
| terminateWait   | `number`  | 10000   | Time in ms that the connection will wait for active queries before terminating | 

```ts
import { Connection } from 'postgresql-client';

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

`Connection` already supports [TC30 Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) proposal.

```ts
import { Connection } from 'postgresql-client';
{
    // connection will be automatically closed when this scope ends
    await using connection = new Connection('postgres://localhost');
    await connection.connect();    
}

```


##### .execute()

Executes single or multiple SQL scripts
using [Simple Query](https://www.postgresql.org/docs/current/protocol-flow.html#id-1.10.5.7.4) protocol.

`execute(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument     | Type        | Default  | Description                            | 
|--------------|--------------| --------|--------------------|
| sql          | string       |         | SQL script that will be executed | 
| options      | [ScriptExecuteOptions](#224-scriptexecuteoptions) |         | Execute options | 

- Returns [ScriptResult](#225-scriptresult)

```ts
import { Connection } from 'postgresql-client';

const connection = new Connection('postgres://localhost');
await connection.connect();
const executeResult = await connection.execute(
        'BEGIN; update my_table set ref=1 where id=1; END;');
// ...
await connection.close();
```

##### .query()

Executes single SQL script
using [Extended Query](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY) protocol.

`query(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument     | Type        | Default  | Description                            | 
|--------------|--------------| --------|--------------------|
| sql          | string       |         | SQL script that will be executed | 
| options      | [QueryOptions](#229-queryoptions) |         | Execute options | 

- Returns [QueryResult](#2210-queryresult)

```ts
import { Connection } from 'postgresql-client';

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

##### .prepare()

Creates a [PreparedStatement](#214-preparedstatement) instance

`prepare(sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument     | Type        | Default  | Description                            | 
|--------------|--------------| --------|--------------------|
| sql          | string       |         | SQL script that will be executed | 
| options      | [StatementPrepareOptions](#228-statementprepareoptions) |         | Options | 

- Returns [PreparedStatement](#214-preparedstatement)

```ts
import { Connection, DataTypeOIDs } from 'postgresql-client';

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

##### .startTransaction()

Starts a transaction

`startTransaction(): Promise<void>`

```ts
import { Connection } from 'postgresql-client';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
        'update my_table set ref=1 where id=1');
// ...... commit or rollback
await connection.close();
```

##### .commit()

Commits current transaction

`commit(): Promise<void>`

```ts
import { Connection } from 'postgresql-client';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
        'update my_table set ref=1 where id=1');
await connection.commit();
await connection.close();
```

##### .rollback()

Rolls back current transaction

`commit(): Promise<void>`

```ts
import { Connection } from 'postgresql-client';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.startTransaction();
const executeResult = await connection.execute(
        'update my_table set ref=1 where id=1');
await connection.commit();
await connection.close();
```

##### .savepoint()

Starts transaction and creates a savepoint

`savepoint(name: string): Promise<void>`

| Argument     | Type        | Default  | Description                            | 
|--------------|-------------| ---------|--------------------|
| name         | string      |          | Name of the savepoint | 

##### .rollbackToSavepoint()

Rolls back current transaction to given savepoint

`savepoint(name: string): Promise<void>`

| Argument     | Type        | Default  | Description                            | 
|--------------|-------------| ---------|--------------------|
| name         | string      |          | Name of the savepoint | 

```ts
import { Connection } from 'postgresql-client';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.savepoint('my_save_point');
const executeResult = await connection.execute(
        'update my_table set ref=1 where id=1');
await connection.rollbackToSavepoint('my_save_point');
await connection.close();
```

##### .listen()

Registers the connection as a listener on the notification channel.

`listen(channel: string, callback: NotificationCallback): Promise<void>`

| Argument     | Type        | Default  | Description                | 
|--------------|-------------| ---------|----------------------------|
| channel      | string      |          | Name of the channel        | 
| callback     | NotificationCallback   |          | Listener callback function | 

```ts
await connection.listen('my_event', (msg: NotificationMessage)=>{
  console.log(msg.channel+ ' event fired!. processId:', msg.processId, '  payload:', msg.payload);
});
```


##### .unListen()

Removes existing registration for NOTIFY events for given channel.

`unListen(channel: string): Promise<void>`

| Argument     | Type        | Default  | Description                | 
|--------------|-------------| ---------|----------------------------|
| channel      | string      |          | Name of the channel        |

```ts
await connection.unListen('my_event');
```



##### .unListenAll()

Removes existing registration for NOTIFY events for all channels.

`unListenAll(): Promise<void>`


```ts
await connection.unListenAll();
```



### Events

#### ___error___ 

  Triggered when an error occurs.

  `(err: Error) => void`

| Argument | Type  | Default  | Description    | 
|--------|-------| ---------|----------------|
| err    | Error |          | Error instance |


##### ___close___

  Triggered when after connection closed.

  `() => void`


#### ___connecting___

  Triggered when establishing a connection.

    `() => void`

#### ___ready___

   Triggered when connection is ready.

    `() => void`


#### ___terminate___

   Triggered when the connection is terminated unintentionally.

   `() => void`

#### ___notification___

   Triggered when notification is received from a registered channel.

    `(msg: NotificationMessage) => void`

| Argument | Type  | Default  | Description                   | 
|--------|-------| ---------|-------------------------------|
| msg    | NotificationMessage |          | Notification message instance |


### 2.1.2. Pool

`new Pool([config: String | PoolConfiguration)`

#### Properties

| Key                 | Type                 | Readonly | Description        | 
|---------------------|----------------------| ---------|--------------------|
| config              | [PoolConfiguration](#222-poolconfiguration)] | true | Returns configuration object | 
| acquiredConnections | `number`             | true     | Returns number of connections that are currently acquired | 
| idleConnections     | `number`             | true     | Returns number of unused connections in the pool | 
| acquiredConnections | `number`             | true     | Returns number of connections that are currently acquired | 
| totalConnections    | `number`             | true     | Returns total number of connections in the pool regardless of whether they are idle or in use | 

#### Methods

##### .acquire()

Obtains a connection from the connection pool

`acquire(): Promise<PoolConnection>`

- Returns [Connection](#211-connection)

````ts
import { Pool } from 'postgresql-client';

const pool = new Pool('postgres://localhost');
const connection = await pool.acquire();
// ...
await connection.close();
````

##### .close()

Shuts down the pool and destroys all resources.

`close(terminateWait?: number): Promise<void>`

````ts
import { Pool } from 'postgresql-client';

const pool = new Pool('postgres://localhost');
const connection = await pool.acquire();
// ...
await pool.close(5000);
````

##### .execute()

Acquires a connection from the pool and executes single or multiple SQL scripts
using [Simple Query](https://www.postgresql.org/docs/current/protocol-flow.html#id-1.10.5.7.4) protocol.

`execute(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument     | Type        | Default  | Description                            | 
|--------------|--------------| --------|--------------------|
| sql          | string       |         | SQL script that will be executed | 
| options      | [ScriptExecuteOptions](#224-scriptexecuteoptions) |         | Execute options | 

- Returns [ScriptResult](#225-scriptresult)

```ts
import { Pool } from 'postgresql-client';

const pool = new Pool('postgres://localhost');
const executeResult = await pool.execute(
        'BEGIN; update my_table set ref=1 where id=1; END;');
// ...
await pool.close();
```

##### .query()

Acquires a connection from the pool and executes single SQL script
using [Extended Query](https://www.postgresql.org/docs/current/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY) protocol.

`query(sql: string, options?: ScriptExecuteOptions): Promise<ScriptResult>;`

| Argument     | Type        | Default  | Description                            | 
|--------------|--------------| --------|--------------------|
| sql          | string       |         | SQL script that will be executed | 
| options      | [QueryOptions](#229-queryoptions) |         | Execute options | 

- Returns [QueryResult](#2210-queryresult)

```ts
import { Pool } from 'postgresql-client';

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

##### .prepare()

Acquires a connection from the pool and creates a [PreparedStatement](#214-preparedstatement) instance.

`prepare(sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument     | Type        | Default  | Description                            | 
|--------------|--------------| --------|--------------------|
| sql          | string       |         | SQL script that will be executed | 
| options      | [StatementPrepareOptions](#228-statementprepareoptions) |         | Options | 

- Returns [PreparedStatement](#214-preparedstatement)

```ts
import { Pool, DataTypeOIDs } from 'postgresql-client';

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

##### .release()

Releases a connection

`release(connection: Connection): Promise<void>`



##### .listen()

Registers the pool as a listener on the notification channel.

`listen(channel: string, callback: NotificationCallback): Promise<void>`

| Argument     | Type        | Default  | Description                | 
|--------------|-------------| ---------|----------------------------|
| channel      | string      |          | Name of the channel        | 
| callback     | NotificationCallback   |          | Listener callback function | 

```ts
await pool.listen('my_event', (msg: NotificationMessage)=>{
  console.log(msg.channel+ ' event fired!. processId:', msg.processId, '  payload:', msg.payload);
});
```


##### .unListen()

Removes existing registration for NOTIFY events for given channel.

`unListen(channel: string): Promise<void>`

| Argument     | Type        | Default  | Description                | 
|--------------|-------------| ---------|----------------------------|
| channel      | string      |          | Name of the channel        |

```ts
await pool.unListen('my_event');
```


##### .unListenAll()

Removes existing registration for NOTIFY events for all channels.

`unListenAll(): Promise<void>`


```ts
await pool.unListenAll();
```


### 2.1.3. Cursor

### 2.1.4. PreparedStatement

### 2.1.5. BindParam

### 2.1.6. DataTypeMap