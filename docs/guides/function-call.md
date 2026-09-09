---
sidebar_position: 23
---

# Function Call Protocol

PostgreSQL's wire protocol has always had a second, older way to invoke a function: the Function
Call sub-protocol (message codes `'F'`/`'V'`), which calls a function by OID directly instead of
going through SQL at all. It predates `SELECT func(...)` over the Simple/Extended Query protocols
— which is what every current client, including postgrejs's own `query()`/`execute()`, uses
exclusively — and is kept here only for wire-protocol completeness, not because it's a better way
to call a function today.

:::note
If you're not sure whether you need this: you don't. Use `connection.query('select func($1)', { params: [...] })`
instead — see [Extended Query](./extended-query.md). `callFunction()` exists for the rare case
where you're working at the wire-protocol level directly and specifically need to bypass SQL
parsing (and, with it, anything SQL resolves for you — collation-dependent functions like `upper()`
don't work through this protocol, since a raw argument has no expression context to resolve a
collation from).
:::

## Why it's different from a normal query

Unlike `query()`/`execute()`, which encode/decode values through postgrejs's own `DataType`
system automatically, `callFunction()` is a low-level, bytes-in-bytes-out API: both the arguments
and the result are plain `Buffer`s (or `null` for SQL `NULL`) in whatever wire format you asked
for — there is no automatic conversion to/from JS values. You build and read those bytes yourself.

## Text-format example

Text format is the default, and for a text argument that's just the UTF-8 bytes of the string:

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost/mydb');
await connection.connect();

const oid = await findOid('md5', 1); // see helper below
const result = await connection.callFunction(oid, [Buffer.from('hello', 'utf8')]);
console.log(result.result?.toString('utf8')); // '5d41402abc4b2a76b9719d911017c592'

await connection.close();
```

## Binary-format example

Request binary for both the arguments and the result with `argFormats`/`resultFormat`, and encode/decode
the bytes yourself — here, two `int4` values added together:

```ts
import { Connection, DataFormat } from 'postgrejs';

const oid = await findOid('int4pl', 2);

const a = Buffer.alloc(4);
a.writeInt32BE(2);
const b = Buffer.alloc(4);
b.writeInt32BE(3);

const result = await connection.callFunction(oid, [a, b], {
  argFormats: [DataFormat.binary],
  resultFormat: DataFormat.binary,
});
console.log(result.result?.readInt32BE()); // 5
```

## NULL arguments and results

Pass `null` in the arguments array for SQL `NULL`; a strict function called with a `null` argument
returns a `null` result rather than throwing:

```ts
const oid = await findOid('md5', 1);
const result = await connection.callFunction(oid, [null]);
result.result; // null
```

## Options

| Option         | Type            | Default            | Description                                                                                      |
| :------------- | :-------------- | :------------------ | :------------------------------------------------------------------------------------------------- |
| `argFormats`   | `DataFormat[]`  | text for every arg   | Format of each argument, applied positionally — a single entry applies to all arguments, omit for text applied to every one. |
| `resultFormat` | `DataFormat`    | `DataFormat.text`    | Format the function's return value comes back in.                                                  |
| `signal`       | `AbortSignal`   |                      | Cancels the call — see [Cancellation & Timeouts](./cancellation.md).                                |

## Finding a function's OID

`callFunction()` takes an OID, not a name — look it up with a normal query first if you don't
already have it (this is the `findOid` helper used above):

```ts
async function findOid(proname: string, pronargs: number): Promise<number> {
  const result = await connection.query(
    'select oid from pg_proc where proname = $1 and pronargs = $2',
    { params: [proname, pronargs] },
  );
  return Number(result.rows[0][0]);
}
```

See [API: Connection.callFunction()](../api/classes/connection.md#callfunction) for the full
signature, and [FunctionCallOptions](../api/interfaces/function-call-options.md) /
[FunctionCallResult](../api/interfaces/function-call-result.md) for the option and result shapes.
