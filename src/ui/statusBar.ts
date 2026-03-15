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
    buildLastUpdateLine,
} from './statusBarHelpers';

export class StatusBarManager {
    private static readonly UI_REFRESH_INTERVAL_MS = 3000;
    private static instance: StatusBarManager;
    private statusBarItem: vscode.StatusBarItem;
    private metricsService: MetricsService;
    private metricsUpdateListener: vscode.Disposable | null = null;
    private staleCheckTimer: NodeJS.Timeout | null = null;
    private currentMeasurePowerSecs = DEFAULT_MEASURE_POWER_SECS;
    private staleCheckIntervalMs = this.getStaleCheckIntervalMs(this.currentMeasurePowerSecs);
    private runtimeDetailsLine = 'Interpreter: Unknown';
    private readonly liveTooltip = new vscode.MarkdownString('', true);
    private readonly staleTooltip = new vscode.MarkdownString('', true);
    private lastUiRefreshMs = 0;

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.metricsService = MetricsService.getInstance();
        this.liveTooltip.isTrusted = false;
        this.staleTooltip.isTrusted = false;
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
        this.statusBarItem.tooltip = 'Start CodeCarbon tracker (single-run policy prevents duplicate trackers)';
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
    public setRunningState(runtimeDetails?: { interpreterPath?: string }): void {
        if (runtimeDetails?.interpreterPath) {
            this.runtimeDetailsLine = `Interpreter: ${runtimeDetails.interpreterPath}`;
        }
        this.statusBarItem.text = `${DEFAULT_STATUS_BAR_TEXT} (Running)`;
        this.statusBarItem.command = COMMANDS.STOP;
        this.statusBarItem.tooltip = `Stop CodeCarbon tracker\n${this.runtimeDetailsLine}`;
        
        // Start listening for metrics updates
        this.startMetricsUpdates();
        this.startStaleChecks();
    }

    /**
     * Update status bar to show tracker setup/install is in progress.
     */
    public setInstallingState(runtimeDetails?: { interpreterPath?: string }): void {
        if (runtimeDetails?.interpreterPath) {
            this.runtimeDetailsLine = `Interpreter: ${runtimeDetails.interpreterPath}`;
        }
        this.statusBarItem.text = `${DEFAULT_STATUS_BAR_TEXT} (Installing...)`;
        this.statusBarItem.command = undefined;
        this.statusBarItem.tooltip = `Preparing Python runtime and installing dependencies if needed.\n${this.runtimeDetailsLine}`;
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
        
        const lines = this.buildTooltipLines(metrics, emissionsText, totalPower, totalEnergy);
        if (!this.shouldRefreshUiNow()) {
            return;
        }
        this.lastUiRefreshMs = Date.now();
        this.statusBarItem.text = `${DEFAULT_STATUS_BAR_TEXT} ${emissionsText}`;

        this.liveTooltip.value = this.renderTooltipLines(lines);
        if (this.statusBarItem.tooltip !== this.liveTooltip) {
            this.statusBarItem.tooltip = this.liveTooltip;
        }
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
        const staleTooltipLines = this.buildStaleTooltipLines(ageSeconds, this.currentMeasurePowerSecs);
        this.staleTooltip.value = this.renderTooltipLines(staleTooltipLines);
        if (this.statusBarItem.tooltip !== this.staleTooltip) {
            this.statusBarItem.tooltip = this.staleTooltip;
        }
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

    private buildTooltipLines(
        metrics: EmissionsMetrics,
        emissionsText: string,
        totalPower: number | null,
        totalEnergy: number | null,
    ): string[] {
        return [
            '$(pulse) CodeCarbon Tracker',
            '',
            `Emissions total: ${emissionsText}`,
            `Energy total: ${this.formatMaybeEnergy(totalEnergy)}`,
            '',
            `$(zap) Current power usage: ${this.formatMaybePower(totalPower)}`,
            '',
            '────────────────────────',
            buildLastUpdateLine(metrics.timestamp, this.currentMeasurePowerSecs),
            '$(primitive-square) Click to stop tracking',
        ];
    }
    
    private buildStaleTooltipLines(ageSeconds: number, measurePowerSecs: number): string[] {
        return [
            '$(warning) CodeCarbon Tracker',
            '',
            `Metrics are stale (${Math.floor(ageSeconds)}s old, expected about ${measurePowerSecs}s).`,
            this.runtimeDetailsLine,
            '',
            '$(primitive-square) Click to stop tracking',
        ];
    }

    private renderTooltipLines(lines: string[]): string {
        return lines.join('  \n');
    }

    private shouldRefreshUiNow(nowMs: number = Date.now()): boolean {
        return nowMs - this.lastUiRefreshMs >= StatusBarManager.UI_REFRESH_INTERVAL_MS;
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
