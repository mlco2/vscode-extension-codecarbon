import * as vscode from 'vscode';
import { ConfigService } from '../utils/config';
import { NOTIFICATION_MODES } from '../utils/constants';

export class NotificationService {
    public static showInfo(message: string): Thenable<string | undefined> | undefined {
        if (ConfigService.getNotificationMode() === NOTIFICATION_MODES.MINIMAL) {
            return undefined;
        }
        return vscode.window.showInformationMessage(message);
    }

    public static showWarning(message: string): Thenable<string | undefined> | undefined {
        if (ConfigService.getNotificationMode() === NOTIFICATION_MODES.MINIMAL) {
            return undefined;
        }
        return vscode.window.showWarningMessage(message);
    }

    public static showError(message: string): Thenable<string | undefined> {
        return vscode.window.showErrorMessage(message);
    }
}
