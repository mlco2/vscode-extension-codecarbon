/**
 * Service to manage Python runtime checks and CodeCarbon installation.
 */
import { execFile } from 'child_process';
import { LogService } from './logService';
import { NotificationService } from './notificationService';
import { InterpreterResolver } from './interpreterResolver';
import { selectWorkingInterpreter } from './interpreterSelection';
import { ConfigService } from '../utils/config';
import { INSTALL_STRATEGIES, MESSAGES, PYTHON_PACKAGE_NAME } from '../utils/constants';

type InstallerState = 'not_installed' | 'installing' | 'installed' | 'install_failed';
type InstallFailureReason =
    | 'none'
    | 'permissions'
    | 'no_network'
    | 'interpreter_mismatch'
    | 'externally_managed_env'
    | 'pip_missing'
    | 'unknown';

interface RuntimePreflight {
    ok: boolean;
    pythonVersion?: string;
    pipVersion?: string;
    isVenv?: boolean;
    details: string[];
}

interface ResolvedRuntime {
    pythonPath: string;
}

interface ExecResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    errorMessage: string;
}

interface InstallCounters {
    attempts: number;
    success: number;
    failure: number;
    lastFailure: InstallFailureReason;
}

export class PythonService {
    private static readonly MIN_SUPPORTED_PYTHON_MINOR = 8;
    private logService: LogService;
    private interpreterResolver: InterpreterResolver;
    private installerState: InstallerState = 'not_installed';
    private counters: InstallCounters = { attempts: 0, success: 0, failure: 0, lastFailure: 'none' };
    private startupHealthChecked = false;

    constructor() {
        this.logService = LogService.getInstance();
        this.interpreterResolver = new InterpreterResolver();
    }

    public getInstallerState(): InstallerState {
        return this.installerState;
    }

    /**
     * Lightweight install health check on startup without popups.
     */
    public async checkInstallHealthOnStartup(pythonPath: string): Promise<void> {
        if (this.startupHealthChecked) {
            return;
        }
        this.startupHealthChecked = true;

        const runtime = await this.resolveRuntime(pythonPath);
        if (!runtime) {
            this.logService.logWarning('Startup health check: Python preflight failed.');
            return;
        }

        const installed = await this.isPackageInstalled(runtime.pythonPath, PYTHON_PACKAGE_NAME);
        this.installerState = installed ? 'installed' : 'not_installed';
        this.logService.log(`Startup health check: installer_state=${this.installerState}`);
    }

    /**
     * Ensure runtime is ready and codecarbon package is available before tracking starts.
     */
    public async ensureCodecarbonInstalled(pythonPath: string): Promise<string | null> {
        this.logService.log(`Preparing Python runtime: ${pythonPath}`);
        const runtime = await this.resolveRuntime(pythonPath);
        if (!runtime) {
            NotificationService.showError(MESSAGES.PREFLIGHT_FAILED);
            return null;
        }
        const resolvedPythonPath = runtime.pythonPath;

        const isInstalled = await this.isPackageInstalled(resolvedPythonPath, PYTHON_PACKAGE_NAME);
        if (isInstalled) {
            this.installerState = 'installed';
            return resolvedPythonPath;
        }

        this.installerState = 'not_installed';
        if (!ConfigService.isAutoInstallEnabled()) {
            NotificationService.showWarning(MESSAGES.INSTALL_DISABLED);
            return null;
        }

        const installedNow = await this.installOrRepairCodecarbon(resolvedPythonPath, true);
        return installedNow ? resolvedPythonPath : null;
    }

    /**
     * Explicit command entrypoint to install/repair codecarbon package.
     */
    public async installOrRepairCodecarbon(pythonPath: string, silentSuccess = false): Promise<boolean> {
        const runtime = await this.resolveRuntime(pythonPath);
        if (!runtime) {
            NotificationService.showError(MESSAGES.PREFLIGHT_FAILED);
            return false;
        }
        const resolvedPythonPath = runtime.pythonPath;

        this.installerState = 'installing';
        this.counters.attempts += 1;
        this.logService.log(`Installer state=${this.installerState}, strategy=${ConfigService.getInstallStrategy()}`);

        const strategies = this.resolveInstallStrategies();
        for (const args of strategies) {
            const result = await this.execPython(resolvedPythonPath, ['-m', 'pip', 'install', ...args, PYTHON_PACKAGE_NAME]);
            this.logPipAttempt(args, result);
            if (result.ok) {
                this.installerState = 'installed';
                this.counters.success += 1;
                this.counters.lastFailure = 'none';
                this.logCounters();
                if (!silentSuccess) {
                    NotificationService.showInfo(MESSAGES.INSTALL_REPAIR_SUCCESS);
                }
                return true;
            }

            const reason = this.classifyInstallFailure(result.stderr, result.errorMessage);
            this.counters.lastFailure = reason;
        }

        this.installerState = 'install_failed';
        this.counters.failure += 1;
        this.logCounters();
        NotificationService.showError(`${MESSAGES.INSTALL_REPAIR_FAILED} ${this.remediationFor(this.counters.lastFailure)}`);
        return false;
    }

