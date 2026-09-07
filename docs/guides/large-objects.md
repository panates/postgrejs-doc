---
sidebar_position: 19
---

# Large Objects

PostgreSQL's large object (`lo_*`) facility stores binary data outside any
table row, reachable a piece at a time through a file-like descriptor rather
than loaded whole the way a `bytea` column must be. It scales to about 4TB
per object, against roughly 1GB for `bytea`. `postgrejs` wraps it as the
`LargeObject` class, with `read`/`write`/`seek`/`tell` methods and Node
`Readable`/`Writable` adapters.

A large object belongs to no row: nothing deletes it when the row that
references its OID is deleted. Call `unlinkLargeObject(oid)` when the data
is no longer needed, or run PostgreSQL's `vacuumlo` utility to find orphaned
objects.

## Opening a large object

| Method | Description |
| :--- | :--- |
| `connection.createLargeObject(mode?)` | Creates a new, empty large object and opens it. Returns `Promise<LargeObject>`. |
| `connection.openLargeObject(oid, mode?)` | Opens an existing large object by OID. Returns `Promise<LargeObject>`. |
| `connection.unlinkLargeObject(oid)` | Deletes a large object and its data. |

Both open methods take a `mode`, from the `LargeObjectMode` enum:

```ts
export const LargeObjectMode = {
  read: 0x00040000,
  write: 0x00020000,
  readWrite: 0x00060000,
} as const;
```

`createLargeObject()` defaults to `LargeObjectMode.readWrite`;
`openLargeObject()` defaults to `LargeObjectMode.read`.

A large object's descriptor is only valid inside a transaction. If the
connection is not already in one, opening it starts one automatically, and
`LargeObject.close()` commits that transaction - but only the one it started
itself; a transaction the caller already had open is left for the caller to
commit or roll back.

## Writing and reading

```ts
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import { Connection } from 'postgrejs';

const connection = new Connection();
await connection.connect();

// Write a blob
const lo = await connection.createLargeObject();
await pipeline(fs.createReadStream('video.mp4'), lo.writable());
await lo.close();
const oid = lo.oid; // keep this - a large object belongs to no row

await connection.query('update media set video_oid = $1 where id = $2', {
  params: [oid, 1],
});

// Read it back later
const reader = await connection.openLargeObject(oid);
await pipeline(reader.readable(), fs.createWriteStream('video-copy.mp4'));
await reader.close();
```

### LargeObject methods

| Method | Description |
| :--- | :--- |
| `read(length: number): Promise<Buffer>` | Reads at most `length` bytes from the current position. |
| `write(data: Buffer): Promise<number>` | Writes at the current position; returns bytes written. |
| `seek(offset: number \| bigint, whence?: number): Promise<bigint>` | Moves the read/write position. `whence`: `0` from start (default), `1` from current position, `2` from end. |
| `tell(): Promise<bigint>` | The current read/write position. |
| `size(): Promise<bigint>` | Total size in bytes. Leaves the position unchanged. |
| `truncate(length: number \| bigint): Promise<void>` | Cuts the object down to `length` bytes. |
| `readable(options?: LargeObjectStreamOptions): Readable` | Streams from the current position to the end. |
| `writable(options?: LargeObjectStreamOptions): Writable` | Streams writes from the current position onward. |
| `close(): Promise<void>` | Closes the descriptor; commits the transaction if this call started it. Safe to call twice. |

`LargeObjectStreamOptions.chunkSize` (default `65536`) controls how many
bytes each internal `loread`/`lowrite` round trip transfers - the readable
and writable streams each issue one query per chunk:

```ts
await pipeline(
  fs.createReadStream('big.bin'),
  lo.writable({ chunkSize: 256 * 1024 }),
);
```

## Random access

Because a large object is addressed by position, you can read a slice
without transferring the rest:

```ts
const lo = await connection.createLargeObject();
await lo.write(Buffer.from('...large content...'));

await lo.seek(1000);
const slice = await lo.read(16); // 16 bytes starting at offset 1000
console.log(await lo.tell()); // 1016n

await lo.truncate(2048);
console.log(await lo.size()); // 2048n

await lo.close();
```

`unlinkLargeObject()` deletes the object entirely:

```ts
await connection.unlinkLargeObject(oid);
```

See [API: LargeObject](../api/classes/large-object.md) for the full class
reference.
