import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMetricsFromLine } from '../../src/services/metricsParser';

test('parses a valid metrics line', () => {
    const result = parseMetricsFromLine(
        'METRICS:{"type":"metrics","timestamp":100,"measure_power_secs":4,"total_emissions":0.1,"cpu_power":10,"gpu_power":0,"ram_power":2,"cpu_energy":0.01,"gpu_energy":0,"ram_energy":0.002}',
        123,
    );

    assert.ok(result);
    assert.equal(result.timestamp, 100);
    assert.equal(result.measurePowerSecs, 4);
    assert.equal(result.totalEmissions, 0.1);
    assert.equal(result.cpuAvailable, true);
    assert.equal(result.gpuAvailable, true);
    assert.equal(result.ramAvailable, true);
});

test('parses metrics line with extra prefix and sanitizes values', () => {
    const result = parseMetricsFromLine(
        'Python output: METRICS:{"type":"metrics","timestamp":"bad","measure_power_secs":"bad","total_emissions":-1,"cpu_power":"oops","cpu_energy":"0.5"}',
        999,
    );

    assert.ok(result);
    assert.equal(result.timestamp, 999);
    assert.equal(result.measurePowerSecs, 5);
    assert.equal(result.totalEmissions, 0);
    assert.equal(result.cpuPower, 0);
    assert.equal(result.cpuEnergy, 0.5);
    assert.equal(result.cpuAvailable, true);
    assert.equal(result.gpuAvailable, false);
    assert.equal(result.ramAvailable, false);
});

test('returns null for non-metrics lines', () => {
    const result = parseMetricsFromLine('Tracker started');
    assert.equal(result, null);
});
