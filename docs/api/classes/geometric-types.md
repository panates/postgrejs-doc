---
sidebar_position: 12
---

# Geometric Types

`point`, `circle`, `box`, `lseg`, `line`, `path` and `polygon` each decode to their own class —
`Point`, `Circle`, `Box`, `LineSegment`, `Line`, `Path` and `Polygon` — instead of a plain object.
Every one of them has a `toString()` that prints exactly what PostgreSQL prints, so casting the
value back through its own type (`::point`, `::box`, ...) round-trips, and a `toJSON()` that
returns that same string — `JSON.stringify(point)` gives `"(1,2)"`, not `{"x":1,"y":2}`.

```ts
import { Connection } from 'postgrejs';

const connection = new Connection('postgres://localhost');
await connection.connect();

const r = await connection.query("select point(1,2) as p, box(point(0,0),point(1,1)) as b");
r.rows[0][0]; // Point { x: 1, y: 2 }
r.rows[0][1]; // Box { x1: 1, y1: 1, x2: 0, y2: 0 }
```

`Box` and `LineSegment` exist as separate classes — not one shared `{x1,y1,x2,y2}` shape — because
a plain object of those four numbers is otherwise indistinguishable between the two types; the same
is true of `Path` and `Polygon` over a list of points. A plain object matching a type's own shape
(`{x,y}` for `Point`, `{x,y,r}` for `Circle`, `{x1,y1,x2,y2}` for `Box`/`LineSegment`, `{a,b,c}` for
`Line`) is still accepted as a parameter, for code that built one before these classes existed —
but only for `Point`/`Circle`/`Line`, since `Box` and `LineSegment` share a shape and only the class
says which one is meant.

## Point

| Key | Type | Description |
|:---|:---|:---|
| x | `number` | |
| y | `number` | |

`new Point(x?, y?)`, both defaulting to `0`.

## Circle

| Key | Type | Description |
|:---|:---|:---|
| x | `number` | Center |
| y | `number` | Center |
| r | `number` | Radius |

`new Circle(x?, y?, r?)`, all defaulting to `0`.

## Box

A rectangle given by two opposite corners. PostgreSQL normalizes the corners to upper-right/
lower-left on the way in, so `box(point(0,0), point(1,1))` decodes as `x1: 1, y1: 1, x2: 0, y2: 0`
— that reordering is the server's, not something this class does.

| Key | Type | Description |
|:---|:---|:---|
| x1, y1 | `number` | One corner |
| x2, y2 | `number` | The opposite corner |

`new Box(x1?, y1?, x2?, y2?)`, all defaulting to `0`.

## LineSegment

The straight line between two points — same shape as `Box`, kept separate for the reason above.

| Key | Type | Description |
|:---|:---|:---|
| x1, y1 | `number` | One endpoint |
| x2, y2 | `number` | The other endpoint |

`new LineSegment(x1?, y1?, x2?, y2?)`, all defaulting to `0`.

## Line

The infinite line `Ax + By + C = 0`, carried as its three coefficients — a pair of points would be
a second, lossy spelling of the same line, so PostgreSQL stores and prints the coefficients
directly and this class does too.

| Key | Type | Description |
|:---|:---|:---|
| a, b, c | `number` | Coefficients of `Ax + By + C = 0` |

`new Line(a?, b?, c?)`, all defaulting to `0`.

## Path and Polygon

Both hold a list of `Point`s (plain `{x,y}` objects are accepted in the constructor and kept as
`Point`s). `Path.isClosed` tracks whether the path is open (`[...]`, printed with square brackets)
or closed (`(...)`, the default — a literal with no brackets, `path '1,2,3,4'`, comes back closed).
A `Polygon` is always closed.

| Key | Type | Description |
|:---|:---|:---|
| points | `Point[]` | |
| isClosed | `boolean` | `Path` only |

`new Path(points?, isClosed?)` — `points` defaults to `[]`, `isClosed` to `true`.
`new Polygon(points?)`.

```ts
import { Path } from 'postgrejs';

await connection.query('select $1::path as p', {
  params: [new Path([{ x: 1, y: 1 }, { x: 2, y: 2 }], false)], // open path
});
```

A plain array of points is *not* accepted for `Path`/`Polygon` parameters — `determine()` reads an
array as a `point[]` array parameter, so a `Path`/`Polygon` has to be constructed explicitly to be
told apart from one.

See [Data Types & Type Mapping](../../querying/data-types.md#geometric-types) for the full guide.
