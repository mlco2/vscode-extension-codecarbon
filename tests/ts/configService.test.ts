import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePythonPath, resolveLaunchOnStartup, resolveNotificationMode } from '../../src/utils/configHelpers';

test('resolvePythonPath returns configured interpreter string', () => {
    assert.equal(resolvePythonPath('/usr/local/bin/python3'), '/usr/local/bin/python3');
});

test('resolvePythonPath falls back to platform default when empty', () => {
    const expected = process.platform === 'win32' ? 'python' : 'python3';
    assert.equal(resolvePythonPath(''), expected);
    assert.equal(resolvePythonPath(undefined), expected);
});

test('resolveLaunchOnStartup uses config getter default', () => {
    const value = resolveLaunchOnStartup((_section, defaultValue) => defaultValue);
    assert.equal(value, true);
});

test('resolveNotificationMode validates values', () => {
    const getter = (value: string) => <T>(_section: string, _defaultValue: T): T => value as unknown as T;
    assert.equal(resolveNotificationMode(getter('minimal')), 'minimal');
    assert.equal(resolveNotificationMode(getter('default')), 'default');
    assert.equal(resolveNotificationMode(getter('unexpected')), 'default');
});
