import {StorageDriver} from './StorageDriver';

/**
 * A storage driver that stores data in memory.
 * @template Input - The type of the data to serialize and deserialize.
 * @template Output - The type of the data to store.
 */
export class MemoryStorageDriver<Input, Output> extends StorageDriver<Input, Output> {
	private data: Output | undefined;

	/**
	 * Set the data to store and emit an update.
	 * @param {Output | undefined} data - The data to store.
	 */
	public async setData(data: Output | undefined): Promise<void> {
		this.data = data;
		this.handleUpdate();
	}

	protected handleInit(): Promise<boolean> {
		return Promise.resolve(true);
	}

	protected async handleStore(data: Output): Promise<void> {
		this.data = data;
		await this.handleUpdate();
	}

	protected async handleHydrate(): Promise<Output | undefined> {
		return this.data;
	}

	protected async handleClear(): Promise<void> {
		this.data = undefined;
	}

	protected async handleUnload(): Promise<boolean> {
		this.data = undefined;
		return true;
	}
}
