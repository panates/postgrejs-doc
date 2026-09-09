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

## Long Cancellation Keys (PostgreSQL 18+)

The out-of-band cancel protocol above works by sending the server a secret key it handed out when
the connection was first established — anyone who has that key can cancel the session's running
query. Under protocol 3.0, that key is always exactly 4 bytes, small enough to be guessed by an
attacker willing to brute-force it. PostgreSQL 18 added protocol 3.2, which lets the server hand
out a key up to 256 bytes instead — set `longCancelKey: true` to request it:

```ts
const connection = new Connection({
  host: 'localhost',
  database: 'my_db',
  longCancelKey: true,
});
await connection.connect();

connection.secretKey; // Buffer, up to 256 bytes on a PostgreSQL 18+ server
```

Turning it on is never a connection-breaking choice. An older server doesn't understand protocol
3.2, so it replies with `NegotiateProtocolVersion` naming the highest minor version it actually
supports, and the session proceeds at 3.0 exactly as if `longCancelKey` had never been set — the
connection still succeeds, `cancel()` still works, the key is just back to 4 bytes.

### Checking whether the server accepted it

`connection.protocolNegotiation` surfaces that reply, if the server sent one:

```ts
await connection.connect();

if (connection.protocolNegotiation) {
  console.log('Server only supports protocol minor version:', connection.protocolNegotiation.supportedVersionMinor);
  console.log('Options it did not recognize:', connection.protocolNegotiation.unrecognizedOptions);
} else {
  // Server recognized everything requested, including longCancelKey if it was set
}
```

`protocolNegotiation` is `undefined` whenever the server recognized every startup option this
client asked for — check it after `connect()` if a feature gated behind such an option doesn't
seem to have taken effect.

:::note
`connection.secretKey` changed from `number` to `Buffer` in postgrejs 3.1 to accommodate keys
longer than 4 bytes — a breaking change if you were reading it directly before.
:::

## See also

- [API: Connection](../api/classes/connection.md)
- [Error Handling](./error-handling.md)
