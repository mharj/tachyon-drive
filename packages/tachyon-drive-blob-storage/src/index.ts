import type {BlockBlobClient} from '@azure/storage-blob';
import type {Loadable} from '@luolapeikko/ts-common';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, type StorageDriverOptions, TachyonBandwidth} from 'tachyon-drive';

export type AzureBlockBlobClient = Pick<BlockBlobClient, 'upload' | 'downloadToBuffer' | 'deleteIfExists' | 'exists' | 'name' | 'containerName' | 'url'>;

export type AzureBlobStorageDriverOptions = StorageDriverOptions & {
	blockBlobClient: Loadable<AzureBlockBlobClient>;
	/** Optional bandwidth settings, defaults to "TachyonBandwidth.VerySmall" because of operation cost */
	bandwidth?: TachyonBandwidth;
};

export class AzureBlobStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	#blockBlobClient: Loadable<AzureBlockBlobClient>;

	/**
	 * AzureBlobStorageDriver
	 * @param {AzureBlobStorageDriverOptions} options - options for the Azure Blob Storage (name, blockBlobClient, bandwidth, logger)
	 * @param {IPersistSerializer<Input, Buffer>} serializer - serializer to serialize and deserialize data (to and from Buffer)
	 * @param {IExternalNotify} [extNotify] - optional external notify service to notify store update events
	 * @param {Loadable<IStoreProcessor<Buffer>>} [processor] - optional processor to process data (encrypt, decrypt, compress, decompress, etc.)
	 */
	public constructor(
		options: AzureBlobStorageDriverOptions,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: Loadable<IStoreProcessor<Buffer>>,
	) {
		super(options, serializer, extNotify ?? null, processor);
		this.#blockBlobClient = options.blockBlobClient;
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

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.VerySmall;
	}

	async #getBlockBlobClient(): Promise<AzureBlockBlobClient> {
		if (typeof this.#blockBlobClient === 'function') {
			this.#blockBlobClient = this.#blockBlobClient();
		}
		return await this.#blockBlobClient;
	}
}
