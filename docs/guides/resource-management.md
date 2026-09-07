---
sidebar_position: 22
---

# Resource Management ("using")

postgrejs objects that hold onto a server-side resource — a socket, a portal, a prepared statement — implement the
TC39 [Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management) proposal, using
its `await using` syntax to close themselves automatically when the enclosing block exits.

## Manual try/finally vs. `using`

Without it, every resource has to be closed by hand, and it is easy to forget the `finally` when a code path grows:

```ts
const connection = new Connection({ host: 'localhost', database: 'my_db' });
await connection.connect();
try {
  const result = await connection.query('select 1');
  console.log(result.rows);
} finally {
  await connection.close();
}
```

With `await using`, the same guarantee comes for free — the object is disposed as soon as control leaves the block,
including when it leaves because of a thrown error:

```ts
{
  await using connection = new Connection({ host: 'localhost', database: 'my_db' });
  await connection.connect();
  const result = await connection.query('select 1');
  console.log(result.rows);
} // connection.close() is called here automatically
```

If the code inside the block throws, `connection.close()` still runs before the error propagates — there is no
separate `catch`/`finally` to write.

## What Implements It

`Symbol.asyncDispose` (which calls `close()`) is currently implemented by:

- [`Connection`](../api/classes/connection.md)
- [`Cursor`](../api/classes/cursor.md)
- [`PreparedStatement`](../api/classes/prepared-statement.md)

```ts
await using connection = new Connection({ host: 'localhost', database: 'my_db' });
await connection.connect();

await using statement = await connection.prepare('select * from users where id = $1');
const result = await statement.execute({ params: [1] });
console.log(result.rows);
// statement.close() runs first, then connection.close(), in reverse declaration order
```

`LargeObject` and `LogicalReplication` do not implement `Symbol.asyncDispose` as of this version — close them
explicitly with `try`/`finally` (see [Large Objects](./large-objects.md) and
[Logical Replication](./logical-replication.md)).

`await using` also composes with `Pool`-acquired connections: since `connection.close()` on a pooled connection
releases it back to the pool rather than closing the socket (see [Connection Pooling](./pooling.md#reference-counting)),
the same pattern works unchanged:

```ts
{
  await using connection = await pool.acquire();
  const result = await connection.query('select 1');
  console.log(result.rows);
} // released back to the pool automatically
```

## Requirements

`using`/`await using` needs TypeScript 5.2 or later to compile, targeting a runtime with `Symbol.asyncDispose`
available. postgrejs polyfills `Symbol.asyncDispose` itself if the runtime doesn't provide it natively, so the
pattern works across supported Node versions (`node >= 20.x`) without any extra setup.

## See Also

- [Single Connection](./single-connection.md)
- [Cursors](./cursors.md)
- [Prepared Statements](./prepared-statements.md)
- [Large Objects](./large-objects.md)
