import {type IPersistSerializer} from 'tachyon-drive';

/**
 * Common serializer that serializes and deserializes string data to and from a Buffer. (for chain serialization)
 * @param {string} data - The string data to serialize.
 * @param {Buffer} buffer - The Buffer data to deserialize.
 * @returns {IPersistSerializer<string, Buffer>} - serializer for string to Buffer
 */
export const strToBufferSerializer: IPersistSerializer<string, Buffer> = {
	name: 'StringToBuffer',
	serialize: (data: string): Buffer => Buffer.from(data),
	deserialize: (buffer: Buffer): string => buffer.toString(),
	validator: (data: string): boolean => typeof data === 'string',
};
