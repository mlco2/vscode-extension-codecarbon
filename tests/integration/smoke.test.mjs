import { execFile, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
const trackerScript = path.resolve(workspaceRoot, 'src/scripts/tracker.py');
const pythonCmd = process.env.PYTHON_CMD || 'python';

function execPython(args) {
    return new Promise((resolve) => {
        execFile(pythonCmd, args, (error, stdout, stderr) => {
            resolve({
                ok: !error,
                stdout: stdout?.toString() ?? '',
                stderr: stderr?.toString() ?? '',
                code: error?.code ?? 0,
            });
        });
    });
}

async function checkInterpreterDiscovery() {
    const version = await execPython(['--version']);
    assert.equal(
        version.ok,
        true,
        `Interpreter discovery failed for "${pythonCmd}"\n${version.stdout}\n${version.stderr}`,
    );
    console.log(`Interpreter discovery OK: ${(version.stdout || version.stderr).trim()}`);

    const pip = await execPython(['-m', 'pip', '--version']);
    assert.equal(pip.ok, true, `pip is unavailable for selected interpreter\n${pip.stdout}\n${pip.stderr}`);
    console.log(`pip check OK: ${pip.stdout.trim()}`);
}

async function checkPackagePresenceProbe() {
    const show = await execPython(['-m', 'pip', 'show', 'codecarbon']);
    if (show.ok) {
        console.log('Package presence check OK: codecarbon is installed.');
        return;
    }

    if (show.code === 1) {
        console.log('Package presence check OK: codecarbon not installed (probe behavior validated).');
        return;
    }

    assert.fail(`Package presence probe failed unexpectedly\n${show.stdout}\n${show.stderr}`);
}

async function checkTrackerLifecycle() {
    await new Promise((resolve, reject) => {
        const child = spawn(pythonCmd, ['-u', trackerScript, 'start'], {
            cwd: workspaceRoot,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        const timeoutMs = 30000;
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error(`Tracker did not start within ${timeoutMs}ms.`));
        }, timeoutMs);

        let started = false;
        let output = '';

        const onData = (chunk) => {
            const text = chunk.toString();
            output += text;
            if (!started && (text.includes('Starting the tracker...') || text.includes('Tracker started.'))) {
                started = true;
                setTimeout(() => child.kill(), 1500);
            }
        };

        child.stdout?.on('data', onData);
        child.stderr?.on('data', onData);

        child.on('close', (code) => {
            clearTimeout(timeout);
            if (!started) {
                reject(new Error(`Tracker lifecycle failed before start (exit code: ${code}).\n${output}`));
                return;
            }
            console.log(`Tracker lifecycle OK (exit code: ${code ?? 'unknown'}).`);
            resolve();
        });

        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

test('integration smoke: interpreter discovery', async () => {
    console.log(`Running integration smoke test with interpreter: ${pythonCmd}`);
    await checkInterpreterDiscovery();
});

test('integration smoke: package presence probe', async () => {
    await checkPackagePresenceProbe();
});

test('integration smoke: tracker lifecycle spawn/stop', async () => {
    await checkTrackerLifecycle();
    console.log('All integration smoke checks passed.');
});
