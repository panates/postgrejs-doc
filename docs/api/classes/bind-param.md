---
sidebar_position: 5
---

# BindParam

Wraps a query parameter value together with an explicit PostgreSQL type OID, letting you override what [DataTypeMap.determine()](./data-type-map.md#determine) would otherwise infer from the JS value. Used in the `params` array of [QueryOptions](../interfaces/query-options.md) and [ScriptExecuteOptions](../interfaces/script-execute-options.md).

## Constructor

`new BindParam(oid: OID, value: any)`

| Argument | Type   | Default | Description                             |
|----------|--------|---------|--------------------------------------------|
| oid      | `OID`  |         | PostgreSQL data type OID for the value       |
| value    | `any`  |         | The parameter value                          |

```ts
import { BindParam, Connection, DataTypeOIDs } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();
await connection.query('select lo_unlink($1)', {
  params: [new BindParam(DataTypeOIDs.oid, 12345)],
});
```

`oid` may be `0`, which declares no type and leaves the server to resolve one from where the parameter appears — see [OID `0`: no declared type](../../querying/query-parameters.md#oid-0-no-declared-type).

## Properties

| Key   | Type   | Readonly | Description                       |
|-------|--------|----------|-----------------------------------|
| oid   | `OID`  | false    | PostgreSQL data type OID for the value |
| value | `any`  | false    | The parameter value                    |
