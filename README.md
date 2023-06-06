# tachyon-drive

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive.svg)](https://badge.fury.io/js/tachyon-drive)
[![Maintainability](https://api.codeclimate.com/v1/badges/03cc4dba13ee3e7eac87/maintainability)](https://codeclimate.com/github/mharj/tachyon-drive/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/03cc4dba13ee3e7eac87/test_coverage)](https://codeclimate.com/github/mharj/tachyon-drive/test_coverage)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/main.yml/badge.svg?branch=main)

***tachyon-drive*** is an extendable TypeScript (JavaScript) storage driver implementation that provides a simple interface for storing and retrieving data using a specified storage mechanism.<br/> It includes a built-in memory storage driver, as well as support for other storage drivers such as file storage and Azure Blob Storage module

## Idea behind the Tachyon-Drive
Tachyon-Drive to be solid basic building block for more complex operations which requires storing data to some storage.<br />
As example, storing Map of verified user JWT token payloads to storage which is shared with multiple backends for cache and validation purposes (and gets store updates via onUpdate callback from driver).

## Core Parts of the Tachyon-Drive
The tachyon-drive includes:

- Class [StorageDriver](./src/drivers/StorageDriver.ts): An abstract class that provides a simplified abstraction for storing and retrieving data using a specified storage mechanism.(implements IStorageDriver)
- Class [MemoryStorageDriver](./src/drivers/MemoryStorageDriver.ts): A built-in storage driver that stores data in memory.
- Interface [IStorageDriver](./src/interfaces/IStorageDriver.ts): An interface that defines the methods that a storage driver must implement.
- Interface [IPersistSerializer](./src/interfaces/IPersistSerializer.ts): An interface that defines the methods that a serializer must implement.
- Interface [IStoreProcessor](./src/interfaces/IStoreProcessor.ts): An interface that defines the methods that a store processor must implement.
- Interface [IExternalUpdateNotify](./src/interfaces/IExternalUpdateNotify.ts): An interface that defines the methods that a external update notifier must implement.
- Function [nextSerializer](./src/serializer.ts): A function that chains two serializers together. (example: Data <=> JSON string <=> Buffer>)

## [Serializer](./src/interfaces/IPersistSerializer.ts)
Core part of the driver is serializer. Serializer is used to serialize and deserialize data to and from storage. Serializer can be optionally used to validate data after deserialization.

## [Store Processor](./src/interfaces/IStoreProcessor.ts) (optional)
Store processor is used to process data before storing and after hydrating. Store processor can be used as example to encrypt and decrypt data.

## [IExternalUpdateNotify](./src/interfaces/IExternalUpdateNotify.ts) (optional)
If storage driver itself does not support update events, external update notifier can be utilized to notify driver about store updates.
As example implementation, FileUpdateNotify in [tachyon-drive-node-fs](https://www.npmjs.com/package/tachyon-drive-node-fs) it's based on file change events and can be used to notify driver about store updates when multiple NodeJS process on same host.

### Usage examples

```typescript
const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

// example serializer for Data to Buffer with optional validation
const bufferSerializer: IPersistSerializer<Data, Buffer> = {
	serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
	deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	validator: (data: Data) => dataSchema.safeParse(data).success, // optional deserialization validation
};
```

### Initialize simple JSON to buffer storage driver

```typescript
const driver = new MemoryStorageDriver('MemoryStorageDriver', bufferSerializer, /* externalNotify = null, processor */);
```

### Driver usage

```typescript
await driver.init(); // initialize driver early

await driver.store({test: 'test'}); // store to the file

const data = await driver.hydrate(); // restore from file

await driver.clear(); // clear storage

driver.onUpdate((data: Data) => {
	// listen for updates (if implemeting driver supports this)
	console.log('data updated', data);
});

// listen driver state changes
driver.onHydrate((state: boolean) => {
	console.log('data hydrate state change', state);
});
driver.onStore((state: boolean) => {
	console.log('data store state change', state);
});
```

### how to use generic driver type on function calls

```typescript
async function doSomethingWithDriver(driver: IStorageDriver<Data>) {
	// await driver.store({test: 'test'});
	// await driver.hydrate();
	// await driver.clear();
}
```

### Other implementing drivers

- [FileStorageDriver](https://www.npmjs.com/package/tachyon-drive-node-fs) for nodejs + NodeJS AES cryption processor
- [AzureBlobStorageDriver](https://www.npmjs.com/package/tachyon-drive-blob-storage) for Azure Blob Storage
- [MemcachedStorageDriver](https://www.npmjs.com/package/tachyon-drive-memcached) for Memcached
- [AwsS3StorageDriver](https://www.npmjs.com/package/tachyon-drive-s3) for S3 compatible storage
- [RedisStorageDriver](https://www.npmjs.com/package/tachyon-drive-redis) for Redis storage
