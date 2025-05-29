---
sidebar_position: 5
---

#  Prepared Statements

Prepared statements are great when you need executing a script more than once (etc. bulk insert or update).
It dramatically reduces execution time.

To create a [PreparedStatement](../api/classes/prepared-statement) instance or just call `connection.prepare()` or `pool.prepare()`
methods.

*pool.prepare(sql: string, options?: [StatementPrepareOptions](../api/interfaces/statement-prepare-options)]):
Promise\<[PreparedStatement](../api/classes/prepared-statement)>;*

*connection.prepare(sql: string, options?: [StatementPrepareOptions](../api/interfaces/statement-prepare-options)]):
Promise\<[PreparedStatement](../api/classes/prepared-statement)>;*

```ts
import { DataTypeOIDs } from 'postgrejs';

// .....
const statement = await connection.prepare(
        'insert into my_table(id, name) values ($1, $2)', {
            paramTypes: [DataTypeOIDs.Int4, DataTypeOIDs.Varchar]
        });

for (let i = 0; i < 100; i++) {
    await statement.execute({params: [i, ('name' + i)]});
}
await statement.close(); // When you done, close the statement to relase resources
```
