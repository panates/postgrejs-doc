---
sidebar_position: 2
---

# Connection Strings

`Connection` and `Pool` both accept a connection string in place of a configuration object — everything below
applies to both, see [Single Connection](./single-connection.md) and [Connection Pooling](./pooling.md) for how
each is constructed.

## TCP connection strings

Use the `postgres://` or `pg://` scheme (accepted identically; if no scheme is given at all, `postgres://` is
assumed):

```
postgres://user:password@host:port/database?param=value
pg://user:password@host:port/database?param=value
```

### Multi-host authority

List several hosts, comma-separated, in the authority part. Each entry falls back to a shared port when it
doesn't carry one of its own:

```
postgres://user:password@host1:5432,host2:5433,host3/database?target_session_attrs=read-write
```

See [Multi-Host & Failover](./multi-host.md) for how `target_session_attrs` picks a server out of the list.

## UNIX socket connection strings

Use the `socket://` or `unix://` scheme (also accepted identically), or a bare path starting with `/`:

```
socket:///var/run/postgresql?db=mydb
unix:///var/run/postgresql?db=mydb
/var/run/postgresql
```

For socket URIs, the socket path is the hostname plus pathname combined; the database is read from the `db`
query parameter rather than the path.

## Query parameters

| Key                     | Type   | Description |
|:-------------------------|:-------|:------------|
| `db`                      | string | Database name (used for TCP too, and required for socket URIs since there's no path segment for it). |
| `host`                    | string | Overrides the host parsed from the authority. |
| `schema`                  | string | Default schema (search_path). |
| `application_name`        | string | Sets `applicationName`, reported to the server as `application_name`. |
| `sslmode`                 | string | `require`, `verify-ca`, or `verify-full` turn on `requireSSL`; any other value leaves it off. |
| `sslnegotiation`          | string | `postgres` (default, SSLRequest handshake) or `direct` (PostgreSQL 17+ direct TLS negotiation). |
| `channel_binding`         | string | `prefer` (default), `require`, or `disable` — controls SCRAM channel binding. |
| `target_session_attrs`    | string | `read-write`, `read-only`, `primary`, `standby`, or `prefer-standby` — used with multi-host connections. |

Unrecognized values for `sslnegotiation`, `channel_binding`, or `target_session_attrs` throw an error rather
than being silently ignored. See [SSL/TLS & Authentication](./ssl-tls.md) for what these security-related
parameters actually do.

If no connection string or config is given at all, postgrejs falls back to the standard `PG*` environment
variables — see [Environment Variables](./environment-variables.md).

## See Also

- [Single Connection](./single-connection.md)
- [Connection Pooling](./pooling.md)
- [Environment Variables](./environment-variables.md)
- [Multi-Host & Failover](./multi-host.md)
- [SSL/TLS & Authentication](./ssl-tls.md)
- API reference: [`getConnectionConfig`](../api/functions/get-connection-config.md) / [`parseConnectionString`](../api/functions/parse-connection-string.md)
