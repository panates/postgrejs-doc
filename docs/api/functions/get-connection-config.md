---
sidebar_position: 4
---

# getConnectionConfig

## getConnectionConfig(config?)

| Parameter | Type                                                                          | Description                                                     |
|-----------|--------------------------------------------------------------------------------|--------------------------------------------------------------------|
| config    | [`ConnectionConfiguration`](../interfaces/database-connection-params.md) `\| string` | Connection configuration object, or a connection string          |

Returns: [`ConnectionConfiguration`](../interfaces/database-connection-params.md)

Resolves a fully-populated connection configuration by merging, in order: environment variables (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, etc.), the passed `config` (parsed with [`parseConnectionString()`](./parse-connection-string.md) first if it is a string), and finally `config.host` itself re-parsed as a connection string when it is set (so a `host` containing a full URL or a comma-separated multi-host list is expanded).

A comma-separated `host` is normalized into a `hosts` array. When `hosts` is set, each entry's `port` falls back to the shared `port`, and the top-level `host`/`port` are set to the first candidate. `user` and `database` default to `'postgres'`, and `host` defaults to `'127.0.0.1'` when still unset after merging.
