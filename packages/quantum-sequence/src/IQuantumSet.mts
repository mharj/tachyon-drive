import type {IQuantumSequence} from './IQuantumSequence.mjs';

/**
 * This is the simple Set style interface for the QuantumSet class implementation.
 */
export interface IQuantumSet<TValue> extends IQuantumSequence {
	has(value: TValue): Promise<boolean>;
	add(value: TValue): Promise<void>;
	delete(value: TValue | TValue[]): Promise<boolean>;
	values(): Promise<IterableIterator<TValue>>;
}
