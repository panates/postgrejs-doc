---
sidebar_position: 2
---

# Interfaces

## 2.2. Interfaces

### 2.2.1. ConnectionConfiguration

| Key              | Type                           | Default         | Description                                                                                                                                                                                                                             | 
|------------------|:-------------------------------|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| host             | `string`                       | localhost       | Host name or the address of the server                                                                                                                                                                                                  | 
| port             | `number`                       | 5432            | Server listening port number                                                                                                                                                                                                            | 
| user             | `string`                       | postgres        | Authenticating user name                                                                                                                                                                                                                |
| password         | `string`                       |                 | User password                                                                                                                                                                                                                           |
| database         | `string`                       |                 | Database name to be connected                                                                                                                                                                                                           |
| applicationName  | `string`                       |                 | The name of your application to attach with your session                                                                                                                                                                                |
| typesMap         | `DataTypeMap`                  | *GlobalTypeMap* | Data type map instance                                                                                                                                                                                                                  |
| ssl              | `tls.ConnectionOptions`        |                 | SSL configuration                                                                                                                                                                                                                       | 
| timezone         | `string`                       |                 | Timezone to be set on start. (Equivalent to SET timezone TO ....)                                                                                                                                                                       |
| schema           | `string`                       |                 | Default schema to be set on start. (Equivalent to SET search_path = ....)                                                                                                                                                               |
| connectTimeoutMs | `number`                       | 30000           | Connection timeout value in millis                                                                                                                                                                                                      | 
| autoCommit       | `boolean`                      | false           | Specifies weather execute query in auto-commit mode                                                                                                                                                                                     | 
| rollbackOnError  | `boolean`                      | true            | When on, if a statement in a transaction block generates an error, the error is ignored and the transaction continues. When off (the default), a statement in a transaction block that generates an error aborts the entire transaction | 
| buffer           | `SmartBufferConfig`            |                 | Configuration object for buffer                                                                                                                                                                                                         | 

### 2.2.2. PoolConfiguration

Extends [ConnectionConfiguration](#221-connectionconfiguration)

| Key               | Type        | Default |    Description        |
|-------------------|-------------| --------|-----------------------|
| acquireMaxRetries  | `number`   | 0       | Maximum number that Pool will try to create a connection before returning the error |
| acquireRetryWait   | `number`   | 2000    | Time in millis that Pool will wait after each tries | 
| acquireTimeoutMillis | `number` | 0       | Time in millis an acquire call will wait for a connection before timing out |
| fifo              | `boolean`   | true    | Specifies if resources will be allocated first-in-first-out order |
| idleTimeoutMillis | `number`    | 30000   | The minimum amount of time in millis that a connection may sit idle in the Pool |
| houseKeepInterval | `number`    | 1000    | Time period in millis that Pool will make a cleanup |
| min               | `number`    | 0       | Minimum number of connections that Pool will keep |
| minIdle           | `number`    | 0       | Minimum number of connections that Pool will keep in idle state |
| max               | `number`    | 10      | Maximum number of connections that Pool will create |
| maxQueue          | `number`    | 1000    | Maximum number of request that Pool will accept |
| validation        | `boolean`   | false   | If true Pool test connection on acquire |

### 2.2.3. DataMappingOptions

| Key          | Type        | Default |    Description        |
|--------------|-------------| --------|-----------------------|
| utcDates     | `boolean`   | false   | If true UTC time will be used for date decoding, else system time offset will be used |


### 2.2.4. ScriptExecuteOptions

Extends [DataMappingOptions](#223-datamappingoptions)

| Key          | Type        | Default |    Description        |
|--------------|-------------| --------|-----------------------|
| autoCommit   | `boolean`   | false   | Specifies whether to execute query in auto-commit mode |
| objectRows   | `boolean`   | false   | Specifies if rows will be fetched as `<FieldName, Value>` pair objects or array of values |
| typeMap      | `DataTypeMap`| *GlobalTypeMap* |Data type map instance |
| rollbackOnError | `boolean`   | true   | When on, if a statement in a transaction block generates an error, the error is ignored and the transaction continues. When off (the default), a statement in a transaction block that generates an error aborts the entire transaction |

### 2.2.5. ScriptResult

| Key          | Type        | Description        |
|--------------|-------------| -------------------|
| results      | `CommandResult[]` | Array of command result for each sql command in the script |
| totalCommands| `number`    |  Command count in the script |
| totalTime    | `number`   |  Total execution time  |

### 2.2.6. CommandResult

| Key          | Type         | Description        |
|--------------|--------------| -------------------|
| command      | `string`     | Name of the command (INSERT, SELECT, UPDATE, etc.) |
| fields       | `FieldInfo[]`| Contains information about fields in column order |
| rows         | `array`      | Contains array of row data |
| executeTime  | `number`     | Time elapsed to execute command |
| rowsAffected | `number`     | How many rows affected |

### 2.2.7. FieldInfo

| Key           | Type        | Description        |
|---------------|-------------| -------------------|
| fieldName     | `string` | Name of the field |
| tableId       | `number` | OID of the table |
| columnId      | `number` | OID of the column |
| dataTypeId    | `number` | OID of the data type |
| dataTypeName  | `string` | Name of the data type |
| elementDataTypeId    | `number` | OID of the elements data type if field is an array |
| elementDataTypeName  | `string` |  Name of the elements data type if field is an array |
| dataTypeName  | `string` | Name of the data type |
| jsType        | `number` | JS type name that data type mapped |
| modifier      | `number` | Modifier of the data type |
| isArray       | `boolean`| Whether the data type is an array |

### 2.2.8. StatementPrepareOptions

| Key          | Type        | Default |    Description        |
|--------------|-------------| --------|-----------------------|
| paramTypes   | `number[]`  |         | Specifies data type for each parameter |
| typeMap      | `DataTypeMap` | *GlobalTypeMap* | Data type map instance |

### 2.2.9. QueryOptions

Extends [DataMappingOptions](#223-datamappingoptions)

| Key          | Type         | Default |    Description        |
|--------------|--------------| --------|-----------------------|
| objectRows   | `boolean`    | false   | Specifies if rows will be fetched as `<FieldName Value>` pair objects or array of values |
| typeMap      | `DataTypeMap`| *GlobalTypeMap* |Data type map instance |
| cursor       | `boolean`    | false   | If true, returns Cursor instance instead of rows |
| params       | `(BindParam  | any)[]` | Query execution parameters |
| columnFormat | `DataFormat` `DataFormat[]`| 1 (binary)  | Specifies transfer format (binary or text) for each column |
| fetchCount   | `number`     | 100     | Specifies how many rows will be fetched. For Cursor, this value specifies how many rows will be fetched in a batch |
| fetchAsString| `OID[]`      |         | Specifies which data types will be fetched as string |
| rollbackOnError | `boolean`   | true   | When on, if a statement in a transaction block generates an error, the error is ignored and the transaction continues. When off (the default), a statement in a transaction block that generates an error aborts the entire transaction |

### 2.2.10. QueryResult

Extends [CommandResult](#226-commandresult)

| Key          | Type         | Default |    Description        |
|--------------|--------------| --------|-----------------------|
| cursor       | `Cursor`     |         | Cursor instance |