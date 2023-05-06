import type {ILoggerLike} from '@avanio/logger-like';

export interface IPersistSerializer<Input, Output, ValidateInput = Input> {
	/**
	 * Serialize data for store.
	 */
	serialize: (data: Input, logger: ILoggerLike | Console | undefined) => Output;
	/**
	 * Deserialize data from store.
	 */
	deserialize: (value: Output, logger: ILoggerLike | Console | undefined) => Input;
	/**
	 * Optional validator callback to validate the data after hydrate.
	 */
	validator?: (data: ValidateInput) => boolean;
}

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
