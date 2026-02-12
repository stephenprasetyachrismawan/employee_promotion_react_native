import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/common/Button';
import { ScaleSlider } from '../components/common/ScaleSlider';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { SectionDisclosure } from '../components/common/SectionDisclosure';
import { MotionView } from '../components/common/MotionView';
import { DataType, ImpactType } from '../types';
import { CriteriaService } from '../database/services/CriteriaService';
import { useAuth } from '../contexts/AuthContext';

export default function CriterionFormScreen({ route, navigation }: any) {
    const { criterionId, groupId, mode } = route.params || { mode: 'add' };
    const isEditMode = mode === 'edit';
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [dataType, setDataType] = useState<DataType>('NUMERIC');
    const [impactType, setImpactType] = useState<ImpactType>('BENEFIT');
    const [scalePreview, setScalePreview] = useState(3);
    const [weight, setWeight] = useState('0');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditMode && criterionId) {
            loadCriterion();
        }
    }, [criterionId]);

    const loadCriterion = async () => {
        if (!user) return;

        try {
            const criterion = await CriteriaService.getById(user.uid, criterionId);
            if (criterion) {
                setName(criterion.name);
                setDataType(criterion.dataType);
                setImpactType(criterion.impactType);
                setWeight(criterion.weight?.toString() ?? '0');
            }
        } catch (error) {
            console.error('Error loading criterion:', error);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a criterion name');
            return;
        }

        if (!user || !groupId) return;

        const parsedWeight = Number(weight);
        if (Number.isNaN(parsedWeight) || parsedWeight < 0 || parsedWeight > 100) {
            Alert.alert('Error', 'Weight must be a number between 0 and 100');
            return;
        }

        setLoading(true);
        try {
            if (isEditMode) {
                await CriteriaService.update(
                    user.uid,
                    criterionId,
                    name.trim(),
                    dataType,
                    impactType,
                    parsedWeight
                );
            } else {
                await CriteriaService.create(
                    user.uid,
                    groupId,
                    name.trim(),
                    dataType,
                    impactType,
                    parsedWeight
                );
            }
            navigation.goBack();
        } catch (error) {
            console.error('Error saving criterion:', error);
            Alert.alert('Error', 'Failed to save criterion');
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
                    <Text style={styles.sectionTitle}>Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Leadership Potential"
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                    />

                    <SectionDisclosure
                        title="Data Type"
                        subtitle="Pilih tipe nilai yang akan diinput."
                        iconName="sliders-h"
                        defaultExpanded
                        containerStyle={styles.disclosureSection}
                    >
                        <View style={styles.optionGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    dataType === 'NUMERIC' && styles.optionButtonSelected,
                                ]}
                                onPress={() => setDataType('NUMERIC')}
                            >
                                <Text style={styles.optionIcon}>#</Text>
                                <Text
                                    style={[
                                        styles.optionText,
                                        dataType === 'NUMERIC' && styles.optionTextSelected,
                                    ]}
                                >
                                    Numeric
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    dataType === 'SCALE' && styles.optionButtonSelected,
                                ]}
                                onPress={() => setDataType('SCALE')}
                            >
                                <Text style={styles.optionIcon}>⚖</Text>
                                <Text
                                    style={[
                                        styles.optionText,
                                        dataType === 'SCALE' && styles.optionTextSelected,
                                    ]}
                                >
                                    Scale (1-5)
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {dataType === 'SCALE' && (
                            <View style={styles.scalePreview}>
                                <Text style={styles.scalePreviewLabel}>Scale Preview:</Text>
                                <ScaleSlider value={scalePreview} onChange={setScalePreview} />
                            </View>
                        )}
                    </SectionDisclosure>

                    <SectionDisclosure
                        title="Impact Type"
                        subtitle="Tentukan apakah nilai tinggi lebih baik atau lebih buruk."
                        iconName="exchange-alt"
                        containerStyle={styles.disclosureSection}
                    >
                        <View style={styles.optionGroup}>
                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    impactType === 'BENEFIT' && styles.optionButtonSelected,
                                ]}
                                onPress={() => setImpactType('BENEFIT')}
                            >
                                <Text style={styles.optionIcon}>↑</Text>
                                <Text
                                    style={[
                                        styles.optionText,
                                        impactType === 'BENEFIT' && styles.optionTextSelected,
                                    ]}
                                >
                                    Benefit
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    impactType === 'COST' && styles.optionButtonSelected,
                                ]}
                                onPress={() => setImpactType('COST')}
                            >
                                <Text style={styles.optionIcon}>↓</Text>
                                <Text
                                    style={[
                                        styles.optionText,
                                        impactType === 'COST' && styles.optionTextSelected,
                                    ]}
                                >
                                    Cost
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.helpText}>
                            {impactType === 'BENEFIT'
                                ? 'Higher values are better (e.g., KPI Score, Experience)'
                                : 'Lower values are better (e.g., Ethics Breach, Attrition Risk)'}
                        </Text>
                    </SectionDisclosure>

                    <Text style={styles.sectionTitle}>Weight (%)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 25"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                    />
                    <Text style={styles.helpText}>
                        Total bobot untuk grup harus 100%.
                    </Text>
                </ScrollView>
            </MotionView>

            <BottomActionBar>
                <Button
                    title={isEditMode ? 'Update Criterion' : 'Add Criterion'}
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

    optionGroup: {
        flexDirection: 'row',
        gap: spacing.md,
    },

    optionButton: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },

    optionButtonSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },

    optionIcon: {
        fontSize: typography['2xl'],
        marginBottom: spacing.xs,
    },

    optionText: {
        fontSize: typography.base,
        fontWeight: typography.medium,
        color: colors.textSecondary,
    },

    optionTextSelected: {
        color: colors.primary,
        fontWeight: typography.semibold,
    },

    scalePreview: {
        marginTop: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
    },

    scalePreviewLabel: {
        fontSize: typography.sm,
        fontWeight: typography.medium,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },

    helpText: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        marginTop: spacing.sm,
        fontStyle: 'italic',
    },

    saveButton: {
        marginBottom: 0,
    },
});
