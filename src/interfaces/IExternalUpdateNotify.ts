import type EventEmitter from 'events';

/**
 * The events that the external notify event emitter can emit.
 */
export type ExternalNotifyEventsMap = {
	update: [timeStamp: Date];
};

/**
 * this interface is for building external update notifiers if driver does not internally support it.
 */
export interface IExternalNotify extends EventEmitter<ExternalNotifyEventsMap> {
	/**
	 * Initializes the notifier.
	 * @returns A promise when the notifier was successfully initialized.
	 */
	init(): void | Promise<void>;

	/**
	 * Unload the notifier.
	 * @returns A promise when the notifier was successfully unloaded.
	 */
	unload(): void | Promise<void>;

	/**
	 * Notify that the data has been updated. (in store and clear methods)
	 */
	notifyUpdate(timeStamp: Date): void | Promise<void>;
}
