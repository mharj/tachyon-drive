import {type Loadable, LoadableCore} from '@luolapeikko/ts-common';
import {type IPersistSerializer, type IStoreProcessor, StorageDriver, type StorageDriverOptions, TachyonBandwidth} from 'tachyon-drive';

export type WebFsStorageDriverOptions = StorageDriverOptions & {
	/** File system file handle which can be a value, promise or a function */
	fileHandle: Loadable<FileSystemFileHandle>;
};

/**
 * WebFsStorageDriver which uses `FileSystemFileHandle` to read and write store data (permission need to be handled before using this)
 * @example
 * const arrayBufferSerializer: IPersistSerializer<DemoData, ArrayBuffer> = {
 *   name: 'arrayBufferSerializer',
 *   serialize: (data: DemoData) => new TextEncoder().encode(JSON.stringify(data)),
 *   deserialize: (buffer: ArrayBuffer) => JSON.parse(new TextDecoder().decode(buffer)) as DemoData,
 * };
 * export const webFsStoreDriver = new WebFsStorageDriver('WebFsStorageDriver', () => fileSystemFileHandle, arrayBufferSerializer);
 * @see https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
 * @since v0.10.3
 */
export class WebFsStorageDriver<Input> extends StorageDriver<Input, ArrayBuffer> {
	private fileHandle: Loadable<FileSystemFileHandle>;

	public constructor(
		options: WebFsStorageDriverOptions,
		serializer: IPersistSerializer<Input, ArrayBuffer>,
		processor?: Loadable<IStoreProcessor<ArrayBuffer>>,
	) {
		super(options, serializer, null, processor);
		this.fileHandle = options.fileHandle;
	}

	protected async handleInit(): Promise<boolean> {
		await this.getFileHandle();
		return true;
	}

	protected async handleStore(buffer: ArrayBuffer): Promise<void> {
		const fileHandle = await this.getFileHandle();
		this.logger.debug(`${this.name}: Writing file '${fileHandle.name}' size: ${buffer.byteLength.toString()}`);
		const writable = await fileHandle.createWritable();
		try {
			await writable.write(buffer);
		} finally {
			await writable.close();
		}
	}

	protected async handleHydrate(): Promise<ArrayBuffer | undefined> {
		try {
			const fileHandle = await this.getFileHandle();
			this.logger.debug(`${this.name}: Reading file '${fileHandle.name}'`);
			const file = await fileHandle.getFile();
			const buffer = await file.arrayBuffer();
			// check if file is empty
			if (buffer.byteLength === 0) {
				return undefined;
			}
			return buffer;
		} catch (err) {
			if (err instanceof Error && err.name === 'NotFoundError') {
				return undefined;
			}
			/* c8 ignore next 2 */
			throw err;
		}
	}

	protected async handleClear(): Promise<void> {
		try {
			const fileHandle = await this.getFileHandle();
			const writable = await fileHandle.createWritable();
			// truncate file to 0 bytes
			await writable.truncate(0);
			await writable.close();
		} catch (err) {
			if (err instanceof Error && err.name === 'NotFoundError') {
				return;
			}
			/* c8 ignore next 2 */
			throw err;
		}
	}

	protected handleUnload(): Promise<boolean> | boolean {
		return true;
	}

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.VeryLarge;
	}

	private async getFileHandle(): Promise<FileSystemFileHandle> {
		if (typeof this.fileHandle === 'function') {
			this.fileHandle = LoadableCore.resolve(this.fileHandle);
		}
		return await this.fileHandle;
	}
}
