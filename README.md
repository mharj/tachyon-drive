# tachyon-drive

## Extendable typescript (javascript) storage driver implementation

### Usage examples

```typescript
interface Data {
	test: string;
}

const bufferSerializer: IPersistSerializer<Data, Buffer> = {
	serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
	deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()),
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
