---
sidebar_position: 1
---

# Introduction

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![CircleCI][circleci-image]][circleci-url]
[![Test Coverage][coveralls-image]][coveralls-url]

PostgreJS is a enterprise-level PostgreSQL client for Node.js. 
It is designed to provide a robust and efficient interface to PostgreSQL databases, 
ensuring high performance and reliability for enterprise applications. 
Written entirely in TypeScript, it leverages modern JavaScript features to deliver a seamless development experience.


## Library Overview

PostgreJS is a pure JavaScript library, meticulously crafted with TypeScript to offer a strictly typed, well-structured, 
and highly maintainable codebase. 
Key highlights include:

- **Language:** Pure modern JavaScript library.
- **Strictly Typed:** Completely written in TypeScript, offering strong typing and enhanced development experience.
- **Compatibility:** Works seamlessly with both CommonJS and ESM module systems, ensuring flexibility in various project setups.
- **Comprehensive Testing:** Rigorously tested to ensure stability and reliability in production environments.
- **Promise-Based API:** Asynchronous operations are handled with a Promise-based API, promoting clean and efficient asynchronous code.

## Features

- **Connection Management:** Supports both single connection and advanced pooling, providing scalability and efficient resource management.
- **Binary Wire Protocol:** Implements the full binary wire protocol for all PostgreSQL data types, ensuring robust and efficient data handling.
- **Prepared Statements:** Named prepared statements for optimized query execution.
- **Cursors:** Features fast double-link cache cursors for efficient data retrieval.
- **Notifications:**  High-level implementation for PostgreSQL notifications (LISTEN/NOTIFY), enabling real-time data updates.
- **Extensibility:** Extensible data-types and type mapping to accommodate custom requirements.
- **Parameter Binding:**  Bind parameters with OID mappings for precise and efficient query execution.
- **Array Handling:** Supports multidimensional arrays with fast binary encoding/decoding.
- **Performance Optimization:**  Low memory utilization and boosted performance through the use of shared buffers.
- **Authorization:** SSupports various password algorithms including Clear text, MD5, and SASL, ensuring secure authentication.
- **Flexible Data Retrieval:**  Can return both array and object rows to suit different data processing needs.
- **Resource Management:** Auto disposal of resources with the "using" syntax ([TC30 Explicit Resource Management](https://github.com/tc39/proposal-explicit-resource-management)), ensuring efficient resource cleanup.

Whether you're building a simple application or a complex enterprise system, 
PostgreJS provides the features and performance you need to succeed. 
Explore the capabilities of the library and elevate your PostgreSQL integration to the next level.

## Installation

```bash
$ npm install postgrejs --save
```

## Example usage

### Establish a single connection, execute a simple query

```ts
import {Connection} from 'postgrejs';
// Create connection
const connection = new Connection('postgres://localhost');
// Connect to database server
await connection.connect();

// Execute query and fetch rows
const result = await connection.query(
    'select * from cities where name like $1',
    {params: ['%york%']});
const rows: any[] = result.rows;
// Do what ever you want with rows

// Disconnect from server
await connection.close(); 
```

### Establish a pooled connection, create a cursor
```ts
import {Pool} from 'postgrejs';

// Create connection pool
const db = new Pool({
    host: 'postgres://localhost',
    pool: {
       min: 1,
       max: 10,
       idleTimeoutMillis: 5000
    }
});

// Execute query and fetch cursor
const result = await db.query(
    'select * from cities where name like $1',
    {params: ['%york%'], cursor: true});

// Walk through the cursor, and do whatever you want with fetched rows
const cursor = result.cursor;
let row;
while ((row = await cursor.next())) {
  console.log(row);
}
// Close cursor, (Send connection back to the pool)
await cursor.close();

// Disconnect all connections and shutdown pool
await db.close(); 
```

### Using prepared statements
```ts
import {DataTypeOIDs} from 'postgrejs'; 

// .....
const statement = await connection.prepare( 
    'insert into my_table(id, name) values ($1, $2)', {
        paramTypes: [DataTypeOIDs.Int4, DataTypeOIDs.Varchar]
    });

for (let i = 0; i < 100; i++) {
    await statement.execute({params: [i, ('name' + i)]});
}
await statement.close(); // When you done, close the statement to relase resources
```

## Support
You can report bugs and discuss features on the [GitHub issues](https://github.com/panates/postgrejs/issues) page
When you open an issue please provide version of NodeJS and PostgreSQL server.

## Node Compatibility
- node >= 16.x

## License
postgrejs is available under [MIT](license.md) license.

[npm-image]: https://img.shields.io/npm/v/postgrejs
[npm-url]: https://npmjs.org/package/postgrejs
[circleci-image]: https://circleci.com/gh/panates/postgrejs/tree/master.svg?style=shield
[circleci-url]: https://circleci.com/gh/panates/postgrejs/tree/master
[coveralls-image]: https://img.shields.io/coveralls/panates/postgrejs/master.svg
[coveralls-url]: https://coveralls.io/r/panates/postgrejs
[downloads-image]: https://img.shields.io/npm/dm/postgrejs.svg
[downloads-url]: https://npmjs.org/package/postgrejs
[dependencies-image]: https://david-dm.org/panates/postgrejs/status.svg
[dependencies-url]:https://david-dm.org/panates/postgrejs
[quality-image]: http://npm.packagequality.com/shield/postgrejs.png
[quality-url]: http://packagequality.com/#?package=postgrejs
