---
sidebar_position: 7
---

# LargeObject

A PostgreSQL large object: binary data stored outside the row it belongs to, reached through a file-like interface so it can be seeked into and read a piece at a time, rather than loaded whole the way a `bytea` column must be — up to 4TB, against roughly 1GB for `bytea`.

Instances are obtained from [Connection.createLargeObject()](./connection.md#createlargeobject) or [Connection.openLargeObject()](./connection.md#openlargeobject); it is never constructed directly.

The descriptor a large object is opened with only lives as long as the transaction that opened it: `createLargeObject()`/`openLargeObject()` start one if the connection is not already in one, and `close()` commits that one — but never a transaction the caller started, which stays theirs to finish.

```ts
import { Connection } from 'postgrejs';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';

const connection = new Connection('postgres://localhost');
await connection.connect();
const lo = await connection.createLargeObject();
await pipeline(fs.createReadStream('video.mp4'), lo.writable());
await lo.close();
// keep lo.oid somewhere - a large object belongs to no row
await connection.close();
```

Nothing links the object to any row that names it: dropping the row leaves the data behind, so [Connection.unlinkLargeObject()](./connection.md#unlinklargeobject) has to be called when it is no longer wanted. PostgreSQL ships `vacuumlo` for finding the ones that were not.

## Properties

| Key | Type     | Readonly | Description                        |
|-----|----------|----------|-----------------------------------------|
| oid | `number` | true     | OID of the large object                  |

## Methods

### read()

Reads at most `length` bytes from the current position.

`read(length: number): Promise<Buffer>`

| Argument | Type     | Default | Description                    |
|----------|----------|---------|-------------------------------------|
| length   | `number` |         | Maximum number of bytes to read      |

- Returns a `Buffer` (possibly zero-length)

### write()

Writes at the current position.

`write(data: Buffer): Promise<number>`

| Argument | Type     | Default | Description             |
|----------|----------|---------|------------------------------|
| data     | `Buffer` |         | Bytes to write                |

- Returns the number of bytes written

### seek()

Moves the read/write position.

`seek(offset: number | bigint, whence?: number): Promise<bigint>`

| Argument | Type                | Default | Description                                       |
|----------|----------------------|---------|--------------------------------------------------------|
| offset   | `number \| bigint`   |         | Offset to seek by/to                                    |
| whence   | `number`             | `0`     | `0` = from start, `1` = from current position, `2` = from end |

- Returns the new position

### tell()

Returns the current read/write position.

`tell(): Promise<bigint>`

### size()

Returns the total size in bytes. Leaves the position where it found it.

`size(): Promise<bigint>`

### truncate()

Cuts the object down to `length` bytes.

`truncate(length: number | bigint): Promise<void>`

| Argument | Type                | Default | Description       |
|----------|----------------------|---------|------------------------|
| length   | `number \| bigint`   |         | New size in bytes        |

### readable()

Returns a Node.js `Readable` that reads from the current position to the end.

`readable(options?: LargeObjectStreamOptions): Readable`

| Argument | Type                                                     | Default | Description        |
|----------|-------------------------------------------------------------|---------|--------------------------|
| options  | [LargeObjectStreamOptions](#largeobjectstreamoptions)       |         | Stream options            |

- Returns [`stream.Readable`](https://nodejs.org/api/stream.html#class-streamreadable)

### writable()

Returns a Node.js `Writable` that writes from the current position onwards.

`writable(options?: LargeObjectStreamOptions): Writable`

| Argument | Type                                                     | Default | Description        |
|----------|-------------------------------------------------------------|---------|--------------------------|
| options  | [LargeObjectStreamOptions](#largeobjectstreamoptions)       |         | Stream options            |

- Returns [`stream.Writable`](https://nodejs.org/api/stream.html#class-streamwritable)

### close()

Closes the descriptor, and commits the transaction if this object started it (see the note above). Safe to call more than once.

`close(): Promise<void>`

## LargeObjectMode

Open modes, mirroring PostgreSQL's own `INV_READ` / `INV_WRITE` constants. Passed to `Connection.createLargeObject()`/`openLargeObject()`.

| Member    | Value        | Description        |
|-----------|--------------|---------------------|
| read      | `0x00040000` | Open for reading     |
| write     | `0x00020000` | Open for writing      |
| readWrite | `0x00060000` | Open for both         |

## LargeObjectStreamOptions

Options for `readable()`/`writable()`.

| Property  | Type     | Default | Description                                                                                    |
|-----------|----------|---------|--------------------------------------------------------------------------------------------------|
| chunkSize | `number` | `65536` | Bytes per round trip. Each chunk is its own `loread`/`lowrite` call, trading memory for query count |
