import {readFile, unlink, writeFile} from 'fs/promises';
import {existsSync, type FSWatcher, watch} from 'node:fs';
import type {ILoggerLike} from '@avanio/logger-like';
import {type Loadable, toError} from '@luolapeikko/ts-common';
import {type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';

export type FileStorageDriverOptions = {
	/**
	 * File name or async function that returns a file name
	 */
	fileName: Loadable<string>;
	/**
	 * Speed of the file storage driver, default is "TachyonBandwidth.Large".
	 */
	bandwidth?: TachyonBandwidth;
};

/**
 * A storage driver that uses the local file system to store files.
 */
export class FileStorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	private isWriting = false;
	private fileName: Loadable<string>;
	private fileWatch: FSWatcher | undefined;

	private fileChangeTimeout: ReturnType<typeof setTimeout> | undefined;

	/**
	 * Creates a new instance of the `FileStorageDriver` class.
	 * @param {string} name - name of the driver
	 * @param {FileStorageDriverOptions} options - options for the driver
	 * @param {Loadable<string>} options.fileName - file name or async function that returns a file name
	 * @param {TachyonBandwidth} options.bandwidth - speed of the file storage driver, default is "TachyonBandwidth.Large"
	 * @param {IPersistSerializer<Input, Buffer>} serializer - serializer to serialize and deserialize data (to and from Buffer)
	 * @param {Loadable<IStoreProcessor<Buffer>>} processor - optional processor to process data before storing and after hydrating
	 * @param {ILoggerLike} logger - optional logger to log messages
	 */
	constructor(
		name: string,
		options: FileStorageDriverOptions,
		serializer: IPersistSerializer<Input, Buffer>,
		processor?: Loadable<IStoreProcessor<Buffer>>,
		logger?: ILoggerLike,
	) {
		super(name, serializer, null, processor, logger);
		this.bandwidth = options.bandwidth ?? TachyonBandwidth.Large;
		this.fileName = options.fileName;
		this.fileWatcher = this.fileWatcher.bind(this);
	}

	/**
	 * initialize watcher if have a file
	 * @returns {Promise<boolean>} - true if watcher was set, false if no file exists
	 */
	protected async handleInit(): Promise<boolean> {
		await this.setFileWatcher();
		return true;
	}

	/**
	 * unload watcher if have a file
	 * @returns {Promise<boolean>} - true if watcher was unset, false if no watcher was set
	 */
	protected async handleUnload(): Promise<boolean> {
		return this.unsetFileWatcher();
	}

	/**
	 * Actual implementation of store data to the file
	 * @param {Buffer} buffer - Buffer to store in the file
	 * @throws {TypeError} - if the buffer is not a Buffer
	 */
	protected async handleStore(buffer: Buffer): Promise<void> {
		// buffer sanity check
		if (!Buffer.isBuffer(buffer)) {
			throw new TypeError(`FileStorageDriver '${this.name}' can only store Buffers`);
		}
		this.isWriting = true;
		await writeFile(await this.getFileName(), buffer);
		await this.setFileWatcher();
		this.isWriting = false;
	}

	/**
	 * Actual implementation of hydrate data from the file
	 * @returns {Promise<Buffer | undefined>} - Buffer from the file or undefined if file does not exist
	 */
	protected async handleHydrate(): Promise<Buffer | undefined> {
		const fileName = await this.getFileName();
		if (existsSync(fileName)) {
			const buffer = await readFile(fileName);
			await this.setFileWatcher();
			return buffer;
		}
		return undefined;
	}

	/**
	 * Actual implementation of delete file and unwatch it
	 */
	protected async handleClear(): Promise<void> {
		await this.unsetFileWatcher();
		const fileName = await this.getFileName();
		if (existsSync(fileName)) {
			this.isWriting = true;
			await unlink(fileName);
			this.isWriting = false;
		}
	}

	/**
	 * Set file watcher if file exists
	 */
	private async setFileWatcher() {
		const fileName = await this.getFileName();
		if (!this.fileWatch && existsSync(fileName)) {
			this.fileWatch = watch(fileName, this.fileWatcher);
		}
	}

	private unsetFileWatcher(): Promise<boolean> {
		if (this.fileWatch) {
			this.fileWatch.close();
			return Promise.resolve(true);
		}
		return Promise.resolve(false);
	}

	/**
	 * method for file watcher instance
	 * @param {('rename' | 'change')} event - event type, either 'rename' or 'change'
	 */
	private fileWatcher(event: 'rename' | 'change') {
		// ignore watcher events if writing
		if (!this.isWriting && event === 'change') {
			if (this.fileChangeTimeout) {
				clearTimeout(this.fileChangeTimeout);
			}
			// delay to avoid multiple file change events
			this.fileChangeTimeout = setTimeout(async () => {
				this.fileChangeTimeout = undefined;
				try {
					await this.handleUpdate();
				} catch (error) {
					/* c8 ignore next 2 */
					this.logger.error(`FileStorageDriver '${this.name}' failed to update data: ${toError(error).message}`);
				}
			}, 100);
		}
	}

	/**
	 * Build file name from fileNameOrPromise
	 * @returns {Promise<string>} - file name
	 */
	private async getFileName(): Promise<string> {
		// lock down file name as this can't be changed after change events
		if (typeof this.fileName === 'function') {
			this.fileName = this.fileName();
		}
		const value = await this.fileName;
		if (typeof value !== 'string') {
			throw new TypeError(`FileStorageDriver '${this.name}' fileName argument must return a string, value: ${JSON.stringify(value)}`);
		}
		return value;
	}
}
