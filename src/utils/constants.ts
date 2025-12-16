/**
 * Constants used throughout the CodeCarbon VSCode extension.
 */
export const PYTHON_PACKAGE_NAME = 'codecarbon';
export const DEFAULT_STATUS_BAR_TEXT = '$(pulse) Codecarbon';

export const COMMANDS = {
    START: 'codecarbon.start',
    STOP: 'codecarbon.stop',
    CHECK_VERSION: 'codecarbon.checkVersion',
} as const;

export const CONFIGURATION_KEYS = {
    LAUNCH_ON_STARTUP: 'launchOnStartup',
    INTERPRETER: 'interpreter',
} as const;

export const MESSAGES = {
    ALREADY_RUNNING: 'Codecarbon tracker is already running.',
    NOT_RUNNING: 'Codecarbon tracker is not running.',
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
} as const;

export const INSTALL_OPTIONS = {
    LATEST: 'Install Latest',
    SPECIFIC: 'Install Specific Version',
    CANCEL: 'Cancel',
} as const;
