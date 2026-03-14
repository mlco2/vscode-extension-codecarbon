/**
 * Main entry point for the CodeCarbon VSCode extension.
 */
import * as vscode from 'vscode';
import { LogService } from './services/logService';
import { TrackerService } from './services/trackerService';
import { PythonService } from './services/pythonService';
import { StatusBarManager } from './ui/statusBar';
import { ConfigService } from './utils/config';
import { COMMANDS, MESSAGES } from './utils/constants';

let trackerService: TrackerService;
let logService: LogService;
let pythonService: PythonService;
let statusBarManager: StatusBarManager;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Initialize services
    logService = LogService.getInstance();
    statusBarManager = StatusBarManager.getInstance();
    trackerService = new TrackerService({
        onTrackerStopped: ({ expected, code }) => {
            statusBarManager.setStoppedState();
            if (!expected) {
                logService.logWarning(`Tracker stopped unexpectedly (exit code: ${code ?? 'unknown'})`);
                vscode.window.showWarningMessage('Codecarbon tracker stopped unexpectedly. See output for details.');
            }
        },
    });
    pythonService = new PythonService();

    // Setup UI
    statusBarManager.show();

    // Add to subscriptions for cleanup
    context.subscriptions.push(logService.getOutputChannel(), statusBarManager.getStatusBarItem());

    logService.log(MESSAGES.EXTENSION_ACTIVATED);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.START, () => startTracker()),
        vscode.commands.registerCommand(COMMANDS.STOP, () => stopTracker()),
        vscode.commands.registerCommand(COMMANDS.CHECK_VERSION, () => checkCodecarbonVersion()),
        vscode.commands.registerCommand(COMMANDS.INSTALL_REPAIR, () => installRepairCodecarbon()),
    );

    await pythonService.checkInstallHealthOnStartup(ConfigService.getPythonPath());

    // Auto-start if enabled in settings
    if (ConfigService.isLaunchOnStartupEnabled()) {
        await startTracker();
    }
}

export async function deactivate(): Promise<void> {
    trackerService?.cleanup();
}

async function startTracker(): Promise<void> {
    const interpreterPath = ConfigService.getPythonPath();
    statusBarManager.setInstallingState({ interpreterPath });
    const success = await trackerService.start();
    if (success) {
        statusBarManager.setRunningState({ interpreterPath });
    } else if (!trackerService.isRunning()) {
        statusBarManager.setStoppedState();
    }
}

async function stopTracker(): Promise<void> {
    const success = trackerService.stop();
    if (success) {
        statusBarManager.setStoppedState();
    }
}

async function checkCodecarbonVersion(): Promise<void> {
    const pythonPath = ConfigService.getPythonPath();
    await pythonService.checkCodecarbonVersion(pythonPath);
}

async function installRepairCodecarbon(): Promise<void> {
    const pythonPath = ConfigService.getPythonPath();
    await pythonService.installOrRepairCodecarbon(pythonPath);
}
