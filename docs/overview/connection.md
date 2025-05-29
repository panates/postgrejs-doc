---
sidebar_position: 1
---

# Connection

## Creating a connection

The library supports both single and pooled connections.
If you want to establish a single session to a PostgreSQL server
you need to use `Connection` class. If you require a connection pool use `Pool` class instead.

*new Connection([config: String | [ConnectionConfiguration](../api/interfaces/connection-configuration.md)]);*

```ts
import { Connection } from 'postgrejs';

const connection = new Connection({
    host: 'localhost',
    port: 5432,
    user: 'user1',
    password: 'mypass',
    database: 'mydb',
    timezone: 'Europe/Amsterdam'
});
await connection.connect();
// Do whatever you need with connection
await connection.close();
```

## Connection Strings

You can initialize both a `Connection` and `Pool` using a connection string uri.
Unix domain sockets and TCP uri's can be used as connection string.

### UNIX domain socket

`[unix:// | socket://][<user>][:<password>]@<path>[?query&query...]`

`/var/run/pgsql`

`/var/run/pgsql?db=mydb`

`unix:///var/run/pgsql`

`socket:/var/run/pgsql`

`socket://user:pass@/var/run/pgsql`

`socket://user:pass@/var/run/pgsql?db=mydb`

```ts
const connection = new Connection('postgres://someuser:somepassword@somehost:381/somedatabase');
```

### TCP connection URI

`[pg:// | postgres://][<user>][:<password>]@<host>[:<port>][/<database>][?query&query...]`

`pg://user:pass@localhost:5432/mydb`

`pg://localhost?db=mydb&user=me`

## Environment variables

Configuration object and connection strings are optional for both `Connection` and `Pool` classes.
If no argument given while creating an instance,
same [environment variables](https://www.postgresql.org/docs/9.1/libpq-envars.html) as libpq will be used to establish
connection.

Current supported environment variables
are [PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD, PGAPPNAME, PGTZ, PGCONNECT_TIMEOUT, PGSCHEMA]

```ts
const connection = new Connection(); // Initialize using environment variables
```
