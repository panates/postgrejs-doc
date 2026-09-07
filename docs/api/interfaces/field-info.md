---
sidebar_position: 8
---

# FieldInfo

| Key                 | Type      | Default | Description                                            |
|---------------------|-----------|---------|-----------------------------------------------------------|
| fieldName           | `string`  |         | Name of the field                                       |
| tableId             | `number`  |         | OID of the table                                        |
| columnId            | `number`  |         | OID of the column                                       |
| dataTypeId          | `number`  |         | OID of the data type                                     |
| dataTypeName        | `string`  |         | Name of the data type                                    |
| elementDataTypeId   | `number`  |         | OID of the element's data type, if the field is an array  |
| elementDataTypeName | `string`  |         | Name of the element's data type, if the field is an array |
| jsType              | `string`  |         | JS type name that the data type maps to                  |
| fixedSize           | `number`  |         | Data length, if the data type has a fixed size            |
| modifier            | `number`  |         | Modifier of the data type                                |
| isArray             | `boolean` |         | Whether the data type is an array                        |

Only `fieldName`, `dataTypeId` and `dataTypeName`/`jsType` are required; all other fields are optional and only present when applicable.
