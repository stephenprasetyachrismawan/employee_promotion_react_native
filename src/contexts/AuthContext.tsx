import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, signOut as firebaseSignOut, onAuthStateChanged, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth, firebaseInitError } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId,
        iosClientId,
        webClientId,
        scopes: ['openid', 'profile', 'email'],
    });

    useEffect(() => {
        if (!auth) {
            console.warn(firebaseInitError ?? 'Firebase Auth belum siap.');
            setLoading(false);
            return;
        }

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            setLoading(false);

            // Persist user ID for quick access
            if (user) {
                await AsyncStorage.setItem('userId', user.uid);
            } else {
                await AsyncStorage.removeItem('userId');
            }
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        const finalizeGoogleSignIn = async () => {
            if (!auth || response?.type !== 'success') {
                return;
            }

            const idToken = response.authentication?.idToken ?? response.params?.id_token;
            const accessToken = response.authentication?.accessToken ?? response.params?.access_token;

            if (!idToken && !accessToken) {
                throw new Error('Token Google tidak ditemukan');
            }

            const credential = GoogleAuthProvider.credential(idToken ?? null, accessToken);
            await signInWithCredential(auth, credential);
        };

        finalizeGoogleSignIn().catch((error) => {
            console.error('Google sign-in finalize error:', error);
        });
    }, [response]);

    const signInWithGoogle = async () => {
        try {
            if (!auth) {
                throw new Error(firebaseInitError ?? 'Firebase Auth belum siap.');
            }

            const activeClientId = Platform.select({
                android: androidClientId,
                ios: iosClientId,
                default: webClientId,
            });

            if (!activeClientId) {
                const requiredEnv = Platform.select({
                    android: 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
                    ios: 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
                    default: 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
                });
                throw new Error(`${requiredEnv} belum dikonfigurasi di .env`);
            }

            if (!request) {
                throw new Error('Google auth request belum siap. Coba lagi.');
            }

            const result = await promptAsync();
            if (result.type === 'cancel' || result.type === 'dismiss') {
                console.log('User cancelled the login');
                return;
            }

            if (result.type === 'error') {
                throw new Error(result.error?.message ?? 'Login Google gagal');
            }
        } catch (error) {
            console.error('Error signing in with Google:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            if (!auth) {
                return;
            }

            await firebaseSignOut(auth);
            await AsyncStorage.removeItem('userId');
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
