/**
 * this interface is for building external update notifiers if driver does not internally support it.
 */
export interface IExternalNotify {
	/**
	 * Initializes the notifier.
	 * @returns A promise when the notifier was successfully initialized.
	 */
	init(): Promise<void>;

	/**
	 * Unload the notifier.
	 * @returns A promise when the notifier was successfully unloaded.
	 */
	unload(): Promise<void>;

	/**
	 * onUpdate callback registeration
	 */
	onUpdate(callback: (timeStamp: Date) => Promise<void>): void;
	/**
	 * Notify that the data has been updated. (in store and clear methods)
	 */
	notifyUpdate(timeStamp: Date): Promise<void>;
}
