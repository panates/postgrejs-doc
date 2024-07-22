---
sidebar_position: 8
---


# QueryOptions

Extends [DataMappingOptions](data-mapping-options)

| Key             | Type                        | Default         | Description                                                                                                                                                                                                                             |
|-----------------|-----------------------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| objectRows      | `boolean`                   | false           | Specifies if rows will be fetched as `<FieldName Value>` pair objects or array of values                                                                                                                                                |
| typeMap         | `DataTypeMap`               | *GlobalTypeMap* | Data type map instance                                                                                                                                                                                                                  |
| cursor          | `boolean`                   | false           | If true, returns Cursor instance instead of rows                                                                                                                                                                                        |
| params          | `(BindParamany)[]`          |                 | Query execution parameters                                                                                                                                                                                                              |
| columnFormat    | `DataFormat` `DataFormat[]` | 1 (binary)      | Specifies transfer format (binary or text) for each column                                                                                                                                                                              |
| fetchCount      | `number`                    | 100             | Specifies how many rows will be fetched. For Cursor, this value specifies how many rows will be fetched in a batch                                                                                                                      |
| fetchAsString   | `OID[]`                     |                 | Specifies which data types will be fetched as string                                                                                                                                                                                    |
| rollbackOnError | `boolean`                   | true            | When on, if a statement in a transaction block generates an error, the error is ignored and the transaction continues. When off (the default), a statement in a transaction block that generates an error aborts the entire transaction |
