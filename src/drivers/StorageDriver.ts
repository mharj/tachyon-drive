import type {ILoggerLike} from '@avanio/logger-like';
import {IHydrateOptions, IStorageDriver, OnUpdateCallback} from '../interfaces/IStorageDriver';
import {IStoreProcessor, isValidStoreProcessor} from '../interfaces/IStoreProcessor';
import {IPersistSerializer, isValidPersistSerializer} from '../interfaces/IPersistSerializer';

/**
 * Abstract class that provides a simple interface for storing and retrieving data using a specified storage mechanism.
 * @template Input - The type of the data to store and retrieve.
 * @template Output - The type of the data to serialize and deserialize.
 */
export abstract class StorageDriver<Input, Output> implements IStorageDriver<Input> {
	public name: string;
	private processor: IStoreProcessor<Output> | undefined;
	private serializer: IPersistSerializer<Input, Output>;
	protected readonly logger: ILoggerLike | undefined;
	private onUpdateCallbacks = new Set<OnUpdateCallback<Input>>();
	private _isInitialized = false;

	/**
	 * Creates a new instance of the `StorageDriver` class.
	 * @param {string} name - The name of the storage driver.
	 * @param {IPersistSerializer} serializer - The serializer to use for serializing and deserializing data.
	 * @param {IStoreProcessor} [processor] - The store processor to use for processing data before it is written to storage and after it is loaded from storage.
	 * @param {ILoggerLike} [logger] - The logger to use for logging messages.
	 * @throws An error if the serializer or processor is invalid.
	 */
	constructor(name: string, serializer: IPersistSerializer<Input, Output>, processor?: IStoreProcessor<Output>, logger?: ILoggerLike) {
		/* istanbul ignore if */
		if (!isValidPersistSerializer(serializer)) {
			throw new Error('Invalid serializer');
		}
		/* istanbul ignore if */
		if (processor && !isValidStoreProcessor(processor)) {
			throw new Error('Invalid processor');
		}
		this.name = name;
		this.serializer = serializer;
		this.processor = processor;
		this.logger = logger;
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
			this.logger?.debug(`${this.name}: init()`);
			this._isInitialized = await this.handleInit();
		}
		return this._isInitialized;
	}

	/**
	 * Stores the given data using the specified key.
	 * @param {Input} data - The data to store.
	 */
	public async store(data: Input): Promise<void> {
		this.logger?.debug(`${this.name}: store()`);
		await this.init();
		let output = this.serializer.serialize(data, this.logger);
		if (this.processor) {
			output = await this.processor.preStore(output);
		}
		await this.handleStore(output);
	}

	/**
	 * Retrieves the data stored using the specified key.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Input | undefined>} The retrieved data, or `undefined` if no data was found.
	 * @throws An error if the data fails validation.
	 */
	public async hydrate({validationThrowsError}: IHydrateOptions = {}): Promise<Input | undefined> {
		this.logger?.debug(`${this.name}: hydrate()`);
		await this.init();
		const data = await this.doHydrate();
		if (data && this.serializer.validator && !this.serializer.validator(data)) {
			if (validationThrowsError) {
				throw new Error(`${this.name}: hydrate() validator failed`);
			}
			this.logger?.debug(`${this.name}: hydrate() validator failed`);
			return undefined;
		}
		return data;
	}

	/**
	 * Clear the stored data
	 */
	public async clear(): Promise<void> {
		this.logger?.debug(`${this.name}: clear()`);
		this._isInitialized = false;
		await this.handleClear();
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
	 * Registers a callback that will be called when the data is updated.
	 * @param {OnUpdateCallback<Input>} callback - The callback to register.
	 */
	public onUpdate(callback: OnUpdateCallback<Input>) {
		this.onUpdateCallbacks.add(callback);
	}

	/**
	 * Use this to indicate that the data has been updated.
	 */
	protected async handleUpdate(): Promise<void> {
		this.logger?.debug(`${this.name}: onUpdate()`);
		const data = await this.doHydrate();
		this.onUpdateCallbacks.forEach((callback) => callback(data));
	}

	/**
	 * Retrieves the data, processes it, and then returns the processed data.
	 * @returns {Promise<Input | undefined>} The retrieved deserialized data, or `undefined` if no data was found.
	 */
	private async doHydrate(): Promise<Input | undefined> {
		let output = await this.handleHydrate();
		if (output) {
			if (this.processor) {
				output = await this.processor.postHydrate(output);
			}
			try {
				return this.serializer.deserialize(output, this.logger);
			} catch (err) {
				/* istanbul ignore next */
				this.logger?.error(this.name, err);
			}
		}
		return undefined;
	}

	/**
	 * Initialize the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	protected abstract handleInit(): Promise<boolean>;
	/**
	 * Store the given data to storage.
	 * @param {Output} buffer - The data to store.
	 * @returns {Promise<void>} A promise that resolves when the data has been successfully stored.
	 */
	protected abstract handleStore(buffer: Output): Promise<void>;
	/**
	 * Retrieve the data from storage.
	 * @returns {Promise<Output | undefined>} A promise that resolves to the retrieved data, or `undefined` if no data was found.
	 */
	protected abstract handleHydrate(): Promise<Output | undefined>;
	/**
	 * Clear the stored data in storage.
	 * @returns A promise that resolves when the data has been successfully cleared.
	 */
	protected abstract handleClear(): Promise<void>;
}
