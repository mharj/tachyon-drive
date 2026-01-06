# Tachyon Drive repository

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive.svg)](https://badge.fury.io/js/tachyon-drive)
[![Maintainability](https://qlty.sh/gh/mharj/projects/tachyon-drive/maintainability.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
[![Code Coverage](https://qlty.sh/gh/mharj/projects/tachyon-drive/coverage.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/coverage.yml/badge.svg?branch=main)

## [Tachyon Drive](https://mharj.github.io/tachyon-drive/) is a simple storage driver for storing data to some storage (file, memory, etc.) with serialization and optional data validation support. It is designed to be used as a basic building block for more complex operations that require storing data to some storage.

## Directory structure

- [tachyon-drive](packages/tachyon-drive/README.md): contains the main library code.
- [tachyon-drive-memcached](packages/tachyon-drive-memcached/README.md): contains the Memcached driver implementation.
- [tachyon-drive-node-fs](packages/tachyon-drive-node-fs/README.md): contains the Node.js file system driver implementation.
- [tachyon-drive-blob-storage](packages/tachyon-drive-blob-storage/README.md): contains the Azure Blob Storage driver implementation.
- [tachyon-drive-browser](packages/tachyon-drive-browser/README.md): contains the browser storage driver implementation.
- [tachyon-drive-redis](packages/tachyon-drive-redis/README.md): contains the Redis driver implementation.
- [tachyon-drive-s3](packages/tachyon-drive-s3/README.md): contains the AWS S3 compatible driver implementation.
