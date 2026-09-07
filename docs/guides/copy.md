---
sidebar_position: 13
---

# COPY TO / COPY FROM

PostgreSQL's `COPY` statement bulk-transfers data between the server and a
client, in text, CSV or binary format, far faster than row-by-row `INSERT`s
or `SELECT`s. `postgrejs` exposes it as Node.js streams: `connection.copyTo()`
returns a `Readable` for `COPY ... TO STDOUT`, and `connection.copyFrom()`
returns a `Writable` for `COPY ... FROM STDIN`.

Both methods forward raw bytes exactly as the server sends or expects them -
nothing is parsed, decoded or re-encoded. The statement's own `FORMAT`
clause (`text`, `csv` or `binary`) decides what those bytes look like.

## COPY TO STDOUT

```ts
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Connection } from 'postgrejs';

const connection = new Connection();
await connection.connect();

const out = await connection.copyTo(`COPY users TO STDOUT (FORMAT csv, HEADER true)`);
await pipeline(out, fs.createWriteStream('users.csv'));
console.log('rows exported:', out.rowCount);
```

`copyTo()` resolves as soon as the server accepts the copy - the export
itself is not buffered in memory; a consumer that reads slowly simply pauses
the underlying socket via normal stream backpressure. The returned
`CopyToStream` must be consumed or explicitly `destroy()`-ed, since the
connection stays mid-statement until the copy finishes.

### CopyToStream properties

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `overallFormat` | `DataFormat` (`0` text \| `1` binary) | - | Format of the copy as a whole, from `CopyOutResponse`. Set once the copy starts. |
| `columnFormats` | `DataFormat[]` | - | Per-column format, from `CopyOutResponse`. |
| `rowCount` | `number` | - | Rows the server reported for the copy. **Set before `'end'` is emitted**, so it is always safe to read once the stream has finished. |

`waitStarted(): Promise<void>` resolves once the server has accepted the
copy (i.e. once `overallFormat` is set) and rejects if the statement never
starts one - for example if it was not actually a `COPY ... TO STDOUT`:

```ts
const out = await connection.copyTo(`COPY users TO STDOUT`);
await out.waitStarted(); // throws if the SQL wasn't a COPY TO STDOUT
```

Passing a statement that isn't a `COPY ... TO STDOUT` rejects the `copyTo()`
call itself with an error, and the connection remains usable for further
queries.

## COPY FROM STDIN

```ts
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Connection } from 'postgrejs';

const connection = new Connection();
await connection.connect();

const input = await connection.copyFrom(`COPY users FROM STDIN (FORMAT csv)`);
await pipeline(fs.createReadStream('users.csv'), input);
console.log('rows imported:', input.rowCount);
```

`'finish'` on a `CopyFromStream` means the server has accepted and committed
the whole copy - the stream actually waits for `CommandComplete`, not merely
for the last byte to be written - so `rowCount` is already set by the time a
`pipeline()` over it resolves.

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `rowCount` | `number` | - | Rows the server accepted. Set before `'finish'` is emitted. |

`waitStarted(): Promise<void>` resolves once the server is ready to receive
data (`CopyInResponse`) and rejects if the statement never asks for any.

If the source of data fails partway through, destroying the stream (which
`pipeline()` does automatically) sends `CopyFail` to the server instead of
leaving the connection stuck waiting for more data - the partial copy is
rolled back and the connection stays usable:

```ts
import { Readable } from 'node:stream';

const input = await connection.copyFrom(`COPY users FROM STDIN`);
const source = Readable.from(brokenGenerator()); // throws partway through
await pipeline(source, input).catch(err => {
  // CopyFail was sent; `connection` can still run further queries.
});
```

## Round-tripping a binary export

Binary format is the most compact and preserves exact types, which makes it
convenient for copying data between tables or servers:

```ts
import { Readable } from 'node:stream';

const exported = await connection.copyTo(`COPY users TO STDOUT (FORMAT binary)`);
const chunks: Buffer[] = [];
for await (const chunk of exported) chunks.push(chunk);

const input = await connection.copyFrom(`COPY users_backup FROM STDIN (FORMAT binary)`);
await pipeline(Readable.from([Buffer.concat(chunks)]), input);
```

See [API: CopyToStream/CopyFromStream](../api/classes/copy-stream.md) for the
full class reference.