    /**
     * Check codecarbon version and display information.
     */
    public async checkCodecarbonVersion(pythonPath: string): Promise<void> {
        const runtime = await this.resolveRuntime(pythonPath);
        if (!runtime) {
            NotificationService.showError(MESSAGES.PREFLIGHT_FAILED);
            return;
        }
        const resolvedPythonPath = runtime.pythonPath;

        const result = await this.execPython(resolvedPythonPath, ['-m', 'pip', 'show', PYTHON_PACKAGE_NAME]);
        if (!result.ok) {
            NotificationService.showWarning(MESSAGES.CHECK_VERSION_NOT_INSTALLED);
            this.logService.log(MESSAGES.NOT_INSTALLED);
            return;
        }

        const versionMatch = result.stdout.match(/Version:\s+(.+)/);
        const locationMatch = result.stdout.match(/Location:\s+(.+)/);
        if (!versionMatch) {
            NotificationService.showError(MESSAGES.VERSION_ERROR);
            return;
        }

        const version = versionMatch[1].trim();
        const location = locationMatch ? locationMatch[1].trim() : 'Unknown';
        NotificationService.showInfo(`Codecarbon ${version} is installed`);
        this.logService.log(`Codecarbon version: ${version}`);
        this.logService.log(`Installation location: ${location}`);
        this.logService.log(`Python interpreter: ${resolvedPythonPath}`);
    }

    private async resolveRuntime(pythonPath: string): Promise<ResolvedRuntime | null> {
        const hasExplicitPythonPath = ConfigService.hasExplicitPythonPath();
        const preferPythonExtension = !hasExplicitPythonPath;
        const candidates = await this.interpreterResolver.getCandidates(pythonPath, preferPythonExtension);
        const selected = await selectWorkingInterpreter(candidates, async (candidate) => {
            const preflight = await this.runRuntimePreflight(candidate);
            return preflight.ok;
        });
        if (!selected) {
            return null;
        }
        if (selected !== pythonPath) {
            if (hasExplicitPythonPath) {
                this.logService.logWarning(
                    `Configured interpreter failed; using fallback interpreter instead: ${selected} (configured: ${pythonPath})`,
                );
            }
            this.logService.log(`Python runtime fallback selected: ${selected} (configured: ${pythonPath})`);
        }
        return { pythonPath: selected };
    }

    private async runRuntimePreflight(pythonPath: string): Promise<RuntimePreflight> {
        const details: string[] = [];

        const versionResult = await this.execPython(pythonPath, ['--version']);
        if (!versionResult.ok) {
            details.push(`Python executable not resolvable: ${pythonPath}`);
            this.logPreflight(details, pythonPath);
            return { ok: false, details };
        }

        const versionOutput = `${versionResult.stdout} ${versionResult.stderr}`.trim();
        const versionMatch = versionOutput.match(/Python\s+(\d+)\.(\d+)\.(\d+)/i);
        if (!versionMatch) {
            details.push(`Unable to parse Python version from output: ${versionOutput}`);
            this.logPreflight(details, pythonPath);
            return { ok: false, details };
        }

        const major = Number(versionMatch[1]);
        const minor = Number(versionMatch[2]);
        const version = `${versionMatch[1]}.${versionMatch[2]}.${versionMatch[3]}`;
        if (major !== 3 || minor < PythonService.MIN_SUPPORTED_PYTHON_MINOR) {
            details.push(`Unsupported Python version ${version}. Use Python 3.${PythonService.MIN_SUPPORTED_PYTHON_MINOR}+.`);
            this.logPreflight(details, pythonPath);
            return { ok: false, details };
        }

        const pipResult = await this.execPython(pythonPath, ['-m', 'pip', '--version']);
        if (!pipResult.ok) {
            details.push('pip is not available for selected interpreter.');
            this.logPreflight(details, pythonPath);
            return { ok: false, details };
        }

        const venvResult = await this.execPython(pythonPath, ['-c', 'import sys; print(int(sys.prefix != getattr(sys, "base_prefix", sys.prefix)))']);
        const isVenv = venvResult.ok && venvResult.stdout.trim() === '1';
        details.push(`Python interpreter: ${pythonPath}`);
        details.push(`Python version: ${version}`);
        details.push(`pip: ${pipResult.stdout.trim()}`);
        details.push(`Virtual environment: ${isVenv ? 'yes' : 'no'}`);
        this.logPreflight(details, pythonPath);
        return {
            ok: true,
            pythonVersion: version,
            pipVersion: pipResult.stdout.trim(),
            isVenv,
            details,
        };
    }

