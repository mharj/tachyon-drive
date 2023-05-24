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
	 * Stores the given data using the specified key.
	 * @param {Input} data - Promise that resolves to the data to store.
	 */
	store(data: Input): Promise<void>;
	/**
	 * Retrieves the stored data.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Input | undefined>} Promise that resolves to the stored data, or `undefined` if no data was stored.
	 */
	hydrate(options?: IHydrateOptions): Promise<Input | undefined>;
	/**
	 * Clears the stored data.
	 */
	clear(): Promise<void>;
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
	 * Unload the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	unload(): Promise<boolean>;

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
