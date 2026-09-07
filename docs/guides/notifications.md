---
sidebar_position: 12
---

# Notifications (LISTEN/NOTIFY)

PostgreSQL's `LISTEN`/`NOTIFY` mechanism lets a session subscribe to named
channels and receive asynchronous messages sent with `NOTIFY` or
`pg_notify()`. `postgrejs` wraps this with a channel-based API on both
`Connection` and `Pool`, plus a raw `'notification'` event for anything that
does not fit the callback model.

## Listening on a Connection

```ts
import { Connection } from 'postgrejs';

const connection = new Connection();
await connection.connect();

await connection.listen('my_channel', msg => {
  console.log(msg.channel, msg.payload, msg.processId);
});

// From this or any other session:
await connection.query(`NOTIFY my_channel, 'hello'`);
```

`listen()` sends `LISTEN <channel>` the first time a callback is registered
for that channel; further callbacks on the same channel are added locally
without another round trip.

| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `channel` | `string` | - | Channel name. Must match `/^[A-Z]\w+$/i`. |
| `callback` | `NotificationCallback` | - | Invoked with the `NotificationMessage` on every matching notification. |

To stop receiving notifications:

```ts
await connection.unListen('my_channel'); // sends UNLISTEN my_channel
await connection.unListenAll(); // sends UNLISTEN *
```

`unListen()` is a no-op if no callback is registered for that channel.
`unListenAll()` is also called automatically when the connection closes, so a
`Connection` never leaves a `LISTEN` registered against the server after it
disconnects.

### The `NotificationMessage` shape

```ts
interface NotificationMessage {
  processId: number; // backend PID of the NOTIFY-ing session
  channel: string;
  payload: string;
}

type NotificationCallback = (msg: NotificationMessage) => any;
```

### The raw `'notification'` event

Every notification the connection receives - regardless of whether anything
is `listen()`-ing for it - is also emitted as a `'notification'` event on the
`Connection`:

```ts
connection.on('notification', msg => {
  console.log(`[${msg.processId}] ${msg.channel}: ${msg.payload}`);
});
```

This fires even for channels you never called `listen()` for (for example if
you issued `LISTEN` yourself with a raw `query()` call), while `listen()`
callbacks only fire for their own channel.

## Listening on a Pool

Calling `pool.listen()` does not borrow one of the pool's regular connections
- it opens and keeps one dedicated internal `Connection` just for `LISTEN`,
created lazily the first time `listen()` is called. That connection is
separate from `acquire()`/`release()` traffic, so subscriptions survive
however many queries the rest of the pool runs; you do not need to keep a
connection acquired to keep listening.

```ts
import { Pool } from 'postgrejs';

const pool = new Pool();

await pool.listen('my_channel', msg => {
  console.log(msg.payload);
});

// Any pooled connection can trigger it:
await pool.query(`NOTIFY my_channel, 'hello from the pool'`);
```

`pool.unListen(channel)` and `pool.unListenAll()` mirror the `Connection`
methods. Once the last channel is unregistered, the pool closes its internal
notification connection; `pool.close()` also tears it down.

If the notification connection drops unexpectedly (network blip, server
restart), the pool reconnects automatically after a short delay and
re-issues `LISTEN` for every channel that still has callbacks registered, so
subscriptions resume without any action from the caller.

| Method | Description |
| :--- | :--- |
| `pool.listen(channel, callback)` | Registers `callback` and opens the internal notification connection if needed. |
| `pool.unListen(channel)` | Removes `callback`(s) for `channel`; closes the internal connection if no channel remains. |
| `pool.unListenAll()` | Removes every listener and closes the internal connection. |

## A full round-trip

```ts
import { Connection, Pool } from 'postgrejs';

const listener = new Pool();
const notifier = new Connection();
await notifier.connect();

await listener.listen('orders', msg => {
  const order = JSON.parse(msg.payload);
  console.log('New order:', order.id);
});

// Elsewhere in the app, or in a trigger via pg_notify():
await notifier.query(
  `select pg_notify('orders', $1)`,
  { params: [JSON.stringify({ id: 42 })] },
);
```

`pg_notify(channel, payload)` is preferable to the `NOTIFY` statement when the
channel name or payload is a parameter, since `NOTIFY` does not accept bind
parameters for the channel name.

See [API: Connection](../api/classes/connection.md) and
[API: Pool](../api/classes/pool.md) for full method signatures.
