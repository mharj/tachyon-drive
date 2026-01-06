import type {ILoggerLike} from '@avanio/logger-like';
import {vi} from 'vitest';

const logDebugSpy = vi.fn();
const logInfoSpy = vi.fn();
const logWarnSpy = vi.fn();
const logErrorSpy = vi.fn();

/**
 * Resets the call history for all logger spies (debug, info, warn, error).
 * This is useful for ensuring clean state in tests that rely on logging behavior.
 */
export function resetLoggerSpies(): void {
	logDebugSpy.mockReset();
	logInfoSpy.mockReset();
	logWarnSpy.mockReset();
	logErrorSpy.mockReset();
}

export const sinonLoggerSpy = {
	debug: logDebugSpy,
	error: logErrorSpy,
	info: logInfoSpy,
	warn: logWarnSpy,
} as const satisfies ILoggerLike;
