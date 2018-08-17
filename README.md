# async-rwlock
ES6 Promise-based asynchronous readers-writers lock. Timeout is also supported.

## Install
```
$ npm install --save async-rwlock
```
or
```
$ yarn add async-rwlock
```

## Quick Usage

```js
const RWLock = require('async-rwlock').RWLock;

const lock = new RWLock();

lock.readLock()
.then(() => {
    console.log('read lock acquired');
    lock.unlock();
});

lock.writeLock()
.then(() => {
    console.log('write lock acquired');
    lock.unlock();
});
```

### Async/Await

```ts
import RWLock from 'async-rwlock';

async function testLock() {
    const lock = new RWLock();

    await lock.readLock();
    console.log('read lock acquired');
    lock.unlock();

    await lock.writeLock();
    console.log('write lock acquired');
    lock.unlock();
}

(async () => { await testLock(); })();
```

## Advanced Usage

### Timeout
```js
const RWLock = require('async-rwlock').RWLock;

const lock = new RWLock();

lock.readLock()
.then(() => {
    console.log('read lock acquired');
    // lock.unlock() // oops!
});

lock.writeLock(1000) // 1 second
.then(() => {
    console.log('write lock will never be acquired');
})
.catch((err) => {
    console.error('promise will be rejected if timeout occured');
    console.error(err);
});
```

#### Async/Await

```ts
import RWLock from 'async-rwlock';

async function testLock() {
    const lock = new RWLock();

    await lock.readLock();
    console.log('read lock acquired');
    // lock.unlock() // oops!

    try {
        await lock.writeLock(1000); // 1 second
        console.log('write lock will never be acquired');
    } catch (err) {
        console.error('error will be thrown if timeout occured');
        console.error(err);
    }
}

(async () => { await testLock(); })();
```

## API

### `new RWLock()`
- Returns: instance of `RWLock`.

#### `readLock([timeout])`
- `timeout?: number`. **Default**: `Infinity`.
- Returns: `Promise<void>`.

#### `writeLock([timeout])`
- `timeout?: number`. **Default**: `Infinity`.
- Returns: `Promise<void>`.

Acquire a read/write lock.

`timeout` is how long it will wait to acquire the lock before promise is rejected in milliseconds. If `timeout` is not in range `0 <= timeout < Infinity`, it will wait indefinitely.

#### `unlock()`
- Returns: `void`.

Release current lock. Must be called after operation using read/write lock is finished.

#### `getState()`
- Returns: `State`.

Get current state of lock. The states are either `Idle`, `Reading`, or `Writing`.

## License
[MIT](LICENSE)
