export interface ParsedMetrics {
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

export function parseMetricsFromLine(line: string, nowSeconds = Date.now() / 1000): ParsedMetrics | null {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes('METRICS:')) {
        return null;
    }

    const metricsPrefixIndex = trimmed.indexOf('METRICS:');
    const jsonData = trimmed.substring(metricsPrefixIndex + 8).trim();
    const rawMetrics = JSON.parse(jsonData) as Record<string, unknown>;

    if (rawMetrics.type !== 'metrics') {
        return null;
    }

    return {
        timestamp: toFiniteNumber(rawMetrics.timestamp, nowSeconds),
        measurePowerSecs: toFiniteNumber(rawMetrics.measure_power_secs, 5),
        totalEmissions: toNonNegativeNumber(rawMetrics.total_emissions),
        cpuPower: toNonNegativeNumber(rawMetrics.cpu_power),
        gpuPower: toNonNegativeNumber(rawMetrics.gpu_power),
        ramPower: toNonNegativeNumber(rawMetrics.ram_power),
        cpuEnergy: toNonNegativeNumber(rawMetrics.cpu_energy),
        gpuEnergy: toNonNegativeNumber(rawMetrics.gpu_energy),
        ramEnergy: toNonNegativeNumber(rawMetrics.ram_energy),
        cpuAvailable: hasFiniteMetric(rawMetrics, 'cpu_power') || hasFiniteMetric(rawMetrics, 'cpu_energy'),
        gpuAvailable: hasFiniteMetric(rawMetrics, 'gpu_power') || hasFiniteMetric(rawMetrics, 'gpu_energy'),
        ramAvailable: hasFiniteMetric(rawMetrics, 'ram_power') || hasFiniteMetric(rawMetrics, 'ram_energy'),
    };
}

function toFiniteNumber(value: unknown, fallback = 0): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonNegativeNumber(value: unknown, fallback = 0): number {
    return Math.max(0, toFiniteNumber(value, fallback));
}

function hasFiniteMetric(data: Record<string, unknown>, key: string): boolean {
    if (!(key in data)) {
        return false;
    }
    const value = data[key];
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed);
}
