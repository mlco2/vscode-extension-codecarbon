/**
 * Service to manage and store emissions metrics from the tracker.
 */
import * as vscode from 'vscode';

export interface EmissionsMetrics {
    timestamp: number;
    measurePowerSecs: number;
    totalEmissions: number;
    cpuPower: number;
    gpuPower: number;
    ramPower: number;
    cpuEnergy: number;
    gpuEnergy: number;
    ramEnergy: number;
    cpuAvailable: boolean;
    gpuAvailable: boolean;
    ramAvailable: boolean;
}

export class MetricsService {
    private static instance: MetricsService;
    private currentMetrics: EmissionsMetrics | null = null;
    private onMetricsUpdatedEmitter = new vscode.EventEmitter<EmissionsMetrics>();
    
    /** Event fired when metrics are updated */
    public readonly onMetricsUpdated = this.onMetricsUpdatedEmitter.event;

    private constructor() {}

    /**
     * Get the singleton instance of MetricsService
     */
    public static getInstance(): MetricsService {
        if (!MetricsService.instance) {
            MetricsService.instance = new MetricsService();
        }
        return MetricsService.instance;
    }

    /**
     * Update the current metrics
     */
    public updateMetrics(metrics: EmissionsMetrics): void {
        this.currentMetrics = metrics;
        this.onMetricsUpdatedEmitter.fire(metrics);
    }

    /**
     * Get the current metrics
     */
    public getCurrentMetrics(): EmissionsMetrics | null {
        return this.currentMetrics;
    }

    /**
     * Clear the current metrics (e.g., when tracker stops)
     */
    public clearMetrics(): void {
        this.currentMetrics = null;
    }

    /**
     * Get the age in seconds for the last metrics update.
     */
    public getMetricsAgeSeconds(nowMs: number = Date.now()): number | null {
        if (!this.currentMetrics) {
            return null;
        }
        const age = nowMs / 1000 - this.currentMetrics.timestamp;
        return Math.max(0, age);
    }

    /**
     * Format power in watts
     */
    public formatPower(watts: number): string {
        if (watts === 0) {
            return '0 W';
        }
        if (watts < 1) {
            return `${(watts * 1000).toFixed(2)} mW`;
        }
        return `${watts.toFixed(2)} W`;
    }

    /**
     * Format energy in kWh
     */
    public formatEnergy(kwh: number): string {
        if (kwh === 0) {
            return '0 Wh';
        }
        if (kwh < 0.001) {
            return `${(kwh * 1000000).toFixed(2)} mWh`;
        }
        if (kwh < 1) {
            return `${(kwh * 1000).toFixed(2)} Wh`;
        }
        return `${kwh.toFixed(3)} kWh`;
    }

    /**
     * Format emissions in kg CO2
     */
    public formatEmissions(kgCO2: number): string {
        if (kgCO2 === 0) {
            return '0 g CO₂';
        }
        if (kgCO2 < 0.001) {
            return `${(kgCO2 * 1000000).toFixed(2)} mg CO₂`;
        }
        if (kgCO2 < 1) {
            return `${(kgCO2 * 1000).toFixed(2)} g CO₂`;
        }
        return `${kgCO2.toFixed(3)} kg CO₂`;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.onMetricsUpdatedEmitter.dispose();
    }
}
