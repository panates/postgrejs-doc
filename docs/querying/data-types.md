---
sidebar_position: 4
slug: /guides/data-types
---

# Data Types & Type Mapping

**125 PostgreSQL types decode automatically, in both text and binary** — every commonly used
scalar and array type, plus the geometric, network, range, interval, bit-string, full-text-search
and system-column types below. The [scalar table](#built-in-scalar-types) just below covers the
common ones; the rest get their own sections further down.

postgrejs decodes every PostgreSQL wire value into a native JS type through a `DataType` registry keyed by OID (object identifier), and lets you [register your own](#registering-a-custom-type) for anything project-specific — an enum, a composite, an extension type.

## Built-in scalar types

| Postgres type | JS type | Notes |
| :--- | :--- | :--- |
| `bool` | `boolean` | |
| `bytea` | `Buffer` | |
| `char` | `string` | single-byte "char" type |
| `bpchar` | `string` | blank-padded `character(n)` |
| `name` | `string` | |
| `text` | `string` | |
| `xml` | `string` | |
| `varchar` | `string` | |
| `uuid` | `string` | canonical `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` form |
| `date` | `Date` | |
| `time` | `string` | |
| `timetz` | `string` | clock time plus a UTC offset, e.g. `12:34:56.789+03` — a `Date` has no field for the offset, so this stays a string. See [System Columns and Identifiers](#system-columns-and-identifiers) for the neighboring types |
| `timestamp` | `Date` | |
| `timestamptz` | `Date` | |
| `float4` | `number` | decoded as the shortest decimal that reads back as the same value — `1.1` comes back `1.1`, not `1.100000023841858` |
| `float8` | `number` | |
| `int2` | `number` | |
| `int4` | `number` | |
| `numeric` | `number \| Numeric` | a `number` when a double holds it exactly, a [`Numeric`](#numeric-exact-decimals) when it doesn't |
| `oid` | `number` | |
| `int8` | `BigInt` | downgraded to `number` automatically when the value fits in `Number.MAX_SAFE_INTEGER` |
| `json` | `string` \| `object` | parsed with `JSON.parse` unless `fetchAsString` requests the raw text |
| `jsonb` | `string` \| `object` | same as `json` |
| `int2vector` | `number[]` | fixed-size vector type used internally by Postgres catalogs |

The geometric types (`point`, `circle`, `box`, `lseg`, `line`, `path`, `polygon`), `interval`, and
the range family each decode to a class of their own rather than a plain value — see
[Geometric Types](#geometric-types), [Interval](#interval), and
[Range and Multirange Types](#range-and-multirange-types) below. The network types, bit strings,
full-text search types, and system-column types are covered in their own sections further down.

## Array types

Every scalar type above has an array counterpart registered under its own `_`-prefixed OID (e.g. `int4` → `_int4`, `timestamptz` → `_timestamptz`). Arrays are:

- Decoded from the binary wire format (dimension count, bounds, and element OID are read directly from the array header).
- Able to represent PostgreSQL's multidimensional arrays — a `_int4` column holding `{{1,2},{3,4}}` decodes to `[[1, 2], [3, 4]]`.
- Detected automatically for parameters: passing a JS array as a query parameter picks the array OID whose `elementsOID` matches the first element's detected type.

```ts
const qr = await connection.query(
  'select array[1, 2, 3]::int4[] as nums',
);
console.log(qr.rows[0][0]); // [1, 2, 3]
```

An array sent as a binary parameter is written with PostgreSQL's own default lower bound (`1`),
matching a text array literal — `v[1]` is the first element and `array_lower(v, 1)` is `1`, whether
the row was inserted through a parameter or a literal. `int2vector`/`oidvector` (0-based, matching
their own catalog columns) are the only exception.

## Numeric: Exact Decimals

:::danger Breaking change in v3.7.0
`numeric` used to always decode to a `number` via `parseFloat`, silently rounding any value with
more precision than a double can hold. It now decodes to a `Numeric` instance whenever that would
happen — existing code that assumes every `numeric` column is a plain `number` (arithmetic, passing
it to something expecting a `number`) needs to check for this, typically with
`typeof v === 'number' ? v : v.toNumber()` where the same lossy behavior as before is acceptable, or
by working with `v.toString()`/`v.toNumber()` explicitly. A column whose values never exceed
`number`'s precision is unaffected and keeps decoding to a plain `number`.
:::

`numeric` decodes to a plain `number` whenever a double round-trips it faithfully — prints back the
exact same digits — and to a [`Numeric`](../api/classes/numeric.md) instance otherwise, the same
contract `int8` has with `number`/`BigInt`:

```ts
const r = await connection.query('select 19.99::numeric as a, 12345678901234567.89::numeric as b');
r.rows[0][0]; // 19.99 - a plain number, since a double holds it exactly
r.rows[0][1]; // Numeric { value: '12345678901234567.89' }
```

The comparison is the round trip itself, not a rule about magnitude — it catches both ways a
`number` loses a `numeric`: too many significant digits (`12345678901234567.89` would decode as
`...68`), and a magnitude JavaScript prints in exponential notation, which PostgreSQL never writes
(`-0.00000000000000001` as `-1e-17`). A declared scale's trailing zeroes (`numeric(40,6)` holding
`19.99` prints `19.990000`) don't count as a difference.

`Numeric` has no `valueOf()` on purpose — arithmetic on one has to be an explicit choice:

```ts
const n = r.rows[0][1];
String(n);      // '12345678901234567.89' - exact, via Symbol.toPrimitive
n.toNumber();   // 12345678901234568 - lossy, and says so by name
n + 1;          // '12345678901234567.891' - string concatenation, not addition
```

It round-trips as a parameter too, unlike a bare string (which `determine()` would type as
`varchar`, and PostgreSQL refuses to store a `varchar` in a `numeric` column):

```ts
import { Numeric } from 'postgrejs';

await connection.query('insert into prices (amount) values ($1)', {
  params: [new Numeric('12345678901234567.89')],
});
```

`NaN`/`Infinity`/`-Infinity` always decode as the JS values of the same name, never as `Numeric`.

See [API: Numeric](../api/classes/numeric.md) for the full class reference.

## Geometric Types

`point`, `circle`, `box`, `lseg`, `line`, `path` and `polygon` each decode to their own class —
`Point`, `Circle`, `Box`, `LineSegment`, `Line`, `Path`, `Polygon` — rather than a plain object.
Every one has a `toString()` that prints exactly what PostgreSQL prints, so it casts back through
its own type, and a `toJSON()` returning that same string:

```ts
const r = await connection.query('select point(1,2) as p, box(point(0,0),point(1,1)) as b');
r.rows[0][0];               // Point { x: 1, y: 2 }
r.rows[0][1];                // Box { x1: 1, y1: 1, x2: 0, y2: 0 } - PostgreSQL normalizes the corners
JSON.stringify(r.rows[0][0]); // '"(1,2)"' - a string, not '{"x":1,"y":2}'
```

`Box` and `LineSegment` share the same four numbers (`x1,y1,x2,y2`) and exist as separate classes
only because a plain object of them can't say which type is meant — same for `Path`/`Polygon` over
a list of points. A parameter can still be a plain object matching the shape (`{x,y}` for `Point`,
`{x,y,r}` for `Circle`, `{a,b,c}` for `Line`) for code written before these classes existed, but
`Box`/`LineSegment`/`Path`/`Polygon` need the actual class, since their shapes are ambiguous or
collide with an array parameter (`point[]`).

```ts
import { Point, Path } from 'postgrejs';

await connection.query('select $1::point as p', { params: [new Point(5, 6)] });
await connection.query('select $1::path as p', {
  params: [new Path([{ x: 1, y: 1 }, { x: 2, y: 2 }], false)], // open path
});
```

See [API: Geometric Types](../api/classes/geometric-types.md) for every class's full field list.

## Interval

`interval` decodes to an [`Interval`](../api/classes/interval.md) instance — the three quantities
PostgreSQL actually keeps: a month count, a day count, and a time — rather than a total duration,
since a month (28–31 days) and a day (23–25 hours across DST) aren't fixed lengths only the server,
holding a calendar and time zone, can resolve against a timestamp.

```ts
const r = await connection.query("select interval '1 year 2 mons 3 days 04:05:06.789' as i");
const iv = r.rows[0][0];
iv.years;             // 1
iv.minutes;            // 0 - every field is always present, never undefined
String(iv);            // '1 year 2 mons 3 days 04:05:06.789'
iv.toISOString();      // 'P1Y2M3DT4H5M6.789S'
```

```ts
import { Interval } from 'postgrejs';

await connection.query('update events set duration = $1 where id = 1', {
  params: [new Interval({ days: 1, hours: 2 })],
});
```

See [API: Interval](../api/classes/interval.md) for the full field list and methods.

## Range and Multirange Types

`int4range`, `int8range`, `numrange`, `daterange`, `tsrange` and `tstzrange` — and their
multirange counterparts — decode to a [`Range`](../api/classes/range.md) (a multirange to a plain
`Range[]`): a pair of bounds, each possibly absent (unbounded) and each possibly inclusive, holding
the element type's own JS values.

```ts
const r = await connection.query('select int4range(1,10) as r, tstzrange($1,$2) as tr', {
  params: ['2020-01-01', '2020-02-01'],
});
r.rows[0][0];                     // Range { lower: 1, upper: 10, lowerInclusive: true, upperInclusive: false, isEmpty: false }
r.rows[0][0].toString();          // '[1,10)'
r.rows[0][1].lower instanceof Date; // true - a tstzrange holds Dates
```

A `Range` decoded from a query already knows which of the six range types it came from and can be
passed straight back as a parameter without naming it again:

```ts
await connection.query('select $1::int4range', { params: [r.rows[0][0]] }); // just works
```

A `Range` you build yourself has to be told which type it is — nothing about a bare `Range` says
whether its numbers are meant as `int4range` or `numrange` — either through the constructor's
fourth argument or [`BindParam`](../api/classes/bind-param.md), otherwise `determine()` throws
rather than silently sending it as JSON:

```ts
import { Range, DataTypeOIDs, BindParam } from 'postgrejs';

new Range(1, 10, '[)', DataTypeOIDs.int4range);
// or:
await connection.query('select $1', {
  params: [new BindParam(DataTypeOIDs.int4range, new Range(1, 10))],
});
```

PostgreSQL normalizes a discrete range's inclusive upper bound on the way in —
`int4range(1,10,'[]')` is stored and returned as `[1,11)`, since those describe the same integers —
so `upperInclusive` reads `false` for every `int4range`/`int8range`/`daterange`. That's the server
normalizing, not information this class lost.

See [API: Range](../api/classes/range.md) for the full reference.

## Network and Bit-String Types

`inet`, `cidr`, `macaddr` and `macaddr8` decode to plain strings — the same form PostgreSQL prints
(`192.168.1.0/24`, `2001:db8::1`, `08:00:2b:01:02:03`) — since an address isn't a shape JavaScript
has anything better for, and every Node API that takes one (`net`, `dns`, `http`) wants a string
too. `bit`/`varbit` also decode to strings of `0` and `1`, for the same reason: a number loses
leading zeroes and anything past 53 bits, and a `Buffer` loses the exact bit count.

```ts
const r = await connection.query(
  "select '192.168.1.0/24'::cidr as c, B'1011'::bit(4) as b",
);
r.rows[0][0]; // '192.168.1.0/24'
r.rows[0][1]; // '1011'
```

None of these five join parameter-type inference — a bare string is far more often plain `text`
than an address or a bit string — so reach them explicitly with
[`BindParam`](../api/classes/bind-param.md):

```ts
import { BindParam, DataTypeOIDs } from 'postgrejs';

await connection.query('insert into hosts (addr) values ($1)', {
  params: [new BindParam(DataTypeOIDs.inet, '10.0.0.1')],
});
```

## Full-Text Search and jsonpath

`tsvector`, `tsquery` and `jsonpath` decode to the strings PostgreSQL itself prints —
`'cat':1,3 'dog':2`, `'a' & !'b'`, `$."a"[*]."b"` (jsonpath's own normalized spelling, not
necessarily what was written) — since the tree behind each has already been built by the server,
and there is nothing more useful for an application to do with it than read or compare the text.

`tsvector`/`tsquery` are also the two exceptions to "postgrejs can send this back as a binary
parameter": there is no `encodeBinary` for either, because the server's own input parser is what
defines them — a `tsvector` literal is sorted and deduplicated on the way in, and a `tsquery`
literal is a small expression language with operators added across releases. Reimplementing either
here would risk `'a' & 'b'` meaning one thing as a literal and another as a parameter depending on
which format it happened to travel in, so both are always sent as text instead, which is exact:

```ts
const r = await connection.query(
  "select to_tsvector('english', 'a fat cat sat on a mat') as v",
);
r.rows[0][0]; // "'cat':3 'fat':2 'mat':7 'sat':4"

await connection.query("select $1::tsquery as q", { params: ['cat & rat'] }); // sent as text
```

## System Columns and Identifiers

`tid`, `xid`, `xid8`, `cid` and `pg_lsn` back the columns and values applications reach for row
identity and replication position — `ctid`, `xmin`/`xmax`/`cmin`/`cmax`, and
`pg_current_wal_lsn()`. `tid` decodes to the `(block,offset)` string the server prints (a physical
address VACUUM may move, so there's nothing to compute with it), `xid`/`cid` to numbers, `xid8` to
a number-or-BigInt the same way `int8` is, and `pg_lsn` to the unpadded `16/B374D848` hex-pair
string:

```ts
const r = await connection.query('select ctid, xmin, xmax from my_table limit 1');
r.rows[0]; // ['(0,1)', 1054813, 0]

(await connection.query('select pg_current_wal_lsn() as lsn')).rows[0][0]; // '3/6AC93898'
```

`pg_snapshot`/`txid_snapshot` (an older name for the same type) decode to the `xmin:xmax:xip,xip`
string `pg_current_snapshot()` prints, for the same reason: the ids are 64-bit counters only the
server's own operators usefully compare. `refcursor` (what a PL/pgSQL function returning a cursor
hands back — its name, nothing more) and `pg_node_tree` (catalog columns like
`pg_attrdef.adbin`) are plain strings on the wire and decode as such.

None of these seven join parameter-type inference, for the same reason the network types don't —
name them with [`BindParam`](../api/classes/bind-param.md) when sending one as a parameter.

## Enum, Extension, and Other Unregistered Types

A column whose type isn't registered — an enum, a composite, an extension type, or one of a
handful of PostgreSQL's own built-ins like `money` — arrives as a raw `Buffer` by default.
`unknownTypesAsString` asks the server for the column's own text instead, which is what `pg` hands
back for the same column:

```ts
await connection.query('select balance::money as b'); // Buffer, uninterpretable
await connection.query('select balance::money as b', { unknownTypesAsString: true }); // '$12.34'
```

It's off by default, and not free: the column types have to be known before the `Bind` that asks
for them, so a statement that hasn't been prepared yet is prepared on first sight — one extra round
trip for that first call, on that connection, for that SQL text. A registered type is unaffected
either way — nothing that already decodes starts arriving as a string.

## `DataTypeMap` and `GlobalTypeMap`

`DataTypeMap` is the registry class that maps an OID to a `DataType` descriptor. `GlobalTypeMap` is the default, process-wide instance every connection uses unless a call overrides it.

```ts
import { GlobalTypeMap, DataTypeOIDs } from 'postgrejs';

const boolType = GlobalTypeMap.get(DataTypeOIDs.bool);
```

| Method | Description |
| :--- | :--- |
| `get(oid)` | Returns the `DataType` registered for an OID, or `undefined`. |
| `register(dataTypes)` | Registers one or more `DataType` descriptors, keyed by their own `oid`. Registering an OID that already exists replaces it. |
| `determine(value)` | Infers the best-matching OID for a plain JS value (used for parameters that are not wrapped in `BindParam`). Arrays are matched against each type's `elementsOID`. |

See [API: DataTypeMap](../api/classes/data-type-map.md) for the full class reference.

### Registering a custom type

To support a Postgres type postgrejs doesn't ship a mapping for (a custom domain, extension type, or one of the catalog types not registered by default), implement the `DataType` interface and register it — either into `GlobalTypeMap` for every connection, or into a private `DataTypeMap` used only for specific calls:

```ts
import { DataTypeMap, GlobalTypeMap, type DataType } from 'postgrejs';

const MyEnumType: DataType = {
  name: 'my_enum',
  oid: 123456, // the type's OID in your database
  jsType: 'string',
  isType: (v: any): boolean => typeof v === 'string',
  decodeText: (v: string) => v,
  encodeText: (v: any) => String(v),
};

// Global — every connection sees it
GlobalTypeMap.register(MyEnumType);

// Or scoped to just the calls that pass this map
const myTypeMap = new DataTypeMap(GlobalTypeMap);
myTypeMap.register(MyEnumType);
```

A `DataType` descriptor at minimum needs `name`, `oid`, `jsType`, `isType`, and a `decodeText`/`decodeBinary` pair matching the wire format(s) you support; add `encodeText`/`encodeBinary` to also send values of that type as query parameters. Set `elementsOID` to register the type as the array element of another OID.

Set `inferrable: false` when a type's `isType` can genuinely match a plain
JS value but no caller actually means that type when they pass one —
PostgreSQL's own single-byte `"char"` is the built-in example: any
one-character string satisfies its `isType`, but a bare `'A'` parameter is
never meant as `"char"`, so `determine()` passes it over during inference
while `"char"` columns still decode normally. Reach the type explicitly
instead with `new BindParam(oid, value)` when it's genuinely what you want.

## Per-query type mapping

Both `QueryOptions` and `StatementPrepareOptions` accept a `typeMap` field that overrides `GlobalTypeMap` for a single `query()`/`execute()` call or a single prepared statement, without touching the global registry:

```ts
import { DataTypeMap, GlobalTypeMap } from 'postgrejs';

const customMap = new DataTypeMap(GlobalTypeMap);
customMap.register(MyEnumType);

const qr = await connection.query('select * from widgets', {
  typeMap: customMap,
});
```

## Text vs Binary Wire Format

PostgreSQL's wire protocol can transfer column values as `text` or `binary`. postgrejs defaults every column to `binary` (`DataFormat.binary`, per `DEFAULT_COLUMN_FORMAT` in the library's constants) since it avoids the cost of formatting/parsing decimal text for every row.

Override the format with `columnFormat` — a single `DataFormat` for every column, or an array assigning a format per column position:

```ts
import { DataFormat } from 'postgrejs';

// All columns as text
await connection.query('select id, name from customers', {
  columnFormat: DataFormat.text,
});

// Per-column: first column binary, second column text
await connection.query('select id, name from customers', {
  columnFormat: [DataFormat.binary, DataFormat.text],
});
```

## Fetching as String

Some types lose information when decoded to their native JS type even where [`numeric`](#numeric-exact-decimals) doesn't — `date`/`time`/`timestamp`/`timestamptz` collapse Postgres's `infinity`/`-infinity` into JS `Infinity`, for instance. `fetchAsString` (on `DataMappingOptions`, inherited by `QueryOptions`) asks the server for specific columns in its own text format instead of decoding them at all, and hands the bytes back unparsed:

```ts
import { DataTypeOIDs } from 'postgrejs';

const qr = await connection.query(
  'select price from products where id = $1',
  {
    params: [1],
    fetchAsString: [DataTypeOIDs.numeric],
  },
);
console.log(qr.rows[0][0]); // "19.995000" — exact string, not a lossy float
```

This is a wire-level request, not a reformatting of the value postgrejs
would otherwise have decoded — so the string is exactly what PostgreSQL
itself would print, and it takes **any** OID, not just a handful of
numeric/date types:

```ts
const r = await connection.query('select count(*) as n from products', {
  fetchAsString: [DataTypeOIDs.int8],
});
r.rows[0][0]; // '3' — a string, not a decoded int8 (number or BigInt)
```

An array column is selected by its own array OID (`_timestamptz`, not
`timestamptz`), and comes back as the whole array literal rather than one
string per element:

```ts
await connection.query('select tags from products', {
  fetchAsString: [DataTypeOIDs._timestamptz],
});
```

:::note `timestamptz` as a string follows the session's `TimeZone`
Because the string is the server's own rendering, a `fetchAsString`'d
`timestamptz` looks like PostgreSQL's own output (`2020-10-22
23:45:12.123+00`) rather than an ISO 8601 string — it shifts with the
session's `TimeZone` setting, same as `select ... ::text` would in `psql`.
`date`, `time`, `timestamp`, `json`, and `jsonb` render the same either way.
:::

## See also

- [API: DataTypeMap](../api/classes/data-type-map.md)
- [API: Numeric](../api/classes/numeric.md)
- [API: Geometric Types](../api/classes/geometric-types.md)
- [API: Interval](../api/classes/interval.md)
- [API: Range](../api/classes/range.md)
- [Query Parameters](./query-parameters.md)
