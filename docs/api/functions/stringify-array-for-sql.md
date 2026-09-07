---
sidebar_position: 10
---

# stringifyArrayForSQL

## stringifyArrayForSQL(v, options?, encode?)

| Parameter | Type                                            | Description                                    |
|-----------|--------------------------------------------------|---------------------------------------------------|
| v         | `any[]`                                          | The array to stringify                             |
| options   | [`DataMappingOptions`](../interfaces/data-mapping-options.md) | Data mapping options passed through to `encode`   |
| encode    | `EncodeTextFunction`                              | Function used to encode each element               |

Returns: `string`

Produces a PostgreSQL `ARRAY[...]` constructor expression (e.g. `ARRAY[1,2,3]`) suitable for splicing directly into SQL text, as used by [`QueryRequest.stringify()`](./sql-tag.md#stringifyoptions).
