import { CONFIGURATION_KEYS } from './constants';

export function resolvePythonPath(interpreters: string[] | undefined): string {
    if (!interpreters || interpreters.length === 0) {
        return 'python';
    }
    return interpreters[0];
}

export function resolveLaunchOnStartup(
    configGetter: <T>(section: string, defaultValue: T) => T,
): boolean {
    return configGetter<boolean>(CONFIGURATION_KEYS.LAUNCH_ON_STARTUP, true);
}
