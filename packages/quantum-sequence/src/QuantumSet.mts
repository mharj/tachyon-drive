import type {IStorageDriver} from 'tachyon-drive';
import type {IQuantumSet} from './IQuantumSet.mjs';
import {QuantumCore, type QuantumCoreOptions} from './QuantumCore.mjs';

export type QuantumSetStore<TValue> = Set<TValue>;

/**
 * A QuantumSet is a Set that is persisted to a storage driver when data is modified.
 *
 * Warning: when interacting with values, you must use the values() method to get the values before add/has/delete as hydrate will re-create objects in Set.
 * Or use QuantumKeySet or QuantumMap with primitive key instead.
 */
export class QuantumSet<TValue> extends QuantumCore<QuantumSetStore<TValue>> implements IQuantumSet<TValue> {
	public readonly name = 'QuantumSet';
	public constructor(driver: IStorageDriver<QuantumSetStore<TValue>>, options: QuantumCoreOptions = {}) {
		super(driver, new Set(), options);
	}

	public init(): Promise<void> {
		return this.coreInit();
	}

	/**
	 * Get a value from the set.
	 *
	 * Warning: this value must come from values() if not primitive as hydrate will re-create objects.
	 */
	public async has(value: TValue): Promise<boolean> {
		await this.coreInit();
		return this.data.has(value);
	}

	/**
	 * Add a value in the set.
	 */
	public add(value: TValue): Promise<void> {
		this.data.add(value);
		return this.coreStore();
	}

	/**
	 * Delete a value from the set.
	 *
	 * Warning: this value must come from values() if not primitive as hydrate will re-create objects.
	 */
	public async delete(value: TValue | TValue[]): Promise<boolean> {
		let deleted = false;
		const values = Array.isArray(value) ? value : [value];
		for (const current of values) {
			if (this.data.delete(current)) {
				deleted = true;
			}
		}
		await this.coreStore();
		return deleted;
	}

	public async values(): Promise<IterableIterator<TValue>> {
		await this.coreInit();
		return this.data.values();
	}

	public async size(): Promise<number> {
		await this.coreInit();
		return this.data.size;
	}

	public clear(): Promise<void> {
		return this.coreClear();
	}
}
