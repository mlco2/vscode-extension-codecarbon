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

const TRACKER_SCRIPT = path.resolve(__dirname, '../scripts/tracker.py');

export class TrackerService {
    /** The child process running the Python tracker */
    private pythonProcess: ChildProcess | null = null;
    private logService: LogService;
    private pythonService: PythonService;

    constructor() {
        this.logService = LogService.getInstance();
        this.pythonService = new PythonService();
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
        if (this.pythonProcess) {
            vscode.window.showInformationMessage(MESSAGES.ALREADY_RUNNING);
            return false;
        }

        const pythonPath = ConfigService.getPythonPath();

        // Ensure codecarbon is installed
        const isInstalled = await this.pythonService.ensureCodecarbonInstalled(pythonPath);
        if (!isInstalled) {
            return false;
        }

        // Start the tracker process
        this.pythonProcess = spawn(pythonPath, [TRACKER_SCRIPT, 'start']);

        this.setupProcessHandlers();

        this.logService.log(MESSAGES.TRACKER_STARTED);
        return true;
    }

    /**
     * Stop the codecarbon tracker
     */
    public stop(): boolean {
        if (!this.pythonProcess) {
            vscode.window.showInformationMessage(MESSAGES.NOT_RUNNING);
            return false;
        }

        this.pythonProcess.kill();
        this.pythonProcess = null;

        this.logService.log(MESSAGES.TRACKER_STOPPED);
        vscode.window.showInformationMessage(MESSAGES.TRACKER_STOPPED);
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
            this.logService.logError(`Python error: ${data}`);
        });

        this.pythonProcess.stdout?.on('data', (data) => {
            this.logService.log(`Python output: ${data}`);
            this.logService.parseLogs(data.toString());
        });

        this.pythonProcess.on('close', (code) => {
            this.logService.log(`Tracker process exited with code ${code}`);
            this.pythonProcess = null;
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
}
