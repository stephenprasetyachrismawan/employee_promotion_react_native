import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AHPCriterion } from '../../types';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { SwipeableRow } from '../../components/common/SwipeableRow';

interface AHPStep2CriteriaScreenProps {
    criteria: AHPCriterion[];
    onAdd: (name: string) => Promise<void>;
    onDelete: (criterion: AHPCriterion) => Promise<void>;
}

export default function AHPStep2CriteriaScreen({
    criteria,
    onAdd,
    onDelete,
}: AHPStep2CriteriaScreenProps) {
    const [name, setName] = useState('');

    const handleAdd = async () => {
        if (!name.trim()) {
            return;
        }
        await onAdd(name.trim());
        setName('');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Criteria Setup</Text>
            <Text style={styles.description}>
                Tambah minimal dua criteria. Mengubah jumlah criteria akan mereset matrix
                pairwise criteria dan alternative per criterion.
            </Text>

            <View style={styles.warningBanner}>
                <FontAwesome5 name="exclamation-triangle" size={14} color={colors.warning} />
                <Text style={styles.warningText}>
                    Perubahan jumlah criteria akan mereset matrix terkait.
                </Text>
            </View>

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Nama criterion"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                />
                <Button title="Tambah" onPress={handleAdd} style={styles.addButton} />
            </View>

            <View style={styles.list}>
                {criteria.map((criterion, index) => (
                    <SwipeableRow
                        key={criterion.id}
                        containerStyle={styles.itemRow}
                        rightActions={[
                            {
                                id: `delete-${criterion.id}`,
                                label: 'Delete',
                                icon: 'trash',
                                color: colors.error,
                                onPress: () => onDelete(criterion),
                            },
                        ]}
                    >
                        <View style={styles.itemCard}>
                            <Text style={styles.itemOrder}>{index + 1}</Text>
                            <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{criterion.name}</Text>
                                <Text style={styles.itemMeta}>
                                    Weight: {(criterion.weight * 100).toFixed(2)}%
                                </Text>
                            </View>
                        </View>
                    </SwipeableRow>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
    },

    title: {
        fontSize: typography.lg,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    description: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        lineHeight: typography.sm * typography.lineHeight.normal,
    },

    warningBanner: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.warning + '55',
        backgroundColor: colors.warning + '12',
        padding: spacing.md,
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
    },

    warningText: {
        flex: 1,
        fontSize: typography.sm,
        color: colors.warning,
        fontWeight: typography.semibold,
    },

    inputRow: {
        flexDirection: 'row',
        gap: spacing.md,
        alignItems: 'center',
    },

    input: {
        flex: 1,
        minHeight: 52,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        fontSize: typography.base,
        color: colors.textPrimary,
    },

    addButton: {
        minWidth: 110,
    },

    list: {
        gap: spacing.md,
    },

    itemRow: {
        marginBottom: spacing.sm,
    },

    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
    },

    itemOrder: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        color: colors.primary,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: typography.sm,
        fontWeight: typography.bold,
    },

    itemInfo: {
        flex: 1,
    },

    itemName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    itemMeta: {
        marginTop: spacing.xs,
        fontSize: typography.xs,
        color: colors.textSecondary,
    },
});
