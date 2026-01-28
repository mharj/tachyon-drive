import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client} from '@aws-sdk/client-s3';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, type StorageDriverOptions, TachyonBandwidth} from 'tachyon-drive';

/**
 * The Tachyon driver configuration object for the AWS S3 storage driver with bucket and key.
 */
export type AwsS3StorageDriverOption = StorageDriverOptions & {
	awsClient: S3Client;
	awsBucket: string;
	awsKey: string;
};

/**
 * A storage driver that uses AWS S3 as a backend.
 *
 * @example
 * const driver = new AwsS3StorageDriver('AwsS3StorageDriver', new URL(`http://accessKeyId:secretAccessKey@localhost:9000/bucket/key?forcePathStyle=true&region=us-east-1`), bufferSerializer);
 */
export class AwsS3StorageDriver<Input> extends StorageDriver<Input, Buffer> {
	readonly #options: AwsS3StorageDriverOption;
	public constructor(
		opts: AwsS3StorageDriverOption,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
	) {
		super(opts, serializer, extNotify ?? null, processor);
		this.#options = opts;
	}

	protected handleInit(): boolean {
		return true;
	}

	protected handleUnload(): boolean {
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await this.#options.awsClient.send(
			new PutObjectCommand({
				Body: buffer,
				Bucket: this.#options.awsBucket,
				Key: this.#options.awsKey,
			}),
		);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		try {
			const response = await this.#options.awsClient.send(new GetObjectCommand({Bucket: this.#options.awsBucket, Key: this.#options.awsKey}));
			if (!response || !response.Body) {
				return undefined;
			}
			return Buffer.from(await response.Body.transformToByteArray());
		} catch (e) {
			if (e instanceof Error && e.name === 'NoSuchKey') {
				return undefined;
			}
			throw e;
		}
	}

	protected async handleClear(): Promise<void> {
		await this.#options.awsClient.send(
			new DeleteObjectCommand({
				Bucket: this.#options.awsBucket,
				Key: this.#options.awsKey,
			}),
		);
	}

	protected getDefaultBandwidth(): TachyonBandwidth {
		return TachyonBandwidth.VerySmall;
	}
}
