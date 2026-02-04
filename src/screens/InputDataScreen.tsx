import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Image,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Button } from '../components/common/Button';
import { Candidate } from '../types';
import { CandidateService } from '../database/services/CandidateService';
import { CriteriaService } from '../database/services/CriteriaService';
import { ExcelHandler } from '../utils/excelHandler';
import { useAuth } from '../contexts/AuthContext';

export default function InputDataScreen({ navigation }: any) {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [criteriaCount, setCriteriaCount] = useState(0);

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
            const [candidatesData, count] = await Promise.all([
                CandidateService.getAll(user.uid),
                CriteriaService.count(user.uid),
            ]);
            setCandidates(candidatesData);
            setCriteriaCount(count);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (!user) return;
        Alert.alert(
            'Delete Candidate',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await CandidateService.delete(user.uid, id);
                            loadData();
                        } catch (error) {
                            console.error('Error deleting candidate:', error);
                        }
                    },
                },
            ]
        );
    };

    const handleDownloadTemplate = async () => {
        if (!user) return;
        try {
            const criteria = await CriteriaService.getAll(user.uid);
            if (criteria.length === 0) {
                Alert.alert('No Criteria', 'Please add criteria first before downloading template');
                return;
            }
            await ExcelHandler.generateTemplate(criteria);
        } catch (error) {
            console.error('Error downloading template:', error);
            Alert.alert('Error', 'Failed to generate template');
        }
    };

    const renderCandidate = ({ item }: { item: Candidate }) => (
        <View style={styles.candidateCard}>
            <View style={styles.candidateContent}>
                {item.imageUri ? (
                    <Image source={{ uri: item.imageUri }} style={styles.candidateAvatar} />
                ) : (
                    <View style={styles.iconContainer}>
                        <FontAwesome5 name="user" size={24} color={colors.primary} />
                    </View>
                )}
                <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>{item.name}</Text>
                    <Text style={styles.candidateDate}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() =>
                        navigation.navigate('ManualEntry', {
                            candidateId: item.id,
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

    if (criteriaCount === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.emptyState}>
                    <FontAwesome5 name="users" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No criteria configured</Text>
                    <Text style={styles.emptySubtext}>
                        Add criteria first before adding candidate data
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
                <Text style={styles.title}>Input Data</Text>
                <Text style={styles.subtitle}>Upload Excel or enter manually</Text>
            </View>

            <View style={styles.actionCards}>
                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('ManualEntry', { mode: 'add' })}
                >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.primary + '20' }]}>
                        <FontAwesome5 name="edit" size={28} color={colors.primary} />
                    </View>
                    <Text style={styles.actionCardTitle}>Manual Entry</Text>
                    <Text style={styles.actionCardSubtitle}>Add candidate data manually</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={() => navigation.navigate('ExcelUpload')}
                >
                    <View style={[styles.actionIconContainer, { backgroundColor: colors.benefit + '20' }]}>
                        <FontAwesome5 name="cloud-upload-alt" size={28} color={colors.benefit} />
                    </View>
                    <Text style={styles.actionCardTitle}>Upload Excel</Text>
                    <Text style={styles.actionCardSubtitle}>Import multiple candidates</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.templateSection}>
                <Button
                    title="Download Template"
                    onPress={handleDownloadTemplate}
                    variant="outline"
                    style={styles.templateButton}
                />
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Candidates ({candidates.length})</Text>
            </View>

            {candidates.length === 0 ? (
                <View style={styles.emptyList}>
                    <Text style={styles.emptyListText}>No candidates yet</Text>
                </View>
            ) : (
                <FlatList
                    data={candidates}
                    renderItem={renderCandidate}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
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

    actionCards: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
        marginBottom: spacing.lg,
    },

    actionCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        ...shadows.sm,
    },

    actionIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    actionCardTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    actionCardSubtitle: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        textAlign: 'center',
    },

    templateSection: {
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.lg,
    },

    templateButton: {
        marginBottom: 0,
    },

    listHeader: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    listTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    list: {
        padding: spacing.lg,
    },

    candidateCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },

    candidateContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },

    candidateAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
    },

    candidateInfo: {
        flex: 1,
    },

    candidateName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    candidateDate: {
        fontSize: typography.sm,
        color: colors.textSecondary,
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

    emptyButton: {
        marginTop: spacing.xl,
    },

    emptyList: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },

    emptyListText: {
        fontSize: typography.base,
        color: colors.textTertiary,
    },
});
