import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_MEASURE_POWER_SECS,
    getEffectiveMeasurePowerSecs,
    getStaleThresholdSeconds,
    getStaleCheckIntervalMs,
    buildStaleTooltip,
} from '../../src/ui/statusBarHelpers';

test('effective measure power secs falls back for invalid values', () => {
    assert.equal(getEffectiveMeasurePowerSecs(-1), DEFAULT_MEASURE_POWER_SECS);
    assert.equal(getEffectiveMeasurePowerSecs(Number.NaN), DEFAULT_MEASURE_POWER_SECS);
    assert.equal(getEffectiveMeasurePowerSecs(2), 2);
});

test('stale threshold is max(min threshold, measure_power_secs * multiplier)', () => {
    assert.equal(getStaleThresholdSeconds(2), 10);
    assert.equal(getStaleThresholdSeconds(5), 15);
});

test('stale check interval is bounded and derived from measure_power_secs', () => {
    assert.equal(getStaleCheckIntervalMs(1), 1000);
    assert.equal(getStaleCheckIntervalMs(4), 2000);
    assert.equal(getStaleCheckIntervalMs(20), 5000);
});

test('stale tooltip formatting is stable and readable', () => {
    const tooltip = buildStaleTooltip(12.8, 5);
    assert.equal(
        tooltip,
        'CodeCarbon Tracker\n\nLatest metrics are stale (12s old, expected about every 5s).\nClick to stop tracking.',
    );
});
