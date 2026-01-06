# tachyon-drive-memcached

## Overview

This package provides an implementation of the Tachyon Drive `StorageDriver` interface from the `tachyon-drive` package that uses Memcached as the underlying storage provider.

## Installation

To install this package, run the following command:

```bash
npm install tachyon-drive-memcached tachyon-drive
```

## Usage

Usage
To use this package, you first need to create an instance of the MemcachedStorageDriver class, passing in the following parameters:

- name: A string that identifies the driver instance.
- key: A string that identifies the Memcached key to use.
- timeout: An number that specifies the data timeout in seconds (use large values to keed data in memcache).
- serializer: A function that converts data to and from a buffer.
- urls: Optional array or callback of array of Memcached server URLs (default: `[new URL('memcached://localhost:11211')]`).
- options: Memcached options (default: `{}`).
- processor: Optional function that processes data before it is stored and after it is retrieved.
- options: Optional logger instance and bandwidth hint.

### Initialize simple JSON Memcached storage driver

```typescript
const driver = new MemcachedStorageDriver(
  "MemcachedStorageDriver",
  "store-key",
  0, // never expire
  bufferSerializer
);
```

### see more on NPMJS [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)
