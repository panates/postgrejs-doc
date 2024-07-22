---
sidebar_position: 4
---

# Extended Queries

In the extended-query protocol, *prepared statements* and *portals* are used.
Unlike simple query, extended query protocol supports parameter binding and binary data format.
The only limit is you can execute one command at a time.

*pool.query(sql: string, options?: [QueryOptions](#229-queryoptions)]): Promise\<[QueryResult](#2210-queryresult)>;*

*connection.query(sql: string, options?: [QueryOptions](#229-queryoptions)]): Promise\<[QueryResult](#2210-queryresult)>
;*

```ts
const qr = await connection.query('select * from my_table');
console.log(qr.fields);
console.log(qr.rows);
```