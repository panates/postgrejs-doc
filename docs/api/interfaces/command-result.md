---
sidebar_position: 7
---

# CommandResult

| Key          | Type                                | Default | Description                                       |
|--------------|--------------------------------------|---------|-----------------------------------------------------|
| command      | `string`                             |         | Name of the command (`INSERT`, `SELECT`, `UPDATE`, etc.) |
| fields       | [`FieldInfo[]`](./field-info.md)       |         | Contains information about fields in column order |
| rows         | `Row[]`                              |         | Contains array of row data                        |
| rowType      | `'array' \| 'object' \| 'custom'`      |         | Row shape — `'custom'` when a [`RowDecoder`](../classes/row-decoder.md) subclass was supplied via `rowDecoder`, since there's no way to know what shape it returns |
| executeTime  | `number`                             |         | Time elapsed to execute the command                |
| suspended    | `boolean`                            |         | `true` when an explicit [`fetchCount`](./query-options.md) stopped the server before the statement ran to completion — `rows` is then a prefix, not the whole result. Only ever set when `fetchCount` was given; the default fetches every row. See [`fetchCount` and suspended results](../../querying/extended-query.md#fetchcount-and-suspended-results). |
| rowsAffected | `number`                             |         | Rows changed by `INSERT`/`UPDATE`/`DELETE`/`MERGE` (`MERGE` needs PostgreSQL 15+ and reports one total across all its actions). Left `undefined` for every other command, `SELECT` included — the count those report is rows returned, not rows affected. |
