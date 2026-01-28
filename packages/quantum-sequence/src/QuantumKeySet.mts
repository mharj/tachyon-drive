import type {IStorageDriver} from 'tachyon-drive';
import type {IQuantumMap} from './IQuantumMap.mjs';
import {QuantumCore, type QuantumCoreOptions} from './QuantumCore.mjs';

type QuantumKey<TValue> = keyof TValue;
type QuantumKeyValue<TValue> = TValue[keyof TValue];
export type QuantumKeySetStore<TValue> = Set<TValue>;

/**
 * primitive key value we can compare on lookup
 */
type QuantumPrimitiveBuildCallback<TValue> = (value: QuantumKeyValue<TValue>) => number | string | boolean;

export type QuantumKeySetOptions<TValue, LookupKey extends QuantumKey<TValue>> = QuantumCoreOptions & {
	readonly lookupKey: LookupKey;
	readonly lookupValueBuilder: QuantumPrimitiveBuildCallback<TValue>;
};

export class QuantumKeySet<TValue, LookupKey extends QuantumKey<TValue>>
	extends QuantumCore<QuantumKeySetStore<TValue>>
	implements IQuantumMap<QuantumKeyValue<TValue>, TValue>
{
	public readonly name = 'QuantumKeySet';
	private lookupKey: LookupKey;
	private lookupValueBuilder: QuantumPrimitiveBuildCallback<TValue>;
	public constructor(options: QuantumKeySetOptions<TValue, LookupKey>, driver: IStorageDriver<QuantumKeySetStore<TValue>>) {
		super(driver, new Set(), options);
		this.lookupKey = options.lookupKey;
		this.lookupValueBuilder = options.lookupValueBuilder;
	}

	public async has(key: QuantumKeyValue<TValue>): Promise<boolean> {
		await this.coreInit();
		return Array.from(this.data).some(this.filterSetWithKey(key));
	}

	public async get(key: QuantumKeyValue<TValue>): Promise<TValue | undefined> {
		await this.coreInit();
		return Array.from(this.data).find(this.filterSetWithKey(key));
	}

	public async set(key: QuantumKeyValue<TValue>, value: TValue): Promise<void> {
		const oldValue = await this.get(key);
		if (oldValue) {
			this.data.delete(oldValue);
		}
		this.data.add(value);
		await this.coreStore();
	}

	public async delete(key: QuantumKeyValue<TValue> | QuantumKeyValue<TValue>[]): Promise<boolean> {
		let deleted = false;
		const keys = Array.isArray(key) ? key : [key];
		for (const key of keys) {
			const oldValue = await this.get(key);
			if (oldValue) {
				this.data.delete(oldValue);
				deleted = true;
			}
		}
		await this.coreStore();
		return deleted;
	}

	public async size(): Promise<number> {
		await this.coreInit();
		return this.data.size;
	}

	public async entries(): Promise<IterableIterator<[QuantumKeyValue<TValue>, TValue]>> {
		await this.coreInit();
		const entryArray = Array.from(this.data).map<[QuantumKeyValue<TValue>, TValue]>((value) => [value[this.lookupKey], value]);
		return entryArray[Symbol.iterator]();
	}

	public async values(): Promise<IterableIterator<TValue>> {
		await this.coreInit();
		return this.data.values();
	}

	public async keys(): Promise<IterableIterator<QuantumKeyValue<TValue>>> {
		await this.coreInit();
		const keyArray = Array.from(this.data).map<QuantumKeyValue<TValue>>((value) => value[this.lookupKey]);
		return keyArray[Symbol.iterator]();
	}

	public init(): Promise<void> {
		return this.coreInit();
	}

	public clear(): Promise<void> {
		return this.coreClear();
	}

	private filterSetWithKey(key: QuantumKeyValue<TValue>): (value: TValue) => boolean {
		const primitiveKey = this.buildLookupCompareValue(key);
		return (value: TValue) => this.buildLookupCompareValue(value[this.lookupKey]) === primitiveKey;
	}

	private buildLookupCompareValue(value: QuantumKeyValue<TValue>): string | number | boolean {
		const primitiveValue = this.lookupValueBuilder(value);
		if (typeof primitiveValue === 'string' || typeof primitiveValue === 'number' || typeof primitiveValue === 'boolean') {
			return primitiveValue;
		}
		/* c8 ignore next 2 */
		throw new TypeError(`${this.name}: lookupValueBuilder callback function must return key as a string, number or boolean value.`);
	}
}
