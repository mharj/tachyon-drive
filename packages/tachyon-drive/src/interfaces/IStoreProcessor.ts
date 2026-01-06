/**
 * Interface for a store processor that processes data before it is written to storage and after it is loaded from storage.
 * @template Output - The type of the data that is written to storage.
 * @since v0.0.1
 */
export interface IStoreProcessor<Output> {
	readonly name: string;
	/**
	 * Pre-process the data before it is stored to storage.
	 */
	preStore(data: Output): Output | Promise<Output>;
	/**
	 * Post-process the data after it is hydrated from storage.
	 */
	postHydrate(data: Output): Output | Promise<Output>;
}

/**
 * Type guard function that checks if a value is an instance of `IStoreProcessor`.
 * @template Output - The type of the data that is written to storage.
 * @param {unknown} value - The value to check.
 * @returns {boolean} `true` if the value is an instance of `IStoreProcessor`, `false` otherwise.
 * @since v0.0.5
 */
export function isValidStoreProcessor<Output>(value: unknown): value is IStoreProcessor<Output> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'name' in value &&
		typeof value.name === 'string' &&
		'preStore' in value &&
		typeof value.preStore === 'function' &&
		'postHydrate' in value &&
		typeof value.postHydrate === 'function'
	);
}
