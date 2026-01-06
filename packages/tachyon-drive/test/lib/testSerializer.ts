import type {z} from 'zod';
import type {IPersistSerializer} from '../../src/index.js';

export class ControlledJsonSerializer<Schema extends z.ZodType> implements IPersistSerializer<z.infer<Schema>, Buffer> {
	public readonly name = 'ControlledSerializer';
	private readonly dataSchema: Schema;
	private throwKey: 'serialize' | 'deserialize' | 'validator' | undefined;
	public constructor(dataSchema: Schema) {
		this.dataSchema = dataSchema;
	}

	public setThrows(key: 'serialize' | 'deserialize' | 'validator' | undefined): void {
		this.throwKey = key;
	}

	public serialize(data: z.infer<Schema>): Buffer {
		if (this.throwKey === 'serialize') {
			throw new Error('serialize');
		}
		return Buffer.from(JSON.stringify(data));
	}

	public deserialize(buffer: Buffer): z.infer<Schema> {
		if (this.throwKey === 'deserialize') {
			throw new Error('deserialize');
		}
		return JSON.parse(buffer.toString()) as z.infer<Schema>;
	}

	public validator(data: z.infer<Schema>): boolean {
		if (this.throwKey === 'validator') {
			throw new Error('validator');
		}
		return this.dataSchema.safeParse(data).success;
	}
}
