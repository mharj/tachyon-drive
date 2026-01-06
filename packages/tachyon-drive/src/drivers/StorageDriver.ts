import {type ILoggerLike, LogLevel, type LogLevelValue, MapLogger} from '@avanio/logger-like';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import type {Loadable} from '@luolapeikko/ts-common';
import {EventEmitter} from 'events';
import type {IExternalNotify} from '../interfaces/IExternalUpdateNotify.js';
import {type IPersistSerializer, isValidPersistSerializer} from '../interfaces/IPersistSerializer.js';
import type {IHydrateOptions, IStorageDriver, StorageDriverEventsMap} from '../interfaces/IStorageDriver.js';
import {type IStoreProcessor, isValidStoreProcessor} from '../interfaces/IStoreProcessor.js';
import type {StorageDriverJson} from '../types/StorageDriverJson.js';
import {getTachyonBandwidthName, type TachyonBandwidth} from '../types/TachyonBandwidth.js';

/**
 * The log key mapping for the storage driver.
 * @since v0.11.0
 */
export type StorageDriverLogMapping = {
	clear: LogLevelValue;
	deserialize: LogLevelValue;
	hydrate: LogLevelValue;
	init: LogLevelValue;
	processor: LogLevelValue;
	store: LogLevelValue;
	unload: LogLevelValue;
	update: LogLevelValue;
	validator: LogLevelValue;
};

/**
 * The default log levels for the storage driver.
 * @since v0.4.0
 */
export const defaultLogLevels: StorageDriverLogMapping = {
	clear: LogLevel.None,
	deserialize: LogLevel.Warn,
	hydrate: LogLevel.Debug,
	init: LogLevel.None,
	processor: LogLevel.Debug,
	store: LogLevel.Debug,
	unload: LogLevel.None,
	update: LogLevel.None,
	validator: LogLevel.Warn,
};

/**
 * Abstract class that provides a simple interface for storing and retrieving data using a specified storage mechanism.
 * @template Input - The type of the data to store and retrieve.
 * @template Output - The type of the data to serialize and deserialize.
 * @since v0.11.0
 */
export abstract class StorageDriver<Input, Output> extends EventEmitter<StorageDriverEventsMap<Input>> implements IStorageDriver<Input> {
	public abstract readonly bandwidth: TachyonBandwidth;
	public readonly name: string;
	public readonly serializer: IPersistSerializer<Input, Output>;
	public readonly logger: MapLogger<StorageDriverLogMapping>;
	#loadableProcessor: Loadable<IStoreProcessor<Output>> | undefined;
	#processor: IStoreProcessor<Output> | undefined;
	#extNotify: IExternalNotify | null;
	#isInitialized = false;

	/**
	 * Creates a new instance of the `StorageDriver` class.
	 * @param {string} name - The name of the storage driver.
	 * @param {IPersistSerializer} serializer - The serializer to use for serializing and deserializing data.
	 * @param {IExternalNotify | null} extNotify - If driver does not support onUpdate, use this to notify with external event.
	 * @param {IStoreProcessor} [processor] - The store processor to use for processing data before it is written to storage and after it is loaded from storage.
	 * @param {ILoggerLike} [logger] - The logger to use for logging messages.
	 * @throws An error if the serializer or processor is invalid.
	 */
	public constructor(
		name: string,
		serializer: IPersistSerializer<Input, Output>,
		extNotify: IExternalNotify | null,
		processor?: Loadable<IStoreProcessor<Output>>,
		logger?: ILoggerLike,
	) {
		super();
		/* c8 ignore next 3 */
		if (!isValidPersistSerializer(serializer)) {
			throw new Error('Invalid serializer');
		}
		this.name = name;
		this.serializer = serializer;
		this.#loadableProcessor = processor;
		this.logger = new MapLogger(logger, defaultLogLevels);
		// bind update handler
		this.handleUpdate = this.handleUpdate.bind(this);
		// hook external notifier to handle update
		this.#extNotify = extNotify;
	}

