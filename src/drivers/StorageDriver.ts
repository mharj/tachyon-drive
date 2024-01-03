import {Err, Ok, Result} from '@luolapeikko/result-option';
import {IHydrateOptions, IStorageDriver, OnActivityCallback, OnUpdateCallback} from '../interfaces/IStorageDriver';
import {IPersistSerializer, isValidPersistSerializer} from '../interfaces/IPersistSerializer';
import {IStoreProcessor, isValidStoreProcessor} from '../interfaces/IStoreProcessor';
import {IExternalNotify} from '../interfaces/IExternalUpdateNotify';
import type {ILoggerLike} from '@avanio/logger-like';

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
	private extNotify: IExternalNotify | null;
	private onUpdateCallbacks = new Set<OnUpdateCallback<Input>>();
	private onInitCallbacks = new Set<OnActivityCallback>();
	private onHydrateCallbacks = new Set<OnActivityCallback>();
	private onStoreCallbacks = new Set<OnActivityCallback>();
	private onClearCallbacks = new Set<OnActivityCallback>();
	private onUnloadCallbacks = new Set<OnActivityCallback>();
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
		processor?: IStoreProcessor<Output>,
		logger?: ILoggerLike,
	) {
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
		// hook external notifier to handle update
		this.extNotify = extNotify;
		this.extNotify?.onUpdate(() => this.handleUpdate());
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
			this.onInitCallbacks.forEach((currentCallback) => currentCallback(true));
			try {
				this._isInitialized = await this.handleInit();
			} finally {
				this.onInitCallbacks.forEach((currentCallback) => currentCallback(false));
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
		this.logger?.debug(`${this.name}: unload()`);
		await this.init();
		this._isInitialized = false;
		this.onUnloadCallbacks.forEach((currentCallback) => currentCallback(true));
		try {
			await this.extNotify?.unload(); // unload external notifier
			return this.handleUnload();
		} finally {
			this.onUnloadCallbacks.forEach((currentCallback) => currentCallback(false));
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
		this.logger?.debug(`${this.name}: store()`);
		await this.init();
		let output = this.serializer.serialize(data, this.logger);
		if (this.processor) {
			output = await this.processor.preStore(output);
		}
		this.onStoreCallbacks.forEach((currentCallback) => currentCallback(true));
		try {
			await this.handleStore(output);
		} finally {
			this.onStoreCallbacks.forEach((currentCallback) => currentCallback(false));
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
		this.logger?.debug(`${this.name}: hydrate()`);
		await this.init();
		this.onHydrateCallbacks.forEach((currentCallback) => currentCallback(true));
		let data: Awaited<Input> | undefined;
		try {
			data = await this.doHydrate();
		} finally {
			this.onHydrateCallbacks.forEach((currentCallback) => currentCallback(false));
		}
		if (data && this.serializer.validator && !this.serializer.validator(data, this.logger)) {
			if (validationThrowsError) {
				throw new Error(`${this.name}: hydrate() validator failed`);
			}
			this.logger?.debug(`${this.name}: hydrate() validator failed`);
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
		this.logger?.debug(`${this.name}: clear()`);
		this._isInitialized = false;
		this.onClearCallbacks.forEach((currentCallback) => currentCallback(true));
		try {
			await this.handleClear();
		} finally {
			this.onClearCallbacks.forEach((currentCallback) => currentCallback(false));
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
	 * Registers a callback that will be called when the data is updated.
	 * @param {OnUpdateCallback<Input>} callback - The callback to register.
	 */
	public onUpdate(callback: OnUpdateCallback<Input>) {
		this.onUpdateCallbacks.add(callback);
	}

	/**
	 * Registers a callback to track async driver initialization state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback to register.
	 */
	public onInit(callback: OnActivityCallback): void {
		this.onInitCallbacks.add(callback);
	}

	/**
	 * Registers a callback to track async driver store state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback to register.
	 */
	public onStore(callback: OnActivityCallback): void {
		this.onStoreCallbacks.add(callback);
	}

	/**
	 * Registers a callback to track async driver hydrate state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback to register.
	 */
	public onHydrate(callback: OnActivityCallback): void {
		this.onHydrateCallbacks.add(callback);
	}

	/**
	 * Registers a callback to track async driver clear state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback to register.
	 */
	public onClear(callback: OnActivityCallback): void {
		this.onClearCallbacks.add(callback);
	}

	/**
	 * Registers a callback to track async driver unload state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback to register.
	 */
	public onUnload(callback: OnActivityCallback): void {
		this.onUnloadCallbacks.add(callback);
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

	/**
	 * Called when the storage driver is unloaded.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	protected abstract handleUnload(): Promise<boolean>;
}
