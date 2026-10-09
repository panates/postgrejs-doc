---
sidebar_position: 1
---

# Installation

Install postgrejs with npm:

```bash
npm install postgrejs
```

## Requirements

- `node >= 20.x` — the test suite runs in CI on every push across Node 20, 22, 24 and 26, each against
  PostgreSQL 12, 16 and 18.
- Bun — the same test suite runs under Bun in CI against PostgreSQL 18 on every push, so it's a supported
  runtime rather than an untested coincidence.
- Cloudflare Workers — with `nodejs_compat`. Not in the CI matrix yet: it was measured by hand against
  PostgreSQL 18, a plain connection and a TLS one, and what the runtime does and doesn't allow is written
  down in [Cloudflare Workers](../connecting/cloudflare-workers.md).

## Module format

postgrejs ships as an ES module (`"type": "module"`). Node 20.19+ and 22.12+ support `require()`-ing an ESM
package directly from CommonJS code, so you can use either `import` or `require()` depending on your project's
module system:

```ts
// ESM
import { Connection } from 'postgrejs';
```

```js
// CommonJS (Node 20.19+ / 22.12+)
const { Connection } = require('postgrejs');
```

On older Node 20/22 releases that don't support requiring ESM, import postgrejs from an ESM entry point (e.g. a
dynamic `import()`, or a project configured with `"type": "module"`).

Next, see [Single Connection](../connecting/single-connection.md) to open your first connection.
