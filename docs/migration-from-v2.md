---
sidebar_position: 4
---

# Migration from v2

v3 is almost entirely additive — existing code that only uses built-in data types keeps working unchanged. There is exactly one breaking API change, plus two project-level changes you should know about.

## Breaking Changes

### Custom `DataType` decode methods renamed

`DataType`'s decode-side members were renamed to pair with their `encode*` counterparts. This only matters if you registered a **custom** `DataType` through `GlobalTypeMap` (or a `DataTypeMap` of your own) — built-in types already use the new names.

| v2                  | v3                    |
| ------------------- | --------------------- |
| `parseBinary`       | `decodeBinary`        |
| `parseText`         | `decodeText`          |
| `parseTextBuffer`   | `decodeTextBuffer`    |

The corresponding type aliases were renamed too:

| v2                          | v3                            |
| ---------------------------- | ------------------------------ |
| `ParseTextFunction`          | `DecodeTextFunction`           |
| `ParseTextBufferFunction`    | `DecodeTextBufferFunction`     |

```ts
// v2
const MyType: DataType = {
  name: 'my_type',
  oid: 90000,
  jsType: 'string',
  parseBinary(v: Buffer): string {
    /* ... */
  },
  parseText(v: string): string {
    /* ... */
  },
  isType: v => typeof v === 'string',
};

// v3
const MyType: DataType = {
  name: 'my_type',
  oid: 90000,
  jsType: 'string',
  decodeBinary(v: Buffer): string {
    /* ... */
  },
  decodeText(v: string): string {
    /* ... */
  },
  isType: v => typeof v === 'string',
};
```

### License change: MIT → BSD-3-Clause

v3 relicenses the project from MIT to **BSD-3-Clause**. Both are permissive licenses; the practical difference is that BSD-3-Clause requires the copyright notice to be preserved in redistributions. Check your organization's license-compliance policy if it tracks dependency licenses. See [License](./license.md).

### Node engine bumped to `>=20`

v3 requires `node >= 20.x`. See [Installation](./getting-started/installation.md).

## New in v3

None of the following requires changes to existing code — all are new, opt-in capabilities:

- **[COPY streams](./guides/copy.md)** — bulk import/export via `connection.copyTo()` / `connection.copyFrom()` as Node streams.
- **[Large objects](./guides/large-objects.md)** — stream data through PostgreSQL's large object API for values too big for `bytea`.
- **[Logical replication](./guides/logical-replication.md)** — stream row-level changes as they commit.
- **[The `sql` tag](./guides/sql-tag.md)** — build statements from a template literal instead of hand-rolled string concatenation.
- **[Opt-in query pipelining](./guides/pooling.md)** — `Pool.query()` / `Pool.execute()` can pipeline requests onto a connection, per call.
- **[Cancellation and timeouts](./guides/cancellation.md)** — pass an `AbortSignal` to cancel a running query.
- **[Multi-host connections](./guides/multi-host.md)** — a `hosts` list with automatic failover and `targetSessionAttrs` to pick the right server in a cluster.
- **[SCRAM channel binding and direct TLS negotiation](./guides/ssl-tls.md)** — `channelBinding` (default `prefer`) and `sslNegotiation: 'direct'` (skips the `SSLRequest` round trip against PostgreSQL 17+).
- **[Two-phase commit](./guides/two-phase-commit.md)** — `prepareTransaction()` / `commitPrepared()`.

For the full list of fixes and improvements, see the project's `CHANGELOG.md`.
