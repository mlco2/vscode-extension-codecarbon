/**
 * Service to manage the lifecycle of the codecarbon tracker.
 * It will start/stop the tracker process and handle its output.
 * The tracker is located in TRACKER_SCRIPT
 */
import { ChildProcess, spawn } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import { LogService } from './logService';
import { PythonService } from './pythonService';
import { ConfigService } from '../utils/config';
import { MESSAGES } from '../utils/constants';
import { routePythonLogLine } from './pythonLogRouting';
import { NotificationService } from './notificationService';

const TRACKER_SCRIPT = path.resolve(__dirname, '../scripts/tracker.py');

interface TrackerServiceOptions {
    onTrackerStopped?: (details: { code: number | null; expected: boolean }) => void;
}

export class TrackerService {
    /** The child process running the Python tracker */
    private pythonProcess: ChildProcess | null = null;
    private logService: LogService;
    private pythonService: PythonService;
    private onTrackerStopped?: (details: { code: number | null; expected: boolean }) => void;
    private stoppingRequested = false;
    private startInProgress = false;

    constructor(options?: TrackerServiceOptions) {
        this.logService = LogService.getInstance();
        this.pythonService = new PythonService();
        this.onTrackerStopped = options?.onTrackerStopped;
    }

    /**
     * Check if the tracker is currently running
     */
    public isRunning(): boolean {
        return this.pythonProcess !== null;
    }

    /**
     * Start the codecarbon tracker
     */
    public async start(): Promise<boolean> {
        if (this.startInProgress) {
            this.logService.log(MESSAGES.START_IN_PROGRESS);
            return false;
        }
        if (this.pythonProcess) {
            this.logService.log(MESSAGES.ALREADY_RUNNING);
            return false;
        }
        this.startInProgress = true;

        const pythonPath = ConfigService.getPythonPath();
        const workspacePath = ConfigService.getWorkspaceFolderPath();
        if (workspacePath) {
            this.logService.log(`Using workspace as tracker cwd for CodeCarbon config discovery: ${workspacePath}`);
        }

        try {
            // Ensure codecarbon is installed
            const isInstalled = await this.pythonService.ensureCodecarbonInstalled(pythonPath);
            if (!isInstalled) {
                return false;
            }

            // Start the tracker process
            this.stoppingRequested = false;
            this.pythonProcess = spawn(pythonPath, [TRACKER_SCRIPT, 'start'], workspacePath ? { cwd: workspacePath } : undefined);

            this.setupProcessHandlers();

            this.logService.log(MESSAGES.TRACKER_STARTED);
            return true;
        } finally {
            this.startInProgress = false;
        }
    }

    /**
     * Stop the codecarbon tracker
     */
    public stop(): boolean {
        if (!this.pythonProcess) {
            this.logService.log(MESSAGES.NOT_RUNNING);
            return false;
        }

        this.stoppingRequested = true;
        this.pythonProcess.kill();
        this.pythonProcess = null;

        this.logService.log(MESSAGES.TRACKER_STOPPED);
        NotificationService.showInfo(MESSAGES.TRACKER_STOPPED);
        return true;
    }

    /**
     * Setup event handlers for the Python process
     */
    private setupProcessHandlers(): void {
        if (!this.pythonProcess) {
            return;
        }

        this.pythonProcess.stderr?.on('data', (data) => {
            this.logPythonOutput(data.toString(), true);
        });

        this.pythonProcess.stdout?.on('data', (data) => {
            this.logPythonOutput(data.toString(), false);
        });

        this.pythonProcess.on('close', (code) => {
            const expectedStop = this.stoppingRequested;
            this.stoppingRequested = false;
            this.logService.log(`Tracker process exited with code ${code}`);
            this.pythonProcess = null;
            this.onTrackerStopped?.({ code, expected: expectedStop });
        });
    }

    /**
     * Force cleanup on extension deactivation
     */
    public cleanup(): void {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
    }

    private logPythonOutput(chunk: string, fromStderr: boolean): void {
        const text = chunk.toString();
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        for (const line of lines) {
            const routed = routePythonLogLine(line, fromStderr);
            if (routed.level === 'warn') {
                this.logService.logWarning(routed.message);
            } else if (routed.level === 'error') {
                this.logService.logError(routed.message);
            } else {
                this.logService.log(routed.message);
            }
            this.logService.parseLogs(routed.parsePayload);
        }
    }
}
