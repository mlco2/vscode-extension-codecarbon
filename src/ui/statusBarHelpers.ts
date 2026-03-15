export const DEFAULT_MEASURE_POWER_SECS = 5;
export const STALE_MULTIPLIER = 3;
export const MIN_STALE_THRESHOLD_SECONDS = 10;
export const MIN_STALE_CHECK_INTERVAL_MS = 1000;
export const MAX_STALE_CHECK_INTERVAL_MS = 5000;

export function getEffectiveMeasurePowerSecs(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_MEASURE_POWER_SECS;
    }
    return value;
}

export function getStaleThresholdSeconds(measurePowerSecs: number): number {
    return Math.max(MIN_STALE_THRESHOLD_SECONDS, measurePowerSecs * STALE_MULTIPLIER);
}

export function getStaleCheckIntervalMs(measurePowerSecs: number): number {
    const interval = Math.round((measurePowerSecs * 1000) / 2);
    return Math.max(MIN_STALE_CHECK_INTERVAL_MS, Math.min(MAX_STALE_CHECK_INTERVAL_MS, interval));
}

export function buildLastUpdateLine(timestampSeconds: number, measurePowerSecs: number): string {
    const cadence = `(every ~${measurePowerSecs}s)`;
    if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) {
        return `$(clock) Last update: unknown ${cadence}`;
    }
    const isoTime = new Date(timestampSeconds * 1000).toISOString().slice(11, 19);
    return `$(clock) Last update: ${isoTime} UTC ${cadence}`;
}

export function buildStaleTooltip(ageSeconds: number, measurePowerSecs: number): string {
    return [
        '$(warning) CodeCarbon Tracker',
        '',
        `Metrics are stale (${Math.floor(ageSeconds)}s old, expected about ${measurePowerSecs}s).`,
        '$(primitive-square) Click to stop tracking',
    ].join('\n');
}
