---
sidebar_position: 3
---
# Queries

## 1.3. Queries

### 1.3.1 Simple query

PostgreSQL wire protocol has two kind of way to execute SQL scripts.
Simple query is the mature way.
Simple query supports executing more than one sql scripts in a single command.
But it does not support *bind parameters* and server transfers data in text format which is slower than binary format.
So it may cause performance and security problems.
We suggest to use `query()` method which uses *Extended query protocol* if you need bind parameters or need to return
rows.

To execute SQL scripts you can create a `ScriptExecutor` instance or just call `connection.execute()`
or `pool.execute()` methods.

*pool.execute(sql: string, options?: [ScriptExecuteOptions](#224-scriptexecuteoptions)]):
Promise\<[ScriptResult](#225-scriptresult)>;*

*connection.execute(sql: string, options?: [ScriptExecuteOptions](#224-scriptexecuteoptions)]):
Promise\<[ScriptResult](#225-scriptresult)>;*

```ts
const qr = await connection.execute('BEGIN; update my_table set ref = ref+1; END;');
console.log(qr.results[1].rowsAffected + ' rows updated');
```

```ts
const scriptExecutor = new ScriptExecutor(connection);
scriptExecutor.on('start', () => console.log('Script execution started'));
scriptExecutor.on('command-complete', (cmd) => console.log(cmd.command + ' complete'));
scriptExecutor.on('row', (row) => console.log('Row received: ', row));
scriptExecutor.on('finish', () => console.log('Script execution complete'));
await scriptExecutor.execute(`
    BEGIN; 
    update my_table set ref = ref+1; 
    select * from my_table where id=1; 
    END;`);
```

## 1.3.2. Extended query

In the extended-query protocol, *prepared statements* and *portals* are used.
Unlike simple query, extended query protocol supports parameter binding and binary data format.
The only limit is you can execute one command at a time.

*pool.query(sql: string, options?: [QueryOptions](#229-queryoptions)]): Promise\<[QueryResult](#2210-queryresult)>;*

*connection.query(sql: string, options?: [QueryOptions](#229-queryoptions)]): Promise\<[QueryResult](#2210-queryresult)>
;*

```ts
const qr = await connection.query('select * from my_table');
console.log(qr.fields);
console.log(qr.rows);
```

## 1.3.3. Prepared Statements

Prepared statements are great when you need executing a script more than once (etc. bulk insert or update).
It dramatically reduces execution time.

To create a [PreparedStatement](#214-preparedstatement) instance or just call `connection.prepare()` or `pool.prepare()`
methods.

*pool.prepare(sql: string, options?: [StatementPrepareOptions](#228-statementprepareoptions)]):
Promise\<[PreparedStatement](#214-preparedstatement)>;*

*connection.prepare(sql: string, options?: [StatementPrepareOptions](#228-statementprepareoptions)]):
Promise\<[PreparedStatement](#214-preparedstatement)>;*

```ts
import { DataTypeOIDs } from 'postgresql-client';

// .....
const statement = await connection.prepare(
        'insert into my_table(id, name) values ($1, $2)', {
            paramTypes: [DataTypeOIDs.Int4, DataTypeOIDs.Varchar]
        });

for (let i = 0; i < 100; i++) {
    await statement.execute({params: [i, ('name' + i)]});
}
await statement.close(); // When you done, close the statement to relase resources
```

## 1.3.4. Using Cursors

Cursors enable applications to process very large data sets.
Cursors should also be used where the number of query rows cannot be predicted
and may be larger than your JavaScript engine can handle in a single array.
A [Cursor](#213-cursor) object is obtained by setting `cursor: true` in the
[options](#229-queryoptions) parameter of the [Connection](#211-connection).execute()
method when executing a query. Cursor fetches rows in batches. Cursor.next() method
returns the next row from the internal cache. When internal cache is empty,
it fetches next batch of rows from the server.
`fetchCount` property lets you set the batch size.
Where there is no more row to fetch, Cursor is closed automatically and next() method returns `undefined`;

```ts
const qr = await connection.query('select * from my_table',
        {cursor: true, fetchCount: 250});
console.log(qr.fields);
const cursor = qr.cursor;
let row;
while ((row = await cursor.next())) {
    console.log(row);
}
await cursor.close(); // When you done, close the cursor to release resources
```