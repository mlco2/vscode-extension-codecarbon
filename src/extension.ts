/**
 * Main entry point for the CodeCarbon VSCode extension.
 */
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LogService } from './services/logService';
import { TrackerService } from './services/trackerService';
import { PythonService } from './services/pythonService';
import { NotificationService } from './services/notificationService';
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
                NotificationService.showWarning('Codecarbon tracker stopped unexpectedly. See output for details.');
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
        vscode.commands.registerCommand(COMMANDS.RESTART, () => restartTracker()),
        vscode.commands.registerCommand(COMMANDS.OPEN_LOGS, () => openTrackingLogs()),
        vscode.commands.registerCommand(COMMANDS.CHECK_VERSION, () => checkCodecarbonVersion()),
        vscode.commands.registerCommand(COMMANDS.INSTALL_REPAIR, () => installRepairCodecarbon()),
        vscode.commands.registerCommand(COMMANDS.OPEN_CONFIG, () => openCodecarbonConfig()),
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
        NotificationService.showInfo(MESSAGES.TRACKER_STARTED);
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

async function restartTracker(): Promise<void> {
    logService.log(MESSAGES.RESTARTING);
    if (trackerService.isRunning()) {
        trackerService.stop();
        statusBarManager.setStoppedState();
    }
    await startTracker();
}

function openTrackingLogs(): void {
    logService.getOutputChannel().show(true);
}

async function checkCodecarbonVersion(): Promise<void> {
    const pythonPath = ConfigService.getPythonPath();
    await pythonService.checkCodecarbonVersion(pythonPath);
}

async function installRepairCodecarbon(): Promise<void> {
    const pythonPath = ConfigService.getPythonPath();
    await pythonService.installOrRepairCodecarbon(pythonPath);
}

async function openCodecarbonConfig(): Promise<void> {
    const workspacePath = ConfigService.getWorkspaceFolderPath();
    if (!workspacePath) {
        NotificationService.showError('No workspace folder is open. Open a folder to create/edit .codecarbon.config.');
        return;
    }
    const resolvedPath = path.join(workspacePath, '.codecarbon.config');

    try {
        await vscode.workspace.fs.stat(vscode.Uri.file(resolvedPath));
    } catch {
        const createAction = 'Create config';
        const selected = await vscode.window.showInformationMessage(
            `No CodeCarbon config found at ${resolvedPath}. Create a minimal template?`,
            createAction,
        );
        if (selected !== createAction) {
            return;
        }

        const template = [
            '[codecarbon]',
            '# Official docs: https://mlco2.github.io/codecarbon/usage.html#configuration',
            'measure_power_secs = 5',
            '',
        ].join('\n');

        await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
        await fs.writeFile(resolvedPath, template, 'utf8');
    }

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(resolvedPath));
    await vscode.window.showTextDocument(doc, { preview: false });
}
