---
sidebar_position: 8
---
# Data Types

## Data Types Mappings

The table below lists builtin data type mappings.

| Posgtres type | JS type     | Receive     | Send   | 
|---------------|:------------|-------------|--------|
| bool          | boolean     | text,binary | binary | 
| int2          | number      | text,binary | binary | 
| int4          | number      | text,binary | binary | 
| int8          | BigInt      | text,binary | binary | 
| float4        | number      | text,binary | binary | 
| float8        | number      | text,binary | binary | 
| char          | string      | text,binary | binary | 
| bpchar        | string      | text,binary | binary | 
| varchar       | string      | text,binary | binary | 
| date          | Date        | text,binary | binary | 
| time          | Date        | text,binary | binary | 
| timestamp     | Date        | text,binary | binary | 
| timestamptz   | Date        | text,binary | binary | 
| oid           | number      | text,binary | binary | 
| bytea         | Buffer      | text,binary | binary | 
| uuid          | string      | text,binary | binary | 
| json          | object      | text,binary | binary | 
| jsonb         | object      | text,binary | binary | 
| xml           | string      | text,binary | binary | 
| point         | Point       | text,binary | binary | 
| circle        | Circle      | text,binary | binary | 
| lseg          | Rectangle   | text,binary | binary | 
| box           | Rectangle   | text,binary | binary |
| int2Vector    | number[]    | text,binary | binary | 
| _bool         | boolean[]   | text,binary | binary | 
| _int2         | number[]    | text,binary | binary | 
| _int4         | number[]    | text,binary | binary | 
| _int8         | BigInt[]    | text,binary | binary | 
| _float4       | number[]    | text,binary | binary | 
| _float8       | number[]    | text,binary | binary | 
| _char         | string[]    | text,binary | binary | 
| _bpchar       | string[]    | text,binary | binary | 
| _varchar      | string[]    | text,binary | binary | 
| _date         | Date[]      | text,binary | binary | 
| _time         | Date[]      | text,binary | binary | 
| _timestamp    | Date[]      | text,binary | binary | 
| _timestamptz  | Date[]      | text,binary | binary | 
| _uuid         | string[]    | text,binary | binary | 
| _oid          | number[]    | text,binary | binary | 
| _bytea        | Buffer[]    | text,binary | binary | 
| _json         | object[]    | text,binary | binary | 
| _jsonb        | object[]    | text,binary | binary | 
| _xml          | string[]    | text,binary | binary | 
| _point        | Point[]     | text,binary | binary | 
| _circle       | Circle[]    | text,binary | binary | 
| _lseg         | Rectangle[] | text,binary | binary | 
| _box          | Rectangle[] | text,binary | binary | 
| _int2Vector   | number[][]  | text,binary | binary | 

## Data transfer formats

PostgreSQL wire protocol offers `text` and `binary` data transfer formats.
Most common libraries supports only `text` transfer format which is easy to implement but poses performance and memory
problems.
`postgrejs` has rich data type mappings which supports both `text` and `binary` formats.
The default format is set to `binary`. However, you can set the format to `text` for all columns or per column.

Note that binary format is faster than text format.
If there is a type mapping for that postgres type, we don't suggest you text format.

```ts
const qr = await connection.query('select id, other_field from my_table',
        {columnFormat: DataFormat.text});
console.log(qr.rows);
```

```ts
const qr = await connection.query('select id, other_field from my_table',
        {columnFormat: [DataFormat.binary, DataFormat.text]});
console.log(qr.rows);
```
