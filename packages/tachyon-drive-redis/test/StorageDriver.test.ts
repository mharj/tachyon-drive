import {type IPersistSerializer, type IStorageDriver, nextSerializer} from 'tachyon-drive';
import {strToBufferSerializer} from 'tachyon-drive-node-fs';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {z} from 'zod';
import {RedisStorageDriver} from '../src';
import {createClient} from './lib/RedisMock';

const dataSchema = z.object({
	test: z.string(),
});

type Data = z.infer<typeof dataSchema>;

const jsonSerialization: IPersistSerializer<Data, string> = {
	deserialize: (buffer: string) => JSON.parse(buffer.toString()) as Data,
	name: 'jsonSerialization',
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(jsonSerialization, strToBufferSerializer);

const redis = createClient();

const driverSet = new Set<IStorageDriver<Data>>([
	new RedisStorageDriver({key: 'test', name: 'MemcachedStorageDriver - default options', redis}, bufferSerializer),
	new RedisStorageDriver({key: 'test', name: 'MemcachedStorageDriver - callback options', redis}, bufferSerializer),
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', () => {
	describe.each([...driverSet])('StorageDriver $name', (currentDriver) => {
		beforeAll(async function () {
			await currentDriver.clear();
			expect(currentDriver.isInitialized).to.be.eq(false);
		});
		it('should be empty store', async () => {
			expect(await currentDriver.hydrate()).to.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should store to storage driver', async () => {
			await currentDriver.store(data);
			expect(await currentDriver.hydrate()).to.eql(data);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should restore data from storage driver', async () => {
			expect(await currentDriver.hydrate()).to.eql(data);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should clear to storage driver', async () => {
			await currentDriver.clear();
			expect(currentDriver.isInitialized).to.be.eq(false);
			expect(await currentDriver.hydrate()).to.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should unload to storage driver', async () => {
			expect(currentDriver.isInitialized).to.be.eq(true);
			await currentDriver.unload();
			expect(currentDriver.isInitialized).to.be.eq(false);
		});
	});
	afterAll(() => {
		redis.quit();
	});
});
