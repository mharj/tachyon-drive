import type {IQuantumSequence} from './IQuantumSequence.mjs';

/**
 * This is the simple Map style interface for the QuantumMap class implementation.
 */
export interface IQuantumMap<TKey, TValue> extends IQuantumSequence {
	has(key: TKey): Promise<boolean>;
	get(key: TKey): Promise<TValue | undefined>;
	set(key: TKey, value: TValue): Promise<void>;
	delete(key: TKey | TKey[]): Promise<boolean>;
	entries(): Promise<IterableIterator<[TKey, TValue]>>;
	values(): Promise<IterableIterator<TValue>>;
	keys(): Promise<IterableIterator<TKey>>;
}
