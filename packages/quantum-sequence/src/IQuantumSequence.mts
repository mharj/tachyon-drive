export interface IQuantumSequence {
	/**
	 * Initialize the storage driver and hydrate the data if it exists
	 */
	init(): Promise<void>;
	/**
	 * Clear storage driver and return initial store
	 */
	clear(): Promise<void>;
	/**
	 * Size of the sequence
	 */
	size(): Promise<number>;
}
