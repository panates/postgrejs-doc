---
sidebar_position: 9
---

# DatabaseError

Extends the built-in `Error`. Constructed internally from the server's `ErrorResponse` message and thrown/rejected by `query()`, `execute()` and other statement-executing methods — you do not construct it yourself. Every field mirrors one of the fields PostgreSQL includes in its `ErrorResponse`/`NoticeResponse` protocol messages (see the [PostgreSQL error field docs](https://www.postgresql.org/docs/current/protocol-error-fields.html)); all are optional because the server only sends the ones it has.

```ts
import { Connection, DatabaseError } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
try {
  await connection.query('select * from no_such_table');
} catch (e) {
  if (e instanceof DatabaseError) {
    console.log(e.code, e.message, e.position);
  }
}
```

## Properties

| Key              | Type     | Readonly | Description                                                                                       |
|-------------------|----------|----------|-----------------------------------------------------------------------------------------------------|
| message           | `string` | false    | Human-readable error message (inherited from `Error`)                                                |
| severity          | `string` | false    | `ERROR`, `FATAL`, `PANIC`, or (for a notice) `WARNING`, `NOTICE`, `DEBUG`, `INFO`, `LOG`                |
| code              | `string` | false    | SQLSTATE error code                                                                                    |
| detail            | `string` | false    | Secondary, more detailed error message                                                                |
| hint              | `string` | false    | Suggestion of what to do about the problem                                                            |
| position          | `number` | false    | 1-based character index into the original query string where the error occurred                       |
| internalPosition  | `string` | false    | 1-based character index into an internally generated query                                             |
| internalQuery     | `string` | false    | The internally generated query that caused the error                                                  |
| where             | `string` | false    | Context in which the error occurred (e.g. a stack of function calls)                                   |
| schema            | `string` | false    | Name of the schema associated with the error                                                          |
| table             | `string` | false    | Name of the table associated with the error                                                           |
| column            | `string` | false    | Name of the column associated with the error                                                          |
| dataType          | `string` | false    | Name of the data type associated with the error                                                       |
| constraint        | `string` | false    | Name of the constraint associated with the error                                                      |
| lineNr            | `number` | false    | Line number within the SQL script that caused the error (computed client-side from `position`)          |
| colNr             | `number` | false    | Column number within that line (computed client-side from `position`)                                  |
| line              | `string` | false    | The text of the offending line itself (computed client-side from `position`)                            |

:::note
`lineNr`, `colNr` and `line` are not sent by the server — they are computed by `Connection` from `position` after the error is received, and only when `position` is present. They are what make the appended `at line N column M` context in a thrown error's `message` possible.
:::
