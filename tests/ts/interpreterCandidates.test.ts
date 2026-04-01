import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInterpreterCandidates } from '../../src/services/interpreterCandidates';

test('prefers ms-python interpreter when not explicitly configured', () => {
    const candidates = buildInterpreterCandidates('python3', '/opt/venv/bin/python', true);
    assert.equal(candidates[0], '/opt/venv/bin/python');
    assert.equal(candidates[1], 'python3');
});

test('prefers explicit interpreter over ms-python interpreter', () => {
    const candidates = buildInterpreterCandidates('/custom/python', '/opt/venv/bin/python', false);
    assert.equal(candidates[0], '/custom/python');
    assert.equal(candidates[1], '/opt/venv/bin/python');
});

test('includes fallback commands after primary candidates', () => {
    const candidates = buildInterpreterCandidates('python3', undefined, false);
    assert.equal(candidates[0], 'python3');
    assert.equal(candidates.includes('python'), true);
});
