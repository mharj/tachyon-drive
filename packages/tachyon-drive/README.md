# tachyon-drive

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive.svg)](https://badge.fury.io/js/tachyon-drive)
[![Maintainability](https://qlty.sh/gh/mharj/projects/tachyon-drive/maintainability.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
[![Code Coverage](https://qlty.sh/gh/mharj/projects/tachyon-drive/coverage.svg)](https://qlty.sh/gh/mharj/projects/tachyon-drive)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/tachyon-drive.yml/badge.svg?branch=main)

**_tachyon-drive_** is an extendable TypeScript (JavaScript) storage driver implementation that provides a simple interface for storing and retrieving data using a specified storage mechanism.<br/> It includes a built-in memory storage driver, as well as support for other storage drivers such as file storage and Azure Blob Storage module

## Idea behind the Tachyon-Drive

Tachyon-Drive to be solid basic building block for more complex operations which requires storing data to some storage.<br />
As example, storing Map of verified user JWT token payloads to storage which is shared with multiple backends for cache and validation purposes (and gets store updates via onUpdate callback from driver).

## Detailed [API Documentation](https://mharj.github.io/tachyon-drive/).

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
const driver = new MemoryStorageDriver(
  { name: "MemoryStorageDriver" },
  bufferSerializer /* externalNotify = null, processor */,
);
```

### Driver usage

```typescript
await driver.init(); // initialize driver early

await driver.store({ test: "test" }); // store to the file

const data = await driver.hydrate(); // restore from file

await driver.clear(); // clear storage

driver.onUpdate((data: Data) => {
  // listen for updates (if implemeting driver supports this)
  console.log("data updated", data);
});

// listen driver state changes
driver.onHydrate((state: boolean) => {
  console.log("data hydrate state change", state);
});
driver.onStore((state: boolean) => {
  console.log("data store state change", state);
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
