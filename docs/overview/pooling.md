---
sidebar_position: 2
---
# Pooling

## Creating a connection pool

`Pool` class is used to create a connection pool. Constructor accepts connection string
or [PoolConfiguration](../api/interfaces/pool-configuration) interface

*new Pool([config: String | [PoolConfiguration](../api/interfaces/pool-configuration)]);*

```ts
import { Pool } from 'postgrejs';

const dbpool = new Pool({
    host: 'postgres://localhost',
    pool: {
        min: 1,
        max: 10,
        idleTimeoutMillis: 5000
    }
});
const qr = await dbpool.query('select * from my_table where id=1');
// Do whatever you need with pool
await dbpool.close(); // Disconnect all connections and shutdown pool
```

## Obtaining a connection

The pool returns an idle `Connection` instance when you call `pool.acquire()` function.
You must call `connection.release()` method when you done with the connection.

`pool.acquire(): Promise<[Connection](#211-connection)>;`
```ts
  const connection = await dbpool.acquire();
try {
    const qr = await connection.query('select * from my_table where id=1');
    // ... Do whatever you need with connection
} finally {
    await connection.release(); // Connection will go back to the pool
}
```

`Pool` class has `pool.execute()` and `pool.query()` methods which applies "obtain a connection",
"execute the given query" and "release the connection" sequence.
This is the comfortable and secure way
if you don't execute your query in a transaction.
So you don't need to take care of releasing the connection
every time.

## Shutting down the pool

To shut down a pool call `pool.close()` method.
This will wait for active connections to get idle than will release all resources.
If you define `terminateWait argument, the pool wait until the given period of time in ms, before force connections to
close.

`pool.close(terminateWait?: number): Promise<void>;`
