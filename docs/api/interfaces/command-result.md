---
sidebar_position: 7
---

# CommandResult

| Key          | Type                                | Default | Description                                       |
|--------------|--------------------------------------|---------|-----------------------------------------------------|
| command      | `string`                             |         | Name of the command (`INSERT`, `SELECT`, `UPDATE`, etc.) |
| fields       | [`FieldInfo[]`](./field-info.md)       |         | Contains information about fields in column order |
| rows         | `Row[]`                              |         | Contains array of row data                        |
| rowType      | `'array' \| 'object'`                 |         | Contains row type                                 |
| executeTime  | `number`                             |         | Time elapsed to execute the command                |
| rowsAffected | `number`                             |         | How many rows were affected                        |
