import {StorageDriver, TachyonBandwidth} from '../../src/index.js';

export class TestMemoryStorageDriver<Input, Output> extends StorageDriver<Input, Output> {
	public readonly bandwidth = TachyonBandwidth.VeryLarge;
	private data: Output | undefined;
	private throwKey: 'init' | 'store' | 'hydrate' | 'clear' | 'unload' | undefined;

	public setThrows(key: 'init' | 'store' | 'hydrate' | 'clear' | 'unload' | undefined) {
		this.throwKey = key;
	}

	/**
	 * Set the data to store and emit an update.
	 * @param {Output | undefined} data - The data to store.
	 */
	public setData(data: Output | undefined) {
		this.data = data;
		return this.handleUpdate();
	}

	protected handleInit() {
		if (this.throwKey === 'init') {
			throw new Error('init');
		}
		return true;
	}

	protected handleStore(data: Output) {
		if (this.throwKey === 'store') {
			throw new Error('store');
		}
		this.data = data;
	}

	protected handleHydrate() {
		if (this.throwKey === 'hydrate') {
			throw new Error('hydrate');
		}
		return this.data;
	}

	protected handleClear() {
		if (this.throwKey === 'clear') {
			throw new Error('clear');
		}
		this.data = undefined;
	}

	protected handleUnload() {
		if (this.throwKey === 'unload') {
			throw new Error('unload');
		}
		this.data = undefined;
		return true;
	}
}