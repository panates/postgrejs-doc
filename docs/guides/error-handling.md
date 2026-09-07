---
sidebar_position: 21
---

# Error Handling

Errors reported by the server arrive as `DatabaseError` — a subclass of `Error` carrying PostgreSQL's structured error fields plus a few fields postgrejs adds itself.

## `DatabaseError` fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `severity` | `string` | e.g. `ERROR`, `FATAL`, `PANIC`. |
| `code` | `string` | The SQLSTATE code (e.g. `23505` for a unique violation, `57014` for a cancelled query). |
| `detail` | `string` | Secondary, more detailed message. |
| `hint` | `string` | A suggestion for fixing the problem. |
| `position` | `number` | Byte offset into the *original query string* where the error occurred, for a syntax error. |
| `internalPosition` | `string` | Position within an internally-generated query (e.g. from a function). |
| `internalQuery` | `string` | The internally-generated query text itself. |
| `where` | `string` | Context stack (which function/statement was executing) when the error occurred. |
| `schema` | `string` | Schema name, for errors tied to a specific object. |
| `table` | `string` | Table name. |
| `column` | `string` | Column name. |
| `dataType` | `string` | Data type name. |
| `constraint` | `string` | Constraint name, e.g. for a failed unique/foreign-key constraint. |
| `lineNr` | `number` | *(postgrejs-added)* 1-based line number within the submitted SQL text where the error occurred. |
| `colNr` | `number` | *(postgrejs-added)* 1-based column number on that line. |
| `line` | `string` | *(postgrejs-added)* The literal source line the error points to. |

`lineNr`/`colNr`/`line` are populated only for queries submitted through this library's `query()`/`execute()`: postgrejs takes the byte `position` Postgres reports and maps it back to a line/column in the SQL text you passed in, then appends a caret-pointer excerpt to the error message — pinpointing exactly where in your submitted SQL the failure occurred, not just a raw byte offset.

```ts
import { DatabaseError } from 'postgrejs';

try {
  await connection.query(`
    select *
    from customers
    wher id = 1
  `);
} catch (err) {
  if (err instanceof DatabaseError) {
    console.log(err.code);   // "42601" (syntax_error)
    console.log(err.lineNr); // 4
    console.log(err.colNr);  // 5
    console.log(err.line);   // "    wher id = 1"
  }
}
```

## `asyncErrorHandling`

By default (`asyncErrorHandling: true`), postgrejs captures the caller's stack at the moment `query()`/`execute()` is called and splices it onto any error the call rejects with. Without this, an error thrown deep inside the library's protocol-handling code would only carry an internal async stack frame — useful for debugging the driver itself, but useless for finding which line of *your* application issued the failing query.

This costs a measurable amount of CPU when many calls are in flight at once (a burst of pipelined queries on one connection), so it can be disabled — globally via `DatabaseConnectionParams.asyncErrorHandling`, or per call via the same option on `QueryOptions`/`ScriptExecuteOptions` — for benchmarking or in hot paths where the extra stack capture isn't worth it:

```ts
const connection = new Connection({
  host: 'localhost',
  user: 'app',
  password: 'secret',
  database: 'app_db',
  asyncErrorHandling: false, // default: true
});

// or per call
await connection.query('select 1', { asyncErrorHandling: false });
```

## See also

- [API: DatabaseError](../api/classes/database-error.md)
- [Cancellation & Timeouts](./cancellation.md)
