import { CONFIGURATION_KEYS } from './constants';

export function resolvePythonPath(interpreter: unknown): string {
    if (typeof interpreter === 'string' && interpreter.trim()) {
        return interpreter.trim();
    }
    return 'python';
}

export function resolveLaunchOnStartup(
    configGetter: <T>(section: string, defaultValue: T) => T,
): boolean {
    return configGetter<boolean>(CONFIGURATION_KEYS.LAUNCH_ON_STARTUP, true);
}
