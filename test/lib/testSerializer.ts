import {type IPersistSerializer} from '../../src/index.js';
import {type z} from 'zod';

export class ControlledJsonSerializer<Data> implements IPersistSerializer<Data, Buffer> {
	public readonly name = 'ControlledSerializer';
	private readonly dataSchema: z.AnyZodObject;
	private throwKey: 'serialize' | 'deserialize' | 'validator' | undefined;
	constructor(dataSchema: z.AnyZodObject) {
		this.dataSchema = dataSchema;
	}

	public setThrows(key: 'serialize' | 'deserialize' | 'validator' | undefined) {
		this.throwKey = key;
	}

	public serialize(data: Data): Buffer {
		if (this.throwKey === 'serialize') {
			throw new Error('serialize');
		}
		return Buffer.from(JSON.stringify(data));
	}

	public deserialize(buffer: Buffer): Data {
		if (this.throwKey === 'deserialize') {
			throw new Error('deserialize');
		}
		return JSON.parse(buffer.toString()) as Data;
	}

	public validator(data: Data): boolean {
		if (this.throwKey === 'validator') {
			throw new Error('validator');
		}
		return this.dataSchema.safeParse(data).success;
	}
}
