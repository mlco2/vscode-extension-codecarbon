/**
 * Service to manage extension configuration settings.
 */
import * as vscode from 'vscode';
import { CONFIGURATION_KEYS, INSTALL_STRATEGIES } from './constants';
import { resolveLaunchOnStartup, resolveNotificationMode, resolvePythonPath } from './configHelpers';

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
        const rawInterpreter = config.get<unknown>(CONFIGURATION_KEYS.INTERPRETER);
        return resolvePythonPath(rawInterpreter);
    }

    public static hasExplicitPythonPath(): boolean {
        const config = this.getConfiguration();
        const inspection = config.inspect<string>(CONFIGURATION_KEYS.INTERPRETER);
        const values = [
            inspection?.globalValue,
            inspection?.workspaceValue,
            inspection?.workspaceFolderValue,
        ];
        return values.some((value) => typeof value === 'string' && value.trim().length > 0);
    }

    /**
     * Check if launch on startup is enabled
     */
    public static isLaunchOnStartupEnabled(): boolean {
        const config = this.getConfiguration();
        return resolveLaunchOnStartup((section, defaultValue) => config.get(section, defaultValue));
    }

    public static isAutoInstallEnabled(): boolean {
        const config = this.getConfiguration();
        return config.get<boolean>(CONFIGURATION_KEYS.AUTO_INSTALL, true);
    }

    public static getInstallStrategy(): string {
        const config = this.getConfiguration();
        const strategy = config.get<string>(CONFIGURATION_KEYS.INSTALL_STRATEGY, INSTALL_STRATEGIES.VENV);
        return strategy ?? INSTALL_STRATEGIES.VENV;
    }

    public static getCustomPipArgs(): string {
        const config = this.getConfiguration();
        return config.get<string>(CONFIGURATION_KEYS.CUSTOM_PIP_ARGS, '').trim();
    }

    public static getNotificationMode(): string {
        const config = this.getConfiguration();
        return resolveNotificationMode((section, defaultValue) => config.get(section, defaultValue));
    }

    public static getEmissionsFilePath(): string | undefined {
        const config = this.getConfiguration();
        const value = config.get<string>(CONFIGURATION_KEYS.EMISSIONS_FILE, '').trim();
        return value || undefined;
    }

    public static getWorkspaceFolderPath(): string | undefined {
        const folder = vscode.workspace.workspaceFolders?.[0];
        return folder?.uri.fsPath;
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
