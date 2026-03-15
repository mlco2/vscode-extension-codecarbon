/**
 * Service to manage the lifecycle of the codecarbon tracker.
 * It will start/stop the tracker process and handle its output.
 * The tracker is located in TRACKER_SCRIPT
 */
import { ChildProcess, spawn } from 'child_process';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { LogService } from './logService';
import { PythonService } from './pythonService';
import { ConfigService } from '../utils/config';
import { MESSAGES } from '../utils/constants';
import { routePythonLogLine } from './pythonLogRouting';
import { NotificationService } from './notificationService';

const TRACKER_SCRIPT = path.resolve(__dirname, '../scripts/tracker.py');
const TRACKER_PID_FILE = '.codecarbon-tracker.pid';

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
            await this.cleanupStaleWorkspaceTracker(workspacePath);
        }
        this.logService.log('Run policy: single active CodeCarbon tracker per workspace (recommended).');

        try {
            // Ensure codecarbon is installed
            const isInstalled = await this.pythonService.ensureCodecarbonInstalled(pythonPath);
            if (!isInstalled) {
                return false;
            }

            // Start the tracker process
            this.stoppingRequested = false;
            this.pythonProcess = spawn(pythonPath, [TRACKER_SCRIPT, 'start'], workspacePath ? { cwd: workspacePath } : undefined);
            if (workspacePath && this.pythonProcess.pid) {
                await this.writePidFile(workspacePath, this.pythonProcess.pid);
            }

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
        this.removeWorkspacePidFile().catch((error) => {
            this.logService.logWarning(`Could not remove tracker PID file: ${String(error)}`);
        });
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
            this.removeWorkspacePidFile().catch((error) => {
                this.logService.logWarning(`Could not remove tracker PID file after process exit: ${String(error)}`);
            });
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
        this.removeWorkspacePidFile().catch((error) => {
            this.logService.logWarning(`Could not remove tracker PID file during cleanup: ${String(error)}`);
        });
    }

    private getWorkspacePidFilePath(workspacePath?: string): string | null {
        if (!workspacePath) {
            return null;
        }
        return path.join(workspacePath, TRACKER_PID_FILE);
    }

    private async writePidFile(workspacePath: string, pid: number): Promise<void> {
        const pidFilePath = this.getWorkspacePidFilePath(workspacePath);
        if (!pidFilePath) {
            return;
        }
        await fs.writeFile(pidFilePath, `${pid}\n`, 'utf8');
    }

    private async removeWorkspacePidFile(): Promise<void> {
        const workspacePath = ConfigService.getWorkspaceFolderPath();
        const pidFilePath = this.getWorkspacePidFilePath(workspacePath);
        if (!pidFilePath) {
            return;
        }
        try {
            await fs.unlink(pidFilePath);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT') {
                throw error;
            }
        }
    }

    private async cleanupStaleWorkspaceTracker(workspacePath: string): Promise<void> {
        const pidFilePath = this.getWorkspacePidFilePath(workspacePath);
        if (!pidFilePath) {
            return;
        }

        let rawPid = '';
        try {
            rawPid = await fs.readFile(pidFilePath, 'utf8');
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== 'ENOENT') {
                this.logService.logWarning(`Could not read tracker PID file: ${String(error)}`);
            }
            return;
        }

        const stalePid = Number.parseInt(rawPid.trim(), 10);
        if (!Number.isInteger(stalePid) || stalePid <= 0) {
            await this.removeWorkspacePidFile();
            return;
        }
        if (stalePid === process.pid) {
            await this.removeWorkspacePidFile();
            return;
        }

        try {
            process.kill(stalePid, 0);
        } catch {
            await this.removeWorkspacePidFile();
            return;
        }

        this.logService.logWarning(`Found stale tracker process (${stalePid}). Sending SIGTERM before new start.`);
        try {
            process.kill(stalePid);
        } catch (error) {
            this.logService.logWarning(`Could not terminate stale tracker (${stalePid}): ${String(error)}`);
        } finally {
            await this.removeWorkspacePidFile();
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
