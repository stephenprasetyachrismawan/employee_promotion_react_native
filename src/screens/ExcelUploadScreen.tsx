import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Alert,
    TouchableOpacity,
    Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';
import { Button } from '../components/common/Button';
import { CriteriaService } from '../database/services/CriteriaService';
import { CandidateService } from '../database/services/CandidateService';
import { ExcelHandler } from '../utils/excelHandler';
import { useAuth } from '../contexts/AuthContext';

export default function ExcelUploadScreen({ navigation }: any) {
    const { user } = useAuth();
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handlePickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                ],
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const file = result.assets[0];
            setSelectedFile(file);
            if (Platform.OS === 'web') {
                const webSource = file.file ?? file.uri;
                await parseFile(webSource);
            } else {
                await parseFile(file.uri);
            }
        } catch (error) {
            console.error('Error picking file:', error);
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const parseFile = async (source: string | File | Blob) => {
        setLoading(true);
        try {
            if (!user) return;
            const criteria = await CriteriaService.getAll(user.uid);
            const { candidates, errors: parseErrors } = await ExcelHandler.parseExcelFile(
                source,
                criteria
            );

            setPreviewData(candidates);
            setErrors(parseErrors);

            if (parseErrors.length > 0) {
                Alert.alert(
                    'Validation Errors',
                    `Found ${parseErrors.length} error(s). Please review.`
                );
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            Alert.alert('Error', 'Failed to parse Excel file');
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!user) return;
        if (previewData.length === 0) {
            Alert.alert('No Data', 'No valid candidates to import');
            return;
        }

        if (errors.length > 0) {
            Alert.alert(
                'Validation Errors',
                'Please fix all errors before importing',
                [{ text: 'OK' }]
            );
            return;
        }

        setLoading(true);
        try {
            for (const candidate of previewData) {
                await CandidateService.create(user.uid, candidate.name, candidate.values);
            }

            Alert.alert(
                'Success',
                `Imported ${previewData.length} candidate(s) successfully!`,
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ]
            );
        } catch (error) {
            console.error('Error importing data:', error);
            Alert.alert('Error', 'Failed to import candidates');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {!selectedFile ? (
                    <View style={styles.uploadSection}>
                        <TouchableOpacity style={styles.uploadBox} onPress={handlePickFile}>
                            <FontAwesome5 name="cloud-upload-alt" size={64} color={colors.primary} />
                            <Text style={styles.uploadTitle}>Upload Excel File</Text>
                            <Text style={styles.uploadSubtitle}>
                                Tap to select .xlsx or .xls file
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.fileCard}>
                            <View style={styles.fileHeader}>
                                <FontAwesome5 name="file-alt" size={32} color={colors.benefit} />
                                <View style={styles.fileInfo}>
                                    <Text style={styles.fileName}>{selectedFile.name}</Text>
                                    <Text style={styles.fileSize}>
                                        {selectedFile?.size
                                            ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                                            : 'Size unknown'}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => {
                                    setSelectedFile(null);
                                    setPreviewData([]);
                                    setErrors([]);
                                }}>
                                    <FontAwesome5 name="times-circle" size={24} color={colors.error} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {errors.length > 0 && (
                            <View style={styles.errorsCard}>
                                <View style={styles.errorsHeader}>
                                    <FontAwesome5 name="exclamation-triangle" size={24} color={colors.error} />
                                    <Text style={styles.errorsTitle}>
                                        Validation Errors ({errors.length})
                                    </Text>
                                </View>
                                <ScrollView style={styles.errorsList}>
                                    {errors.map((error, index) => (
                                        <Text key={index} style={styles.errorText}>
                                            • {error}
                                        </Text>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {previewData.length > 0 && (
                            <View style={styles.previewCard}>
                                <Text style={styles.previewTitle}>
                                    Preview ({previewData.length} candidates)
                                </Text>
                                {previewData.slice(0, 5).map((candidate, index) => (
                                    <View key={index} style={styles.previewItem}>
                                        <FontAwesome5 name="user" size={20} color={colors.primary} />
                                        <Text style={styles.previewName}>{candidate.name}</Text>
                                        <Text style={styles.previewCount}>
                                            {candidate.values.length} values
                                        </Text>
                                    </View>
                                ))}
                                {previewData.length > 5 && (
                                    <Text style={styles.previewMore}>
                                        ... and {previewData.length - 5} more
                                    </Text>
                                )}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {selectedFile && (
                <View style={styles.footer}>
                    <Button
                        title={`Import ${previewData.length} Candidate(s)`}
                        onPress={handleImport}
                        disabled={previewData.length === 0 || errors.length > 0}
                        loading={loading}
                    />
                </View>
            )}
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

    content: {
        padding: spacing.lg,
    },

    uploadSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 400,
    },

    uploadBox: {
        width: '100%',
        padding: spacing['3xl'],
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.primary + '40',
        borderStyle: 'dashed',
        alignItems: 'center',
        ...shadows.sm,
    },

    uploadTitle: {
        fontSize: typography.lg,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },

    uploadSubtitle: {
        fontSize: typography.base,
        color: colors.textSecondary,
    },

    fileCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        ...shadows.sm,
    },

    fileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },

    fileInfo: {
        flex: 1,
    },

    fileName: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },

    fileSize: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    errorsCard: {
        backgroundColor: colors.error + '10',
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.error + '40',
    },

    errorsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },

    errorsTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.error,
    },

    errorsList: {
        maxHeight: 200,
    },

    errorText: {
        fontSize: typography.sm,
        color: colors.error,
        marginBottom: spacing.xs,
    },

    previewCard: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        ...shadows.sm,
    },

    previewTitle: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },

    previewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    previewName: {
        flex: 1,
        fontSize: typography.base,
        color: colors.textPrimary,
    },

    previewCount: {
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    previewMore: {
        fontSize: typography.sm,
        color: colors.textTertiary,
        marginTop: spacing.sm,
        fontStyle: 'italic',
    },

    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
    },
});
