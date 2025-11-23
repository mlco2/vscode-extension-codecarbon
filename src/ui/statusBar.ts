/**
 * Singleton class to manage the status bar item for the CodeCarbon VSCode extension.
 */
import * as vscode from 'vscode';
import { DEFAULT_STATUS_BAR_TEXT, COMMANDS } from '../utils/constants';

export class StatusBarManager {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.initializeStatusBar();
    }

    /**
     * Get the singleton instance of StatusBarManager
     */
    public static getInstance(): StatusBarManager {
        if (!StatusBarManager.instance) {
            StatusBarManager.instance = new StatusBarManager();
        }
        return StatusBarManager.instance;
    }

    /**
     * Get the status bar item for subscriptions
     */
    public getStatusBarItem(): vscode.StatusBarItem {
        return this.statusBarItem;
    }

    /**
     * Initialize the status bar with default settings
     */
    private initializeStatusBar(): void {
        this.statusBarItem.text = DEFAULT_STATUS_BAR_TEXT;
        this.statusBarItem.command = COMMANDS.START;
        this.statusBarItem.tooltip = 'Start CodeCarbon tracker';
    }

    /**
     * Show the status bar item
     */
    public show(): void {
        this.statusBarItem.show();
    }

    /**
     * Hide the status bar item
     */
    public hide(): void {
        this.statusBarItem.hide();
    }

    /**
     * Update status bar to show tracker is running
     */
    public setRunningState(): void {
        this.statusBarItem.text = `${DEFAULT_STATUS_BAR_TEXT} (Running)`;
        this.statusBarItem.command = COMMANDS.STOP;
        this.statusBarItem.tooltip = 'Stop CodeCarbon tracker';
    }

    /**
     * Update status bar to show tracker is stopped
     */
    public setStoppedState(): void {
        this.initializeStatusBar();
    }

    /**
     * Update the status bar text
     */
    public setText(text: string): void {
        this.statusBarItem.text = text;
    }

    /**
     * Update the status bar tooltip
     */
    public setTooltip(tooltip: string): void {
        this.statusBarItem.tooltip = tooltip;
    }

    /**
     * Update the status bar command
     */
    public setCommand(command: string): void {
        this.statusBarItem.command = command;
    }

    /**
     * Dispose of the status bar item
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
