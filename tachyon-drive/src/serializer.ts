import {type ILoggerLike} from '@avanio/logger-like';
import {type IPersistSerializer} from './interfaces/IPersistSerializer.js';

/**
 * Chains two serializers together.
 * @template CurrentInput - The type of the data that is serialized and deserialized by the current serializer.
 * @template CurrentOutput - The type of the data that is written to storage by the current serializer.
 * @template TargetOutput - The type of the data that is written to storage by the next serializer.
 * @param {IPersistSerializer} current - The current serializer.
 * @param {IPersistSerializer} nextSer - The next serializer.
 * @returns {IPersistSerializer} The chained serializer.
 * @since v0.7.0
 * @example
 * const baseSerializer: IPersistSerializer<Data, string> = {
 *   name: 'BaseSerializer',
 *   serialize: (data: Data) => JSON.stringify(data),
 *   deserialize: (buffer: string) => JSON.parse(buffer),
 *   validator: (data: Data) => dataSchema.safeParse(data).success,
 * };
 *
 * const strToBufferSerializer: IPersistSerializer<string, Buffer> = {
 *   name: 'StrToBufferSerializer',
 *   serialize: (data: string) => Buffer.from(data),
 *   deserialize: (buffer: Buffer) => buffer.toString(),
 *   validator: (data: string) => typeof data === 'string', // optional deserialization validation
 * };
 *
 * const bufferSerializer: IPersistSerializer<Data, Buffer> = nextSerializer<Data, string, Buffer>(baseSerializer, strToBufferSerializer);
 */
export function nextSerializer<CurrentInput, CurrentOutput, TargetOutput>(
	current: IPersistSerializer<CurrentInput, CurrentOutput>,
	nextSer: IPersistSerializer<CurrentOutput, TargetOutput>,
): IPersistSerializer<CurrentInput, TargetOutput> {
	return {
		name: `${current.name} => ${nextSer.name}`,
		serialize: (data: CurrentInput, logger: ILoggerLike | undefined): TargetOutput => {
			return nextSer.serialize(current.serialize(data, logger), logger);
		},
		deserialize: (data: TargetOutput, logger: ILoggerLike | undefined): CurrentInput => {
			return current.deserialize(nextSer.deserialize(data, logger), logger);
		},
		validator: async (data: CurrentInput, logger: ILoggerLike | undefined): Promise<boolean> => {
			const firstValidation = await current.validator?.(data, logger);
			if (firstValidation === false) {
				return false;
			}
			const secondValidation = await nextSer.validator?.(current.serialize(data, logger), logger); // double serialization to ensure the data is in the correct format
			return secondValidation !== false; // undefined = no validation = true
		},
	};
}
