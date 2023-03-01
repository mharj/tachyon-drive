import {StorageDriver} from './StorageDriver';

export class MemoryStorageDriver<Input, Output> extends StorageDriver<Input, Output> {
	private data: Output | undefined;

	protected handleInit(): Promise<boolean> {
		return Promise.resolve(true);
	}

	protected async handleStore(data: Output): Promise<void> {
		this.data = data;
	}

	protected async handleHydrate(): Promise<Output | undefined> {
		return this.data;
	}

	protected async handleClear(): Promise<void> {
		this.data = undefined;
	}
}
