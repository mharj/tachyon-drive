import type {ILoggerLike} from '@avanio/logger-like';
import {DeleteObjectCommand, GetObjectCommand, PutObjectCommand, type S3Client} from '@aws-sdk/client-s3';
import {type IExternalNotify, type IPersistSerializer, type IStoreProcessor, StorageDriver, TachyonBandwidth} from 'tachyon-drive';

/**
 * The Tachyon driver configuration object for the AWS S3 storage driver with bucket and key.
 */
export type AwsS3StorageDriverOption = {awsClient: S3Client; awsBucket: string; awsKey: string; logger?: ILoggerLike; TachyonBandwidth?: TachyonBandwidth};

/**
 * A storage driver that uses AWS S3 as a backend.
 *
 * @example
 * const driver = new AwsS3StorageDriver('AwsS3StorageDriver', new URL(`http://accessKeyId:secretAccessKey@localhost:9000/bucket/key?forcePathStyle=true&region=us-east-1`), bufferSerializer);
 */
export class AwsS3StorageDriver<Input> extends StorageDriver<Input, Buffer> {
	public readonly bandwidth: TachyonBandwidth;
	private _options: AwsS3StorageDriverOption;
	public constructor(
		name: string,
		opts: AwsS3StorageDriverOption,
		serializer: IPersistSerializer<Input, Buffer>,
		extNotify?: IExternalNotify,
		processor?: IStoreProcessor<Buffer>,
	) {
		super(name, serializer, extNotify ?? null, processor, opts?.logger);
		this._options = opts;
		this.bandwidth = opts?.TachyonBandwidth ?? TachyonBandwidth.VerySmall;
	}

	protected handleInit(): boolean {
		return true;
	}

	protected handleUnload(): boolean {
		return true;
	}

	protected async handleStore(buffer: Buffer): Promise<void> {
		await this._options.awsClient.send(
			new PutObjectCommand({
				Body: buffer,
				Bucket: this._options.awsBucket,
				Key: this._options.awsKey,
			}),
		);
	}

	protected async handleHydrate(): Promise<Buffer | undefined> {
		try {
			const response = await this._options.awsClient.send(new GetObjectCommand({Bucket: this._options.awsBucket, Key: this._options.awsKey}));
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
		await this._options.awsClient.send(
			new DeleteObjectCommand({
				Bucket: this._options.awsBucket,
				Key: this._options.awsKey,
			}),
		);
	}
}
