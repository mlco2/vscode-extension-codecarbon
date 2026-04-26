import { CONFIGURATION_KEYS, NOTIFICATION_MODES } from './constants';

export function resolvePythonPath(interpreter: unknown): string {
    if (typeof interpreter === 'string' && interpreter.trim()) {
        return interpreter.trim();
    }
    if (process.platform === 'win32') {
        return 'python';
    }
    return 'python3';
}

export function resolveLaunchOnStartup(
    configGetter: <T>(section: string, defaultValue: T) => T,
): boolean {
    return configGetter<boolean>(CONFIGURATION_KEYS.LAUNCH_ON_STARTUP, true);
}

export function resolveNotificationMode(
    configGetter: <T>(section: string, defaultValue: T) => T,
): string {
    const value = configGetter<string>(CONFIGURATION_KEYS.NOTIFICATIONS, NOTIFICATION_MODES.DEFAULT);
    if (value === NOTIFICATION_MODES.MINIMAL || value === NOTIFICATION_MODES.DEFAULT) {
        return value;
    }
    return NOTIFICATION_MODES.DEFAULT;
}
