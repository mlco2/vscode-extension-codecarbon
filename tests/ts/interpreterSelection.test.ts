import test from 'node:test';
import assert from 'node:assert/strict';
import { selectWorkingInterpreter } from '../../src/services/interpreterSelection';

test('selectWorkingInterpreter returns null when no interpreter is available', async () => {
    const tried: string[] = [];
    const selected = await selectWorkingInterpreter(['python3', 'python'], async (candidate) => {
        tried.push(candidate);
        return false;
    });
    assert.equal(selected, null);
    assert.deepEqual(tried, ['python3', 'python']);
});

test('selectWorkingInterpreter falls back to second candidate', async () => {
    const tried: string[] = [];
    const selected = await selectWorkingInterpreter(['python3', 'python'], async (candidate) => {
        tried.push(candidate);
        return candidate === 'python';
    });
    assert.equal(selected, 'python');
    assert.deepEqual(tried, ['python3', 'python']);
});

test('selectWorkingInterpreter stops on first working candidate', async () => {
    const tried: string[] = [];
    const selected = await selectWorkingInterpreter(['python3', 'python'], async (candidate) => {
        tried.push(candidate);
        return candidate === 'python3';
    });
    assert.equal(selected, 'python3');
    assert.deepEqual(tried, ['python3']);
});
