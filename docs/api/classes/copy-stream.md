---
sidebar_position: 6
---

# Copy Streams

Two Node.js stream classes returned by [Connection.copyTo()](./connection.md#copyto) and [Connection.copyFrom()](./connection.md#copyfrom). Neither is constructed directly by user code.

## CopyToStream

A `COPY ... TO STDOUT` in progress, as a `Readable` of the raw bytes the server sends — text, CSV or binary, whichever the statement's `FORMAT` asked for. Nothing is decoded; the payload is forwarded exactly as it arrived.

Extends: [`stream.Readable`](https://nodejs.org/api/stream.html#class-streamreadable)

The stream must be consumed or destroyed: until the copy finishes the connection is still mid-statement, and an unread stream pauses the socket rather than buffering the whole export in memory.

### Properties

| Key           | Type           | Readonly | Description                                                                 |
|---------------|-----------------|----------|----------------------------------------------------------------------------------|
| overallFormat | `DataFormat`    | false    | Format of the copy as a whole, from the server's `CopyOutResponse`                |
| columnFormats | `DataFormat[]`  | false    | Per-column formats, from the server's `CopyOutResponse`                           |
| rowCount      | `number`        | false    | Rows the server reported for the copy. Set before `'end'` is emitted               |

### Methods

#### waitStarted()

Resolves once the server has accepted the copy (i.e. sent `CopyOutResponse`); rejects if it never starts one.

`waitStarted(): Promise<void>`

```ts
import { Connection } from 'postgrejs';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const out = await connection.copyTo('COPY users TO STDOUT (FORMAT csv)');
await pipeline(out, fs.createWriteStream('users.csv'));
console.log(out.rowCount);
await connection.close();
```

## CopyFromStream

A `COPY ... FROM STDIN` in progress, as a `Writable`. Whatever is written is forwarded as `CopyData` without being copied or reinterpreted, so the caller's data must already match the statement's `FORMAT`.

Extends: [`stream.Writable`](https://nodejs.org/api/stream.html#class-streamwritable)

`'finish'` means the server accepted the whole copy — the stream waits for `CommandComplete` rather than for the last byte to leave, so `rowCount` is set by the time a `pipeline()` over it resolves. Destroying the stream (which `pipeline()` does when the source fails) sends `CopyFail`, leaving the connection usable rather than stuck waiting for data.

### Properties

| Key      | Type     | Readonly | Description                                              |
|----------|----------|----------|----------------------------------------------------------------|
| rowCount | `number` | false    | Rows the server accepted. Set before `'finish'` is emitted        |

### Methods

#### waitStarted()

Resolves once the server is ready for data (i.e. sent `CopyInResponse`); rejects if it never asks for any.

`waitStarted(): Promise<void>`

```ts
import { Connection } from 'postgrejs';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const inp = await connection.copyFrom('COPY users FROM STDIN (FORMAT csv)');
await pipeline(fs.createReadStream('users.csv'), inp);
console.log(inp.rowCount);
await connection.close();
```
