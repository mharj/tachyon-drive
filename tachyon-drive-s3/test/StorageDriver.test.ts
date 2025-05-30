/* eslint-disable sonarjs/no-duplicate-string */
import {beforeAll, describe, expect, it} from 'vitest';
import * as dotenv from 'dotenv';
import * as zod from 'zod';
import {AwsS3StorageDriver, urlToClientConfig} from '../src/';
import {IPersistSerializer, IStorageDriver, nextSerializer} from 'tachyon-drive';
import {strToBufferSerializer} from 'tachyon-drive-node-fs';

dotenv.config();

const dataSchema = zod.object({
	test: zod.string(),
});

type Data = zod.infer<typeof dataSchema>;

const jsonSerialization: IPersistSerializer<Data, string> = {
	name: 'jsonSerialization',
	deserialize: (buffer: string) => JSON.parse(buffer.toString()),
	serialize: (data: Data) => JSON.stringify(data),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(jsonSerialization, strToBufferSerializer);

let url: URL;

const driverSet = new Set<IStorageDriver<Data>>([
	new AwsS3StorageDriver('AwsS3StorageDriver - with URL', () => url, bufferSerializer),
	new AwsS3StorageDriver('AwsS3StorageDriver - with Config', () => urlToClientConfig(url), bufferSerializer),
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', {skip: !process.env.S3_URI}, () => {
	beforeAll(function () {
		url = new URL(`${process.env.S3_URI}`);
	});
	driverSet.forEach((currentDriver) => {
		describe(currentDriver.name, () => {
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
