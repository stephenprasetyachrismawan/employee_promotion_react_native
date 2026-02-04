import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Criterion } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { useAuth } from '../contexts/AuthContext';

export default function CriteriaListScreen({ navigation }: any) {
    const { user } = useAuth();
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCriteria();
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadCriteria();
        });

        return unsubscribe;
    }, [navigation]);

    const loadCriteria = async () => {
        if (!user) return;

        try {
            const data = await CriteriaService.getAll(user.uid);
            setCriteria(data);
        } catch (error) {
            console.error('Error loading criteria:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (!user) return;

        Alert.alert(
            'Delete Criterion',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await CriteriaService.delete(user.uid, id);
                            loadCriteria();
                        } catch (error) {
                            console.error('Error deleting criterion:', error);
                        }
                    },
                },
            ]
        );
    };

    const renderCriterion = ({ item }: { item: Criterion }) => {
        const isBenefit = item.impactType === 'BENEFIT';
        const iconColor = isBenefit ? colors.benefit : colors.cost;

        return (
            <View style={styles.criterionCard}>
                <View style={styles.criterionContent}>
                    <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                        <FontAwesome5
                            name={isBenefit ? 'arrow-up' : 'arrow-down'}
                            size={24}
                            color={iconColor}
                        />
                    </View>
                    <View style={styles.criterionInfo}>
                        <Text style={styles.criterionName}>{item.name}</Text>
                        <View style={styles.criterionMeta}>
                            <Text style={styles.metaText}>{item.impactType}</Text>
                            <Text style={styles.metaSeparator}>•</Text>
                            <Text style={styles.metaText}>{item.dataType}</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() =>
                            navigation.navigate('CriterionForm', {
                                criterionId: item.id,
                                mode: 'edit',
                            })
                        }
                    >
                        <FontAwesome5 name="edit" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(item.id, item.name)}
                    >
                        <FontAwesome5 name="trash" size={20} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Criteria</Text>
                <Text style={styles.subtitle}>Define metrics and score types.</Text>
            </View>

            {criteria.length === 0 && !loading ? (
                <View style={styles.emptyState}>
                    <FontAwesome5 name="list" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No criteria yet</Text>
                    <Text style={styles.emptySubtext}>
                        Add criteria to start evaluating candidates
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={criteria}
                    renderItem={renderCriterion}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CriterionForm', { mode: 'add' })}
            >
                <FontAwesome5 name="plus" size={28} color={colors.surface} />
            </TouchableOpacity>
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

    list: {
        padding: spacing.lg,
        paddingTop: 0,
    },

    criterionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },

    criterionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },

    criterionInfo: {
        flex: 1,
    },

    criterionName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    criterionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    metaText: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    metaSeparator: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        marginHorizontal: spacing.xs,
    },

    actions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    actionButton: {
        padding: spacing.sm,
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

    fab: {
        position: 'absolute',
        right: spacing.lg,
        bottom: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
    },
});