	public get isInitialized(): boolean {
		return this.#isInitialized;
	}

	/**
	 * Initializes the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	public async init(): Promise<boolean> {
		if (!this.#isInitialized) {
			this.#extNotify?.removeListener('update', this.handleUpdate);
			this.#extNotify?.addListener('update', this.handleUpdate);
			this.logger.logKey('init', `${this.name}: init()`);
			this.emit('init', true);
			try {
				this.#isInitialized = await this.handleInit();
			} finally {
				this.emit('init', false);
			}
			await this.#extNotify?.init(); // init external notifier
			await this.getProcessor(); // load processor
		}
		return this.#isInitialized;
	}

	public async initResult(): Promise<IResult<boolean>> {
		try {
			return Ok(await this.init());
		} catch (err) {
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
		this.#isInitialized = false;
		this.emit('unload', true);
		try {
			await this.#extNotify?.unload(); // unload external notifier
			return await this.handleUnload();
		} finally {
			this.#extNotify?.removeListener('update', this.handleUpdate); // remove external notifier callback
			this.emit('unload', false);
		}
	}

	/**
	 * Unload the storage driver and return the Promise of Result.
	 * @returns {Promise<Result<boolean>>} A promise of Result that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	public async unloadResult(): Promise<IResult<boolean>> {
		try {
			return Ok(await this.unload());
		} catch (err) {
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
		await this.#extNotify?.notifyUpdate(new Date());
	}

	/**
	 * Stores the given data using the specified key and returns the Promise of Result.
	 * @param {Input} data - The data to store.
	 * @returns {Promise<Result<void>>} A promise of Result that resolves when the data has been successfully stored.
	 */
	public async storeResult(data: Input): Promise<IResult<void>> {
		try {
			return Ok(await this.store(data));
		} catch (err) {
			return Err(err);
		}
	}

	/**
	 * Retrieves the data stored using the specified key.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Input | undefined>} The retrieved data, or `undefined` if no data was found.
	 * @throws An error if the data fails validation.
	 */
	public async hydrate({validationThrowsError, deserializationThrowsError}: IHydrateOptions = {}): Promise<Input | undefined> {
		this.logger.logKey('hydrate', `${this.name}: hydrate()`);
		await this.init();
		this.emit('hydrate', true);
		let data: Awaited<Input> | undefined;
		try {
			data = await this.#doHydrate({deserializationThrowsError});
		} finally {
			this.emit('hydrate', false);
		}
		if (data && this.serializer.validator && !(await this.serializer.validator(data, this.logger))) {
			if (validationThrowsError) {
				throw new Error(`${this.name}: hydrate() validator failed`);
			}
			this.logger.logKey('validator', `${this.name}: hydrate() validator failed`);
			return undefined;
		}
		return data;
	}

	/**
	 * Retrieves the data stored using the specified key and returns the Promise of Result.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Result<Input | undefined>>}  Promise of Result that resolves to the retrieved data, or `undefined` if no data was found.
	 */
	public async hydrateResult(options?: IHydrateOptions): Promise<IResult<Input | undefined>> {
		try {
			return Ok(await this.hydrate(options));
		} catch (err) {
			return Err(err);
		}
	}

	/**
	 * Clear the stored data
	 */
	public async clear(): Promise<void> {
		this.logger.logKey('clear', `${this.name}: clear()`);
		this.#isInitialized = false;
		this.emit('clear', true);
		try {
			await this.handleClear();
		} finally {
			this.emit('clear', false);
		}
		// notify external update if driver does not support it
		await this.#extNotify?.notifyUpdate(new Date());
	}

