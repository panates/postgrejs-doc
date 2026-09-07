---
sidebar_position: 16
---

# Multi-Host & Failover

postgrejs can try several servers in order until one accepts the connection — the same idea as libpq's multi-host connection strings, useful for a primary/replica cluster where the primary may fail over to a different host.

## Configuring multiple hosts

Pass a `hosts` array instead of a single `host`/`port`. Each entry falls back to the top-level `port` when it doesn't carry one of its own:

```ts
import { Connection } from 'postgrejs';

const connection = new Connection({
  hosts: [
    { host: 'db-primary.internal', port: 5432 },
    { host: 'db-replica-1.internal', port: 5432 },
    { host: 'db-replica-2.internal' }, // falls back to top-level `port`
  ],
  port: 5432,
  targetSessionAttrs: 'read-write',
  user: 'app',
  password: 'secret',
  database: 'app_db',
});

await connection.connect();
```

Host selection happens when a connection is opened, so a cluster that has already failed over to another node is picked up on the *next* connect — a query already in flight when a server goes down still fails and must be retried by the caller.

## `targetSessionAttrs`

`targetSessionAttrs` tells postgrejs which kind of server in `hosts` is acceptable. A server that doesn't match is skipped and the next one in the list is tried — which is how `read-write` reliably lands on whichever host currently holds the primary role, even after a failover:

| Value | Description |
| :--- | :--- |
| `read-write` | Only a server that accepts writes (the primary). |
| `read-only` | Only a server in read-only mode (a replica, or a primary in recovery). |
| `primary` | Only a server that is not in recovery. |
| `standby` | Only a server that is in recovery (a standby/replica). |
| `prefer-standby` | A standby if any is reachable, otherwise falls back to the primary. |

```ts
const connection = new Connection({
  hosts: [
    { host: 'db-a.internal' },
    { host: 'db-b.internal' },
    { host: 'db-c.internal' },
  ],
  port: 5432,
  targetSessionAttrs: 'read-write', // always connects to the current primary
  user: 'app',
  password: 'secret',
  database: 'app_db',
});
```

Use `'prefer-standby'` to spread read-only traffic across replicas while still tolerating a cluster with no replica currently up:

```ts
const readPool = new Pool({
  hosts: [
    { host: 'db-replica-1.internal' },
    { host: 'db-replica-2.internal' },
    { host: 'db-primary.internal' },
  ],
  targetSessionAttrs: 'prefer-standby',
  user: 'app',
  password: 'secret',
  database: 'app_db',
});
```

## Connection-string form

The same failover behavior is available from a connection string, using a comma-separated host list and the `target_session_attrs` query parameter:

```
postgres://app:secret@db-a.internal:5432,db-b.internal:5432,db-c.internal:5432/app_db?target_session_attrs=read-write
```

See [Connection Strings](./connection-strings.md) for the full connection-string syntax. This applies equally
to [`Pool`](./pooling.md) — a pool can be pointed at the same multi-host config or connection string as a
single `Connection`.
