---
sidebar_position: 3
---

# escapeLiteral

## escapeLiteral(str)

| Parameter | Type     | Description               |
|-----------|----------|------------------------------|
| str       | `string` | String value to quote as a literal |

Returns: `string`

Quotes a string so it can be written into a statement as a literal, doubling embedded single quotes and escaping backslashes (prefixing the literal with `E` when it contains any). Ported from PostgreSQL's own escaping rules. Throws if `str` contains a NUL (`\0`) byte.

```ts
import { escapeLiteral } from 'postgrejs';

escapeLiteral(`O'Brien`); // "'O''Brien'"
```

:::tip
Prefer the [`sql`](./sql-tag.md) tagged template and bind parameters over building SQL text with these functions by hand — parameters are safe by construction, while a literal is only as safe as the code that calls `escapeLiteral()`/`escapeIdentifier()` correctly and consistently.
:::
