---
sidebar_position: 1
---

# Installation

Install postgrejs with npm:

```bash
npm install postgrejs
```

## Requirements

- `node >= 20.x`

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

Next, see [Single Connection](../guides/single-connection.md) to open your first connection.
