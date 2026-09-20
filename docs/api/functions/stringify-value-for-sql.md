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

Converts a single JS value into a SQL-literal-safe expression for splicing into SQL text: `null` for `null`/`undefined`, `true`/`false` for booleans, an `ARRAY[...]` expression for arrays (via `stringifyArrayForSQL`), a quoted `'...'::uuid` for UUID strings, and an escaped bare literal for everything else (a plain string, a number, ...).

For any other object, [`DataTypeMap.determine()`](../classes/data-type-map.md#determine) is asked which type it is, the same way it would be if the value were bound as a parameter instead — so a `Point`, a `Range`, an `Interval`, a `Date`, or a `Buffer` is written through that type's own `encodeText()` and cast, e.g. `'(1,2)'::point` or `'2020-01-02T03:04:05.000Z'::timestamptz`, rather than through `JSON.stringify`. Only an object no registered type claims falls back to a quoted `'...'::json`. A `Range` built without a type OID throws — see [API: Range](../classes/range.md) — rather than silently becoming JSON, since nothing about a bare `Range` says which of the six range types it's meant to be.
