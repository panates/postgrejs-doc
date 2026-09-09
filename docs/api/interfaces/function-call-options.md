---
sidebar_position: 12
---

# FunctionCallOptions

Options for [`Connection.callFunction()`](../classes/connection.md#callfunction).

| Key            | Type            | Default            | Description                                                                                      |
|----------------|-----------------|--------------------|----------------------------------------------------------------------------------------------------|
| `argFormats`   | `DataFormat[]`  |                    | Format of each argument, applied positionally — omit for text (the default) applied to every argument, a single entry to apply it to all of them, or one entry per argument. |
| `resultFormat` | `DataFormat`    | `DataFormat.text`  | Format the function's return value comes back in.                                                  |
| `signal`       | `AbortSignal`   |                    | Cancels the call. See [Cancellation & Timeouts](../../guides/cancellation.md).                     |

See the [Function Call Protocol](../../guides/function-call.md) guide for usage.
