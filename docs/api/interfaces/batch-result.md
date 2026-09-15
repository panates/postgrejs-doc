---
sidebar_position: 14
---

# BatchResult

The result of [`PreparedStatement.executeBatch()`](../classes/prepared-statement.md#executebatch). `results` holds every *completed* set — on success that's all of them; when the server rejects one, the batch stops there and the completed prefix is attached to the thrown [`DatabaseError`](../classes/database-error.md) as `batchResults` instead.

| Key              | Type                    | Default | Description                                                                                          |
|------------------|--------------------------|---------|---------------------------------------------------------------------------------------------------------|
| results          | `BatchCommandResult[]`   |         | One entry per parameter set, in submission order                                                        |
| totalRowsAffected| `number`                 |         | Sum of every set's `rowsAffected` — the common bulk-write case                                          |
| fields           | [`FieldInfo[]`](./field-info.md) |  | Column descriptions, when the statement returns rows — one copy for the whole batch, since every set runs the same statement |
| executeTime      | `number`                 |         | Wall time for the whole batch, when `timing` is enabled                                                 |

## `BatchCommandResult`

What one parameter set produced — exactly one per set, in the same order the sets were submitted in, since the server answers each `Execute` with its own `CommandComplete`.

| Key          | Type      | Default | Description                                                                                          |
|--------------|-----------|---------|----------------------------------------------------------------------------------------------------------|
| command      | `string`  |         | The command tag PostgreSQL reported for this set (`INSERT`/`UPDATE`/...)                                 |
| rowsAffected | `number`  |         | Rows affected, for `INSERT`/`UPDATE`/`DELETE` — as in `QueryResult`                                       |
| rows         | `any[]`   |         | Rows this set returned, decoded the same way `execute()` decodes them (`rowDecoder` included). Only present when the statement actually returns rows — a plain `UPDATE` without `RETURNING` leaves this `undefined` rather than an empty array |

```ts
const stmt = await connection.prepare('update users set name = $1 where id = $2');
const batch = await stmt.executeBatch([
  ['John', 1],
  ['Jane', 2],
  ['Bob', 3],
]);
batch.results.map(r => r.rowsAffected); // [1, 1, 0]
batch.totalRowsAffected;                // 2
```

See [Prepared Statements](../../guides/prepared-statements.md#batch-execution) for the full guide.
