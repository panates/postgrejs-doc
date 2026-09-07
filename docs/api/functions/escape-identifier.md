---
sidebar_position: 2
---

# escapeIdentifier

## escapeIdentifier(str)

| Parameter | Type     | Description                    |
|-----------|----------|-----------------------------------|
| str       | `string` | Table, column or schema name to quote |

Returns: `string`

Quotes a table, column or schema name so it can be written into a statement safely. Identifiers cannot be parameters — `$1` is always a value — so a dynamic name has to go into the SQL text itself, which is exactly where an injection would get in. Quoting wraps the name in double quotes and doubles any embedded double quote, so whatever it contains stays a single identifier. Named after, and ported from, PostgreSQL's own `quote_ident()`. Throws if `str` contains a NUL (`\0`) byte.

```ts
import { escapeIdentifier } from 'postgrejs';

escapeIdentifier('my"column'); // '"my""column"'
```

:::tip
Prefer the [`sql`](./sql-tag.md) tagged template and bind parameters over building SQL text with these functions by hand — parameters are safe by construction, while a literal is only as safe as the code that calls `escapeLiteral()`/`escapeIdentifier()` correctly and consistently.
:::
