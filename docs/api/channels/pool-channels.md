---
sidebar_position: 2
---

# poolChannels

```ts
import { poolChannels } from 'postgrejs';
```

Plain `node:diagnostics_channel` channels on which a [`Pool`](../classes/pool.md) reports what it
does, since 3.15.0, for metrics on how full a pool is and how long its connections are held. Each
value is a Node `Channel`; the same channel is also reachable by name with
`diagnosticsChannel.channel('postgrejs:pool:checkout')` and so on. Nothing is published while a
channel has no subscribers.

See [Pool channels](../../observability/tracing-channels.md#pool-channels) in the Tracing Channels
guide for usage.

| Key        | Channel name              | Published when                                                                     | Message                                       |
|------------|---------------------------|------------------------------------------------------------------------------------|-----------------------------------------------|
| `create`   | `postgrejs:pool:create`   | a pool is constructed                                                              | [`PoolEventMessage`](#pooleventmessage)       |
| `close`    | `postgrejs:pool:close`    | a pool has closed                                                                  | [`PoolEventMessage`](#pooleventmessage)       |
| `checkout` | `postgrejs:pool:checkout` | a pooled connection is handed out, by `acquire()` or to a pipelined `pool.query()` | [`PoolCheckoutMessage`](#poolcheckoutmessage) |
| `checkin`  | `postgrejs:pool:checkin`  | a pooled connection comes back                                                     | [`PoolCheckoutMessage`](#poolcheckoutmessage) |
| `timeout`  | `postgrejs:pool:timeout`  | a caller gave up waiting, after `acquireTimeoutMillis`                             | [`PoolEventMessage`](#pooleventmessage)       |

## PoolEventMessage

| Key  | Type                         | Description      |
|------|------------------------------|------------------|
| pool | [`Pool`](../classes/pool.md) | The pool         |

## PoolCheckoutMessage

| Key      | Type                         | Description                                                                                                                         |
|----------|------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| pool     | [`Pool`](../classes/pool.md) | The pool                                                                                                                            |
| resource | `object`                     | An opaque object standing for the pooled connection, the same one in a checkout and the checkin that ends it. It is not a `Connection` |
