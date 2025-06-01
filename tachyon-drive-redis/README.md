# tachyon-drive-redis

## Overview

This package provides an implementation of the Tachyon Drive `StorageDriver` interface from the `tachyon-drive` package that uses Redis as the underlying storage provider.

## Installation

To install this package, run the following command:

```bash
npm install tachyon-drive-redis tachyon-drive
```

## Usage

Usage
To use this package, you first need to create an instance of the RedisStorageDriver class, passing in the following parameters:

- name: A string that identifies the driver instance.
- key: A string that identifies the Redis key to use.
- options: Redis client options.
- serializer: A function that converts data to and from a buffer.
- processor: Optional function that processes data before it is stored and after it is retrieved.
- logger: Optional logger instance.

### Initialize simple JSON Redis storage driver

```typescript
const driver = new RedisStorageDriver('RedisStorageDriver', 'store-key', {url: 'redis://localhost:6379'}, bufferSerializer);
```

### see more on NPMJS [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)
