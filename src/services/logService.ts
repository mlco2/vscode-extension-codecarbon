/**
 * Service to manage logging within the extension.
 */
import * as vscode from 'vscode';
import { PYTHON_PACKAGE_NAME } from '../utils/constants';
import { MetricsService, EmissionsMetrics } from './metricsService';
import { parseMetricsFromLine } from './metricsParser';

export class LogService {
    private static instance: LogService;
    private outputChannel: vscode.LogOutputChannel;
    private metricsService: MetricsService;
    private stdoutBuffer = '';

    private constructor(outputChannelName: string = PYTHON_PACKAGE_NAME) {
        this.outputChannel = vscode.window.createOutputChannel(outputChannelName, { log: true });
        this.metricsService = MetricsService.getInstance();
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
        this.stdoutBuffer += data;
        const lines = this.stdoutBuffer.split(/\r?\n/);
        this.stdoutBuffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }

            // Check for JSON metrics data
            if (trimmed.includes('METRICS:')) {
                try {
                    const parsedMetrics = parseMetricsFromLine(trimmed);
                    if (!parsedMetrics) {
                        continue;
                    }

                    const metrics: EmissionsMetrics = {
                        timestamp: parsedMetrics.timestamp,
                        measurePowerSecs: parsedMetrics.measurePowerSecs,
                        totalEmissions: parsedMetrics.totalEmissions,
                        cpuPower: parsedMetrics.cpuPower,
                        gpuPower: parsedMetrics.gpuPower,
                        ramPower: parsedMetrics.ramPower,
                        cpuEnergy: parsedMetrics.cpuEnergy,
                        gpuEnergy: parsedMetrics.gpuEnergy,
                        ramEnergy: parsedMetrics.ramEnergy,
                        cpuAvailable: parsedMetrics.cpuAvailable,
                        gpuAvailable: parsedMetrics.gpuAvailable,
                        ramAvailable: parsedMetrics.ramAvailable,
                    };

                    this.metricsService.updateMetrics(metrics);
                } catch (error) {
                    this.logError(`Failed to parse metrics: ${error}`);
                }
            } else if (trimmed.includes('emissions')) {
                // Extract and display emissions data
                this.log(`Emissions update: ${trimmed}`);
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
