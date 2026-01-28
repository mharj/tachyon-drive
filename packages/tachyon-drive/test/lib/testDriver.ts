import {StorageDriver, TachyonBandwidth} from '../../src/index.js';

export class TestMemoryStorageDriver<Input, Output> extends StorageDriver<Input, Output> {
	private data: Output | undefined;
	private throwKey: 'init' | 'store' | 'hydrate' | 'clear' | 'unload' | undefined;

	public setThrows(key: 'init' | 'store' | 'hydrate' | 'clear' | 'unload' | undefined): void {
		this.throwKey = key;
	}

	/**
	 * Set the data to store and emit an update.
	 * @param {Output | undefined} data - The data to store.
	 * @returns {Promise<void>} A promise that resolves when the data has been successfully stored.
	 */
	public setData(data: Output | undefined): Promise<void> {
		this.data = data;
		return this.handleUpdate();
	}

	protected handleInit(): boolean {
		if (this.throwKey === 'init') {
			throw new Error('init');
		}
		return true;
	}

	protected handleStore(data: Output): void {
		if (this.throwKey === 'store') {
			throw new Error('store');
		}
		this.data = data;
	}

	protected handleHydrate(): Output | undefined {
		if (this.throwKey === 'hydrate') {
			throw new Error('hydrate');
		}
		return this.data;
	}

	protected handleClear(): void {
		if (this.throwKey === 'clear') {
			throw new Error('clear');
		}
		this.data = undefined;
	}

	protected handleUnload(): boolean {
		if (this.throwKey === 'unload') {
			throw new Error('unload');
		}
		this.data = undefined;
		return true;
	}

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.VeryLarge;
	}
}
