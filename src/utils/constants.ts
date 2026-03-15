/**
 * Constants used throughout the CodeCarbon VSCode extension.
 */
export const PYTHON_PACKAGE_NAME = 'codecarbon';
export const DEFAULT_STATUS_BAR_TEXT = '$(pulse) Codecarbon';

export const COMMANDS = {
    START: 'codecarbon.start',
    STOP: 'codecarbon.stop',
    RESTART: 'codecarbon.restart',
    OPEN_LOGS: 'codecarbon.openLogs',
    CHECK_VERSION: 'codecarbon.checkVersion',
    INSTALL_REPAIR: 'codecarbon.installRepair',
    OPEN_CONFIG: 'codecarbon.openConfig',
} as const;

export const CONFIGURATION_KEYS = {
    LAUNCH_ON_STARTUP: 'launchOnStartup',
    INTERPRETER: 'interpreter',
    AUTO_INSTALL: 'autoInstall',
    INSTALL_STRATEGY: 'installStrategy',
    CUSTOM_PIP_ARGS: 'customPipArgs',
} as const;

export const MESSAGES = {
    ALREADY_RUNNING: 'Codecarbon tracker is already running.',
    NOT_RUNNING: 'Codecarbon tracker is not running.',
    RESTARTING: 'Restarting Codecarbon tracker.',
    TRACKER_STARTED: 'Codecarbon tracker started',
    TRACKER_STOPPED: 'Codecarbon tracker stopped',
    EXTENSION_ACTIVATED: 'Codecarbon extension activated',
    NOT_INSTALLED: 'Codecarbon is not installed',
    INSTALL_PROMPT: 'The Python package "codecarbon" is not installed. Would you like to install it?',
    INSTALL_SUCCESS: 'Successfully installed codecarbon',
    INSTALL_FAILED: 'Failed to install codecarbon',
    VERSION_PROMPT: 'Enter codecarbon version to install (e.g., 3.1.0)',
    VERSION_PLACEHOLDER: '3.1.0',
    CHECK_VERSION_NOT_INSTALLED: 'Codecarbon is not installed. Use "Start tracking emissions" to install it.',
    VERSION_ERROR: 'Could not determine codecarbon version',
    PREFLIGHT_FAILED: 'Python runtime preflight failed. Check CodeCarbon output for details.',
    INSTALL_DISABLED: 'CodeCarbon is not installed and auto-install is disabled. Run "Install/Repair CodeCarbon Python package".',
    INSTALL_REPAIR_SUCCESS: 'CodeCarbon install/repair completed successfully.',
    INSTALL_REPAIR_FAILED: 'CodeCarbon install/repair failed. Check CodeCarbon output for remediation details.',
    START_IN_PROGRESS: 'Codecarbon startup is already in progress.',
} as const;

export const INSTALL_OPTIONS = {
    LATEST: 'Install Latest',
    SPECIFIC: 'Install Specific Version',
    CANCEL: 'Cancel',
} as const;

export const INSTALL_STRATEGIES = {
    VENV: 'venv',
    USER: 'user',
    CUSTOM: 'custom',
} as const;
