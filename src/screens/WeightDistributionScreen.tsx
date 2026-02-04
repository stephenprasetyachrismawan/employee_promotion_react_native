import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Button } from '../components/common/Button';
import { WeightSlider } from '../components/common/WeightSlider';
import { Criterion, Weight } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { WeightService } from '../database/services/WeightService';
import { useAuth } from '../contexts/AuthContext';

interface WeightSliderItemProps {
    criterion: Criterion;
    weight: Weight;
    onWeightChange: (criterionId: string, value: number) => void;
    onToggleLock: (criterionId: string) => void;
}

const WeightSliderItem: React.FC<WeightSliderItemProps> = ({
    criterion,
    weight,
    onWeightChange,
    onToggleLock,
}) => {
    return (
        <View style={styles.sliderItem}>
            <View style={styles.sliderHeader}>
                <TouchableOpacity onPress={() => onToggleLock(criterion.id)}>
                    <FontAwesome5
                        name={weight.isLocked ? 'lock' : 'lock-open'}
                        size={20}
                        color={weight.isLocked ? colors.primary : colors.textTertiary}
                    />
                </TouchableOpacity>
                <Text style={styles.criterionName}>{criterion.name}</Text>
                <Text style={styles.weightValue}>{Math.round(weight.weight)}%</Text>
            </View>
            <WeightSlider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={weight.weight}
                onValueChange={(value) => onWeightChange(criterion.id, value)}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.borderLight}
                thumbTintColor={colors.primary}
                disabled={weight.isLocked}
            />
        </View>
    );
};

export default function WeightDistributionScreen({ navigation }: any) {
    const { user } = useAuth();
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [weights, setWeights] = useState<Weight[]>([]);
    const [totalWeight, setTotalWeight] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });

        return unsubscribe;
    }, [navigation]);

    const loadData = async () => {
        if (!user) return;
        try {
            const [criteriaData, weightsData] = await Promise.all([
                CriteriaService.getAll(user.uid),
                WeightService.getAll(user.uid),
            ]);

            setCriteria(criteriaData);
            setWeights(weightsData);
            calculateTotal(weightsData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (weightsData: Weight[]) => {
        const total = weightsData.reduce((sum, w) => sum + w.weight, 0);
        setTotalWeight(total);
    };

    const handleWeightChange = async (criterionId: string, value: number) => {
        try {
            if (!user) return;
            await WeightService.updateWeight(user.uid, criterionId, value);
            const updatedWeights = await WeightService.getAll(user.uid);
            setWeights(updatedWeights);
            calculateTotal(updatedWeights);
        } catch (error) {
            console.error('Error updating weight:', error);
        }
    };

    const handleToggleLock = async (criterionId: string) => {
        try {
            if (!user) return;
            await WeightService.toggleLock(user.uid, criterionId);
            const updatedWeights = await WeightService.getAll(user.uid);
            setWeights(updatedWeights);
        } catch (error) {
            console.error('Error toggling lock:', error);
        }
    };

    const handleAutoBalance = async () => {
        try {
            if (!user) return;
            await WeightService.autoBalance(user.uid);
            const updatedWeights = await WeightService.getAll(user.uid);
            setWeights(updatedWeights);
            calculateTotal(updatedWeights);
        } catch (error) {
            console.error('Error auto-balancing:', error);
        }
    };

    const handleConfirm = async () => {
        const isValid = Math.abs(totalWeight - 100) < 0.01;

        if (!isValid) {
            Alert.alert('Invalid Weights', 'Total weight must equal 100%');
            return;
        }

        Alert.alert('Success', 'Weights saved successfully!', [
            { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
    };

    const isValid = Math.abs(totalWeight - 100) < 0.01;

    if (criteria.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyState}>
                    <FontAwesome5 name="balance-scale" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No criteria configured</Text>
                    <Text style={styles.emptySubtext}>
                        Add criteria first before setting weights
                    </Text>
                    <Button
                        title="Go to Criteria"
                        onPress={() => navigation.navigate('Criteria')}
                        style={styles.emptyButton}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Weighting</Text>
                    <TouchableOpacity style={styles.autoBalanceButton} onPress={handleAutoBalance}>
                        <FontAwesome5 name="bolt" size={16} color={colors.primary} />
                        <Text style={styles.autoBalanceText}>Auto-Balance</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.subtitle}>Distribution must total 100%.</Text>
            </View>

            <View style={[styles.totalCard, isValid && styles.totalCardValid]}>
                <View style={styles.totalContent}>
                    {isValid && (
                        <FontAwesome5 name="check-circle" size={24} color={colors.success} />
                    )}
                    <View>
                        <Text style={styles.totalLabel}>TOTAL ALLOCATION</Text>
                        <Text style={[styles.totalValue, isValid && styles.totalValueValid]}>
                            {Math.round(totalWeight)}%
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {criteria.map((criterion) => {
                    const weight = weights.find((w) => w.criterionId === criterion.id);
                    if (!weight) return null;

                    return (
                        <WeightSliderItem
                            key={criterion.id}
                            criterion={criterion}
                            weight={weight}
                            onWeightChange={handleWeightChange}
                            onToggleLock={handleToggleLock}
                        />
                    );
                })}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Confirm Weights"
                    onPress={handleConfirm}
                    disabled={!isValid}
                />
            </View>
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

    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },

    title: {
        fontSize: typography['2xl'],
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    subtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },

    autoBalanceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary + '10',
        borderRadius: borderRadius.md,
    },

    autoBalanceText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.primary,
    },

    totalCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.error + '40',
    },

    totalCardValid: {
        backgroundColor: colors.success + '10',
        borderColor: colors.success,
    },

    totalContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },

    totalLabel: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
        letterSpacing: 1,
    },

    totalValue: {
        fontSize: typography['3xl'],
        fontWeight: typography.bold,
        color: colors.error,
    },

    totalValueValid: {
        color: colors.success,
    },

    scrollView: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
        paddingTop: 0,
    },

    sliderItem: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },

    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    criterionName: {
        flex: 1,
        fontSize: typography.base,
        fontWeight: typography.medium,
        color: colors.textPrimary,
        marginLeft: spacing.md,
    },

    weightValue: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.primary,
    },

    slider: {
        width: '100%',
        height: 40,
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

    emptyButton: {
        marginTop: spacing.xl,
    },

    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
});
