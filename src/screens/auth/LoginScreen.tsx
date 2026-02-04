import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = React.useState(false);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error('Sign in error:', error);
            alert('Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <FontAwesome5 name="trophy" size={80} color={colors.primary} />
                    <Text style={styles.title}>PromoteAI</Text>
                    <Text style={styles.subtitle}>
                        Employee Promotion Decision Support System
                    </Text>
                </View>

                <View style={styles.featuresContainer}>
                    <View style={styles.feature}>
                        <FontAwesome5 name="chart-line" size={24} color={colors.primary} />
                        <Text style={styles.featureText}>Smart Analysis</Text>
                    </View>
                    <View style={styles.feature}>
                        <FontAwesome5 name="users" size={24} color={colors.primary} />
                        <Text style={styles.featureText}>Multi-Criteria Evaluation</Text>
                    </View>
                    <View style={styles.feature}>
                        <FontAwesome5 name="cloud" size={24} color={colors.primary} />
                        <Text style={styles.featureText}>Cloud Sync</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.googleButton, loading && styles.googleButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={loading}
                >
                    <FontAwesome5 name="google" size={24} color={colors.surface} />
                    <Text style={styles.googleButtonText}>
                        {loading ? 'Signing in...' : 'Continue with Google'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },

    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing['3xl'],
    },

    title: {
        fontSize: typography['3xl'],
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 300,
    },

    featuresContainer: {
        width: '100%',
        maxWidth: 400,
        marginBottom: spacing['3xl'],
    },

    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.lg,
    },

    featureText: {
        fontSize: typography.base,
        color: colors.textPrimary,
        marginLeft: spacing.md,
        fontWeight: typography.medium,
    },

    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.lg,
        width: '100%',
        maxWidth: 400,
        ...shadows.md,
    },

    googleButtonDisabled: {
        opacity: 0.6,
    },

    googleButtonText: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.surface,
        marginLeft: spacing.md,
    },

    disclaimer: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.xl,
        maxWidth: 300,
    },
});
