---
sidebar_position: 6
---


# CommandResult

| Key          | Type          | Description                                        |
|--------------|---------------|----------------------------------------------------|
| command      | `string`      | Name of the command (INSERT, SELECT, UPDATE, etc.) |
| fields       | `FieldInfo[]` | Contains information about fields in column order  |
| rows         | `array`       | Contains array of row data                         |
| executeTime  | `number`      | Time elapsed to execute command                    |
| rowsAffected | `number`      | How many rows affected                             |
