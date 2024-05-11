import {Err, Ok, type Result} from '@luolapeikko/result-option';
import {type IHydrateOptions, type IStorageDriver, type StorageDriverEventEmitterConstructor} from '../interfaces/IStorageDriver';
import {type ILoggerLike, type ISetOptionalLogger, LogLevel, type LogMapping, MapLogger} from '@avanio/logger-like';
import {type IPersistSerializer, isValidPersistSerializer} from '../interfaces/IPersistSerializer';
import {type IStoreProcessor, isValidStoreProcessor} from '../interfaces/IStoreProcessor';
import {EventEmitter} from 'events';
import {type IExternalNotify} from '../interfaces/IExternalUpdateNotify';
import type {Loadable} from '@luolapeikko/ts-common';

/**
 * The default log levels for the storage driver.
 */
export const defaultLogLevels = {
	clear: LogLevel.None,
	deserialize: LogLevel.Warn,
	hydrate: LogLevel.Debug,
	init: LogLevel.None,
	store: LogLevel.Debug,
	unload: LogLevel.None,
	update: LogLevel.None,
	validator: LogLevel.Warn,
};

export type LogMappingType = LogMapping<keyof typeof defaultLogLevels>; // build type

/**
 * Abstract class that provides a simple interface for storing and retrieving data using a specified storage mechanism.
 * @template Input - The type of the data to store and retrieve.
 * @template Output - The type of the data to serialize and deserialize.
 */
