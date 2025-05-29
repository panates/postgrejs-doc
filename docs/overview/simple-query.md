---
sidebar_position: 3
---

# Simple Queries

PostgreSQL wire protocol has two kind of way to execute SQL scripts.
Simple query is the mature way.
Simple query supports executing more than one sql scripts in a single command.
But it does not support *bind parameters* and server transfers data in text format which is slower than binary format.
So it may cause performance and security problems.
We suggest to use `query()` method which uses *Extended query protocol* if you need bind parameters or need to return
rows.

To execute SQL scripts you can create a `ScriptExecutor` instance or just call `connection.execute()`
or `pool.execute()` methods.

*pool.execute(sql: string, options?: [ScriptExecuteOptions](../api/interfaces/script-execute-options)]):
Promise\<[ScriptResult](../api/interfaces/script-result)>;*

*connection.execute(sql: string, options?: [ScriptExecuteOptions](../api/interfaces/script-execute-options)]):
Promise\<[ScriptResult](../api/interfaces/script-result)>;*

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
