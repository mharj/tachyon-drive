import {StorageDriver} from './StorageDriver';

/**
 * A storage driver that stores data in memory.
 * @template Input - The type of the data to serialize and deserialize.
 * @template Output - The type of the data to store.
 * @example
 * const driver: IStorageDriver<SomeType> = new MemoryStorageDriver<SomeType>('MemoryStorageDriver', serializer, null);
 */
export class MemoryStorageDriver<Input, Output> extends StorageDriver<Input, Output> {
	private data: Output | undefined;

	/**
	 * Set the data to store and emit an update.
	 * @param {Output | undefined} data - The data to store.
	 */
	public setData(data: Output | undefined) {
		this.data = data;
		return this.handleUpdate();
	}

	protected handleInit() {
		return true;
	}

	protected handleStore(data: Output) {
		this.data = data;
	}

	protected handleHydrate() {
		return this.data;
	}

	protected handleClear() {
		this.data = undefined;
	}

	protected handleUnload() {
		this.data = undefined;
		return true;
	}
}
