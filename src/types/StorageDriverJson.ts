import type {TachyonBandwidth} from './TachyonBandwidth';

export type StorageDriverJson = {
	name: string;
	bandwidth: TachyonBandwidth;
	processor?: string;
	serializer: string;
};
