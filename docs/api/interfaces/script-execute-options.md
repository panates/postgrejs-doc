---
sidebar_position: 5
---

# ScriptExecuteOptions

Extends [DataMappingOptions](./data-mapping-options.md)

| Key                | Type          | Default             | Description                                                                                                                                                                                                                                                                                                                     |
|--------------------|----------------|----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| autoCommit         | `boolean`      | `true`               | Specifies whether to execute the script in auto-commit mode                                                                                                                                                                                                                                                                     |
| objectRows         | `boolean`      | `false`              | Specifies whether rows are fetched as `<FieldName, Value>` pair objects or as arrays of values                                                                                                                                                                                                                                  |
| typeMap            | `DataTypeMap`  | `GlobalTypeMap`      | Data type map instance                                                                                                                                                                                                                                                                                                          |
| rollbackOnError    | `boolean`      | `true`               | When off, if a statement in a transaction block generates an error, the error is ignored and the transaction continues. When on (the default), a statement in a transaction block that generates an error aborts the entire transaction                                                                                       |
| signal             | `AbortSignal`  |                      | Aborts the call when the signal fires: the running script is cancelled on the server and the promise rejects with the signal's own reason, with the database error attached as `cause`. Cancelling is a request rather than a guarantee — the call settles when the server has actually finished, not the moment `abort()` is called. `AbortSignal.timeout(ms)` gives a per-call timeout |
| asyncErrorHandling | `boolean`      | the connection's own setting | Overrides the connection's own `asyncErrorHandling` for this call only — see [`DatabaseConnectionParams.asyncErrorHandling`](./database-connection-params.md)                                                                                                                                                                    |

`ScriptExecuteOptions` has no `cursor`, `params`, `columnFormat` or `fetchCount` fields — those are specific to [QueryOptions](./query-options.md); a script is a batch of Simple Query statements with no bind parameters and no cursor support.
