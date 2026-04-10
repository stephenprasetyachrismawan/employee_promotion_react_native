import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AHPAlternative } from '../../types';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { SwipeableRow } from '../../components/common/SwipeableRow';

interface AHPStep6AlternativesScreenProps {
    alternatives: AHPAlternative[];
    affectedMatrixCount: number;
    onAdd: (name: string) => Promise<void>;
    onDelete: (alternative: AHPAlternative) => Promise<void>;
}

export default function AHPStep6AlternativesScreen({
    alternatives,
    affectedMatrixCount,
    onAdd,
    onDelete,
}: AHPStep6AlternativesScreenProps) {
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
            <Text style={styles.title}>Alternatives Setup</Text>
            <Text style={styles.description}>
                Tambahkan minimal dua alternative atau kandidat. Mengubah jumlah alternative akan
                mereset semua matrix alternative.
            </Text>
            <View style={styles.warningBanner}>
                <Text style={styles.warningText}>
                    Perubahan alternative akan mereset {affectedMatrixCount} matrix pairwise.
                </Text>
            </View>
            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Nama alternative"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                />
                <Button title="Tambah" onPress={handleAdd} style={styles.addButton} />
            </View>
            <View style={styles.list}>
                {alternatives.map((alternative, index) => (
                    <SwipeableRow
                        key={alternative.id}
                        containerStyle={styles.itemRow}
                        rightActions={[
                            {
                                id: `delete-${alternative.id}`,
                                label: 'Delete',
                                icon: 'trash',
                                color: colors.error,
                                onPress: () => onDelete(alternative),
                            },
                        ]}
                    >
                        <View style={styles.itemCard}>
                            <Text style={styles.itemOrder}>{index + 1}</Text>
                            <Text style={styles.itemName}>{alternative.name}</Text>
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
    },

    warningText: {
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

    itemName: {
        flex: 1,
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },
});
