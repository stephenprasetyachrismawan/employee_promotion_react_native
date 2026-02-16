import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, signOut as firebaseSignOut, onAuthStateChanged, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { auth, firebaseInitError } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

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

    // Use Expo's auth proxy for easier setup (already whitelisted by Google)
    const redirectUri = AuthSession.makeRedirectUri({
        useProxy: true,
    });

    console.log('Redirect URI:', redirectUri);

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

    const signInWithGoogle = async () => {
        try {
            if (!auth) {
                throw new Error(firebaseInitError ?? 'Firebase Auth belum siap.');
            }

            const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
            if (!clientId) {
                throw new Error('Google Client ID belum dikonfigurasi di .env');
            }

            // Configure Google OAuth
            const discovery = {
                authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
                tokenEndpoint: 'https://oauth2.googleapis.com/token',
            };

            // Create authorization request
            const request = new AuthSession.AuthRequest({
                clientId,
                redirectUri,
                scopes: ['openid', 'profile', 'email'],
                responseType: AuthSession.ResponseType.Token,
                usePKCE: false,
            });

            const result = await request.promptAsync(discovery);

            if (result.type === 'success') {
                const { id_token } = result.params;

                if (!id_token) {
                    throw new Error('ID token tidak ditemukan dalam response');
                }

                // Create credential with Google ID token
                const credential = GoogleAuthProvider.credential(id_token);

                // Sign in to Firebase with credential
                await signInWithCredential(auth, credential);
            } else if (result.type === 'cancel') {
                console.log('User cancelled the login');
            } else {
                throw new Error('Login failed');
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
