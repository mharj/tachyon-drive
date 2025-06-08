import {type ILoggerLike} from '@avanio/logger-like';
import type Sinon from 'sinon';
import {spy} from 'sinon';

const logDebugSpy = spy();
const logInfoSpy = spy();
const logWarnSpy = spy();
const logErrorSpy = spy();

/**
 * Resets the call history for all logger spies (debug, info, warn, error).
 * This is useful for ensuring clean state in tests that rely on logging behavior.
 */
export function resetLoggerSpies(): void {
	logDebugSpy.resetHistory();
	logInfoSpy.resetHistory();
	logWarnSpy.resetHistory();
	logErrorSpy.resetHistory();
}

export const sinonLoggerSpy: {
	debug: Sinon.SinonSpy<any[], any>;
	error: Sinon.SinonSpy<any[], any>;
	info: Sinon.SinonSpy<any[], any>;
	warn: Sinon.SinonSpy<any[], any>;
} = {
	debug: logDebugSpy,
	error: logErrorSpy,
	info: logInfoSpy,
	warn: logWarnSpy,
} satisfies ILoggerLike;
