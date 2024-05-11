import type {Result} from '@luolapeikko/result-option';
import type TypedEmitter from 'typed-emitter';

export type StorageDriverEvents<Input> = {
	hydrate: (isHydrating: boolean) => void;
	init: (isInitializing: boolean) => void;
	store: (isWriting: boolean) => void;
	update: (data: Input | undefined) => void;
	clear: (isClearing: boolean) => void;
	unload: (isUnloading: boolean) => void;
};

/**
 * Event emitter for the storage driver.
 */
export type StorageDriverEventEmitter<Input> = TypedEmitter<StorageDriverEvents<Input>>;

/**
 * Constructor for the storage driver event emitter.
 * @example
 * (EventEmitter as StorageDriverEventEmitterConstructor)<Input>
 */
export type StorageDriverEventEmitterConstructor = {new <Input>(): StorageDriverEventEmitter<Input>};

/**
 * Interface for options to use when hydrating data.
 */
export interface IHydrateOptions {
	validationThrowsError?: boolean;
}

/**
 * Interface for a storage driver that provides a simple interface for storing and retrieving data using a specified storage mechanism.
 * @template Input - The type of the data to store and retrieve.
 */
export interface IStorageDriver<Input> extends StorageDriverEventEmitter<Input> {
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
	 * @returns A boolean or promise of boolean that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	init(): boolean | Promise<boolean>;

	/**
	 * Initializes the storage driver and returns the Promise of Result.
	 * @returns {Promise<Result<boolean>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	initResult(): Result<boolean> | Promise<Result<boolean>>;
	/**
	 * Stores the given data using the specified key.
	 * @param {Input} data - Promise that resolves to the data to store.
	 * @returns {Promise<void>} Promise that resolves when the data has been stored.
	 */
	store(data: Input): void | Promise<void>;

	/**
	 * Stores the given data using the specified key and returns the Promise of Result.
	 * @param {Input} data - Promise that resolves to the data to store.
	 * @returns {Promise<Result<void>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	storeResult(data: Input): Result<void> | Promise<Result<void>>;
	/**
	 * Retrieves the stored data.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Input | undefined>} Promise that resolves to the stored data, or `undefined` if no data was stored.
	 */
	hydrate(options?: IHydrateOptions): Input | undefined | Promise<Input | undefined>;

	/**
	 * Retrieves the stored data and returns the Promise of Result.
	 * @param {IHydrateOptions} options - The options to use for hydrating the data.
	 * @returns {Promise<Result<Input | undefined>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	hydrateResult(options?: IHydrateOptions): Result<Input | undefined> | Promise<Result<Input | undefined>>;
	/**
	 * Clears the stored data.
	 */
	clear(): void | Promise<void>;

	/**
	 * Clears the stored data and returns the Promise of Result.
	 * @returns {Promise<Result<void>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	clearResult(): Result<void> | Promise<Result<void>>;

	/**
	 * Unload the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	unload(): boolean | Promise<boolean>;

	/**
	 * Unload the storage driver and returns the Promise of Result.
	 * @returns {Promise<Result<boolean>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	unloadResult(): Result<boolean> | Promise<Result<boolean>>;

	/**
	 * Clone the data
	 * @param {Input} data
	 */
	clone(data: Input): Input;
}
