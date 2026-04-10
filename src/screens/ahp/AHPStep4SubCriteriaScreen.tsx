import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AHPCriterion, AHPSubCriterion } from '../../types';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { SwipeableRow } from '../../components/common/SwipeableRow';
import { SectionDisclosure } from '../../components/common/SectionDisclosure';

interface AHPStep4SubCriteriaScreenProps {
    criteria: AHPCriterion[];
    subCriteria: AHPSubCriterion[];
    onAdd: (criterionId: string, name: string) => Promise<void>;
    onDelete: (subCriterion: AHPSubCriterion) => Promise<void>;
}

export default function AHPStep4SubCriteriaScreen({
    criteria,
    subCriteria,
    onAdd,
    onDelete,
}: AHPStep4SubCriteriaScreenProps) {
    const [names, setNames] = useState<Record<string, string>>({});

    const handleAdd = async (criterionId: string) => {
        const name = names[criterionId]?.trim();
        if (!name) {
            return;
        }
        await onAdd(criterionId, name);
        setNames((current) => ({ ...current, [criterionId]: '' }));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Sub-Criteria Setup</Text>
            <Text style={styles.description}>
                Tambahkan sub-criteria per criterion bila detail penilaian perlu dipecah lebih
                lanjut. Perubahan jumlah sub-criteria akan mereset matrix sub terkait.
            </Text>

            {criteria.map((criterion) => {
                const children = subCriteria.filter((item) => item.criterionId === criterion.id);

                return (
                    <SectionDisclosure
                        key={criterion.id}
                        title={criterion.name}
                        subtitle={`${children.length} sub-criteria`}
                        iconName="sitemap"
                        defaultExpanded
                    >
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Nama sub-criterion"
                                placeholderTextColor={colors.textTertiary}
                                value={names[criterion.id] ?? ''}
                                onChangeText={(value) =>
                                    setNames((current) => ({
                                        ...current,
                                        [criterion.id]: value,
                                    }))
                                }
                            />
                            <Button
                                title="Tambah"
                                onPress={() => handleAdd(criterion.id)}
                                style={styles.addButton}
                            />
                        </View>

                        {children.length === 1 ? (
                            <Text style={styles.warningText}>
                                Tambahkan minimal dua sub-criteria atau hapus sub-criteria ini.
                            </Text>
                        ) : null}

                        {children.map((child, index) => (
                            <SwipeableRow
                                key={child.id}
                                containerStyle={styles.itemRow}
                                rightActions={[
                                    {
                                        id: `delete-${child.id}`,
                                        label: 'Delete',
                                        icon: 'trash',
                                        color: colors.error,
                                        onPress: () => onDelete(child),
                                    },
                                ]}
                            >
                                <View style={styles.itemCard}>
                                    <Text style={styles.itemOrder}>{index + 1}</Text>
                                    <View style={styles.itemInfo}>
                                        <Text style={styles.itemName}>{child.name}</Text>
                                        <Text style={styles.itemMeta}>
                                            Local: {(child.localWeight * 100).toFixed(2)}% |
                                            Global: {(child.globalWeight * 100).toFixed(2)}%
                                        </Text>
                                    </View>
                                </View>
                            </SwipeableRow>
                        ))}
                    </SectionDisclosure>
                );
            })}
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
        backgroundColor: colors.background,
        padding: spacing.md,
        fontSize: typography.base,
        color: colors.textPrimary,
    },

    addButton: {
        minWidth: 110,
    },

    warningText: {
        fontSize: typography.sm,
        color: colors.warning,
        fontWeight: typography.semibold,
    },

    itemRow: {
        marginTop: spacing.sm,
    },

    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.sm,
    },

    itemOrder: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary + '15',
        color: colors.primary,
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: typography.xs,
        fontWeight: typography.bold,
    },

    itemInfo: {
        flex: 1,
    },

    itemName: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    itemMeta: {
        marginTop: spacing.xs,
        fontSize: typography.xs,
        color: colors.textSecondary,
    },
});
