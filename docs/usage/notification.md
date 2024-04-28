---
sidebar_position: 5
---
# Notification Listeners

## 1.5. Notification Listeners

postgresql-client library has a high level implementation for PostgreSql's LISTEN/NOTIFY feature.
You can listen for channels using both single Connection instance or a Pool instance.

### 1.5.1 Listening notifications with Connection instance

To listen PostgreSql's channels, you can use high level listener implementation
(recommended) or can use low level event emitter style.

Using high level listener implementation is very easy. When you call "listen" method, 
the library registers for the channel and emits the callback function when a notification received.

```ts
await connection.listen('my_channel', (msg) => {
    console.log(msg.payload);
});
```

To unregister from a channel just call "unListen" or call "unListenAll" method to unregister all channels.

```ts
await connection.unListen('my_channel');
```

```ts
await connection.unListenAll();
```


### 1.5.2 Listening notifications with Pool

You can also listen for notifications using connection Pool. When you call "listen" method,
the Pool creates a separate connection to listen for channels and emits the callback function when a notification received.

```ts
await pool.listen('my_channel', (msg) => {
    console.log(msg.payload);
});
```

To unregister from a channel just call "unListen" or call "unListenAll" method to unregister all channels.

```ts
await pool.unListen('my_channel');
```

```ts
await pool.unListenAll();
```