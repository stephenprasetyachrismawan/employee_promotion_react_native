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
} from 'react-native';
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
                await CandidateService.update(user.uid, candidateId, name.trim(), valuesList);
            } else {
                await CandidateService.create(user.uid, name.trim(), valuesList);
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
