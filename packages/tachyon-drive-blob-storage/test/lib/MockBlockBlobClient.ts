import type {
	BlobDeleteIfExistsResponse,
	BlobDeleteOptions,
	BlobExistsOptions,
	BlockBlobUploadOptions,
	BlockBlobUploadResponse,
	HttpRequestBody,
} from '@azure/storage-blob';
import type {AzureBlockBlobClient} from '../../src/index';

export class MockBlockBlobClient implements AzureBlockBlobClient {
	private static _memory = new Map<string, Buffer>();

	public get name(): string {
		return 'test';
	}
	public get containerName(): string {
		return 'test';
	}
	public get url(): string {
		return `http://localhost/${this.containerName}/${this.name}`;
	}

	public upload(body: HttpRequestBody, _contentLength: number, _options?: BlockBlobUploadOptions): Promise<BlockBlobUploadResponse> {
		if (body instanceof Buffer) {
			MockBlockBlobClient._memory.set(this.url, body);
		} else {
			return Promise.reject(new Error('Upload body type not implemented in mock.'));
		}
		return Promise.resolve({} as BlockBlobUploadResponse);
	}

	public exists(_options?: BlobExistsOptions): Promise<boolean> {
		return Promise.resolve(MockBlockBlobClient._memory.has(this.url));
	}
	public deleteIfExists(_options?: BlobDeleteOptions): Promise<BlobDeleteIfExistsResponse> {
		const existed = MockBlockBlobClient._memory.delete(this.url);
		return Promise.resolve({succeeded: existed} as BlobDeleteIfExistsResponse);
	}
	public downloadToBuffer(_buffer?: unknown, _offset?: unknown, _count?: unknown, _options?: unknown): Promise<Buffer> {
		const data = MockBlockBlobClient._memory.get(this.url);
		return data ? Promise.resolve(data) : Promise.reject(new Error('Blob not found.'));
	}
}
