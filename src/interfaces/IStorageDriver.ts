import type {Result} from '@luolapeikko/result-option';

/**
 * Interface for options to use when hydrating data.
 */
export interface IHydrateOptions {
	validationThrowsError?: boolean;
}

/**
 * Callback function type for when the data is updated in storage.
 */
export type OnUpdateCallback<Input> = (data: Input | undefined) => void;

export type OnActivityCallback = (state: boolean) => void;
/**
 * Interface for a storage driver that provides a simple interface for storing and retrieving data using a specified storage mechanism.
 * @template Input - The type of the data to store and retrieve.
 */
export interface IStorageDriver<Input> {
	/**
	 * Indicates whether or not the storage driver has been initialized.
	 */
	readonly isInitialized: boolean;
	/**
	 * The name of the storage driver.
	 */
	readonly name: string;
	/**
	 * Initializes the storage driver.
	 * @returns A promise that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	init(): Promise<boolean>;

	/**
	 * Initializes the storage driver and returns the Promise of Result.
	 * @returns {Promise<Result<boolean>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	initResult(): Promise<Result<boolean>>;
	/**
	 * Stores the given data using the specified key.
	 * @param {Input} data - Promise that resolves to the data to store.
	 * @returns {Promise<void>} Promise that resolves when the data has been stored.
	 */
	store(data: Input): Promise<void>;

	/**
	 * Stores the given data using the specified key and returns the Promise of Result.
	 * @param {Input} data - Promise that resolves to the data to store.
	 * @returns {Promise<Result<void>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	storeResult(data: Input): Promise<Result<void>>;
	/**
	 * Retrieves the stored data.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Input | undefined>} Promise that resolves to the stored data, or `undefined` if no data was stored.
	 */
	hydrate(options?: IHydrateOptions): Promise<Input | undefined>;

	/**
	 * Retrieves the stored data and returns the Promise of Result.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Result<Input | undefined>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	hydrateResult(options?: IHydrateOptions): Promise<Result<Input | undefined>>;
	/**
	 * Clears the stored data.
	 */
	clear(): Promise<void>;

	/**
	 * Clears the stored data and returns the Promise of Result.
	 * @returns {Promise<Result<void>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	clearResult(): Promise<Result<void>>;

	/**
	 * Unload the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	unload(): Promise<boolean>;

	/**
	 * Unload the storage driver and returns the Promise of Result.
	 * @returns {Promise<Result<boolean>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	unloadResult(): Promise<Result<boolean>>;

	/**
	 * Clone the data
	 * @param {Input} data
	 */
	clone(data: Input): Input;
	/**
	 * Callback function type for when the data is updated in storage.
	 * @param {OnUpdateCallback<Input>} callback
	 */
	onUpdate(callback: OnUpdateCallback<Input>): void;

	/**
	 * Event callback to track async driver initialization state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback function which tells boolean state of initialization.
	 */
	onInit(callback: OnActivityCallback): void;

	/**
	 * Event callback to track async driver store state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback function which tells boolean state of data store.
	 */
	onStore(callback: OnActivityCallback): void;

	/**
	 * Event callback to track async driver hydrate state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback function which tells boolean state of data hydrate.
	 */
	onHydrate(callback: OnActivityCallback): void;

	/**
	 * Event callback to track async driver clear state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback function which tells boolean state of data clear.
	 */
	onClear(callback: OnActivityCallback): void;

	/**
	 * Event callback to track async driver unload state changes (begin and end)
	 * @param {OnActivityCallback} callback - The callback function which tells boolean state of unload.
	 */
	onUnload(callback: OnActivityCallback): void;
}
