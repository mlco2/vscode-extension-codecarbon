import test from 'node:test';
import assert from 'node:assert/strict';
import { canStartTracker, canStopTracker } from '../../src/services/trackerLifecycle';

test('canStartTracker only when not running and installed', () => {
    assert.equal(canStartTracker({ isRunning: false, isInstalled: true }), true);
    assert.equal(canStartTracker({ isRunning: true, isInstalled: true }), false);
    assert.equal(canStartTracker({ isRunning: false, isInstalled: false }), false);
});

test('canStopTracker only when running', () => {
    assert.equal(canStopTracker(true), true);
    assert.equal(canStopTracker(false), false);
});
