import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    SafeAreaView,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/common/Button';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { SectionDisclosure } from '../components/common/SectionDisclosure';
import { MotionView } from '../components/common/MotionView';
import { CriteriaGroup, DecisionMethod } from '../types';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { useAuth } from '../contexts/AuthContext';

export default function InputGroupFormScreen({ route, navigation }: any) {
    const { groupId, mode } = route.params || { mode: 'add' };
    const isEditMode = mode === 'edit';
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [method, setMethod] = useState<DecisionMethod>('WPM');
    const [templateGroupId, setTemplateGroupId] = useState('');
    const [templates, setTemplates] = useState<CriteriaGroup[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        if (isEditMode && groupId) {
            loadGroup();
        }
    }, [groupId, isEditMode]);

    const loadTemplates = async () => {
        if (!user) return;
        try {
            const data = await CriteriaGroupService.getAllByType(user.uid, 'criteria');
            setTemplates(data);
            if (!isEditMode && data.length > 0) {
                setTemplateGroupId((current) => current || data[0].id);
            }
        } catch (error) {
            console.error('Error loading criteria templates:', error);
        }
    };

    const loadGroup = async () => {
        if (!user || !groupId) return;
        try {
            const group = await CriteriaGroupService.getById(user.uid, groupId);
            if (group) {
                setName(group.name);
                setDescription(group.description ?? '');
                setMethod(group.method ?? 'WPM');
                setTemplateGroupId(group.sourceGroupId ?? '');
            }
        } catch (error) {
            console.error('Error loading input group:', error);
        }
    };

    const selectedTemplate = useMemo(
        () => templates.find((template) => template.id === templateGroupId),
        [templates, templateGroupId]
    );

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        if (!user) return;

        if (!isEditMode && !templateGroupId) {
            Alert.alert('Error', 'Please choose a criteria group');
            return;
        }

        setLoading(true);
        try {
            if (isEditMode) {
                await CriteriaGroupService.update(
                    user.uid,
                    groupId,
                    name.trim(),
                    description.trim(),
                    method
                );
            } else {
                await CriteriaGroupService.createInputGroupFromTemplate(
                    user.uid,
                    name.trim(),
                    description.trim(),
                    method,
                    templateGroupId
                );
            }
            navigation.goBack();
        } catch (error) {
            console.error('Error saving input group:', error);
            Alert.alert('Error', 'Failed to save input group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <MotionView style={styles.motionContainer}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <Text style={styles.sectionTitle}>Group Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Batch Promosi Q4"
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                    />

                    <SectionDisclosure
                        title="Description"
                        subtitle="Opsional. Boleh dikosongkan."
                        iconName="align-left"
                        containerStyle={styles.disclosureSection}
                    >
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Add a short description"
                            placeholderTextColor={colors.textTertiary}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />
                    </SectionDisclosure>

                    <SectionDisclosure
                        title="Pilih Kriteria"
                        subtitle="Kriteria akan dikunci setelah grup disimpan."
                        iconName="list"
                        containerStyle={styles.disclosureSection}
                        defaultExpanded
                    >
                        <View style={styles.pickerWrapper}>
                            <Picker
                                selectedValue={templateGroupId}
                                onValueChange={(value) => setTemplateGroupId(value)}
                                enabled={!isEditMode}
                                style={styles.picker}
                            >
                                {templates.length === 0 ? (
                                    <Picker.Item label="Belum ada kriteria" value="" />
                                ) : (
                                    templates.map((template) => (
                                        <Picker.Item
                                            key={template.id}
                                            label={template.name}
                                            value={template.id}
                                        />
                                    ))
                                )}
                            </Picker>
                        </View>
                        {isEditMode && selectedTemplate ? (
                            <Text style={styles.lockedHint}>
                                Menggunakan kriteria: {selectedTemplate.name}
                            </Text>
                        ) : null}
                    </SectionDisclosure>

                    <SectionDisclosure
                        title="Metode Perhitungan"
                        subtitle="Metode dapat diubah setelah grup disimpan."
                        iconName="calculator"
                        containerStyle={styles.disclosureSection}
                    >
                        <View style={styles.methodOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.methodOption,
                                    method === 'WPM' && styles.methodOptionActive,
                                ]}
                                onPress={() => setMethod('WPM')}
                            >
                                <Text
                                    style={[
                                        styles.methodOptionText,
                                        method === 'WPM' && styles.methodOptionTextActive,
                                    ]}
                                >
                                    Weighted Product (WPM)
                                </Text>
                                <Text style={styles.methodHint}>
                                    Perkalian berbobot, nilai harus &gt; 0
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.methodOption,
                                    method === 'SAW' && styles.methodOptionActive,
                                ]}
                                onPress={() => setMethod('SAW')}
                            >
                                <Text
                                    style={[
                                        styles.methodOptionText,
                                        method === 'SAW' && styles.methodOptionTextActive,
                                    ]}
                                >
                                    SAW (Simple Additive Weighting)
                                </Text>
                                <Text style={styles.methodHint}>
                                    Normalisasi &amp; penjumlahan berbobot
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SectionDisclosure>
                </ScrollView>
            </MotionView>

            <BottomActionBar>
                <Button
                    title={isEditMode ? 'Update Group' : 'Add Group'}
                    onPress={handleSave}
                    loading={loading}
                    style={styles.saveButton}
                />
                <Button
                    title="Cancel"
                    onPress={() => navigation.goBack()}
                    variant="outline"
                />
            </BottomActionBar>
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

    motionContainer: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
    },

    sectionTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },

    input: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        fontSize: typography.base,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },

    disclosureSection: {
        marginTop: spacing.md,
    },

    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },

    pickerWrapper: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },

    picker: {
        color: colors.textPrimary,
    },

    lockedHint: {
        marginTop: spacing.sm,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    methodOptions: {
        gap: spacing.md,
    },

    methodOption: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
    },

    methodOptionActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },

    methodOptionText: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    methodOptionTextActive: {
        color: colors.primary,
    },

    methodHint: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    saveButton: {
        marginBottom: 0,
    },
});
