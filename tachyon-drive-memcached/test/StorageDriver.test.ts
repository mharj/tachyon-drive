import {type Nullish} from '@luolapeikko/ts-common';
import dotenv from 'dotenv';
import {type IPersistSerializer, type IStorageDriver, nextSerializer} from 'tachyon-drive';
import {strToBufferSerializer} from 'tachyon-drive-node-fs';
import {beforeAll, describe, expect, it} from 'vitest';
import {z} from 'zod';
import {MemcachedStorageDriver} from '../src';

dotenv.config();

const dataSchema = z.object({test: z.string()});

type Data = z.infer<typeof dataSchema>;

const jsonSerialization: IPersistSerializer<Data, string> = {
	name: 'jsonSerialization',
	deserialize: (buffer: string) => JSON.parse(buffer.toString()) as Data,
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(jsonSerialization, strToBufferSerializer);

function getServers(servers: Nullish<string>): URL[] {
	if (!servers) {
		throw new Error('No Memcached servers provided');
	}
	return servers.split(',').map((url) => new URL(url));
}

const driverSet = new Set<IStorageDriver<Data>>([
	new MemcachedStorageDriver('MemcachedStorageDriver - default URLs', 'test', 2592000, bufferSerializer),
	new MemcachedStorageDriver('MemcachedStorageDriver - callback URLs', 'test', 2592000, bufferSerializer, () => getServers(process.env.MEMCACHED_SERVERS)),
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', {skip: !process.env.MEMCACHED_SERVERS}, () => {
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
});
