import {type IPersistSerializer, type IStorageDriver, nextSerializer} from 'tachyon-drive';
import {strToBufferSerializer} from 'tachyon-drive-node-fs';
import {beforeAll, describe, expect, it} from 'vitest';
import * as zod from 'zod';
import {AwsS3StorageDriver} from '../src';
import {MockS3Client} from './lib/MockS3Client';

const awsClient = new MockS3Client();

const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

const jsonSerialization: IPersistSerializer<Data, string> = {
	deserialize: (buffer: string) => JSON.parse(buffer.toString()) as Data,
	name: 'jsonSerialization',
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(jsonSerialization, strToBufferSerializer);

const driverSet = new Set<IStorageDriver<Data>>([
	new AwsS3StorageDriver({awsBucket: 'bucket', awsClient, awsKey: 'key', name: 'AwsS3StorageDriver'}, bufferSerializer),
]);

const data = dataSchema.parse({test: 'demo'});

describe('tachyon-drive-s3 StorageDriver', () => {
	describe.each([...driverSet])('tachyon-drive-s3 StorageDriver $name', (currentDriver) => {
		beforeAll(async () => {
			try {
				await currentDriver.clear();
			} catch (e) {
				console.error(e);
			}
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
		});
		it('should unload to storage driver', async () => {
			expect(currentDriver.isInitialized).to.be.eq(true);
			await currentDriver.unload();
			expect(currentDriver.isInitialized).to.be.eq(false);
		});
	});
});
