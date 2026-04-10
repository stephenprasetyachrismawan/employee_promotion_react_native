import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { AHPProject } from '../../types';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import { Button } from '../../components/common/Button';
import { SectionDisclosure } from '../../components/common/SectionDisclosure';

interface AHPStep1SetupScreenProps {
    project: AHPProject;
    saving: boolean;
    onSave: (data: { name: string; goal: string; hasSub: boolean }) => Promise<void>;
}

export default function AHPStep1SetupScreen({
    project,
    saving,
    onSave,
}: AHPStep1SetupScreenProps) {
    const [name, setName] = useState(project.name);
    const [goal, setGoal] = useState(project.goal);
    const [hasSub, setHasSub] = useState(project.hasSub);

    useEffect(() => {
        setName(project.name);
        setGoal(project.goal);
        setHasSub(project.hasSub);
    }, [project]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Project Setup</Text>
            <Text style={styles.description}>
                Definisikan tujuan keputusan sebelum menyusun criteria dan alternatives.
            </Text>

            <View style={styles.field}>
                <Text style={styles.label}>Nama Project</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Contoh: Seleksi Promosi Q4"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Goal</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Contoh: Pilih kandidat promosi terbaik"
                    placeholderTextColor={colors.textTertiary}
                    value={goal}
                    onChangeText={setGoal}
                    multiline
                />
            </View>

            <TouchableOpacity
                style={[styles.toggleRow, hasSub && styles.toggleRowActive]}
                onPress={() => setHasSub((current) => !current)}
            >
                <FontAwesome5
                    name={hasSub ? 'check-circle' : 'circle'}
                    size={16}
                    color={hasSub ? colors.primary : colors.textSecondary}
                />
                <View style={styles.toggleTextWrap}>
                    <Text style={[styles.toggleTitle, hasSub && styles.toggleTitleActive]}>
                        Gunakan Sub-Criteria
                    </Text>
                    <Text style={styles.toggleHint}>
                        Aktifkan jika tiap criterion memiliki anak kriteria sendiri.
                    </Text>
                </View>
            </TouchableOpacity>

            <SectionDisclosure
                title="Catatan Struktur"
                subtitle="Perubahan sub-criteria akan memengaruhi step berikutnya."
                iconName="info-circle"
            >
                <Text style={styles.description}>
                    Jika sub-criteria dimatikan, perbandingan alternatif dilakukan langsung per
                    criterion. Jika aktif, perbandingan alternatif dilakukan per sub-criterion.
                </Text>
            </SectionDisclosure>

            <Button
                title="Simpan Setup"
                loading={saving}
                onPress={() => onSave({ name: name.trim(), goal: goal.trim(), hasSub })}
            />
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

    field: {
        gap: spacing.sm,
    },

    label: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    input: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        fontSize: typography.base,
        color: colors.textPrimary,
    },

    textArea: {
        minHeight: 112,
        textAlignVertical: 'top',
    },

    toggleRow: {
        minHeight: 64,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },

    toggleRowActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },

    toggleTextWrap: {
        flex: 1,
    },

    toggleTitle: {
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: colors.textPrimary,
    },

    toggleTitleActive: {
        color: colors.primary,
    },

    toggleHint: {
        marginTop: spacing.xs,
        fontSize: typography.xs,
        color: colors.textSecondary,
    },
});
