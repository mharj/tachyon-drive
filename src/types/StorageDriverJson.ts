import type {TachyonBandwidth} from './TachyonBandwidth.js';

/**
 * JSON representation of a storage driver.
 * @since v0.8.0
 */
export type StorageDriverJson = {
	name: string;
	bandwidth: TachyonBandwidth;
	processor?: string;
	serializer: string;
};
