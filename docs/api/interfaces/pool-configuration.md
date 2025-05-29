---
sidebar_position: 2
---

# PoolConfiguration

Extends [ConnectionConfiguration](connection-configuration.md)

| Key                  | Type      | Default | Description                                                                         |
|----------------------|-----------|---------|-------------------------------------------------------------------------------------|
| acquireMaxRetries    | `number`  | 0       | Maximum number that Pool will try to create a connection before returning the error |
| acquireRetryWait     | `number`  | 2000    | Time in millis that Pool will wait after each tries                                 | 
| acquireTimeoutMillis | `number`  | 0       | Time in millis an acquire call will wait for a connection before timing out         |
| fifo                 | `boolean` | true    | Specifies if resources will be allocated first-in-first-out order                   |
| idleTimeoutMillis    | `number`  | 30000   | The minimum amount of time in millis that a connection may sit idle in the Pool     |
| houseKeepInterval    | `number`  | 1000    | Time period in millis that Pool will make a cleanup                                 |
| min                  | `number`  | 0       | Minimum number of connections that Pool will keep                                   |
| minIdle              | `number`  | 0       | Minimum number of connections that Pool will keep in idle state                     |
| max                  | `number`  | 10      | Maximum number of connections that Pool will create                                 |
| maxQueue             | `number`  | 1000    | Maximum number of request that Pool will accept                                     |
| validation           | `boolean` | false   | If true Pool test connection on acquire                                             |
