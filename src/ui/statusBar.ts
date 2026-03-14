/**
 * Singleton class to manage the status bar item for the CodeCarbon VSCode extension.
 */
import * as vscode from 'vscode';
import { DEFAULT_STATUS_BAR_TEXT, COMMANDS } from '../utils/constants';
import { MetricsService, EmissionsMetrics } from '../services/metricsService';
import {
    DEFAULT_MEASURE_POWER_SECS,
    getEffectiveMeasurePowerSecs,
    getStaleThresholdSeconds,
    getStaleCheckIntervalMs,
    buildStaleTooltip,
} from './statusBarHelpers';

export class StatusBarManager {
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;
    private metricsService: MetricsService;
    private metricsUpdateListener: vscode.Disposable | null = null;
    private staleCheckTimer: NodeJS.Timeout | null = null;
    private currentMeasurePowerSecs = DEFAULT_MEASURE_POWER_SECS;
    private staleCheckIntervalMs = this.getStaleCheckIntervalMs(this.currentMeasurePowerSecs);

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.metricsService = MetricsService.getInstance();
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
        
        // Start listening for metrics updates
        this.startMetricsUpdates();
        this.startStaleChecks();
    }

    /**
     * Update status bar to show tracker is stopped
     */
    public setStoppedState(): void {
        // Stop listening for metrics updates
        this.stopMetricsUpdates();
        this.stopStaleChecks();
        
        // Clear metrics
        this.metricsService.clearMetrics();
        
        this.initializeStatusBar();
    }

    /**
     * Start listening for metrics updates
     */
    private startMetricsUpdates(): void {
        if (this.metricsUpdateListener) {
            return; // Already listening
        }
        
        this.metricsUpdateListener = this.metricsService.onMetricsUpdated((metrics) => {
            this.updateWithMetrics(metrics);
        });
    }

    /**
     * Stop listening for metrics updates
     */
    private stopMetricsUpdates(): void {
        if (this.metricsUpdateListener) {
            this.metricsUpdateListener.dispose();
            this.metricsUpdateListener = null;
        }
    }

    /**
     * Start periodic stale metrics checks to keep UI state accurate.
     */
    private startStaleChecks(): void {
        if (this.staleCheckTimer) {
            return;
        }

        this.staleCheckTimer = setInterval(() => {
            this.refreshStaleState();
        }, this.staleCheckIntervalMs);
    }

    /**
     * Stop periodic stale checks.
     */
    private stopStaleChecks(): void {
        if (this.staleCheckTimer) {
            clearInterval(this.staleCheckTimer);
            this.staleCheckTimer = null;
        }
    }

    /**
     * Update status bar with current metrics
     */
    private updateWithMetrics(metrics: EmissionsMetrics): void {
        const nextMeasurePowerSecs = this.getEffectiveMeasurePowerSecs(metrics.measurePowerSecs);
        if (nextMeasurePowerSecs !== this.currentMeasurePowerSecs) {
            this.currentMeasurePowerSecs = nextMeasurePowerSecs;
            this.reconfigureStaleCheckInterval();
        }

        // Display emissions in the status bar text
        const emissionsText = this.metricsService.formatEmissions(metrics.totalEmissions);
        this.statusBarItem.text = `${DEFAULT_STATUS_BAR_TEXT} ${emissionsText}`;
        
        // Create concise tooltip with key metrics
        const totalPower = this.sumAvailable(
            metrics.cpuAvailable ? metrics.cpuPower : null,
            metrics.gpuAvailable ? metrics.gpuPower : null,
            metrics.ramAvailable ? metrics.ramPower : null,
        );
        const totalEnergy = this.sumAvailable(
            metrics.cpuAvailable ? metrics.cpuEnergy : null,
            metrics.gpuAvailable ? metrics.gpuEnergy : null,
            metrics.ramAvailable ? metrics.ramEnergy : null,
        );
        
        const lines = [
            'CodeCarbon Tracker',
            '',
            `Emissions: ${emissionsText}`,
            `Power total: ${this.formatMaybePower(totalPower)}`,
            `  CPU: ${this.formatMetricPair(metrics.cpuAvailable, metrics.cpuPower, metrics.cpuEnergy)}`,
            `  GPU: ${this.formatMetricPair(metrics.gpuAvailable, metrics.gpuPower, metrics.gpuEnergy)}`,
            `  RAM: ${this.formatMetricPair(metrics.ramAvailable, metrics.ramPower, metrics.ramEnergy)}`,
            `Energy total: ${this.formatMaybeEnergy(totalEnergy)}`,
            '',
            'Click to stop tracking'
        ];
        
        this.statusBarItem.tooltip = lines.join('\n');
    }

    /**
     * Mark metrics as stale if no update arrived recently.
     */
    private refreshStaleState(): void {
        const ageSeconds = this.metricsService.getMetricsAgeSeconds();
        const staleThreshold = this.getStaleThresholdSeconds();
        if (ageSeconds === null || ageSeconds < staleThreshold) {
            return;
        }

        if (!this.statusBarItem.text.includes('(stale)')) {
            this.statusBarItem.text = `${this.statusBarItem.text} (stale)`;
        }
        this.statusBarItem.tooltip = buildStaleTooltip(ageSeconds, this.currentMeasurePowerSecs);
    }

    private getStaleThresholdSeconds(): number {
        return getStaleThresholdSeconds(this.currentMeasurePowerSecs);
    }

    private getEffectiveMeasurePowerSecs(value: number): number {
        return getEffectiveMeasurePowerSecs(value);
    }

    private getStaleCheckIntervalMs(measurePowerSecs: number): number {
        return getStaleCheckIntervalMs(measurePowerSecs);
    }

    private reconfigureStaleCheckInterval(): void {
        const nextInterval = this.getStaleCheckIntervalMs(this.currentMeasurePowerSecs);
        if (nextInterval === this.staleCheckIntervalMs) {
            return;
        }
        this.staleCheckIntervalMs = nextInterval;

        if (this.staleCheckTimer) {
            this.stopStaleChecks();
            this.startStaleChecks();
        }
    }

    private sumAvailable(...values: Array<number | null>): number | null {
        const validValues = values.filter((value): value is number => value !== null);
        if (validValues.length === 0) {
            return null;
        }
        return validValues.reduce((sum, current) => sum + current, 0);
    }

    private formatMetricPair(available: boolean, power: number, energy: number): string {
        if (!available) {
            return 'N/A';
        }
        return `${this.metricsService.formatPower(power)} | ${this.metricsService.formatEnergy(energy)}`;
    }

    private formatMaybePower(value: number | null): string {
        if (value === null) {
            return 'N/A';
        }
        return this.metricsService.formatPower(value);
    }

    private formatMaybeEnergy(value: number | null): string {
        if (value === null) {
            return 'N/A';
        }
        return this.metricsService.formatEnergy(value);
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
        this.stopMetricsUpdates();
        this.stopStaleChecks();
        this.statusBarItem.dispose();
    }
}
