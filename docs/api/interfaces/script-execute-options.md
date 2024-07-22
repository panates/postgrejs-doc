---
sidebar_position: 4
---

# ScriptExecuteOptions

Extends [DataMappingOptions](data-mapping-options)

| Key             | Type          | Default         | Description                                                                                                                                                                                                                             |
|-----------------|---------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| autoCommit      | `boolean`     | false           | Specifies whether to execute query in auto-commit mode                                                                                                                                                                                  |
| objectRows      | `boolean`     | false           | Specifies if rows will be fetched as `<FieldName, Value>` pair objects or array of values                                                                                                                                               |
| typeMap         | `DataTypeMap` | *GlobalTypeMap* | Data type map instance                                                                                                                                                                                                                  |
| rollbackOnError | `boolean`     | true            | When on, if a statement in a transaction block generates an error, the error is ignored and the transaction continues. When off (the default), a statement in a transaction block that generates an error aborts the entire transaction |
