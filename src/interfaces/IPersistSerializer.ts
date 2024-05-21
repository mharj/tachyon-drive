import type {ILoggerLike} from '@avanio/logger-like';

/**
 * Interface for a serializer that can serialize and deserialize data for persistence.
 * @template Input - The type of the data that is serialized and deserialized.
 * @template Output - The type of the data that is written to storage.
 * @template ValidateInput - The type of the data that is validated.
 */
export interface IPersistSerializer<Input, Output, ValidateInput = Input> {
	readonly name: string;
	/**
	 * Serialize data for store.
	 */
	serialize: (data: Input, logger: ILoggerLike | undefined) => Output;
	/**
	 * Deserialize data from store.
	 */
	deserialize: (value: Output, logger: ILoggerLike | undefined) => Input;
	/**
	 * Optional validator callback to validate the data after hydrate.
	 */
	validator?: (data: ValidateInput, logger: ILoggerLike | undefined) => boolean;
}

/**
 * Type guard function that checks if a value is an instance of `IPersistSerializer`.
 * @template Input - The type of the data that is serialized and deserialized.
 * @template Output - The type of the data that is written to storage.
 * @template ValidateInput - The type of the data that is validated.
 * @param {unknown} value - The value to check.
 * @returns {boolean} `true` if the value is an instance of `IPersistSerializer`, `false` otherwise.
 */
export function isValidPersistSerializer<Input, Output, ValidateInput = Input>(value: unknown): value is IPersistSerializer<Input, Output, ValidateInput> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'serialize' in value &&
		typeof value.serialize === 'function' &&
		'deserialize' in value &&
		typeof value.deserialize === 'function' &&
		('validator' in value ? typeof value.validator === 'function' : true)
	);
}
