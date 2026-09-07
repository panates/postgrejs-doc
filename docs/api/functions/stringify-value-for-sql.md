---
sidebar_position: 11
---

# stringifyValueForSQL

## stringifyValueForSQL(v, options?, encode?)

| Parameter | Type                                            | Description                                    |
|-----------|--------------------------------------------------|---------------------------------------------------|
| v         | `any`                                             | The value to stringify                              |
| options   | [`DataMappingOptions`](../interfaces/data-mapping-options.md) | Data mapping options passed through to `encode`   |
| encode    | `EncodeTextFunction`                              | Function used to encode non-primitive values        |

Returns: `string`

Converts a single JS value into a SQL-literal-safe expression for splicing into SQL text: `null` for `null`/`undefined`, `true`/`false` for booleans, an `ARRAY[...]` expression for arrays (via `stringifyArrayForSQL`), a quoted `'...'::uuid` for UUID strings, a quoted `'...'::json` for other objects (via `JSON.stringify`), and an escaped literal for everything else.
