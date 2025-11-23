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
    trackerService = new TrackerService();
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
    );

    // Auto-start if enabled in settings
    if (ConfigService.isLaunchOnStartupEnabled()) {
        await startTracker();
    }
}

export async function deactivate(): Promise<void> {
    trackerService?.cleanup();
}

async function startTracker(): Promise<void> {
    const success = await trackerService.start();
    if (success) {
        statusBarManager.setRunningState();
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
