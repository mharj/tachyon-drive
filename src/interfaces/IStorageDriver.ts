import type EventEmitter from 'events';
import type {IResult} from '@luolapeikko/result-option';
import type {AsJson} from '@luolapeikko/ts-common';
import type {StorageDriverJson} from '../types/StorageDriverJson.js';
import type {TachyonBandwidth} from '../types/TachyonBandwidth.js';
import {type IPersistSerializer} from './IPersistSerializer.js';
import {type IStoreProcessor} from './IStoreProcessor.js';

/**
 * Events emitted by the storage driver.
 * @since v0.9.0
 */
export type StorageDriverEventsMap<Input> = {
	hydrate: [isHydrating: boolean];
	init: [isInitializing: boolean];
	store: [isWriting: boolean];
	update: [data: Input | undefined];
	clear: [isClearing: boolean];
	unload: [isUnloading: boolean];
};

/**
 * Interface for options to use when hydrating data.
 * @since v0.0.8
 */
export interface IHydrateOptions {
	validationThrowsError?: boolean;
	deserializationThrowsError?: boolean;
}

/**
 * Interface for a storage driver that provides a simple interface for storing and retrieving data using a specified storage mechanism.
 * @template Input - The type of the data to store and retrieve.
 * @template Output - The type of the data to serialize and deserialize.
 * @template JsonOutput - The type of the data from the JSON representation of the storage driver.
 * @since v0.11.0
 */
export interface IStorageDriver<Input, Output = unknown, JsonOutput extends StorageDriverJson = StorageDriverJson>
	extends EventEmitter<StorageDriverEventsMap<Input>> {
	/**
	 * Indicates the speed of the storage driver.
	 */
	readonly bandwidth: TachyonBandwidth;
	/**
	 * Indicates whether or not the storage driver has been initialized.
	 */
	readonly isInitialized: boolean;
	/**
	 * The name of the storage driver.
	 */
	readonly name: string;

	/**
	 * Get current processor (after init)
	 */
	readonly processor: IStoreProcessor<Output> | undefined;

	/**
	 * Get Current serializer
	 */
	readonly serializer: IPersistSerializer<Input, Output>;
	/**
	 * Initializes the storage driver.
	 * @returns A boolean or promise of boolean that resolves to `true` if the storage driver was successfully initialized, or `false` otherwise.
	 */
	init(): boolean | Promise<boolean>;

	/**
	 * Initializes the storage driver and returns the Promise of Result.
	 * @returns {Promise<Result<boolean>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	initResult(): IResult<boolean> | Promise<IResult<boolean>>;
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
	storeResult(data: Input): IResult<void> | Promise<IResult<void>>;
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
	hydrateResult(options?: IHydrateOptions): IResult<Input | undefined> | Promise<IResult<Input | undefined>>;
	/**
	 * Clears the stored data.
	 */
	clear(): void | Promise<void>;

	/**
	 * Clears the stored data and returns the Promise of Result.
	 * @returns {Promise<Result<void>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	clearResult(): IResult<void> | Promise<IResult<void>>;

	/**
	 * Unload the storage driver.
	 * @returns {Promise<boolean>} A promise that resolves to `true` if the storage driver was successfully unloaded, or `false` otherwise.
	 */
	unload(): boolean | Promise<boolean>;

	/**
	 * Unload the storage driver and returns the Promise of Result.
	 * @returns {Promise<Result<boolean>>} Promise of the result object, see [Result](https://mharj.github.io/result/)
	 */
	unloadResult(): IResult<boolean> | Promise<IResult<boolean>>;

	/**
	 * Clone the data
	 * @param {Input} data
	 */
	clone(data: Input): Input;

	/**
	 * Clone the data and return the Result
	 * @param {Input} data
	 */
	cloneResult(data: Input): IResult<Input>;

	/**
	 * Returns a JSON representation of the storage driver
	 */
	toJSON(): AsJson<JsonOutput>;

	/**
	 * Returns a string representation of the storage driver.
	 */
	toString(): string;
}
