import {EventEmitter} from 'node:events';
import type {ExternalNotifyEventsMap, IExternalNotify, IPersistSerializer, IStorageDriver} from 'tachyon-drive';
import {CryptoBufferProcessor} from 'tachyon-drive-node-fs';
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {AzureBlobStorageDriver} from '../src/index.js';
import {MockBlockBlobClient} from './lib/MockBlockBlobClient.js';

const dataSchema = z.object({
	test: z.string(),
});

type Data = z.infer<typeof dataSchema>;

const bufferSerializer: IPersistSerializer<Data, Buffer> = {
	deserialize: (buffer: Buffer) => JSON.parse(buffer.toString()) as Data,
	name: 'BufferSerializer',
	serialize: (data: Data) => Buffer.from(JSON.stringify(data)),
	validator: (data: Data) => dataSchema.safeParse(data).success,
};

class SimpleNotify extends EventEmitter<ExternalNotifyEventsMap> implements IExternalNotify {
	private callback = new Set<(timeStamp: Date) => Promise<void>>();

	public init(): Promise<void> {
		return Promise.resolve();
	}

	public unload(): Promise<void> {
		return Promise.resolve();
	}

	public onUpdate(callback: (timeStamp: Date) => Promise<void>): void {
		this.callback.add(callback);
	}

	public async notifyUpdate(timeStamp: Date): Promise<void> {
		await Promise.all([...this.callback].map((callback) => callback(timeStamp)));
	}
}

const processor = new CryptoBufferProcessor(Buffer.from('some-secret-key'));

const driverSet = new Set<IStorageDriver<Data>>([
	new AzureBlobStorageDriver(
		{
			blockBlobClient: new MockBlockBlobClient(),
			name: 'AzureBlobStorageDriver',
		},
		bufferSerializer,
	),
	new AzureBlobStorageDriver(
		{
			blockBlobClient: new MockBlockBlobClient(),
			name: 'CryptAzureBlobStorageDriver',
		},
		bufferSerializer,
		new SimpleNotify(),
		() => processor,
	),
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', () => {
	describe.each([...driverSet])('StorageDriver $name', (currentDriver) => {
		it('should be empty store', async () => {
			expect(await currentDriver.hydrate()).to.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should store to storage driver', async () => {
			await expect(currentDriver.store(data)).resolves.to.be.eq(undefined);
			await expect(currentDriver.hydrate()).resolves.to.eql(data);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should restore data from storage driver', async () => {
			await expect(currentDriver.hydrate()).resolves.to.eql(data);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should clear to storage driver', async () => {
			await expect(currentDriver.clear()).resolves.to.be.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(false);
			await expect(currentDriver.hydrate()).resolves.to.eq(undefined);
			expect(currentDriver.isInitialized).to.be.eq(true);
		});
		it('should unload to storage driver', async () => {
			expect(currentDriver.isInitialized).to.be.eq(true);
			await expect(currentDriver.unload()).resolves.to.eq(true);
			expect(currentDriver.isInitialized).to.be.eq(false);
		});
	});
});
