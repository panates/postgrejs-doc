---
sidebar_position: 7
slug: /guides/cloudflare-workers
---

# Cloudflare Workers

postgrejs runs on [Cloudflare Workers](https://workers.cloudflare.com) with nothing installed beyond
the package itself and no build step of its own: the `nodejs_compat` flag supplies `node:net`,
`node:crypto` and the rest, and the client uses them exactly as it does on Node.js.

:::info Since 3.14.0
Cloudflare Workers support is in postgrejs **3.14.0** and later.
:::

Everything below was measured by the maintainers on **workerd via `wrangler dev`**, against
PostgreSQL 18 — by hand: unlike Node.js and Bun, Workers isn't in the CI test matrix yet.

## Setup

Turn on `nodejs_compat` — without it the bundle fails on the first `node:` import:

```jsonc
// wrangler.jsonc
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

Then connect the way you would anywhere else — one connection per request, closed in a `finally`:

```ts
import { Connection } from 'postgrejs';

export default {
  async fetch(): Promise<Response> {
    const db = new Connection({
      host: '…', port: 5432, user: '…', password: '…', database: '…',
    });
    await db.connect();
    try {
      const r = await db.query('select now() as t', { objectRows: true });
      return Response.json(r.rows![0]);
    } finally {
      await db.close();
    }
  },
};
```

## What works

- Connecting, querying, and every decode path — the wire protocol needs nothing the runtime doesn't
  have.
- SCRAM and MD5 [authentication](./ssl-tls.md#authentication-methods). The primitives all exist and
  are synchronous under `nodejs_compat`: `randomBytes`, `createHash`, `createHmac`, `pbkdf2Sync`.
- [Prepared statements](../querying/prepared-statements.md), [cursors](../querying/cursors.md),
  [`COPY`](../bulk-data/copy.md) and [large objects](../bulk-data/large-objects.md) — none of them
  touches the runtime any differently from a query.

## TLS

A connection that asks for TLS opens a socket of the runtime's own and upgrades it with workerd's
`startTls()`, because `tls.connect({ socket })` isn't something workerd can carry out. The exchange
either side of the upgrade is the same one as everywhere else: `SSLRequest`, the server's `S`, then
the handshake.

Verified against a managed PostgreSQL 18 with a Let's Encrypt certificate, from `wrangler dev` — and
against the same server with `sslmode` removed, which it refuses (`28000 connection is insecure`).
That second result is what gives the first one meaning: since the server turns away unencrypted
connections, a query that answered could only have answered over TLS.

Three limits come with it, and none of them is this client's to lift.

### The certificate has to chain to a public CA

Workerd's entire TLS surface is `{ expectedServerHostname?: string }`, so nothing on this runtime
can say which certificate to trust — not this client, and not `pg` or postgres.js, which drop `ca`,
`cert` and `rejectUnauthorized` for the same reason. A `ca` of your own, a client certificate and
`rejectUnauthorized: false` are all accepted by the [`ssl` option](./ssl-tls.md#enabling-ssl) and
ignored by the runtime.

In particular, **a local PostgreSQL with a self-signed certificate can't be reached over TLS at
all** — which describes most development setups.

### `sslNegotiation: 'direct'` is refused

TLS from the first byte needs the `postgresql` ALPN protocol announced in the handshake, and the
runtime's socket options are `{ secureTransport, allowHalfOpen }` — there's nowhere to say it. Left
to try, the server answers by closing the connection and workerd reports an internal error with a
reference number, so the client raises a clear one instead:

> sslNegotiation "direct" is not available on Cloudflare Workers: it needs the "postgresql" ALPN
> protocol, which the runtime offers no way to announce. Leave sslNegotiation unset to negotiate
> with SSLRequest instead.

See [`sslNegotiation`](./ssl-tls.md#sslnegotiation).

### Channel binding can't be used

[Channel binding](./ssl-tls.md#channel-binding) mixes a hash of the server's certificate into the
SCRAM proof, and there's no certificate to hash here. `channelBinding: 'prefer'` (the default)
notices and authenticates without it; `'require'` is refused by name, rather than claiming the
connection isn't encrypted, which it may well be.

## Reaching a database that requires TLS: Hyperdrive

When the database's certificate doesn't chain to a public CA — or you'd rather not hold the TLS leg
in the Worker — use [Hyperdrive](https://developers.cloudflare.com/hyperdrive/). It connects to the
database from Cloudflare's own network and terminates TLS there, then hands the Worker a plain
connection to speak to, which is the half this client already does. Connection pooling comes with
it, which a Worker can't do for itself (see below).

Bind it and pass its connection string straight to the client:

```jsonc
// wrangler.jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<your-config-id>" }]
```

```ts
interface Env {
  HYPERDRIVE: { connectionString: string };
}

export default {
  async fetch(_req: Request, env: Env): Promise<Response> {
    const db = new Connection(env.HYPERDRIVE.connectionString);
    await db.connect();
    try {
      const r = await db.query('select current_database() as db', { objectRows: true });
      return Response.json(r.rows![0]);
    } finally {
      await db.close();
    }
  },
};
```

The string it hands over carries `sslmode=disable` — which [leaves TLS off](./connection-strings.md#query-parameters)
for the Worker's leg — and that is the point rather than a weakening: the TLS that protects the
database is the leg Hyperdrive holds, and the Worker's leg doesn't leave Cloudflare.

`wrangler dev` serves the binding locally without an account — point it at any database with:

```sh
export WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="postgres://user:pass@127.0.0.1:5432/db"
```

That's how the example above was checked, end to end, against PostgreSQL 18. What it doesn't
exercise is the deployed path — a Worker on Cloudflare reaching a real Hyperdrive config — since
the local binding proxies straight to the string you give it. That leg is Hyperdrive's own protocol
handling rather than anything specific to this client, but it hasn't been measured.

## Other differences worth knowing

- **Unix domain sockets** aren't reachable: there's no filesystem to put one on.
- **A [`Pool`](./pooling.md) doesn't outlive a request** the way it does on a server. A Worker isolate
  may be reused between requests and may not, so a pool created at module scope is a cache that may
  be cold at any time rather than a pool with a known size. Hyperdrive is where connection reuse
  actually lives on this platform.
- **[`LISTEN`/`NOTIFY`](../realtime/notifications.md) and
  [logical replication](../bulk-data/logical-replication.md)** need a connection that stays open and
  a process that stays alive to hear it. Neither is a thing a request-scoped Worker has.
- **`os.totalmem()` answers `0`** on workerd rather than throwing, so the buffer ceiling this client
  derives from it falls back to its own 2 GB cap. Nothing to configure; noted because the number
  differs from what the same code reports on Node.js.

## See also

- [SSL/TLS & Authentication](./ssl-tls.md)
- [Connection Strings](./connection-strings.md)
- [Connection Pooling](./pooling.md)
