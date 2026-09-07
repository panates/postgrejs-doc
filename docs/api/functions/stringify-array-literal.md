---
sidebar_position: 9
---

# stringifyArrayLiteral

## stringifyArrayLiteral(value, options?, encode?)

| Parameter | Type                                            | Description                                                              |
|-----------|--------------------------------------------------|-----------------------------------------------------------------------------|
| value     | `any[]`                                          | The (possibly nested/multi-dimensional) array to stringify                |
| options   | [`DataMappingOptions`](../interfaces/data-mapping-options.md) | Data mapping options passed through to `encode`                           |
| encode    | `EncodeTextFunction`                              | Function used to encode each leaf element before quoting                  |

Returns: `string`

Produces PostgreSQL's curly-brace array literal syntax (e.g. `{"1","2",NULL}`), inferring dimensions from the input array, quoting each element and escaping embedded backslashes/double quotes. Used to encode array values as text for the wire protocol.
