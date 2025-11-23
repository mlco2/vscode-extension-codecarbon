/**
 * Service to manage logging within the extension.
 */
import * as vscode from 'vscode';
import { PYTHON_PACKAGE_NAME } from '../utils/constants';

export class LogService {
    private static instance: LogService;
    private outputChannel: vscode.LogOutputChannel;

    private constructor(outputChannelName: string = PYTHON_PACKAGE_NAME) {
        this.outputChannel = vscode.window.createOutputChannel(outputChannelName, { log: true });
    }

    /**
     * Get the singleton instance of LogService
     */
    public static getInstance(): LogService {
        if (!LogService.instance) {
            LogService.instance = new LogService();
        }
        return LogService.instance;
    }

    /**
     * Get the output channel for subscriptions
     */
    public getOutputChannel(): vscode.LogOutputChannel {
        return this.outputChannel;
    }

    /**
     * Log an informational message
     */
    public log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    /**
     * Log an error message
     */
    public logError(message: string): void {
        this.outputChannel.error(message);
    }

    /**
     * Log a warning message
     */
    public logWarning(message: string): void {
        this.outputChannel.warn(message);
    }

    /**
     * Parse log data and extract emissions information
     */
    public parseLogs(data: string): void {
        const lines = data.split('\n');
        for (const line of lines) {
            if (line.includes('emissions')) {
                // Extract and display emissions data
                this.log(`Emissions update: ${line.trim()}`);
            }
        }
    }

    /**
     * Dispose of the output channel
     */
    public dispose(): void {
        this.outputChannel.dispose();
    }
}
