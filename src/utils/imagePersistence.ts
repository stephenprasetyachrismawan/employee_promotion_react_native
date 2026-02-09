import { Platform } from 'react-native';
import type { DocumentPickerAsset } from 'expo-document-picker';

const BLOB_URI_PREFIX = 'blob:';
const DATA_URI_PREFIX = 'data:';

const fileToDataUri = (file: unknown): Promise<string> =>
    new Promise((resolve, reject) => {
        const Reader = (globalThis as { FileReader?: new () => { readAsDataURL: (input: unknown) => void; result: unknown; onerror: (() => void) | null; onload: (() => void) | null } }).FileReader;
        if (!Reader) {
            reject(new Error('FileReader is not available'));
            return;
        }
        const reader = new Reader();
        reader.onerror = () => reject(new Error('Failed to convert image to data URI'));
        reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
                resolve(result);
                return;
            }
            reject(new Error('Invalid FileReader result'));
        };
        reader.readAsDataURL(file);
    });

export const sanitizeStoredImageUri = (uri?: string | null): string | null => {
    if (!uri) return null;

    // `blob:` URLs are session-scoped in browsers and break after refresh/login.
    if (Platform.OS === 'web' && uri.startsWith(BLOB_URI_PREFIX)) {
        return null;
    }

    return uri;
};

export const toPersistableImageUri = async (
    asset: DocumentPickerAsset
): Promise<string | null> => {
    const rawUri = asset.uri ?? null;
    if (!rawUri) return null;

    if (Platform.OS !== 'web') {
        return rawUri;
    }

    if (asset.base64) {
        if (asset.base64.startsWith(DATA_URI_PREFIX)) {
            return asset.base64;
        }
        const mimeType = asset.mimeType ?? 'image/jpeg';
        return `data:${mimeType};base64,${asset.base64}`;
    }

    const file = asset.file;
    if (file) {
        return fileToDataUri(file);
    }

    if (rawUri.startsWith(BLOB_URI_PREFIX)) {
        const response = await fetch(rawUri);
        const blob = await response.blob();
        return fileToDataUri(blob);
    }

    return rawUri;
};
