import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePythonPath, resolveLaunchOnStartup } from '../../src/utils/configHelpers';

test('resolvePythonPath returns configured interpreter string', () => {
    assert.equal(resolvePythonPath('/usr/local/bin/python3'), '/usr/local/bin/python3');
});

test('resolvePythonPath falls back to python when empty', () => {
    assert.equal(resolvePythonPath(''), 'python');
    assert.equal(resolvePythonPath(undefined), 'python');
});

test('resolveLaunchOnStartup uses config getter default', () => {
    const value = resolveLaunchOnStartup((_section, defaultValue) => defaultValue);
    assert.equal(value, true);
});
