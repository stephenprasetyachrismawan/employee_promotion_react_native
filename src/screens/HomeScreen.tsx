import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { CriteriaService } from '../database/services/CriteriaService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CandidateService } from '../database/services/CandidateService';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }: any) {
    const { user } = useAuth();
    const [groupCount, setGroupCount] = useState(0);
    const [criteriaCount, setCriteriaCount] = useState(0);
    const [readyGroups, setReadyGroups] = useState(0);
    const [candidateCount, setCandidateCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStatus();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadStatus();
        });

        return unsubscribe;
    }, [navigation]);

    const loadStatus = async () => {
        if (!user) return;

        try {
            const groups = await CriteriaGroupService.getAll(user.uid);
            const counts = await Promise.all(
                groups.map(async (group) => {
                    const [criteria, candidates] = await Promise.all([
                        CriteriaService.getByGroup(user.uid, group.id),
                        CandidateService.getAllByGroup(user.uid, group.id),
                    ]);
                    const totalWeight = criteria.reduce(
                        (sum, criterion) => sum + (criterion.weight ?? 0),
                        0
                    );
                    const isReady =
                        criteria.length > 0 &&
                        candidates.length > 0 &&
                        Math.abs(totalWeight - 100) < 0.01;
                    return {
                        criteriaCount: criteria.length,
                        candidateCount: candidates.length,
                        isReady,
                    };
                })
            );

            const totalCriteria = counts.reduce((sum, item) => sum + item.criteriaCount, 0);
            const totalCandidates = counts.reduce((sum, item) => sum + item.candidateCount, 0);
            const readyCount = counts.filter(item => item.isReady).length;

            setGroupCount(groups.length);
            setCriteriaCount(totalCriteria);
            setCandidateCount(totalCandidates);
            setReadyGroups(readyCount);
        } catch (error) {
            console.error('Error loading status:', error);
        } finally {
            setLoading(false);
        }
    };

    const isReadyToAnalyze = readyGroups > 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <FontAwesome5 name="chart-bar" size={32} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>Welcome, {user?.displayName?.split(' ')[0] || 'User'}!</Text>
                    <Text style={styles.subtitle}>Smart decisions for employee growth.</Text>
                </View>

                {/* Status Cards */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.statusCard}
                        onPress={() => navigation.navigate('Criteria')}
                    >
                        <View style={styles.statusCardHeader}>
                            <FontAwesome5 name="cog" size={24} color={colors.primary} />
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusBadgeText}>
                                    {criteriaCount > 0 ? '✓' : '!'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.statusCardTitle}>Configure Criteria</Text>
                        <Text style={styles.statusCardSubtitle}>Create groups and criteria</Text>
                        <Text style={styles.statusCardInfo}>
                            {groupCount} {groupCount === 1 ? 'group' : 'groups'} • {criteriaCount}{' '}
                            {criteriaCount === 1 ? 'criterion' : 'criteria'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.statusCard}
                        onPress={() => navigation.navigate('Input')}
                    >
                        <View style={styles.statusCardHeader}>
                            <FontAwesome5 name="users" size={24} color={colors.benefit} />
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusBadgeText}>
                                    {candidateCount > 0 ? '✓' : '!'}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.statusCardTitle}>Input Data</Text>
                        <Text style={styles.statusCardSubtitle}>Upload Excel or enter manually</Text>
                        <Text style={styles.statusCardInfo}>
                            {candidateCount} {candidateCount === 1 ? 'candidate' : 'candidates'} added
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Ready to Analyze Section */}
                <Card style={styles.analyzeCard} variant="elevated">
                    <Text style={styles.analyzeTitle}>Ready to Analyze?</Text>
                    <Text style={styles.analyzeSubtitle}>
                        Jalankan Decision Support System dengan metode WPM atau SAW.
                    </Text>
                    <Button
                        title="View Results"
                        onPress={() => navigation.navigate('Results')}
                        disabled={!isReadyToAnalyze}
                        style={styles.analyzeButton}
                    />
                    {!isReadyToAnalyze && (
                        <Text style={styles.warningText}>
                            {groupCount === 0 && '• Create a criteria group first\n'}
                            {readyGroups === 0 && groupCount > 0 && '• Ensure one group has 100% weight\n'}
                            {candidateCount === 0 && '• Add candidate data'}
                        </Text>
                    )}
                </Card>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
    },

    header: {
        alignItems: 'center',
        marginBottom: spacing['3xl'],
        marginTop: spacing.xl,
    },

    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    title: {
        fontSize: typography['3xl'],
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },

    section: {
        marginBottom: spacing.xl,
    },

    statusCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },

    statusCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    statusBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.benefit + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },

    statusBadgeText: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.benefit,
    },

    statusCardTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    statusCardSubtitle: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },

    statusCardInfo: {
        fontSize: typography.sm,
        color: colors.textTertiary,
    },

    analyzeCard: {
        backgroundColor: colors.dark.surface,
        padding: spacing.xl,
    },

    analyzeTitle: {
        fontSize: typography.xl,
        fontWeight: typography.bold,
        color: colors.surface,
        marginBottom: spacing.xs,
    },

    analyzeSubtitle: {
        fontSize: typography.base,
        color: colors.textTertiary,
        marginBottom: spacing.lg,
    },

    analyzeButton: {
        marginTop: spacing.md,
    },

    warningText: {
        fontSize: typography.sm,
        color: colors.warning,
        marginTop: spacing.md,
    },
});
