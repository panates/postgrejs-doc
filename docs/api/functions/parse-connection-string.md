---
sidebar_position: 5
---

# parseConnectionString

## parseConnectionString(str)

| Parameter | Type     | Description               |
|-----------|----------|-------------------------------|
| str       | `string` | A PostgreSQL connection string |

Returns: [`ConnectionConfiguration`](../interfaces/database-connection-params.md)

Parses a `postgres://`, `pg://`, `socket://`/`unix://` (Unix domain socket) or bare-path (`/var/run/...`) connection string into a configuration object, reading `host`, `port`, `user`, `password`, and the database name from the URL, plus the following query-string parameters: `host`, `db`, `schema`, `application_name`, `sslmode` (mapped to `requireSSL`), `channel_binding` (mapped to `channelBinding`), `sslnegotiation` (mapped to `sslNegotiation`) and `target_session_attrs` (mapped to `targetSessionAttrs`). A comma-separated host list in the authority (e.g. `postgres://a:5432,b:5433/db`) is parsed into `hosts`. Throws if `channel_binding`, `sslnegotiation` or `target_session_attrs` carries an unrecognized value.

See the [Connection Strings](../../guides/connection-strings.md) guide for the supported string formats.
