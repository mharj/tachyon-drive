# tachyon-drive-redis

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive-redis.svg)](https://badge.fury.io/js/tachyon-drive-redis)
[![Maintainability](https://qlty.sh/gh/mharj/projects/tachyon-drive/maintainability.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
[![Code Coverage](https://qlty.sh/gh/mharj/projects/tachyon-drive/coverage.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/tachyon-drive-redis.yml/badge.svg?branch=main)

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
- serializer: A function that converts data to and from a buffer.
- options: RedisStorageDriver options.
- processor: Optional function that processes data before it is stored and after it is retrieved.
- logger: Optional logger instance.

### Initialize simple JSON Redis storage driver

```typescript
const redis = createClient({ ...options }).withTypeMapping({
  [RESP_TYPES.BLOB_STRING]: Buffer,
});

const driver = new RedisStorageDriver(
  "RedisStorageDriver",
  "store-key",
  bufferSerializer,
  { redis }
);
```

### see more on NPMJS [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)