    private async isPackageInstalled(pythonPath: string, packageName: string): Promise<boolean> {
        const result = await this.execPython(pythonPath, ['-m', 'pip', 'show', packageName]);
        if (!result.ok) {
            return false;
        }
        const versionMatch = result.stdout.match(/Version:\s+(.+)/);
        if (versionMatch) {
            this.logService.log(`Found ${packageName} version: ${versionMatch[1].trim()}`);
        }
        return true;
    }

    private resolveInstallStrategies(): string[][] {
        const strategy = ConfigService.getInstallStrategy();
        const customArgs = ConfigService.getCustomPipArgs();
        if (strategy === INSTALL_STRATEGIES.USER) {
            return [['--user']];
        }
        if (strategy === INSTALL_STRATEGIES.CUSTOM) {
            if (!customArgs) {
                return [[]];
            }
            return [customArgs.split(/\s+/).filter(Boolean)];
        }
        // Default: current interpreter/venv first, then user fallback.
        return [[], ['--user']];
    }

    private classifyInstallFailure(stderr: string, errorMessage: string): InstallFailureReason {
        const haystack = `${stderr}\n${errorMessage}`.toLowerCase();
        if (haystack.includes('externally-managed-environment')) {
            return 'externally_managed_env';
        }
        if (haystack.includes('permission denied') || haystack.includes('not permitted')) {
            return 'permissions';
        }
        if (haystack.includes('temporary failure in name resolution') || haystack.includes('connection') || haystack.includes('timed out')) {
            return 'no_network';
        }
        if (haystack.includes('no module named pip')) {
            return 'pip_missing';
        }
        if (haystack.includes('requires python') || haystack.includes('unsupported python')) {
            return 'interpreter_mismatch';
        }
        return 'unknown';
    }

    private remediationFor(reason: InstallFailureReason): string {
        switch (reason) {
            case 'permissions':
                return 'Try install strategy "user" or run inside a writable virtual environment.';
            case 'no_network':
                return 'Check network/proxy settings, then retry install.';
            case 'interpreter_mismatch':
                return 'Use a supported Python interpreter (3.8+).';
            case 'externally_managed_env':
                return 'Use a virtual environment, or set install strategy to "user".';
            case 'pip_missing':
                return 'Install pip for the selected interpreter and retry.';
            default:
                return 'See output logs for stderr details.';
        }
    }

    private logPreflight(details: string[], pythonPath: string): void {
        this.logService.log(`Runtime preflight for interpreter: ${pythonPath}`);
        for (const line of details) {
            this.logService.log(`Preflight: ${line}`);
        }
    }

    private logPipAttempt(args: string[], result: ExecResult): void {
        this.logService.log(`pip install args: ${args.join(' ') || '(default)'}`);
        this.logService.log(`pip install ok=${result.ok}`);
        if (result.stdout.trim()) {
            this.logService.log(`pip stdout: ${result.stdout.trim()}`);
        }
        if (result.stderr.trim()) {
            this.logService.logWarning(`pip stderr: ${result.stderr.trim()}`);
        }
        if (!result.ok && result.errorMessage) {
            this.logService.logError(`pip error: ${result.errorMessage}`);
        }
    }

    private logCounters(): void {
        this.logService.log(
            `Installer counters: attempts=${this.counters.attempts}, success=${this.counters.success}, failure=${this.counters.failure}, last_failure=${this.counters.lastFailure}`,
        );
    }

    private async execPython(pythonPath: string, args: string[]): Promise<ExecResult> {
        return new Promise((resolve) => {
            execFile(pythonPath, args, (error, stdout, stderr) => {
                resolve({
                    ok: !error,
                    stdout: stdout ?? '',
                    stderr: stderr ?? '',
                    errorMessage: error ? String(error.message || error) : '',
                });
            });
        });
    }
}
