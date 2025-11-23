/**
 * Service to manage Python package installations and version checks.
 */
import { exec } from 'child_process';
import * as vscode from 'vscode';
import { LogService } from './logService';
import { MESSAGES, INSTALL_OPTIONS } from '../utils/constants';

export class PythonService {
    private logService: LogService;

    constructor() {
        this.logService = LogService.getInstance();
    }

    /**
     * Check if a Python package is installed
     */
    public async isPackageInstalled(pythonPath: string, packageName: string): Promise<boolean> {
        return new Promise((resolve) => {
            exec(`${pythonPath} -m pip show ${packageName}`, (error, stdout) => {
                if (!error && stdout) {
                    // Extract version from pip show output
                    const versionMatch = stdout.match(/Version: (.+)/);
                    if (versionMatch) {
                        this.logService.log(`Found ${packageName} version: ${versionMatch[1]}`);
                    }
                }
                resolve(!error);
            });
        });
    }

    /**
     * Install a Python package
     */
    public async installPackage(pythonPath: string, packageName: string): Promise<void> {
        return new Promise((resolve, reject) => {
            exec(`${pythonPath} -m pip install ${packageName}`, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Failed to install ${packageName}: ${stderr}`));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Handle codecarbon package installation with user prompts
     */
    public async ensureCodecarbonInstalled(pythonPath: string): Promise<boolean> {
        this.logService.log(`Checking codecarbon installation with Python: ${pythonPath}`);
        const isInstalled = await this.isPackageInstalled(pythonPath, 'codecarbon');

        if (isInstalled) {
            return true;
        }

        const install = await vscode.window.showWarningMessage(
            MESSAGES.INSTALL_PROMPT,
            INSTALL_OPTIONS.LATEST,
            INSTALL_OPTIONS.SPECIFIC,
            INSTALL_OPTIONS.CANCEL,
        );

        if (install === INSTALL_OPTIONS.LATEST) {
            return this.installLatestVersion(pythonPath);
        } else if (install === INSTALL_OPTIONS.SPECIFIC) {
            return this.installSpecificVersion(pythonPath);
        }

        return false;
    }

    /**
     * Install the latest version of codecarbon
     */
    private async installLatestVersion(pythonPath: string): Promise<boolean> {
        vscode.window.showInformationMessage('Installing codecarbon (latest version)...');
        try {
            await this.installPackage(pythonPath, 'codecarbon');
            vscode.window.showInformationMessage(MESSAGES.INSTALL_SUCCESS);
            // Check version after installation
            await this.isPackageInstalled(pythonPath, 'codecarbon');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`${MESSAGES.INSTALL_FAILED}: ${error}`);
            return false;
        }
    }

    /**
     * Install a specific version of codecarbon
     */
    private async installSpecificVersion(pythonPath: string): Promise<boolean> {
        const version = await vscode.window.showInputBox({
            prompt: MESSAGES.VERSION_PROMPT,
            placeHolder: MESSAGES.VERSION_PLACEHOLDER,
        });

        if (!version) {
            return false;
        }

        vscode.window.showInformationMessage(`Installing codecarbon version ${version}...`);
        try {
            await this.installPackage(pythonPath, `codecarbon==${version}`);
            vscode.window.showInformationMessage(`Successfully installed codecarbon ${version}`);
            // Check version after installation
            await this.isPackageInstalled(pythonPath, 'codecarbon');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install codecarbon ${version}: ${error}`);
            return false;
        }
    }

    /**
     * Check codecarbon version and display information
     */
    public async checkCodecarbonVersion(pythonPath: string): Promise<void> {
        return new Promise((resolve) => {
            exec(`${pythonPath} -m pip show codecarbon`, (error, stdout) => {
                if (error) {
                    vscode.window.showWarningMessage(MESSAGES.CHECK_VERSION_NOT_INSTALLED);
                    this.logService.log(MESSAGES.NOT_INSTALLED);
                } else {
                    const versionMatch = stdout.match(/Version: (.+)/);
                    const locationMatch = stdout.match(/Location: (.+)/);

                    if (versionMatch) {
                        const version = versionMatch[1].trim();
                        const location = locationMatch ? locationMatch[1].trim() : 'Unknown';

                        vscode.window.showInformationMessage(`Codecarbon ${version} is installed`);
                        this.logService.log(`Codecarbon version: ${version}`);
                        this.logService.log(`Installation location: ${location}`);
                        this.logService.log(`Python interpreter: ${pythonPath}`);
                    } else {
                        vscode.window.showErrorMessage(MESSAGES.VERSION_ERROR);
                    }
                }
                resolve();
            });
        });
    }
}
