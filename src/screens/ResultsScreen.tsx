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
import { Criterion, WPMResult } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { WeightService } from '../database/services/WeightService';
import { CandidateService } from '../database/services/CandidateService';
import { WPMCalculator } from '../utils/wpm';
import { useAuth } from '../contexts/AuthContext';

interface CandidateResultCardProps {
    result: WPMResult;
    criteria: Criterion[];
    onToggle: () => void;
    isExpanded: boolean;
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
    const [results, setResults] = useState<WPMResult[]>([]);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
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
            const [criteriaData, weightsData, candidatesData] = await Promise.all([
                CriteriaService.getAll(user.uid),
                WeightService.getAll(user.uid),
                CandidateService.getAllWithValues(user.uid),
            ]);

            if (criteriaData.length === 0) {
                setError('No criteria configured');
                return;
            }

            if (candidatesData.length === 0) {
                setError('No candidates added');
                return;
            }

            const isWeightsValid = await WeightService.isValid(user.uid);
            if (!isWeightsValid) {
                setError('Weights must total 100%');
                return;
            }

            const calculatedResults = WPMCalculator.calculateNormalized(
                candidatesData,
                criteriaData,
                weightsData
            );

            setResults(calculatedResults);
            setCriteria(criteriaData);
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
                    <Text style={styles.title}>Analysis Results</Text>
                    <Text style={styles.subtitle}>Weighted Product Method Ranking.</Text>
                </View>
                <View style={styles.emptyState}>
                    <FontAwesome5 name="exclamation-circle" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>{error}</Text>
                    <Text style={styles.emptySubtext}>
                        {error.includes('criteria') && 'Add criteria to get started'}
                        {error.includes('candidates') && 'Add candidate data to analyze'}
                        {error.includes('Weights') && 'Set weights to 100% to continue'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Analysis Results</Text>
                <Text style={styles.subtitle}>Weighted Product Method Ranking.</Text>
            </View>

            {loading ? (
                <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>Calculating scores...</Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    {results.map((result) => (
                        <CandidateResultCard
                            key={result.candidateId}
                            result={result}
                            criteria={criteria}
                            onToggle={() => toggleExpand(result.candidateId)}
                            isExpanded={expandedId === result.candidateId}
                        />
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
