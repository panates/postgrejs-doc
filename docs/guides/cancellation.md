---
sidebar_position: 14
---

# Cancellation & Timeouts

## The `signal` option

`connection.query()` and `connection.execute()` both accept a `signal?: AbortSignal` option (on `QueryOptions` and `ScriptExecuteOptions` respectively). When the signal fires, postgrejs cancels the running statement on the server using PostgreSQL's out-of-band cancel protocol and rejects the call.

Cancelling is a *request*, not a guarantee: the cancel message travels over its own short-lived connection, and the statement may finish before the server acts on it. Because of this, the call doesn't settle the instant `abort()` is called — it waits for the server to actually finish with the statement, then rejects with the signal's own reason (the underlying database error is attached as `cause`).

### Aborting manually

```ts
const controller = new AbortController();

const promise = connection.query('select pg_sleep(30)', {
  signal: controller.signal,
});

// Cancel it from elsewhere
setTimeout(() => controller.abort(), 1000);

try {
  await promise;
} catch (err) {
  console.log(err.name); // "AbortError"
  console.log(err.cause); // DatabaseError, SQLSTATE 57014, if the server acted on the cancel
}
```

### Timing out a query

`AbortSignal.timeout(ms)` gives a per-call timeout without managing a `setTimeout` yourself:

```ts
try {
  await connection.query('select pg_sleep(30)', {
    signal: AbortSignal.timeout(5000),
  });
} catch (err) {
  console.log(err.name); // "TimeoutError"
}
```

## `connection.cancel()`

`connection.cancel(): Promise<void>` asks the server to cancel whatever the connection is currently running, using the same out-of-band cancel protocol as the `signal` option. It's the lower-level primitive `signal` is built on — call it directly when you need to trigger a cancel from code that doesn't hold the original `signal`.

```ts
const promise = connection.query('select pg_sleep(30)');

// From elsewhere, e.g. a shutdown handler
await connection.cancel();

await promise; // rejects with a DatabaseError, SQLSTATE 57014, if the cancel was acted on
```

Like the `signal` option, this is a request rather than a guarantee — the statement may finish first. Prefer the per-call `signal` option when you have one available: it does the same thing and delivers the abort/rejection back to the specific call that requested it, rather than to whichever query happens to be running.

## See also

- [API: Connection](../api/classes/connection.md)
- [Error Handling](./error-handling.md)
