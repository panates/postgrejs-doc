---
sidebar_position: 4
---

# PreparedStatement

A named, server-side prepared statement created by [Connection.prepare()](./connection.md#prepare) or [Pool.prepare()](./pool.md#prepare). It implements `AsyncDisposable`, so it can be used with `await using`.

## Constructor / static factory

The public entry point is the static `prepare()` factory, used internally by `Connection.prepare()` — you normally never call either directly, and instead call `connection.prepare(sql, options)`.

`PreparedStatement.prepare(connection: Connection, sql: string, options?: StatementPrepareOptions): Promise<PreparedStatement>`

| Argument   | Type                                                                   | Default | Description                      |
|------------|---------------------------------------------------------------------------|---------|----------------------------------------|
| connection | [Connection](./connection.md)                                            |         | The connection to prepare the statement on |
| sql        | `string`                                                                   |         | SQL script that will be executed       |
| options    | [StatementPrepareOptions](../interfaces/statement-prepare-options.md)     |         | Prepare options                        |

- Returns `Promise<PreparedStatement>`

```ts
import { Connection, DataTypeOIDs } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const statement = await connection.prepare(
    'insert into my_table (ref_number) values ($1)', {
      paramTypes: [DataTypeOIDs.int4],
    });
```

## Properties

| Key        | Type                        | Readonly | Description                                             |
|------------|-------------------------------|----------|--------------------------------------------------------------|
| connection | [Connection](./connection.md) | true     | Returns the connection this statement belongs to               |
| name       | `string \| undefined`        | true     | Returns the server-side name assigned to this statement          |
| sql        | `string`                      | true     | Returns the SQL that was prepared                                |
| paramTypes | `OID[] \| undefined`          | true     | Returns the parameter type OIDs the statement was prepared with, as declared by the caller |
| resolvedParamTypes | `OID[] \| undefined`  | true     | What the server made of each parameter, in order — see below |

### `resolvedParamTypes`

The server's `Describe` answers with the parameters as well as the columns, and this is that
answer kept rather than discarded. A parameter the caller declared nothing for is resolved by the
server from where it appears — the column it's inserted into, the operator beside it, the function
it's passed to — never from the value itself, which is still three messages away when the server
gives this answer. So it's a property of the statement, stable across every `execute()`:

```ts
const statement = await connection.prepare('insert into t(v) values($1)');
statement.resolvedParamTypes; // [21] — int2, if t.v is an int2 column
```

Useful for two things: it says what a parameter with no context became — `prepare('select $1')`
resolves to `text`, which is the whole explanation for an untyped array coming back as an array
literal there — and it names the type to hand a [`BindParam`](./bind-param.md) for a caller who
wants the binary encoding back that [an untyped numeric array gives up](../../querying/query-parameters.md#strings-dates-and-numeric-arrays-go-out-unspecified).
`undefined` until the statement has actually been prepared.

## Methods

### execute()

Executes the prepared statement using the Extended Query protocol (Bind+Execute+Sync against the already-parsed statement).

`execute(options?: QueryOptions): Promise<QueryResult>`

| Argument | Type                                          | Default | Description       |
|----------|-------------------------------------------------|---------|------------------------|
| options  | [QueryOptions](../interfaces/query-options.md)  |         | Execute options         |

- Returns [QueryResult](../interfaces/query-result.md)

```ts
for (let i = 0; i < 100; i++) {
  await statement.execute({ params: [i] });
}
await statement.close();
```

A [`BindParam`](./bind-param.md) in `params` has its value unwrapped before it reaches the wire —
unlike `Connection.query()`, a prepared statement's parameter types are already fixed by its
`Parse`, so `BindParam` can't declare a new one here. Naming the same type the statement already
has (or that [`resolvedParamTypes`](#resolvedparamtypes) reports) is a no-op; naming a different
one throws, since believing it would read the bytes back as the wrong type:

```ts
const statement = await connection.prepare('insert into bp(v) values($1)', {
  paramTypes: [DataTypeOIDs.text],
});
await statement.execute({ params: [new BindParam(DataTypeOIDs.int4, 5)] });
// TypeError: Parameter $1 was given as int4 (23), but this prepared
// statement's $1 is text (25). A prepared statement takes its parameter
// types at prepare(sql, { paramTypes }), and they cannot be changed per
// execution.
```

The same unwrapping applies to a cursor's `Bind` and to every parameter set in `executeBatch()`
below.

### executeBatch()

Runs the statement once per parameter set, sending every `Bind`/`Execute` before waiting on any of them and closing the whole batch with a single `Sync` — the sets share one implicit transaction (unless one is already open) and a rejected set stops the ones behind it from running.

`executeBatch(paramSets: any[][], options?: QueryOptions): Promise<BatchResult>`

| Argument  | Type                                            | Default | Description                                                                 |
|-----------|--------------------------------------------------|---------|------------------------------------------------------------------------------|
| paramSets | `any[][]`                                        |         | One array of bind parameters per execution                                   |
| options   | [QueryOptions](../interfaces/query-options.md)   |         | Applied to every set — the same options `execute()` takes, minus `fetchCount` and `cursor`, which a batch cannot honor |

- Returns [BatchResult](../interfaces/batch-result.md)
- Throws a [DatabaseError](./database-error.md) carrying `failedIndex` (which set was rejected) and `batchResults` (the sets that completed before it), if the server rejects a set
- Throws `TypeError` if `paramSets` isn't an array
- Throws if `options.cursor` is set — a batch runs every set to completion under one `Sync`, so there's no portal left to fetch from

```ts
const stmt = await connection.prepare('update users set name = $1 where id = $2');
const batch = await stmt.executeBatch([
  ['John', 1],
  ['Jane', 2],
  ['Bob', 3],
]);
batch.results.map(r => r.rowsAffected); // [1, 1, 0]
batch.totalRowsAffected;                // 2
```

See [Prepared Statements](../../querying/prepared-statements.md#batch-execution) for the full guide, including why this is a separate method rather than an option on `execute()`.

### close()

Closes the statement. `PreparedStatement` is refcounted: each open [Cursor](./cursor.md) obtained from `execute({ cursor: true })` holds an extra reference, so the statement's server-side resources are only actually released once every such cursor has also been closed and `close()` has been called once per outstanding reference.

`close(): Promise<void>`

```ts
await statement.close();
```

### cancel()

Asks the server to cancel whatever this statement's connection is currently running. See [Connection.cancel()](./connection.md#cancel); prefer the per-call `signal` option of `execute()`, which reports the abort to the caller that asked for it.

`cancel(): Promise<void>`

### Symbol.asyncDispose()

Implements `AsyncDisposable`; calls `close()`.

`[Symbol.asyncDispose](): Promise<void>`

```ts
{
  await using statement = await connection.prepare('select * from my_table where id = $1');
  const result = await statement.execute({ params: [1] });
  // ...
} // statement closed automatically
```

## Events

### close

Triggered once the statement has actually been closed on the wire (after every outstanding reference — see `close()` above — has been released).

`() => void`

### notice

Triggered when the server sends a `NoticeResponse` while the statement's `Close`/`Sync` messages are in flight.

`(msg: DatabaseError) => void`

| Argument | Type                            | Default | Description             |
|----------|-----------------------------------|---------|------------------------------|
| msg      | [DatabaseError](./database-error.md) |     | The notice, shaped like an error |
