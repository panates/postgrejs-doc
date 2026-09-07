---
sidebar_position: 5
---

# Simple Query

`connection.execute(sql, options?)` runs SQL using PostgreSQL's **Simple Query** protocol. It is the right tool for scripts made of one or more complete statements, and for anything the Extended Query protocol can't run in one round trip (`BEGIN`/`COMMIT` blocks, `VACUUM`, `LISTEN`, DDL, multi-statement migrations).

```ts
import { Connection } from 'postgrejs';

const connection = new Connection();
await connection.connect();

const result = await connection.execute(`
  begin;
  update accounts set balance = balance - 100 where id = 1;
  update accounts set balance = balance + 100 where id = 2;
  end;
`);

console.log(result.totalCommands); // 4
console.log(result.results.map(r => r.command)); // ['BEGIN', 'UPDATE', 'UPDATE', 'COMMIT']
```

## Multi-statement scripts

A single `execute()` call can carry any number of semicolon-separated statements. The server runs them in order, in a single implicit transaction unless your script starts its own `BEGIN`/`END`. The returned [`ScriptResult`](../api/interfaces/script-result.md) reports one [`CommandResult`](../api/interfaces/command-result.md) per statement:

```ts
const result = await connection.execute('select 1; select 2;');
result.totalCommands; // 2
result.results[0].rows; // [[1]]
result.results[1].rows; // [[2]]
```

`ScriptResult` also reports `totalTime`, the combined execution time for the whole script.

## No bind parameters

The Simple Query protocol has no out-of-band parameter mechanism, so `ScriptExecuteOptions` has no `params` field — `execute()` only ever takes a plain SQL string (or a [`sql` tag](./sql-tag.md) result rendered with `.stringify()`). Values must be written into the script as literals:

```ts
// No params option exists for execute() — build the literal yourself,
// or use the sql tag's stringify() helper (see the sql-tag guide):
await connection.execute(`select * from accounts where id = ${accountId}`);
```

Passing a `sql\`...\`` template directly to `execute()` also works — the connection calls `.stringify()` on it internally, safely encoding each interpolated value as a properly cast literal:

```ts
import { sql } from 'postgrejs';

await connection.execute(sql`select * from accounts where id = ${accountId}`);
```

If you need real bind parameters (`$1`, `$2`, ...), use [`connection.query()`](./extended-query.md) instead — see [Extended Query](./extended-query.md) and [Query Parameters](./query-parameters.md).

## Row modes

By default rows are returned as arrays of values. Pass `objectRows: true` to get `<fieldName, value>` objects instead:

```ts
const result = await connection.execute(`select 1 as one, 'two'::varchar as two`);
result.results[0].rows; // [[1, 'two']]

const objResult = await connection.execute(
  `select 1 as one, 'two'::varchar as two`,
  { objectRows: true },
);
objResult.results[0].rows; // [{ one: 1, two: 'two' }]
```

Each `CommandResult` also reports its own `rowType: 'array' | 'object'` and `fields` (column metadata).

## Column format

`ScriptExecuteOptions.columnFormat` selects the wire format PostgreSQL uses to send column values back — text or binary — via the `DataFormat` enum:

```ts
import { DataFormat } from 'postgrejs';

await connection.execute(`select * from accounts`, {
  columnFormat: DataFormat.text,
});
```

It defaults to `DataFormat.binary`, which is faster to parse and avoids locale-dependent text formatting. You normally don't need to change it — postgrejs decodes both formats transparently into the same JS values.

## `execute()` vs `query()`

| | `execute()` (Simple Query) | `query()` (Extended Query) |
| --- | --- | --- |
| Bind parameters | Not supported | `params: [...]` |
| Multiple statements per call | Yes | No (one statement) |
| Result shape | `ScriptResult` (`results: CommandResult[]`) | `QueryResult` (single `CommandResult` + optional `cursor`) |
| Server-side cursor | Not supported | `cursor: true` |
| Typical use | Scripts, migrations, `BEGIN`/`COMMIT` blocks, admin commands | Application queries with dynamic input |

For anything that takes user-supplied values, prefer [`query()`](./extended-query.md) — it sends values out of band, which is both simpler and safer than building literals by hand.

## See also

- [`ScriptResult`](../api/interfaces/script-result.md), [`CommandResult`](../api/interfaces/command-result.md), [`ScriptExecuteOptions`](../api/interfaces/script-execute-options.md) reference
- [Extended Query](./extended-query.md)
- [The `sql` Template Tag](./sql-tag.md)
