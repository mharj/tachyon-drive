import type {ILoggerLike} from '@avanio/logger-like';
import type {BlockBlobClient} from '@azure/storage-blob';
import type {Loadable} from '@luolapeikko/ts-common';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';

export type AzureBlobStorageDriverOptions = {
	blockBlobClient: Loadable<BlockBlobClient>;
	/** Optional bandwidth settings, defaults to "TachyonBandwidth.VerySmall" because of operation cost */
	bandwidth?: TachyonBandwidth;
};

export class AzureBlobStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	#blockBlobClient: Loadable<BlockBlobClient>;

	/**
	 * AzureBlobStorageDriver
	 * @param {string} name - name of the driver
	 * @param {AzureBlobStorageDriverOptions} blobOptions - options for the Azure Blob Storage (connectionString, containerName, fileName)
	 * @param {IPersistSerializer<Input, Buffer>} serializer - serializer to serialize and deserialize data (to and from Buffer)
	 * @param {IExternalNotify} [extNotify] - optional external notify service to notify store update events
	 * @param {Loadable<IStoreProcessor<Buffer>>} [processor] - optional processor to process data (encrypt, decrypt, compress, decompress, etc.)
	 * @param {ILoggerLike} [logger] - optional logger
	 */
	public constructor(
		name: string,
		blobOptions: AzureBlobStorageDriverOptions,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: Loadable<IStoreProcessor<Buffer>>,
		logger?: ILoggerLike,
	) {
		super(name, serializer, extNotify ?? null, processor, logger);
		this.bandwidth = blobOptions.bandwidth ?? TachyonBandwidth.VerySmall;
		this.#blockBlobClient = blobOptions.blockBlobClient;
	}

	protected async handleInit(): Promise<boolean> {
		await this.#getBlockBlobClient();
		return true;
	}

	protected handleUnload(): boolean {
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		const blockBlobClient = await this.#getBlockBlobClient();
		await blockBlobClient.upload(buffer, buffer.length);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		const blockBlobClient = await this.#getBlockBlobClient();
		if (await blockBlobClient.exists()) {
			return blockBlobClient.downloadToBuffer();
		}
		return undefined;
	}

	protected async handleClear(): Promise<void> {
		const blockBlobClient = await this.#getBlockBlobClient();
		await blockBlobClient.deleteIfExists();
	}

	async #getBlockBlobClient(): Promise<BlockBlobClient> {
		if (typeof this.#blockBlobClient === 'function') {
			this.#blockBlobClient = this.#blockBlobClient();
		}
		return await this.#blockBlobClient;
	}
}
