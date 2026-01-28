# tachyon-drive-memcached

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive-memcached.svg)](https://badge.fury.io/js/tachyon-drive-memcached)
[![Maintainability](https://qlty.sh/gh/mharj/projects/tachyon-drive/maintainability.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
[![Code Coverage](https://qlty.sh/gh/mharj/projects/tachyon-drive/coverage.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/tachyon-drive-memcached.yml/badge.svg?branch=main)

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
  { name: "MemcachedStorageDriver", key: "store-key", timeout: 0 },
  bufferSerializer,
);
```

### see more on NPMJS [tachyon-drive](https://www.npmjs.com/package/tachyon-drive)
