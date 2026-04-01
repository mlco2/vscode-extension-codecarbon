import * as vscode from 'vscode';
import { LogService } from './logService';
import { buildInterpreterCandidates } from './interpreterCandidates';

type PythonEnvironmentApi = {
    getActiveEnvironmentPath?: (resource?: vscode.Uri) => Promise<unknown>;
};

type PythonExtensionApi = {
    environments?: PythonEnvironmentApi;
};

export class InterpreterResolver {
    private logService: LogService;

    constructor() {
        this.logService = LogService.getInstance();
    }

    public async getCandidates(configuredPath: string, preferPythonExtension: boolean): Promise<string[]> {
        const pythonExtensionPath = await this.resolveFromPythonExtension();
        const candidates = buildInterpreterCandidates(configuredPath, pythonExtensionPath, preferPythonExtension);

        this.logService.log(`Interpreter candidates: ${candidates.join(', ')}`);
        return candidates;
    }

    private async resolveFromPythonExtension(): Promise<string | undefined> {
        const extension = vscode.extensions.getExtension('ms-python.python');
        if (!extension) {
            return undefined;
        }

        const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        try {
            const api = (await extension.activate()) as PythonExtensionApi;
            const active = await api.environments?.getActiveEnvironmentPath?.(workspaceUri);
            const value = this.readPathLikeValue(active);
            if (value) {
                this.logService.log(`Interpreter resolved from Python extension API: ${value}`);
                return value;
            }
        } catch (error) {
            this.logService.logWarning(`Python extension API interpreter resolution failed: ${String(error)}`);
        }

        const config = vscode.workspace.getConfiguration('python', workspaceUri);
        const settingPath = this.cleanConfiguredPath(
            config.get<string>('defaultInterpreterPath') ?? config.get<string>('pythonPath'),
        );
        if (settingPath) {
            this.logService.log(`Interpreter resolved from Python extension settings: ${settingPath}`);
            return settingPath;
        }
        return undefined;
    }

    private readPathLikeValue(value: unknown): string | undefined {
        if (typeof value === 'string') {
            return this.cleanConfiguredPath(value);
        }
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        const record = value as Record<string, unknown>;
        if (typeof record.path === 'string') {
            return this.cleanConfiguredPath(record.path);
        }
        return undefined;
    }

    private cleanConfiguredPath(value: string | undefined): string | undefined {
        const normalized = (value ?? '').trim();
        if (!normalized) {
            return undefined;
        }
        // Ignore unresolved command variables from settings.
        if (normalized.startsWith('${command:')) {
            return undefined;
        }
        return normalized;
    }
}
