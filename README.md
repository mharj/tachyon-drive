# tachyon-drive

[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![npm version](https://badge.fury.io/js/tachyon-drive.svg)](https://badge.fury.io/js/tachyon-drive)
[![Maintainability](https://api.codeclimate.com/v1/badges/03cc4dba13ee3e7eac87/maintainability)](https://codeclimate.com/github/mharj/tachyon-drive/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/03cc4dba13ee3e7eac87/test_coverage)](https://codeclimate.com/github/mharj/tachyon-drive/test_coverage)
![github action](https://github.com/mharj/tachyon-drive/actions/workflows/main.yml/badge.svg?branch=main)

## Extendable typescript (javascript) storage driver implementation

### Usage examples

```typescript
const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

const bufferSerializer: IPersistSerializer<Data, Buffer> = {
	serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
	deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
	validator: (data: Data) => dataSchema.safeParse(data).success, // optional deserialization validation
};
```

### Initialize simple JSON to buffer storage driver

```typescript
const driver = new MemoryStorageDriver('MemoryStorageDriver', bufferSerializer);
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
