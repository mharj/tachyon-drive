import {TachyonBandwidth} from '../types/TachyonBandwidth.js';
import {StorageDriver} from './StorageDriver.js';

/**
 * A storage driver that stores data in memory.
 * @template Input - The type of the data to serialize and deserialize.
 * @template Output - The type of the data to store.
 * @since v0.6.0
 * @example
 * const driver: IStorageDriver<SomeType> = new MemoryStorageDriver<SomeType>('MemoryStorageDriver', serializer, null);
 */
export class MemoryStorageDriver<Input, Output> extends StorageDriver<Input, Output> {
	#data: Output | undefined;

	/**
	 * Set the data to store and emit an update.
	 * @param {Output | undefined} data - The data to store.
	 * @returns {Promise<void>} A promise that resolves when the data has been successfully stored.
	 */
	public setData(data: Output | undefined): Promise<void> {
		this.#data = data;
		return this.handleUpdate();
	}

	protected handleInit(): boolean {
		return true;
	}

	protected handleStore(data: Output): void {
		this.#data = data;
	}

	protected handleHydrate(): Output | undefined {
		return this.#data;
	}

	protected handleClear(): void {
		this.#data = undefined;
	}

	protected handleUnload(): boolean {
		this.#data = undefined;
		return true;
	}

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.VeryLarge;
	}
}
