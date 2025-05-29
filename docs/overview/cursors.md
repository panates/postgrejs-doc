---
sidebar_position: 5
---

# Using Cursors

Cursors enable applications to process very large data sets.
Cursors should also be used where the number of query rows cannot be predicted
and may be larger than your JavaScript engine can handle in a single array.
A [Cursor](../api/classes/cursor) object is obtained by setting `cursor: true` in the
[options](../api/interfaces/query-options) parameter of the [Connection](../api/classes/connection).execute()
method when executing a query. Cursor fetches rows in batches. Cursor.next() method
returns the next row from the internal cache. When internal cache is empty,
it fetches next batch of rows from the server.
`fetchCount` property lets you set the batch size.
Where there is no more row to fetch, Cursor is closed automatically and next() method returns `undefined`;

```ts
const qr = await connection.query('select * from my_table',
        {cursor: true, fetchCount: 250});
console.log(qr.fields);
const cursor = qr.cursor;
let row;
while ((row = await cursor.next())) {
    console.log(row);
}
await cursor.close(); // When you done, close the cursor to release resources
```
