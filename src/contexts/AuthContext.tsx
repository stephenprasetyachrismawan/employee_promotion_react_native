import React, { createContext, useState, useEffect, useContext } from 'react';
import { User, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseInitError } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

            throw new Error(
                'Login Google native belum diimplementasikan. Gunakan Expo Auth Session + signInWithCredential.'
            );
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
