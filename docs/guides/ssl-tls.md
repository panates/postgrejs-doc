---
sidebar_position: 17
---

# SSL/TLS & Authentication

## Enabling SSL

Set `ssl` to a standard Node.js `tls.ConnectionOptions` object. Any option `tls.connect()` accepts works here — certificates, `rejectUnauthorized`, SNI overrides, and so on:

```ts
import { readFileSync } from 'fs';
import { Connection } from 'postgrejs';

const connection = new Connection({
  host: 'db.example.com',
  user: 'app',
  password: 'secret',
  database: 'app_db',
  ssl: {
    ca: readFileSync('/path/to/server-ca.pem'),
    rejectUnauthorized: true,
  },
});

await connection.connect();
```

Set `requireSSL: true` to fail the connection outright if the server refuses TLS, instead of silently falling back to a plaintext session.

## `sslNegotiation`

Controls how the TLS handshake is started:

| Value | Description |
| :--- | :--- |
| `'postgres'` (default) | Sends an `SSLRequest` first and waits for the server's yes/no before starting TLS — works against any Postgres version. |
| `'direct'` | Begins the TLS handshake immediately, advertising the `postgresql` protocol over ALPN so the server knows what's being spoken. Saves a round trip and avoids a plaintext preamble a middlebox could read or strip. Requires **PostgreSQL 17+** and `ssl` to be set — an older server just closes the connection. |

```ts
const connection = new Connection({
  host: 'db.example.com',
  ssl: { ca: caCert },
  sslNegotiation: 'direct', // PostgreSQL 17+ only
});
```

## Authentication methods

postgrejs supports every password-based authentication method PostgreSQL offers: cleartext password, MD5, and SASL/SCRAM-SHA-256 (including the channel-bound `SCRAM-SHA-256-PLUS` variant). The right method is negotiated automatically based on what the server requests — nothing to configure beyond `user`/`password`.

## Channel binding

`channelBinding` controls whether SCRAM authentication binds itself to the TLS channel:

| Value | Description |
| :--- | :--- |
| `'prefer'` (default) | Uses channel binding (`SCRAM-SHA-256-PLUS`) when the server offers it, plain `SCRAM-SHA-256` otherwise. |
| `'require'` | Refuses to authenticate unless channel binding is available. |
| `'disable'` | Never negotiates channel binding. |

```ts
const connection = new Connection({
  host: 'db.example.com',
  ssl: { ca: caCert },
  channelBinding: 'require',
});
```

Channel binding mixes a hash of the server's TLS certificate into the SCRAM proof. This protects the login when a middlebox terminates TLS in front of Postgres (an intercepting proxy, a misconfigured load balancer) — such a proxy necessarily presents a different certificate to the client than the one the real server used, so a channel-bound proof computed against it fails, revealing the interception instead of silently authenticating through it. It matters most when the certificate itself isn't strictly verified, which is the common case with a self-signed certificate or a permissive `ssl` config.

## See also

- [Single Connection](./single-connection.md)
- [Connection Strings](./connection-strings.md)
