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
| rowsAffected | `number`                             |         | How many rows were affected                        |
