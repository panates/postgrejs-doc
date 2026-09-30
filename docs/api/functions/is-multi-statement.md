---
sidebar_position: 12
---

# isMultiStatement

## isMultiStatement(sql)

| Parameter | Type     | Description                    |
|-----------|----------|-----------------------------------|
| sql       | `string` | SQL to inspect                    |

Returns: `boolean`

Reports whether `sql` holds more than one statement, without running it. [`Connection.query()`](../classes/connection.md#query)
speaks the Extended Query protocol, which PostgreSQL refuses for more than one command per call;
[`Connection.execute()`](../classes/connection.md#execute) sends the Simple Query protocol, which
accepts a whole script but gives up the prepared plan. A caller that already knows which shape it
has picks the right method directly and needs nothing from this function — it exists for a single
SQL-taking entry point above both (an ORM adapter, a migration runner, a REPL, anything taking SQL
from a user) that has to choose before it can send:

```ts
import { Connection, isMultiStatement } from 'postgrejs';

async function run(connection: Connection, sql: string) {
  return isMultiStatement(sql) ? connection.execute(sql) : connection.query(sql);
}
```

It's a one-pass scanner, not a parser: it tracks `'...'`/`E'...'` string literals, `"..."` quoted
identifiers, `$tag$...$tag$` dollar-quoted bodies (including a `$1` placeholder, which opens no
quote), `--` line comments and nested `/* */` block comments, so a `;` inside any of those is never
mistaken for a statement boundary. A trailing `;`, or a run of them followed only by whitespace and
comments, is a terminator rather than a second statement — `isMultiStatement('select 1;')` is
`false`, matching that PostgreSQL accepts `select 1;;` on the extended protocol without complaint.

```ts
isMultiStatement('select 1'); // false
isMultiStatement('select 1;'); // false — a trailing terminator, not a second statement
isMultiStatement('select 1; select 2'); // true
isMultiStatement(`select ';'`); // false — inside a string literal
isMultiStatement('select $1'); // false — a placeholder, not a dollar-quoted body
```

Checked against a live server rather than against a reading of the grammar: PostgreSQL refuses a
multi-command string on the extended protocol with `42601 cannot insert multiple commands into a
prepared statement` exactly when it holds more than one, and this function agrees with that verdict
on both a hand-built corpus and every combination of it.

Which way a wrong answer goes isn't symmetric — saying *several* about one statement costs it its
prepared plan and nothing else, while saying *one* about several reaches the caller as that
`42601`. One boundary is left as-is: under `standard_conforming_strings = off` (default `on` since
PostgreSQL 9.1) a backslash escapes inside a plain `'...'` too, which this function doesn't account
for — both readings still end in an error, so nothing is decoded wrongly either way.

`query()` and `execute()` don't call this themselves — a scan on every statement would be a cost
everyone pays for a mistake few make.

## See also

- [Simple Query: `execute()` vs `query()`](../../querying/simple-query.md#execute-vs-query)
- [Extended Query](../../querying/extended-query.md)
