import type {TachyonBandwidth} from './TachyonBandwidth.js';

export type StorageDriverJson = {
	name: string;
	bandwidth: TachyonBandwidth;
	processor?: string;
	serializer: string;
};
