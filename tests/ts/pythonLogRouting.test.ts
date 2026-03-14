import test from 'node:test';
import assert from 'node:assert/strict';
import { routePythonLogLine } from '../../src/services/pythonLogRouting';

test('routes codecarbon info and strips prefix', () => {
    const line = '[codecarbon INFO @ 13:59:27] Codecarbon is taking the configuration from global file:';
    const routed = routePythonLogLine(line, true);

    assert.equal(routed.level, 'info');
    assert.equal(routed.message, 'Codecarbon is taking the configuration from global file:');
    assert.equal(routed.parsePayload, `${line}\n`);
});

test('routes codecarbon warning to warn', () => {
    const line = '[codecarbon WARNING @ 13:59:28] No CPU tracking mode found.';
    const routed = routePythonLogLine(line, false);

    assert.equal(routed.level, 'warn');
    assert.equal(routed.message, 'No CPU tracking mode found.');
    assert.equal(routed.parsePayload, `${line}\n`);
});

test('routes codecarbon error to error', () => {
    const line = '[codecarbon ERROR @ 13:59:29] Failed to read power data.';
    const routed = routePythonLogLine(line, false);

    assert.equal(routed.level, 'error');
    assert.equal(routed.message, 'Failed to read power data.');
    assert.equal(routed.parsePayload, `${line}\n`);
});

test('routes unknown stderr as python error', () => {
    const line = 'Traceback (most recent call last):';
    const routed = routePythonLogLine(line, true);

    assert.equal(routed.level, 'error');
    assert.equal(routed.message, `Python error: ${line}`);
    assert.equal(routed.parsePayload, `${line}\n`);
});

test('routes plain stdout as info and preserves message', () => {
    const line = 'METRICS:{"type":"metrics","timestamp":1}';
    const routed = routePythonLogLine(line, false);

    assert.equal(routed.level, 'info');
    assert.equal(routed.message, line);
    assert.equal(routed.parsePayload, `${line}\n`);
});
