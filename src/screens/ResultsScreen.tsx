import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Criterion, CriteriaGroup, DecisionResult } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CandidateService } from '../database/services/CandidateService';
import { WPMCalculator } from '../utils/wpm';
import { SAWCalculator } from '../utils/saw';
import { useAuth } from '../contexts/AuthContext';

interface CandidateResultCardProps {
    result: DecisionResult;
    criteria: Criterion[];
    onToggle: () => void;
    isExpanded: boolean;
}

interface GroupResults {
    group: CriteriaGroup;
    criteria: Criterion[];
    results: DecisionResult[];
    status: 'ready' | 'missingCriteria' | 'missingCandidates' | 'invalidWeights';
}

const CandidateResultCard: React.FC<CandidateResultCardProps> = ({
    result,
    criteria,
    onToggle,
    isExpanded,
}) => {
    const getRankColor = (rank: number) => {
        if (rank === 1) return colors.warning;
        if (rank === 2) return colors.textSecondary;
        if (rank === 3) return '#CD7F32'; // Bronze
        return colors.textTertiary;
    };

    return (
        <TouchableOpacity
            style={[
                styles.resultCard,
                result.rank === 1 && styles.topRankCard,
            ]}
            onPress={onToggle}
        >
            <View style={styles.resultHeader}>
                <View style={styles.rankBadge}>
                    <Text style={[styles.rankNumber, { color: getRankColor(result.rank) }]}>
                        {result.rank}
                    </Text>
                </View>

                {result.imageUri ? (
                    <Image source={{ uri: result.imageUri }} style={styles.candidateAvatar} />
                ) : (
                    <View style={styles.candidateAvatarPlaceholder}>
                        <FontAwesome5 name="user" size={18} color={colors.textSecondary} />
                    </View>
                )}

                <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>{result.candidateName}</Text>
                    <View style={styles.scoreBar}>
                        <View
                            style={[styles.scoreBarFill, { width: `${result.score}%` }]}
                        />
                    </View>
                    <Text style={styles.scoreText}>{result.score.toFixed(2)}%</Text>
                </View>

                {result.rank === 1 && (
                    <FontAwesome5 name="trophy" size={28} color={colors.warning} />
                )}

                <FontAwesome5
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textSecondary}
                />
            </View>

            {isExpanded && (
                <View style={styles.detailsSection}>
                    <View style={styles.divider} />
                    <View style={styles.detailsGrid}>
                        {criteria.map((criterion) => {
                            const value = result.values[criterion.id];
                            return (
                                <View key={criterion.id} style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>{criterion.name}</Text>
                                    <Text style={styles.detailValue}>{value}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function ResultsScreen({ navigation }: any) {
    const { user } = useAuth();
    const [groupResults, setGroupResults] = useState<GroupResults[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadResults();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadResults();
        });

        return unsubscribe;
    }, [navigation]);

    const loadResults = async () => {
        setLoading(true);
        setError(null);

        try {
            if (!user) return;
            const groups = await CriteriaGroupService.getAll(user.uid);

            if (groups.length === 0) {
                setError('No criteria groups configured');
                return;
            }

            const resultsByGroup = await Promise.all(
                groups.map(async (group) => {
                    const [criteriaData, candidatesData] = await Promise.all([
                        CriteriaService.getByGroup(user.uid, group.id),
                        CandidateService.getAllWithValuesByGroup(user.uid, group.id),
                    ]);

                    if (criteriaData.length === 0) {
                        return {
                            group,
                            criteria: criteriaData,
                            results: [],
                            status: 'missingCriteria' as const,
                        };
                    }

                    if (candidatesData.length === 0) {
                        return {
                            group,
                            criteria: criteriaData,
                            results: [],
                            status: 'missingCandidates' as const,
                        };
                    }

                    const totalWeight = criteriaData.reduce(
                        (sum, criterion) => sum + (criterion.weight ?? 0),
                        0
                    );
                    if (Math.abs(totalWeight - 100) > 0.01) {
                        return {
                            group,
                            criteria: criteriaData,
                            results: [],
                            status: 'invalidWeights' as const,
                        };
                    }

                    const calculatedResults =
                        group.method === 'SAW'
                            ? SAWCalculator.calculateNormalized(candidatesData, criteriaData)
                            : WPMCalculator.calculateNormalized(candidatesData, criteriaData);

                    return {
                        group,
                        criteria: criteriaData,
                        results: calculatedResults,
                        status: 'ready' as const,
                    };
                })
            );

            setGroupResults(resultsByGroup);
        } catch (error) {
            console.error('Error loading results:', error);
            setError('Failed to calculate results');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (candidateId: string) => {
        setExpandedId(expandedId === candidateId ? null : candidateId);
    };

    if (error) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Decision Support System Results</Text>
                    <Text style={styles.subtitle}>
                        Rangking berbasis metode grup (WPM atau SAW).
                    </Text>
                </View>
                <View style={styles.emptyState}>
                    <FontAwesome5 name="exclamation-circle" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>{error}</Text>
                    <Text style={styles.emptySubtext}>
                        {error.includes('groups') && 'Add a criteria group to get started'}
                        {error.includes('Failed') && 'Try refreshing the results'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Decision Support System Results</Text>
                <Text style={styles.subtitle}>
                    Rangking berbasis metode grup (WPM atau SAW).
                </Text>
            </View>

            {loading ? (
                <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>Calculating scores...</Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    {groupResults.map((groupResult) => (
                        <View key={groupResult.group.id} style={styles.groupCard}>
                            <View style={styles.groupHeader}>
                                <View>
                                    <Text style={styles.groupTitle}>{groupResult.group.name}</Text>
                                    <Text style={styles.groupSubtitle}>
                                        {groupResult.criteria.length} criteria
                                    </Text>
                                </View>
                                <View style={styles.groupMetaRight}>
                                    <View
                                        style={[
                                            styles.methodBadge,
                                            groupResult.group.method === 'SAW'
                                                ? styles.methodBadgeSaw
                                                : styles.methodBadgeWpm,
                                        ]}
                                    >
                                        <Text style={styles.methodBadgeText}>
                                            {groupResult.group.method}
                                        </Text>
                                    </View>
                                    <View style={styles.groupStatus}>
                                        <FontAwesome5
                                            name={
                                                groupResult.status === 'ready'
                                                    ? 'check-circle'
                                                    : 'exclamation-circle'
                                            }
                                            size={18}
                                            color={
                                                groupResult.status === 'ready'
                                                    ? colors.success
                                                    : colors.warning
                                            }
                                        />
                                    </View>
                                </View>
                            </View>

                            {groupResult.status !== 'ready' ? (
                                <View style={styles.groupMessage}>
                                    <Text style={styles.groupMessageText}>
                                        {groupResult.status === 'missingCriteria' &&
                                            'Tambahkan criteria untuk grup ini.'}
                                        {groupResult.status === 'missingCandidates' &&
                                            'Tambahkan data kandidat untuk grup ini.'}
                                        {groupResult.status === 'invalidWeights' &&
                                            'Total bobot harus 100%.'}
                                    </Text>
                                </View>
                            ) : (
                                groupResult.results.map((result) => (
                                    <CandidateResultCard
                                        key={result.candidateId}
                                        result={result}
                                        criteria={groupResult.criteria}
                                        onToggle={() => toggleExpand(result.candidateId)}
                                        isExpanded={expandedId === result.candidateId}
                                    />
                                ))
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    header: {
        padding: spacing.lg,
        paddingTop: spacing.xl,
    },

    title: {
        fontSize: typography['2xl'],
        fontWeight: typography.bold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
        paddingTop: 0,
    },

    groupCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        ...shadows.sm,
    },

    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    groupMetaRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    groupTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    groupSubtitle: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        marginTop: spacing.xs,
    },

    groupStatus: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },

    methodBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },

    methodBadgeWpm: {
        backgroundColor: colors.primary + '20',
    },

    methodBadgeSaw: {
        backgroundColor: colors.benefit + '20',
    },

    methodBadgeText: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    groupMessage: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
    },

    groupMessageText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    resultCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.md,
    },

    topRankCard: {
        borderWidth: 2,
        borderColor: colors.warning + '60',
        backgroundColor: colors.warning + '05',
    },

    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },

    rankBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.dark.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },

    rankNumber: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
    },

    candidateInfo: {
        flex: 1,
    },

    candidateAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },

    candidateAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },

    candidateName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },

    scoreBar: {
        height: 8,
        backgroundColor: colors.borderLight,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },

    scoreBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },

    scoreText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
    },

    detailsSection: {
        marginTop: spacing.md,
    },

    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: spacing.md,
    },

    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },

    detailItem: {
        width: '48%',
        backgroundColor: colors.background,
        padding: spacing.md,
        borderRadius: borderRadius.md,
    },

    detailLabel: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },

    detailValue: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },

    emptyText: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        marginTop: spacing.lg,
    },

    emptySubtext: {
        fontSize: typography.base,
        color: colors.textTertiary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },

    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },
});
