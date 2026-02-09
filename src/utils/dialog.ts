import { Alert, Platform } from 'react-native';

export interface ConfirmDialogOptions {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
}

const buildWebMessage = (title: string, message?: string) =>
    message ? `${title}\n\n${message}` : title;

const getGlobalDialogApi = () =>
    globalThis as typeof globalThis & {
        alert?: (message?: string) => void;
        confirm?: (message?: string) => boolean;
    };

export const showAlert = (title: string, message?: string) => {
    if (Platform.OS === 'web') {
        const dialogApi = getGlobalDialogApi();
        if (typeof dialogApi.alert === 'function') {
            dialogApi.alert(buildWebMessage(title, message));
            return;
        }
    }

    Alert.alert(title, message);
};

export const confirmDialog = async ({
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    destructive = false,
}: ConfirmDialogOptions): Promise<boolean> => {
    if (Platform.OS === 'web') {
        const dialogApi = getGlobalDialogApi();
        if (typeof dialogApi.confirm === 'function') {
            return dialogApi.confirm(buildWebMessage(title, message));
        }
        return false;
    }

    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                {
                    text: cancelText,
                    style: 'cancel',
                    onPress: () => resolve(false),
                },
                {
                    text: confirmText,
                    style: destructive ? 'destructive' : 'default',
                    onPress: () => resolve(true),
                },
            ],
            {
                cancelable: true,
                onDismiss: () => resolve(false),
            }
        );
    });
};
