import {ILoggerLike} from './ILoggerLike';

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
