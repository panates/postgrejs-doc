---
sidebar_position: 16
---

# ConnectionLostError

Extends the built-in `Error`. Reported when a connection's socket closes without anyone asking it
to — the backend was terminated by an administrator, a failover, a network fault — as opposed to a
`close()` the application itself called. Constructed internally; you do not create it yourself.

One object reports the same event everywhere it's visible, so a caller holding two of them (say,
from a query rejection and a `'close'` handler) can pair them by identity:

- The reason on [`Connection`](./connection.md)'s [`'close'`](./connection.md#close-1) event.
- The second argument of [`Pool`](./pool.md)'s [`'destroy'`](./pool.md#destroy) event, for a pooled
  connection that died rather than one evicted normally.
- [`Pool`](./pool.md)'s [`'error'`](./pool.md#error) event.
- The rejection of whatever query was in flight on the connection when it happened.

```ts
pool.on('error', err => {
  if (err.code === '08006') log.warn('pooled connection lost', err.processID);
  else log.error('could not open a connection', err);
});
```

## Properties

| Key | Type | Readonly | Description |
|:---|:---|:---|:---|
| message | `string` | false | Always `"Connection terminated unexpectedly"` — deliberately generic, matching what other drivers report for the same event, so code branching on the message keeps working. What happened to *this* connection is in the other fields |
| code | `string` | true | Always `'08006'` (`connection_failure`), a SQLSTATE-shaped value synthesized here — the server itself never sends it, since it cannot report its own connection going away. Lets a listener branch without `instanceof`, which fails across duplicated copies of the package |
| processID | `number` | false | The backend's process id, as it was before the connection reset |
| cause | `unknown` | false | The underlying socket error, when there was one — a clean FIN leaves none |

## Telling it apart from an ordinary disconnect

A `close()` *you* called still rejects any in-flight call with a plain `Error('Connection closed')`
— nothing was lost there, the caller simply raced a shutdown it requested. `ConnectionLostError`
only shows up for a close nobody asked for, which is what makes `code === '08006'` a reliable signal
that something went wrong rather than that the application shut the connection down on purpose.
