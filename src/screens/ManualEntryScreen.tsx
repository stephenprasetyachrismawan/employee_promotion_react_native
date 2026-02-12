import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/common/Button';
import { ScaleSlider } from '../components/common/ScaleSlider';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { SectionDisclosure } from '../components/common/SectionDisclosure';
import { MotionView } from '../components/common/MotionView';
import { Criterion } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { CandidateService } from '../database/services/CandidateService';
import { useAuth } from '../contexts/AuthContext';
import { toPersistableImageUri } from '../utils/imagePersistence';
import { showAlert } from '../utils/dialog';

export default function ManualEntryScreen({ route, navigation }: any) {
    const { candidateId, mode, groupId: routeGroupId } = route.params || { mode: 'add' };
    const isEditMode = mode === 'edit';
    const { user } = useAuth();

    const [groupId, setGroupId] = useState<string | null>(routeGroupId ?? null);
    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [values, setValues] = useState<{ [key: string]: number | undefined }>({});
    const [method, setMethod] = useState<'WPM' | 'SAW'>('WPM');
    const [loading, setLoading] = useState(false);
    const MAX_WEB_IMAGE_SIZE_BYTES = 700 * 1024;

    useEffect(() => {
        if (groupId) {
            loadCriteria(groupId);
            loadGroupMeta(groupId);
        }
    }, [groupId]);

    useEffect(() => {
        if (isEditMode && candidateId) {
            loadCandidate();
        }
    }, [candidateId]);

    const loadCriteria = async (activeGroupId: string) => {
        if (!user) return;
        try {
            const data = await CriteriaService.getByGroup(user.uid, activeGroupId);
            setCriteria(data);

            // Initialize values with defaults
            const initialValues: { [key: string]: number | undefined } = {};
            data.forEach((criterion) => {
                initialValues[criterion.id] = criterion.dataType === 'SCALE' ? 3 : undefined;
            });
            setValues(initialValues);
        } catch (error) {
            console.error('Error loading criteria:', error);
        }
    };

    const loadGroupMeta = async (activeGroupId: string) => {
        if (!user) return;
        try {
            const group = await CriteriaGroupService.getById(user.uid, activeGroupId);
            setMethod(group?.method ?? 'WPM');
        } catch (error) {
            console.error('Error loading group meta:', error);
        }
    };

    const loadCandidate = async () => {
        if (!user || !candidateId) return;
        try {
            const candidate = await CandidateService.getWithValues(user.uid, candidateId);
            if (candidate) {
                setName(candidate.name);
                setImageUri(candidate.imageUri ?? null);
                setGroupId(candidate.groupId);

                const candidateValues: { [key: string]: number } = {};
                candidate.values.forEach((v) => {
                    candidateValues[v.criterionId] = v.value;
                });
                setValues(candidateValues);
            }
        } catch (error) {
            console.error('Error loading candidate:', error);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        if (!groupId) {
            showAlert('Error', 'Please select a criteria group first');
            return;
        }
        if (!name.trim()) {
            showAlert('Error', 'Please enter a candidate name');
            return;
        }

        // Validate all values are filled
        for (const criterion of criteria) {
            const value = values[criterion.id];
            if (value === undefined || (method === 'WPM' && value <= 0)) {
                showAlert(
                    'Error',
                    method === 'WPM'
                        ? `Nilai untuk ${criterion.name} harus lebih dari 0 (WPM).`
                        : `Please enter a value for ${criterion.name}`
                );
                return;
            }
        }

        setLoading(true);
        try {
            const valuesList = criteria.map((c) => ({
                criterionId: c.id,
                value: values[c.id] ?? 0,
            }));

            if (isEditMode) {
                await CandidateService.update(
                    user.uid,
                    candidateId,
                    groupId,
                    name.trim(),
                    valuesList,
                    imageUri
                );
            } else {
                await CandidateService.create(
                    user.uid,
                    groupId,
                    name.trim(),
                    valuesList,
                    imageUri
                );
            }

            navigation.goBack();
        } catch (error) {
            console.error('Error saving candidate:', error);
            showAlert('Error', 'Failed to save candidate');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (criterionId: string, value: number | undefined) => {
        setValues((prev) => ({ ...prev, [criterionId]: value }));
    };

    const handleSelectImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
                multiple: false,
                base64: Platform.OS === 'web',
            });

            if (result.canceled) {
                return;
            }

            const asset = result.assets?.[0];
            if (asset) {
                if (
                    Platform.OS === 'web' &&
                    typeof asset.size === 'number' &&
                    asset.size > MAX_WEB_IMAGE_SIZE_BYTES
                ) {
                    showAlert(
                        'Image Too Large',
                        'Please choose an image smaller than 700 KB for reliable web saving.'
                    );
                    return;
                }

                const persistedUri = await toPersistableImageUri(asset);
                if (!persistedUri) {
                    showAlert('Error', 'Failed to process selected image');
                    return;
                }
                setImageUri(persistedUri);
            }
        } catch (error) {
            console.error('Error selecting image:', error);
            showAlert('Error', 'Failed to select image');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <MotionView style={styles.motionContainer}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                    <Text style={styles.sectionTitle}>Candidate Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                    />

                    <SectionDisclosure
                        title="Candidate Photo"
                        subtitle="Opsional, untuk identifikasi kandidat."
                        iconName="camera"
                        containerStyle={styles.photoSection}
                    >
                        <View style={styles.photoCard}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                            ) : (
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoPlaceholderText}>
                                        No photo selected
                                    </Text>
                                </View>
                            )}
                            <View style={styles.photoActions}>
                                <Button
                                    title={imageUri ? 'Change Photo' : 'Select Photo'}
                                    onPress={handleSelectImage}
                                    variant="outline"
                                />
                                {imageUri ? (
                                    <Button
                                        title="Remove Photo"
                                        onPress={() => setImageUri(null)}
                                        variant="secondary"
                                    />
                                ) : null}
                            </View>
                        </View>
                    </SectionDisclosure>

                    <SectionDisclosure
                        title="Criterion Values"
                        subtitle={
                            method === 'WPM'
                                ? 'WPM: nilai harus lebih dari 0 untuk semua kriteria.'
                                : 'SAW: nilai akan dinormalisasi per kriteria.'
                        }
                        iconName="sliders-h"
                        defaultExpanded
                    >
                        {criteria.map((criterion) => (
                            <View key={criterion.id} style={styles.criterionSection}>
                                <View style={styles.criterionHeader}>
                                    <Text style={styles.criterionName}>{criterion.name}</Text>
                                    <View style={styles.criterionBadge}>
                                        <Text style={styles.criterionBadgeText}>
                                            {criterion.dataType}
                                        </Text>
                                    </View>
                                </View>

                                {criterion.dataType === 'NUMERIC' ? (
                                    <TextInput
                                        style={styles.numericInput}
                                        placeholder="Enter value"
                                        placeholderTextColor={colors.textTertiary}
                                        keyboardType="numeric"
                                        value={
                                            values[criterion.id] !== undefined
                                                ? values[criterion.id]?.toString()
                                                : ''
                                        }
                                        onChangeText={(text) => {
                                            if (text.trim() === '') {
                                                handleValueChange(criterion.id, undefined);
                                                return;
                                            }
                                            const numValue = parseFloat(text);
                                            handleValueChange(
                                                criterion.id,
                                                Number.isNaN(numValue) ? 0 : numValue
                                            );
                                        }}
                                    />
                                ) : (
                                    <View style={styles.scaleContainer}>
                                        <ScaleSlider
                                            value={values[criterion.id] || 3}
                                            onChange={(value) => handleValueChange(criterion.id, value)}
                                        />
                                    </View>
                                )}

                                <Text style={styles.criterionHint}>
                                    {criterion.impactType === 'BENEFIT'
                                        ? 'Higher is better'
                                        : 'Lower is better'}
                                </Text>
                            </View>
                        ))}
                    </SectionDisclosure>
                    </ScrollView>
                </MotionView>

                <BottomActionBar>
                    <Button
                        title={isEditMode ? 'Update Candidate' : 'Add Candidate'}
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    keyboardView: {
        flex: 1,
    },

    scrollView: {
        flex: 1,
    },

    motionContainer: {
        flex: 1,
    },

    content: {
        padding: spacing.lg,
        paddingBottom: spacing['3xl'],
    },

    sectionTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },

    photoSection: {
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

    photoCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.md,
    },

    photoPreview: {
        width: '100%',
        height: 200,
        borderRadius: borderRadius.md,
        resizeMode: 'cover',
    },

    photoPlaceholder: {
        height: 200,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
    },

    photoPlaceholderText: {
        fontSize: typography.sm,
        color: colors.textTertiary,
    },

    photoActions: {
        gap: spacing.sm,
    },

    criterionSection: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },

    criterionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },

    criterionName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        flex: 1,
    },

    criterionBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primary + '20',
        borderRadius: borderRadius.sm,
    },

    criterionBadgeText: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.primary,
    },

    numericInput: {
        backgroundColor: colors.background,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.base,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },

    scaleContainer: {
        paddingVertical: spacing.sm,
    },

    criterionHint: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        marginTop: spacing.sm,
        fontStyle: 'italic',
    },

    saveButton: {
        marginBottom: 0,
    },
});
