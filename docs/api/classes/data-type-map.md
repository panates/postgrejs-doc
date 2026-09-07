---
sidebar_position: 10
---

# DataTypeMap

Maps PostgreSQL type OIDs to the [DataType](../interfaces/data-type.md) descriptor (encoder/decoder pair) used to convert values between JS and the wire format, and is also used in the other direction — to guess which OID a plain JS value (not wrapped in a [BindParam](./bind-param.md)) should be sent as.

Most code never needs to touch this directly: every query is encoded/decoded using [GlobalTypeMap](#globaltypemap) unless a per-call `typeMap` option overrides it. Create your own instance (optionally seeded from an existing one) to register additional or custom data types without affecting the rest of the application.

## Constructor

`new DataTypeMap(other?: DataTypeMap)`

| Argument | Type          | Default | Description                                          |
|----------|----------------|---------|-------------------------------------------------------|
| other    | `DataTypeMap` |         | An existing map to copy registered types from           |

```ts
import { DataTypeMap, GlobalTypeMap } from 'postgrejs';

const myTypeMap = new DataTypeMap(GlobalTypeMap);
myTypeMap.register(myCustomType);

const result = await connection.query('select * from my_table', {
  typeMap: myTypeMap,
});
```

## Methods

### get()

Returns the registered [DataType](../interfaces/data-type.md) for the given OID.

`get(oid: OID): DataType`

| Argument | Type  | Default | Description       |
|----------|-------|---------|------------------------|
| oid      | `OID` |         | PostgreSQL type OID      |

- Returns [DataType](../interfaces/data-type.md)

### register()

Registers one or more data types, keyed by their `oid`. Registering with an OID that is already registered replaces the existing entry.

`register(dataTypes: DataType | DataType[]): void`

| Argument  | Type                                                   | Default | Description                 |
|-----------|---------------------------------------------------------|---------|----------------------------------|
| dataTypes | [DataType](../interfaces/data-type.md) \| `DataType[]`   |         | One or more data type descriptors |

### determine()

Guesses the PostgreSQL type OID for a plain JS value, by checking registered types (most-recently-registered first) until one claims the value via its `isType()` predicate. Used for query parameters that are not wrapped in a [BindParam](./bind-param.md).

`determine(value: any): OID`

| Argument | Type  | Default | Description        |
|----------|-------|---------|-------------------------|
| value    | `any` |         | Value to determine a type for |

- Returns an `OID`, or `DataTypeOIDs.unknown` if `value` is `null`/`undefined` or no registered type matches

## GlobalTypeMap

```ts
export const GlobalTypeMap: DataTypeMap;
```

A pre-populated singleton `DataTypeMap` instance, registered with every built-in data type (`bool`, `int2`/`int4`/`int8`, `float4`/`float8`, `numeric`, `text`/`varchar`/`bpchar`/`name`, `uuid`, `json`/`jsonb`, `bytea`, `date`/`time`/`timestamp`/`timestamptz`, geometric types, and their array counterparts). This is the type map used by [Connection](./connection.md), [Pool](./pool.md) and [PreparedStatement](./prepared-statement.md) whenever a query does not supply its own `typeMap` option.
