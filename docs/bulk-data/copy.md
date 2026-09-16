---
sidebar_position: 1
slug: /guides/copy
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

## Loading JS Rows Directly: `copyFromRows()`

`copyFrom()` sends bytes you've already formatted as text, CSV, or binary. `copyFromRows(table, source, options?)`
does the formatting for you: it encodes each row with the destination columns' own binary encoders and drives
`COPY ... FROM STDIN (FORMAT binary)` itself, so you never build a text payload at all:

```ts
const { rowCount } = await connection.copyFromRows('users', [
  [1, 'John', 10.5],
  [2, 'Jane', 20.0],
], { columns: ['id', 'name', 'amount'] });
```

`source` can be an array, a generator, or a `Readable` (already an `AsyncIterable`) — rows are pulled rather than
pushed, so a source far larger than memory streams in with backpressure being the loop pausing rather than a
queue growing. Each row is either a positional array (matching `columns`, or the table's own column order if
`columns` is omitted) or an object keyed by column name:

```ts
await connection.copyFromRows('users', [
  { id: 1, name: 'John', amount: 10.5 },
]);
```

Measured on 200,000 rows of mixed types, `copyFromRows()` took 113ms against 460ms for the equivalent CSV
`copyFrom()` — about 4x, with client-side encoding counted on both sides. Binary wins twice over: the server
skips parsing the payload, and writing a 4-byte integer costs less than formatting its decimal text.

### Column types

Binary `COPY` does no conversion server-side, so the column types have to be exactly right. By default,
`copyFromRows()` finds them itself with one extra round trip (a `Describe` of `select <columns> from <table>
where false` against the destination), so schemas, quoting, `search_path`, and views all resolve exactly as
they will for the real `COPY`. Pass `columnTypes` to skip that probe when the OIDs are already known — worth it
only on a hot path, and only when they're guaranteed to match the table, since a wrong OID here isn't something
the server can reconcile: it either rejects the stream outright or, for two types that happen to share a byte
width, silently stores the bytes as the wrong value.

### Handling bad values

A value the destination column can't encode — `'abc'` into an integer column, `{}` into a numeric one — aborts
the copy by default, naming the offending row and column rather than surfacing PostgreSQL's opaque "incorrect
binary data format":

```ts
try {
  await connection.copyFromRows('users', [['abc', 'x']], { columns: ['id', 'name'] });
} catch (e) {
  e.message; // mentions row 0 and column "id"
}
```

For a load large enough that abandoning it over one bad record costs more than the record is worth,
`onInvalidValue: 'null'` writes `NULL` in just that column and keeps the row, and `onInvalidValue: 'skip'` drops
the row entirely — both report how many they touched (`nulledValues`/`skippedRows` on the result), so a
tolerant load still says what it swallowed rather than looking clean:

```ts
const r = await connection.copyFromRows('users', rows, {
  columns: ['id', 'name'],
  onInvalidValue: 'skip',
});
r.rowCount;     // rows actually sent
r.skippedRows;  // rows dropped for an unencodable value
```

Neither option touches `NaN`/`Infinity` in a `float`/`numeric` column — PostgreSQL stores those as values
distinct from `NULL`, so they encode normally and are never treated as "invalid".

See [API: Connection.copyFromRows()](../api/classes/connection.md#copyfromrows) and
[CopyFromRowsOptions](../api/interfaces/copy-from-rows-options.md) for the full reference.

See [API: CopyToStream/CopyFromStream](../api/classes/copy-stream.md) for the
full class reference.
