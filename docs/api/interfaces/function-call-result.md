---
sidebar_position: 13
---

# FunctionCallResult

Return value of [`Connection.callFunction()`](../classes/connection.md#callfunction).

| Key      | Type            | Description                                                                                    |
|----------|-----------------|--------------------------------------------------------------------------------------------------|
| `result` | `Buffer \| null` | The function's return value, in the wire format requested via `FunctionCallOptions.resultFormat` — `null` if it returned SQL `NULL`. |

See the [Function Call Protocol](../../guides/function-call.md) guide for usage.
