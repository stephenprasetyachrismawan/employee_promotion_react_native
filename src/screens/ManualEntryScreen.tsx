import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    SafeAreaView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/common/Button';
import { ScaleSlider } from '../components/common/ScaleSlider';
import { Criterion } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { CandidateService } from '../database/services/CandidateService';
import { useAuth } from '../contexts/AuthContext';

export default function ManualEntryScreen({ route, navigation }: any) {
    const { candidateId, mode } = route.params || { mode: 'add' };
    const isEditMode = mode === 'edit';
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [values, setValues] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCriteria();
    }, []);

    useEffect(() => {
        if (isEditMode && candidateId) {
            loadCandidate();
        }
    }, [candidateId]);

    const loadCriteria = async () => {
        if (!user) return;
        try {
            const data = await CriteriaService.getAll(user.uid);
            setCriteria(data);

            // Initialize values with defaults
            const initialValues: { [key: string]: number } = {};
            data.forEach((criterion) => {
                initialValues[criterion.id] = criterion.dataType === 'SCALE' ? 3 : 0;
            });
            setValues(initialValues);
        } catch (error) {
            console.error('Error loading criteria:', error);
        }
    };

    const loadCandidate = async () => {
        if (!user || !candidateId) return;
        try {
            const candidate = await CandidateService.getWithValues(user.uid, candidateId);
            if (candidate) {
                setName(candidate.name);
                setImageUri(candidate.imageUri ?? null);

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
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a candidate name');
            return;
        }

        // Validate all values are filled
        for (const criterion of criteria) {
            if (values[criterion.id] === undefined || values[criterion.id] === 0) {
                Alert.alert('Error', `Please enter a value for ${criterion.name}`);
                return;
            }
        }

        setLoading(true);
        try {
            const valuesList = criteria.map((c) => ({
                criterionId: c.id,
                value: values[c.id],
            }));

            if (isEditMode) {
                await CandidateService.update(user.uid, candidateId, name.trim(), valuesList, imageUri);
            } else {
                await CandidateService.create(user.uid, name.trim(), valuesList, imageUri);
            }

            navigation.goBack();
        } catch (error) {
            console.error('Error saving candidate:', error);
            Alert.alert('Error', 'Failed to save candidate');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (criterionId: string, value: number) => {
        setValues((prev) => ({ ...prev, [criterionId]: value }));
    };

    const handleSelectImage = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (result.canceled) {
                return;
            }

            const asset = result.assets?.[0];
            if (asset?.uri) {
                setImageUri(asset.uri);
            }
        } catch (error) {
            console.error('Error selecting image:', error);
            Alert.alert('Error', 'Failed to select image');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.sectionTitle}>Candidate Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. John Doe"
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.sectionTitle}>Candidate Photo</Text>
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

                    <Text style={styles.sectionTitle}>Criterion Values</Text>
                    <Text style={styles.sectionSubtitle}>
                        Enter values for each criterion
                    </Text>

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
                                    value={values[criterion.id]?.toString() || ''}
                                    onChangeText={(text) => {
                                        const numValue = parseFloat(text) || 0;
                                        handleValueChange(criterion.id, numValue);
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
                </ScrollView>

                <View style={styles.footer}>
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
                </View>
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

    sectionSubtitle: {
        fontSize: typography.sm,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
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

    footer: {
        padding: spacing.lg,
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },

    saveButton: {
        marginBottom: 0,
    },
});
