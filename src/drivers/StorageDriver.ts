import type {ILoggerLike} from '@avanio/logger-like';
import {IHydrateOptions, IStorageDriver, OnUpdateCallback} from '..';
import {IStoreProcessor, isValidStoreProcessor} from '../interfaces/IStoreProcessor';
import {IPersistSerializer, isValidPersistSerializer} from '../interfaces/IPersistSerializer';

export abstract class StorageDriver<Input, Output> implements IStorageDriver<Input> {
	public name: string;
	private processor: IStoreProcessor<Output> | undefined;
	private serializer: IPersistSerializer<Input, Output>;
	protected readonly logger: ILoggerLike | Console | undefined;
	private onUpdateCallbacks = new Set<OnUpdateCallback<Input>>();
	private _isInitialized = false;

	constructor(name: string, serializer: IPersistSerializer<Input, Output>, processor?: IStoreProcessor<Output>, logger?: ILoggerLike | Console) {
		if (!isValidPersistSerializer(serializer)) {
			throw new Error('Invalid serializer');
		}
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
	 * do pre-initialization of the store driver.
	 */
	public async init(): Promise<boolean> {
		if (!this._isInitialized) {
			this.logger?.debug(`${this.name}: init()`);
			this._isInitialized = await this.handleInit();
		}
		return this._isInitialized;
	}

	/**
	 * Store the data to store.
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
	 * Hydrate the data from store with optional validator callback.
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
	 * Clear the data from store.
	 */
	public async clear(): Promise<void> {
		this.logger?.debug(`${this.name}: clear()`);
		this._isInitialized = false;
		await this.handleClear();
	}

	/**
	 * Clone the data with the same serializer.
	 */
	public clone(data: Input): Input {
		return this.serializer.deserialize(this.serializer.serialize(data, this.logger), this.logger);
	}

	/**
	 * Listen for updates to the data.
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

	private async doHydrate(): Promise<Input | undefined> {
		let output = await this.handleHydrate();
		if (output) {
			if (this.processor) {
				output = await this.processor.postHydrate(output);
			}
			try {
				return this.serializer.deserialize(output, this.logger);
			} catch (err) {
				this.logger?.error(this.name, err);
			}
		}
		return undefined;
	}

	/**
	 * Implement this to do the actual initialization of the store driver.
	 */
	protected abstract handleInit(): Promise<boolean>;
	/**
	 * Implement this to do the actual store of the data.
	 */
	protected abstract handleStore(buffer: Output): Promise<void>;
	/**
	 * Implement this to do the actual hydrate of the data.
	 */
	protected abstract handleHydrate(): Promise<Output | undefined>;
	/**
	 * Implement this to do the actual clear of the data.
	 */
	protected abstract handleClear(): Promise<void>;
}