	/**
	 * Clear the stored data and return the Promise of Result.
	 * @returns {Promise<Result<void>>} A promise of Result that resolves when the data has been successfully cleared.
	 */
	public async clearResult(): Promise<IResult<void>> {
		try {
			return Ok(await this.clear());
		} catch (err) {
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
	 * Get current processor
	 * @returns {IStoreProcessor | undefined} current processor
	 */
	public get processor(): IStoreProcessor<Output> | undefined {
		if (!this.#isInitialized) {
			throw new Error('Storage driver is not initialized');
		}
		return this.#processor;
	}

	/**
	 * Clone the given data with the serializer and return Result of the cloned data.
	 * @param {Input} data - The data to clone.
	 * @returns {Result<Input>} The cloned data.
	 */
	public cloneResult(data: Input): IResult<Input> {
		try {
			return Ok(this.clone(data));
		} catch (err) {
			return Err(err);
		}
	}

	/**
	 * Retrieves the processor for the storage driver if it is available.
	 * @returns {Promise<IStoreProcessor | undefined>} The processor for the storage driver, or `undefined` if no processor is available.
	 */
	public async getProcessor(): Promise<IStoreProcessor<Output> | undefined> {
		if (!this.#loadableProcessor) {
			return undefined;
		}
		if (this.#processor) {
			return this.#processor;
		}
		// allow loading processor only once
		if (typeof this.#loadableProcessor === 'function') {
			this.#loadableProcessor = await this.#loadableProcessor();
		}
		await this.#loadableProcessor;
		if (!isValidStoreProcessor(this.#loadableProcessor)) {
			throw new TypeError('Invalid processor');
		}
		this.#processor = this.#loadableProcessor;
		this.logger.logKey('processor', `${this.name}: processor (${this.#processor.name}) loaded`);
		return this.#loadableProcessor;
	}

	/**
	 * Retrieves the processor for the storage driver if it is available and returns the Promise of Result.
	 * @returns {Promise<Result<IStoreProcessor<Output> | undefined>>} The processor for the storage driver, or `undefined` if no processor is available.
	 */
	public async getProcessorResult(): Promise<IResult<IStoreProcessor<Output> | undefined>> {
		try {
			return Ok(await this.getProcessor());
		} catch (err) {
			return Err(err);
		}
	}

	/**
	 * Get the serializer for the storage driver.
	 * @returns {IPersistSerializer} The serializer for the storage driver.
	 */
	public getSerializer(): IPersistSerializer<Input, Output> {
		return this.serializer;
	}

	public override toString(): string {
		return `${this.name}(serializer=${this.serializer.name}, processor=${this.#processor?.name ?? 'undefined'}, bandwidth=${getTachyonBandwidthName(this.bandwidth)})`;
	}

	/**
	 * Build the default JSON representation of the storage driver.
	 * @returns {StorageDriverJson} The JSON representation of the storage driver.
	 * @example
	 * // override the toJSON method to include additional (typed) properties
	 * public override toJSON(): FooStorageDriverJson {
	 * 	return {
	 * 		...super.toJSON(),
	 * 		foo: this.foo,
	 * 	};
	 * }
	 */
	public toJSON(): StorageDriverJson {
		return {
			bandwidth: this.bandwidth,
			name: this.name,
			processor: this.#processor?.name,
			serializer: this.serializer.name,
		};
	}

	/**
	 * Use this to indicate that the data has been updated.
	 */
	protected async handleUpdate(): Promise<void> {
		this.logger.logKey('update', `${this.name}: onUpdate()`);
		const data = await this.#doHydrate();
		this.emit('update', data);
	}

	/**
	 * Retrieves the data, processes it, and then returns the processed data.
	 * @param {IHydrateOptions} If deserializationThrowsError `true`, the deserialization will throw an error if it fails.
	 * @returns {Promise<Input | undefined>} The retrieved deserialized data, or `undefined` if no data was found.
	 */
	async #doHydrate({deserializationThrowsError}: IHydrateOptions = {}): Promise<Input | undefined> {
		let output = await this.handleHydrate();
		if (output) {
			const processor = await this.getProcessor();
			if (processor) {
				output = await processor.postHydrate(output);
			}
			try {
				return this.serializer.deserialize(output, this.logger);
			} catch (err) {
				if (deserializationThrowsError) {
					throw err;
				}
				this.logger.logKey('deserialize', this.name, err);
			}
		}
		return undefined;
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
