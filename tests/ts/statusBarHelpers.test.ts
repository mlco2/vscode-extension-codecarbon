import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_MEASURE_POWER_SECS,
    getEffectiveMeasurePowerSecs,
    getStaleThresholdSeconds,
    getStaleCheckIntervalMs,
    buildLastUpdateLine,
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
        '$(warning) CodeCarbon Tracker\n\nMetrics are stale (12s old, expected about 5s).\n$(primitive-square) Click to stop tracking',
    );
});

test('last update line formatting is stable and readable', () => {
    const lastUpdate = buildLastUpdateLine(1710000000, 5);
    assert.equal(lastUpdate, '$(clock) Last update: 16:00:00 UTC (every ~5s)');
});

test('last update line handles invalid timestamps', () => {
    const lastUpdate = buildLastUpdateLine(Number.NaN, 5);
    assert.equal(lastUpdate, '$(clock) Last update: unknown (every ~5s)');
});
