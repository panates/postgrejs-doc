---
sidebar_position: 1
---

# Environment Variables

When no explicit value is given, postgrejs falls back to the standard `PG*` environment variables:

| Variable            | Config field         | Default        |
|:--------------------|:----------------------|:---------------|
| `PGHOST` / `PGHOSTADDR` | `host`             | `127.0.0.1`    |
| `PGPORT`              | `port`                 | `5432`         |
| `PGDATABASE`          | `database`             | `postgres`     |
| `PGUSER`              | `user`                 | `postgres`     |
| `PGPASSWORD`          | `password`             | —              |
| `PGAPPNAME`           | `applicationName`      | —              |
| `PGTZ`                | `timezone`             | —              |
| `PGSCHEMA`            | `schema`               | —              |
| `PGCONNECT_TIMEOUT`   | `connectTimeoutMs`     | `30000`        |
| `PGMAX_BUFFER_SIZE`   | `buffer.maxLength`     | —              |

`PGHOST` is checked first, falling back to `PGHOSTADDR` if unset.

```ts
import { Connection } from 'postgrejs';

// No config given at all — reads PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE etc.
const connection = new Connection();
await connection.connect();
```

## Precedence

Values are resolved in this order, from lowest to highest precedence:

1. **Built-in defaults** — `user`/`database` default to `postgres`, `host` defaults to `127.0.0.1`.
2. **Environment variables** — the `PG*` variables above.
3. **Explicit configuration** — the connection string or config object passed to `Connection`/`Pool`, which
   overrides anything from the environment.

If a config object's `host` field itself looks like a connection string or URI, it is parsed and merged in as
well, with an explicitly-set `requireSSL` preserved.

See [Connection Strings](./connection-strings.md) for the connection string syntax these variables are an
alternative to.
