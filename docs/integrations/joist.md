---
sidebar_position: 2
title: Joist
hide_title: true
---

import IntegrationLogo from '@site/src/components/IntegrationLogo';

<IntegrationLogo alt="Joist" light="/img/joist-full-light.svg" dark="/img/joist-full-dark.svg" />

# Joist

[Joist](https://joist-orm.io) is an ORM for TypeScript and PostgreSQL, built around entities and an
`EntityManager`. Joist 2.5, released on 1 November 2026, ships a `postgrejs` driver, and `postgrejs`
3.14.1 carries two fixes that came out of Joist's testing of it.

This is the one integration here that we did not write. The driver, `joist-orm/postgrejs`, lives
inside `joist-orm` and is maintained by the Joist project. The other adapters on this page are
maintained alongside `postgrejs`. What follows is how the two fit together, taken from Joist's own
documentation and its published `joist-orm` 2.5.0 package. We have not run Joist ourselves or
benchmarked it, so the page has no numbers of our own.

## Installation

```bash
npm install joist-orm postgrejs@3.14.1
```

Joist's documentation names `postgrejs@3.14.1`, and `joist-orm` declares `postgrejs` as an optional
peer dependency pinned to that exact version.

## Usage

Swap the driver you hand to the `EntityManager`; entities and application code stay as they are:

```ts
import { PostgreJsDriver } from 'joist-orm/postgrejs';
import { Pool } from 'postgrejs';

const pool = new Pool(process.env.DATABASE_URL);
const driver = new PostgreJsDriver(pool);

// Reuse the pool and the driver; create one EntityManager per request.
const em = new EntityManager(ctx, driver);

// On application shutdown:
await pool.close();
```

`Pool` takes a connection string, as here, or an options object; see
[Connection Pooling](../connecting/pooling.md) and [Connection Strings](../connecting/connection-strings.md).

## Why a separate driver: lazy rows

Joist has an optimization it calls "lazy rows". When rows arrive off the wire, it avoids parsing each
column into a JavaScript value until the entity for that row asks for that particular cell. Reading a
subset of an entity's data then costs a fraction of decoding everything.

On `pg` this works by patching the driver's handling of socket buffers, behind a `lazyRows` flag. On
`postgrejs` it needs no patch: Joist's driver subclasses [`RowDecoder`](../api/classes/row-decoder.md),
`postgrejs`'s public hook for deciding what a row becomes, and hands it to each query as the
`rowDecoder` option. See [Custom Row Decoding](../querying/row-decoder.md) for the same mechanism used
directly.

Joist reports that reading subsets of entity data this way is about 1.5 to 2.5 times faster than stock
`pg`, and that its own `lazyRows` option on `pg` lands in the same range. Those figures are Joist's,
from benchmarks in the Joist repository that read a subset of an entity's fields; they say nothing
about other access patterns.

## What still uses `pg`

Joist's migrations and its `joist-codegen` step still use `pg`. Joist describes both as build steps
only; at runtime the driver above is the one in use.

## The 3.14.1 fixes

`postgrejs` 3.14.1 contains two fixes that Joist's testing found, both reported against 3.14.0:

- **Byte views as `bytea`.** A `Uint8Array` — off `fetch`, or a `subarray()` of a larger buffer — was
  taken for JSON and the statement failed. Any `ArrayBuffer` view is now sent as `bytea`, and only the
  bytes it covers. See [Data Types](../querying/data-types.md).
- **Submission order.** Pipelined statements on one connection now run in the order they were
  submitted. Before, a statement that had to wait for its `Parse` could be overtaken by a later one that
  was already cached. See [Connection Pooling](../connecting/pooling.md#pipelining).

## Support

Problems with the driver's Joist-specific behavior belong in
[Joist's issue tracker](https://github.com/joist-orm/joist-orm/issues). Anything about `postgrejs`
itself, such as connections, types and the pool, belongs in
[ours](https://github.com/panates/postgrejs/issues).

## See also

- [Custom Row Decoding](../querying/row-decoder.md)
- [Connection Pooling](../connecting/pooling.md)
- [Joist's PostgreJS guide](https://joist-orm.io/advanced/postgrejs/)
