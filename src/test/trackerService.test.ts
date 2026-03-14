import { strict as assert } from 'assert';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';
import { TrackerService, ISpawnFunction } from '../services/trackerService';
import { PythonService } from '../services/pythonService';
import { LogService } from '../services/logService';

describe('TrackerService', () => {
    describe('start and stop tracker', () => {
        let trackerService: TrackerService;
        let mockPythonService: PythonService;
        let mockLogService: LogService;
        let mockSpawn: ISpawnFunction;
        let mockChildProcess: ChildProcess;

        beforeEach(() => {
            // Create a mock ChildProcess
            mockChildProcess = new EventEmitter() as ChildProcess;
            mockChildProcess.kill = () => true;
            mockChildProcess.stderr = new EventEmitter() as any;
            mockChildProcess.stdout = new EventEmitter() as any;

            // Mock spawn function
            mockSpawn = (() => mockChildProcess) as ISpawnFunction;

            // Mock PythonService
            mockPythonService = {
                ensureCodecarbonInstalled: async () => true,
            } as any;

            // Mock LogService
            mockLogService = {
                log: () => {},
                logError: () => {},
                parseLogs: () => {},
                getOutputChannel: () => ({ dispose: () => {} }) as any,
            } as any;

            trackerService = new TrackerService(mockPythonService, mockLogService, mockSpawn);
        });

        it('should start the tracker successfully', async () => {
            const started = await trackerService.start();
            assert.strictEqual(started, true);
            assert.strictEqual(trackerService.isRunning(), true);
        });

        it('should not start the tracker if already running', async () => {
            await trackerService.start();
            const startedAgain = await trackerService.start();
            assert.strictEqual(startedAgain, false);
        });

        it('should not start if codecarbon is not installed', async () => {
            // Override the mock to return false for this test
            mockPythonService.ensureCodecarbonInstalled = async () => false;

            const started = await trackerService.start();
            assert.strictEqual(started, false);
            assert.strictEqual(trackerService.isRunning(), false);
        });

        it('should stop the tracker successfully', async () => {
            await trackerService.start();
            const stopped = trackerService.stop();
            assert.strictEqual(stopped, true);
            assert.strictEqual(trackerService.isRunning(), false);
        });

        it('should not stop the tracker if not running', () => {
            const stopped = trackerService.stop();
            assert.strictEqual(stopped, false);
        });

        it('should cleanup process on cleanup call', async () => {
            await trackerService.start();
            assert.strictEqual(trackerService.isRunning(), true);

            trackerService.cleanup();
            assert.strictEqual(trackerService.isRunning(), false);
        });
    });
});
