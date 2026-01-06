import {BlobServiceClient} from '@azure/storage-blob';
import {type ChildProcess, spawn} from 'child_process';
import {EventEmitter} from 'events';
import type {ExternalNotifyEventsMap, IExternalNotify, IPersistSerializer, IStorageDriver} from 'tachyon-drive';
import {CryptoBufferProcessor} from 'tachyon-drive-node-fs';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {z} from 'zod';
import {AzureBlobStorageDriver} from '../src/index.js';

let azuriteProcess: ChildProcess | undefined;

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
		'AzureBlobStorageDriver',
		{
			blockBlobClient: BlobServiceClient.fromConnectionString(
				`DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;`,
			)
				.getContainerClient('test')
				.getBlockBlobClient('test.json'),
		},
		bufferSerializer,
	),
	new AzureBlobStorageDriver(
		'CryptAzureBlobStorageDriver',
		{
			blockBlobClient: BlobServiceClient.fromConnectionString(
				`DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;`,
			)
				.getContainerClient('test')
				.getBlockBlobClient('test.aes'),
		},
		bufferSerializer,
		new SimpleNotify(),
		() => processor,
	),
]);

const data = dataSchema.parse({test: 'demo'});

describe('StorageDriver', () => {
	beforeAll(async () => {
		azuriteProcess = spawn('azurite', ['--silent', '--location', 'azurite-data', '--blobHost', '127.0.0.1'], {shell: true, stdio: 'inherit'});
		// wait a bit for Azurite to be ready
		await new Promise((r) => setTimeout(r, 5000));
	});

	afterAll(async () => {
		if (azuriteProcess?.pid) {
			if (process.platform === 'win32') {
				spawn('taskkill', ['/pid', azuriteProcess.pid.toString(), '/f', '/t']);
			} else {
				azuriteProcess.kill();
			}
		}
		// wait a bit for Azurite to be closed
		await new Promise((r) => setTimeout(r, 2000));
	});

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
