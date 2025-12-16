/**
 * Service to manage extension configuration settings.
 */
import * as vscode from 'vscode';
import { CONFIGURATION_KEYS } from './constants';

export class ConfigService {
    private static readonly EXTENSION_PREFIX = 'codecarbon';

    /**
     * Get the current extension configuration
     */
    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(this.EXTENSION_PREFIX);
    }

    /**
     * Get the Python interpreter path from configuration
     */
    public static getPythonPath(): string {
        const config = this.getConfiguration();
        const interpreters = config.get<string[]>(CONFIGURATION_KEYS.INTERPRETER, []);
        return interpreters.length > 0 ? interpreters[0] : 'python';
    }

    /**
     * Check if launch on startup is enabled
     */
    public static isLaunchOnStartupEnabled(): boolean {
        const config = this.getConfiguration();
        return config.get<boolean>(CONFIGURATION_KEYS.LAUNCH_ON_STARTUP, true);
    }

    /**
     * Update a configuration value
     */
    public static async updateConfiguration<T>(
        key: string,
        value: T,
        scope?: vscode.ConfigurationTarget,
    ): Promise<void> {
        const config = this.getConfiguration();
        await config.update(key, value, scope);
    }
}
