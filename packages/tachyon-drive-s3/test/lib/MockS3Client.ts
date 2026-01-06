import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client, type S3ClientResolvedConfig} from '@aws-sdk/client-s3';

export class MockS3Client implements S3Client {
	private static _memory = new Map<string, Buffer>();

	public config = {} as S3ClientResolvedConfig;

	public destroy(): void {
		// no-op
	}

	// biome-ignore lint/suspicious/noExplicitAny: mock
	public send(command: any, _options?: any, cb?: any): Promise<any> {
		if (cb) {
			return Promise.reject(new Error('Callback not supported in mock.'));
		}

		if (command instanceof PutObjectCommand) {
			const {Bucket, Key, Body} = command.input;
			if (Body instanceof Buffer) {
				MockS3Client._memory.set(`${Bucket}/${Key}`, Body);
			} else {
				return Promise.reject(new Error('Upload body type not implemented in mock.'));
			}
			return Promise.resolve({});
		}

		if (command instanceof GetObjectCommand) {
			const {Bucket, Key} = command.input;
			const data = MockS3Client._memory.get(`${Bucket}/${Key}`);
			if (!data) {
				const error = new Error('The specified key does not exist.');
				error.name = 'NoSuchKey';
				return Promise.reject(error);
			}
			return Promise.resolve({
				Body: {
					transformToByteArray: async () => new Uint8Array(data),
				},
			});
		}

		if (command instanceof DeleteObjectCommand) {
			const {Bucket, Key} = command.input;
			MockS3Client._memory.delete(`${Bucket}/${Key}`);
			return Promise.resolve({});
		}

		return Promise.reject(new Error(`Command ${command.constructor.name || 'Unknown'} not implemented in mock.`));
	}

	// biome-ignore lint/suspicious/noExplicitAny: mock
	public middlewareStack: any;
}
