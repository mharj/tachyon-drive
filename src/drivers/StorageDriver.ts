import {ILoggerLike} from '../interfaces/ILoggerLike';
import {IStorageDriver, OnUpdateCallback} from '..';
import {IStoreProcessor} from '../interfaces/IStoreProcessor';
import {IPersistSerializer} from '../interfaces/IPersistSerializer';

export abstract class StorageDriver<Input, Output> implements IStorageDriver<Input> {
	public name: string;
	private processor: IStoreProcessor<Output> | undefined;
	private serializer: IPersistSerializer<Input, Output>;
	protected readonly logger: ILoggerLike | Console | undefined;
	private onUpdateCallbacks = new Set<OnUpdateCallback<Input>>();
	private _isInitialized = false;

	constructor(name: string, serializer: IPersistSerializer<Input, Output>, processor?: IStoreProcessor<Output>, logger?: ILoggerLike | Console) {
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
		let output = this.serializer.serialize(data);
		if (this.processor) {
			output = await this.processor.preStore(output);
		}
		await this.handleStore(output);
	}

	/**
	 * Hydrate the data from store.
	 */
	public async hydrate(): Promise<Input | undefined> {
		this.logger?.debug(`${this.name}: hydrate()`);
		await this.init();
		return this.doHydrate();
	}

	public async clear(): Promise<void> {
		this.logger?.debug(`${this.name}: clear()`);
		this._isInitialized = false;
		await this.handleClear();
	}

	/**
	 * Clone the data with the same serializer.
	 */
	public clone(data: Input): Input {
		return this.serializer.deserialize(this.serializer.serialize(data));
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
				return this.serializer.deserialize(output);
			} catch (err) {
				this.logger?.error(this.name, err);
			}
		}
		return undefined;
	}
	protected abstract handleInit(): Promise<boolean>;
	protected abstract handleStore(buffer: Output): Promise<void>;
	protected abstract handleHydrate(): Promise<Output | undefined>;
	protected abstract handleClear(): Promise<void>;
}
