import {InMemoryStore, MemcachedServer} from '@luolapeikko/memcached';
import Memcached from 'memcached';
import {type IPersistSerializer, type IStorageDriver, nextSerializer} from 'tachyon-drive';
import {strToBufferSerializer} from 'tachyon-drive-node-fs';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {z} from 'zod';
import {MemcachedStorageDriver} from '../src';

const dataSchema = z.object({test: z.string()});

type Data = z.infer<typeof dataSchema>;

const jsonSerialization: IPersistSerializer<Data, string> = {
	deserialize: (buffer: string) => JSON.parse(buffer.toString()) as Data,
	name: 'jsonSerialization',
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(jsonSerialization, strToBufferSerializer);

const driverSet = new Set<IStorageDriver<Data>>([
	new MemcachedStorageDriver('MemcachedStorageDriver - default URLs', 'test', 0, () => new Memcached('localhost:11211'), bufferSerializer),
	new MemcachedStorageDriver('MemcachedStorageDriver - callback URLs', 'test', 0, new Memcached('localhost:11211'), bufferSerializer),
]);

const data = dataSchema.parse({test: 'demo'});
let memcacheServer: MemcachedServer;

describe('StorageDriver', () => {
	beforeAll(async function () {
		memcacheServer = new MemcachedServer({store: new InMemoryStore()});
		await memcacheServer.start();
	});
	driverSet.forEach((currentDriver) => {
		describe(currentDriver.name, () => {
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
	});
	afterAll(async function () {
		await memcacheServer.stop();
	});
});
