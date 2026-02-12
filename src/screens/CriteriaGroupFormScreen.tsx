import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    SafeAreaView,
    Alert,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { Button } from '../components/common/Button';
import { BottomActionBar } from '../components/common/BottomActionBar';
import { SectionDisclosure } from '../components/common/SectionDisclosure';
import { MotionView } from '../components/common/MotionView';
import { CriteriaGroupService } from '../database/services/CriteriaGroupService';
import { useAuth } from '../contexts/AuthContext';

export default function CriteriaGroupFormScreen({ route, navigation }: any) {
    const { groupId, mode } = route.params || { mode: 'add' };
    const isEditMode = mode === 'edit';
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditMode && groupId) {
            loadGroup();
        }
    }, [groupId]);

    const loadGroup = async () => {
        if (!user) return;
        try {
            const group = await CriteriaGroupService.getById(user.uid, groupId);
            if (group) {
                setName(group.name);
                setDescription(group.description ?? '');
            }
        } catch (error) {
            console.error('Error loading criteria group:', error);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }

        if (!user) return;

        setLoading(true);
        try {
            if (isEditMode) {
                await CriteriaGroupService.update(
                    user.uid,
                    groupId,
                    name.trim(),
                    description.trim()
                );
            } else {
                await CriteriaGroupService.create(
                    user.uid,
                    name.trim(),
                    description.trim(),
                    'WPM',
                    'criteria'
                );
            }
            navigation.goBack();
        } catch (error) {
            console.error('Error saving criteria group:', error);
            Alert.alert('Error', 'Failed to save criteria group');
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
                        placeholder="e.g. Leadership Track"
                        placeholderTextColor={colors.textTertiary}
                        value={name}
                        onChangeText={setName}
                    />

                    <SectionDisclosure
                        title="Description"
                        subtitle="Opsional. Bisa diisi nanti."
                        iconName="align-left"
                        containerStyle={styles.descriptionSection}
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

    descriptionSection: {
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

    textArea: {
        minHeight: 120,
        textAlignVertical: 'top',
    },

    saveButton: {
        marginBottom: 0,
    },
});
