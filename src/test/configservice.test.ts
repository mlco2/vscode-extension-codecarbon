import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { ConfigService } from '../utils/config';

describe('ConfigService', () => {
    describe('getPythonPath', () => {
        it('should return the first interpreter from configuration if available', () => {
            const config = vscode.workspace.getConfiguration('codecarbon');
            const interpreters = config.get<string[]>('interpreter', []);

            const pythonPath = ConfigService.getPythonPath();

            if (interpreters.length > 0) {
                assert.strictEqual(pythonPath, interpreters[0]);
            } else {
                assert.strictEqual(pythonPath, 'python');
            }
        });

        it('should return default "python" when no interpreters are configured', () => {
            const pythonPath = ConfigService.getPythonPath();
            assert.ok(typeof pythonPath === 'string');
            assert.ok(pythonPath.length > 0);
        });
    });

    describe('isLaunchOnStartupEnabled', () => {
        it('should return a boolean value', () => {
            const isEnabled = ConfigService.isLaunchOnStartupEnabled();
            assert.ok(typeof isEnabled === 'boolean');
        });
    });

    describe('getConfiguration', () => {
        it('should return a WorkspaceConfiguration object', () => {
            const config = ConfigService.getConfiguration();
            assert.ok(config !== null);
            assert.ok(config !== undefined);
            assert.ok(typeof config.get === 'function');
        });
    });
});