export abstract class StorageDriver<Input, Output>
	extends (EventEmitter as StorageDriverEventEmitterConstructor)<Input>
	implements IStorageDriver<Input>, ISetOptionalLogger
{
	public name: string;
	private processor: Loadable<IStoreProcessor<Output>> | undefined;
	private serializer: IPersistSerializer<Input, Output>;
	protected logger: MapLogger<LogMappingType>;
	private extNotify: IExternalNotify | null;
	private _isInitialized = false;

	/**
	 * Creates a new instance of the `StorageDriver` class.
	 * @param {string} name - The name of the storage driver.
	 * @param {IPersistSerializer} serializer - The serializer to use for serializing and deserializing data.
	 * @param {IExternalNotify | null} extNotify - If driver does not support onUpdate, use this to notify with external event.
	 * @param {IStoreProcessor} [processor] - The store processor to use for processing data before it is written to storage and after it is loaded from storage.
	 * @param {ILoggerLike} [logger] - The logger to use for logging messages.
	 * @throws An error if the serializer or processor is invalid.
	 */
	constructor(
		name: string,
		serializer: IPersistSerializer<Input, Output>,
		extNotify: IExternalNotify | null,
		processor?: Loadable<IStoreProcessor<Output>>,
		logger?: ILoggerLike,
	) {
		super();
		/* istanbul ignore if */
		if (!isValidPersistSerializer(serializer)) {
			throw new Error('Invalid serializer');
		}
		this.name = name;
		this.serializer = serializer;
		this.processor = processor;
		this.logger = new MapLogger(logger, defaultLogLevels);
		// hook external notifier to handle update
		this.extNotify = extNotify;
		this.extNotify?.on('update', () => this.handleUpdate());
	}

	/**
	 * Set the logger for the storage driver.
	 * @param logger - The logger to use for logging messages.
	 */
	public setLogger(logger: ILoggerLike | undefined): void {
		this.logger.setLogger(logger);
	}

	/**
	 * Change log levels for the storage driver.
	 * @param map - The log key mapping to use for logging messages.
	 */
	public setLogMapping(map: Partial<LogMappingType>): void {
		this.logger.setLogMapping(map);
	}

	public get isInitialized(): boolean {
		return this._isInitialized;
	}

	/**
	 * Initializes the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	public async init(): Promise<boolean> {
		if (!this._isInitialized) {
			this.logger.logKey('init', `${this.name}: init()`);
			this.emit('init', true);
			try {
				this._isInitialized = await this.handleInit();
			} finally {
				this.emit('init', false);
			}
			await this.extNotify?.init(); // init external notifier
		}
		return this._isInitialized;
	}

	public async initResult(): Promise<Result<boolean>> {
		try {
			return Ok(await this.init());
		} catch (err) {
			/* istanbul ignore next */
			return Err(err);
		}
	}

	/**
	 * Unload the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	public async unload(): Promise<boolean> {
		this.logger.logKey('unload', `${this.name}: unload()`);
		await this.init();
		this._isInitialized = false;
		this.emit('unload', true);
		try {
			await this.extNotify?.unload(); // unload external notifier
			return this.handleUnload();
		} finally {
			this.emit('unload', false);
		}
	}

	public async unloadResult(): Promise<Result<boolean>> {
		try {
			return Ok(await this.unload());
		} catch (err) {
			/* istanbul ignore next */
			return Err(err);
		}
	}

	/**
	 * Stores the given data using the specified key.
	 * @param {Input} data - The data to store.
	 */
	public async store(data: Input): Promise<void> {
		this.logger.logKey('store', `${this.name}: store()`);
		await this.init();
		let output = this.serializer.serialize(data, this.logger);
		const processor = await this.getProcessor();
		if (processor) {
			output = await processor.preStore(output);
		}
		this.emit('store', true);
		try {
			await this.handleStore(output);
		} finally {
			this.emit('store', false);
		}
		// notify external update if driver does not support it
		await this.extNotify?.notifyUpdate(new Date());
	}

	public async storeResult(data: Input): Promise<Result<void>> {
		try {
			return Ok(await this.store(data));
		} catch (err) {
			/* istanbul ignore next */
			return Err(err);
		}
	}

	/**
	 * Retrieves the data stored using the specified key.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Input | undefined>} The retrieved data, or `undefined` if no data was found.
	 * @throws An error if the data fails validation.
	 */
	public async hydrate({validationThrowsError}: IHydrateOptions = {}): Promise<Input | undefined> {
		this.logger.logKey('hydrate', `${this.name}: hydrate()`);
		await this.init();
		this.emit('hydrate', true);
		let data: Awaited<Input> | undefined;
		try {
			data = await this.doHydrate();
		} finally {
			this.emit('hydrate', false);
		}
		if (data && this.serializer.validator && !this.serializer.validator(data, this.logger)) {
			if (validationThrowsError) {
				throw new Error(`${this.name}: hydrate() validator failed`);
			}
			this.logger.logKey('validator', `${this.name}: hydrate() validator failed`);
			return undefined;
		}
		return data;
	}

	public async hydrateResult(options?: IHydrateOptions): Promise<Result<Input | undefined>> {
		try {
			return Ok(await this.hydrate(options));
		} catch (err) {
			/* istanbul ignore next */
			return Err(err);
		}
	}

	/**
	 * Clear the stored data
	 */
	public async clear(): Promise<void> {
		this.logger.logKey('clear', `${this.name}: clear()`);
		this._isInitialized = false;
		this.emit('clear', true);
		try {
			await this.handleClear();
		} finally {
			this.emit('clear', false);
		}
		// notify external update if driver does not support it
		await this.extNotify?.notifyUpdate(new Date());
	}

	public async clearResult(): Promise<Result<void>> {
		try {
			return Ok(await this.clear());
		} catch (err) {
			/* istanbul ignore next */
			return Err(err);
		}
	}

	/**
	 * Clones the given data with the serializer.
	 * @param {Input} data - The data to clone.
	 * @returns {Input} The cloned data.
	 */
	public clone(data: Input): Input {
		return this.serializer.deserialize(this.serializer.serialize(data, this.logger), this.logger);
	}

	/**
	 * Use this to indicate that the data has been updated.
	 */
	protected async handleUpdate(): Promise<void> {
		this.logger.logKey('update', `${this.name}: onUpdate()`);
		const data = await this.doHydrate();
		this.emit('update', data);
	}

	/**
	 * Retrieves the data, processes it, and then returns the processed data.
	 * @returns {Promise<Input | undefined>} The retrieved deserialized data, or `undefined` if no data was found.
	 */
	private async doHydrate(): Promise<Input | undefined> {
		let output = await this.handleHydrate();
		if (output) {
			const processor = await this.getProcessor();
			if (processor) {
				output = await processor.postHydrate(output);
			}
			try {
				return this.serializer.deserialize(output, this.logger);
			} catch (err) {
				/* istanbul ignore next */
				this.logger.logKey('deserialize', this.name, err);
			}
		}
		return undefined;
	}

	private async getProcessor(): Promise<IStoreProcessor<Output> | undefined> {
		if (!this.processor) {
			return undefined;
		}
		// allow loading processor only once
		if (typeof this.processor === 'function') {
			this.processor = await this.processor();
		}
		await this.processor;
		if (!isValidStoreProcessor(this.processor)) {
			throw new Error('Invalid processor');
		}
		return this.processor;
	}

	/**
	 * Initialize the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	protected abstract handleInit(): Promise<boolean> | boolean;
	/**
	 * Store the given data to storage.
	 * @param {Output} buffer - The data to store.
	 * @returns {Promise<void>} A promise that resolves when the data has been successfully stored.
	 */
	protected abstract handleStore(buffer: Output): Promise<void> | void;
	/**
	 * Retrieve the data from storage.
	 * @returns {Promise<Output | undefined>} A promise that resolves to the retrieved data, or `undefined` if no data was found.
	 */
	protected abstract handleHydrate(): Promise<Output | undefined> | Output | undefined;
	/**
	 * Clear the stored data in storage.
	 * @returns A promise that resolves when the data has been successfully cleared.
	 */
	protected abstract handleClear(): Promise<void> | void;

	/**
	 * Called when the storage driver is unloaded.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	protected abstract handleUnload(): Promise<boolean> | boolean;
}
