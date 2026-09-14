---
sidebar_position: 11
---

# DataType

The descriptor shape used to register a codec for a PostgreSQL type on a [DataTypeMap](../classes/data-type-map.md) — every built-in type on [GlobalTypeMap](../classes/data-type-map.md#globaltypemap) is one of these, and registering a custom type (or overriding a built-in one) means providing an object matching this interface.

| Key                 | Type                              | Default | Description                                                                                                                                                                                        |
|---------------------|------------------------------------|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| oid                 | `OID`                              |         | PostgreSQL type OID this descriptor decodes/encodes                                                                                                                                              |
| name                | `string`                           |         | Type name (informational, shown in [FieldInfo.dataTypeName](./field-info.md))                                                                                                                     |
| elementsOID         | `OID`                              |         | For an array type, the OID of its element type (e.g. the `_int4` array type points at `int4`)                                                                                                    |
| isArray             | `boolean`                          |         | Whether this descriptor represents an array type                                                                                                                                                  |
| jsType              | `string`                           |         | Name of the JS type values decode to (informational, shown in [FieldInfo.jsType](./field-info.md))                                                                                               |
| arraySeparator      | `string`                           | `,`     | Separator used between elements when encoding this type's text-format array literal                                                                                                              |
| isType              | `(v: any) => boolean`              |         | Predicate used by [`DataTypeMap.determine()`](../classes/data-type-map.md#determine) to guess whether a plain JS value should be sent as this type                                               |
| decodeBinary        | `DecodeBinaryFunction`             |         | Decodes a value from the binary wire format — `(buf: Buffer, offset: number, len: number, options) => any`. Must not read past `len`: `buf` is the whole row's shared buffer, not a value-sized slice, so an unbounded decoder returns bytes belonging to whatever follows in the row instead of failing loudly |
| decodeText          | `DecodeTextFunction`               |         | Decodes a value from the text wire format                                                                                                                                                         |
| decodeTextBuffer    | `DecodeTextBufferFunction`         |         | Optional fast path: decodes directly from the raw wire `Buffer` instead of the pre-converted UTF-8 string `decodeText` receives. Only meaningful for text-format scalar columns                  |
| encodeAsNull        | `EncodeAsNullFunction`             |         | Predicate deciding whether a given value should be encoded as SQL `NULL`                                                                                                                          |
| encodeBinary        | `EncodeBinaryFunction`             |         | Encodes a value into the binary wire format                                                                                                                                                       |
| encodeText          | `EncodeTextFunction`               |         | Encodes a value into the text wire format                                                                                                                                                         |
| encodeCalculateDim  | `EncodeCalculateDimFunction`       |         | For array types, computes the array's dimensions before encoding                                                                                                                                  |

:::note
Breaking change in v3.3.0: `decodeBinary` used to receive a single `Buffer` already sliced to the
value's own bytes, plus a separate `fixedBinarySize` field for constant-width types. Both are gone —
`decodeBinary` now always gets `(buf, offset, len, options)`, the same shape `decodeTextBuffer` has
always used. A decoder that ignores `len` no longer throws on an out-of-bounds read; it silently
returns bytes belonging to whatever value follows it in the row, so update any custom `DataType` to
read only `buf.subarray(offset, offset + len)` (or the equivalent bounded access) before upgrading.
:::

## Registering a custom type

```ts
import { DataTypeMap, GlobalTypeMap, type DataType } from 'postgrejs';

const myType: DataType = {
  oid: 90210,
  name: 'my_type',
  jsType: 'string',
  isType: v => typeof v === 'string' && v.startsWith('my:'),
  decodeText: v => v,
  // buf is the row's own shared buffer, not a value-sized slice - read
  // exactly `len` bytes starting at `offset`, never past it.
  decodeBinary: (buf, offset, len) => buf.toString('utf8', offset, offset + len),
};

const myTypeMap = new DataTypeMap(GlobalTypeMap);
myTypeMap.register(myType);
```

See [DataTypeMap](../classes/data-type-map.md) and the [Data Types & Type Mapping](../../guides/data-types.md) guide.
