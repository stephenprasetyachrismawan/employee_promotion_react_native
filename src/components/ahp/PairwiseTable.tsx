import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

const SCALE_OPTIONS = [
    { label: '1/9', value: 1 / 9 },
    { label: '1/8', value: 1 / 8 },
    { label: '1/7', value: 1 / 7 },
    { label: '1/6', value: 1 / 6 },
    { label: '1/5', value: 1 / 5 },
    { label: '1/4', value: 1 / 4 },
    { label: '1/3', value: 1 / 3 },
    { label: '1/2', value: 1 / 2 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
    { label: '8', value: 8 },
    { label: '9', value: 9 },
];

interface PairwiseTableProps {
    labels?: string[];
    criteria?: string[];
    matrix: number[][];
    onChange: (i: number, j: number, value: number) => void;
    disabled?: boolean;
}

export const PairwiseTable: React.FC<PairwiseTableProps> = ({
    labels,
    criteria,
    matrix,
    onChange,
    disabled = false,
}) => {
    const tableLabels = labels ?? criteria ?? [];

    return (
        <View style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                    <View style={styles.row}>
                        <View style={[styles.cell, styles.headerCell]} />
                        {tableLabels.map((label) => (
                            <View key={label} style={[styles.cell, styles.headerCell]}>
                                <Text style={styles.headerText} numberOfLines={2}>
                                    {label}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {matrix.map((row, rowIndex) => (
                        <View key={`row-${rowIndex}`} style={styles.row}>
                            <View style={[styles.cell, styles.headerCell]}>
                                <Text style={styles.headerText} numberOfLines={2}>
                                    {tableLabels[rowIndex] ?? `C${rowIndex + 1}`}
                                </Text>
                            </View>
                            {row.map((value, columnIndex) => {
                                const isDiagonal = rowIndex === columnIndex;
                                const isUpper = rowIndex < columnIndex;

                                if (isUpper) {
                                    return (
                                        <View
                                            key={`${rowIndex}-${columnIndex}`}
                                            style={[styles.cell, styles.inputCell]}
                                        >
                                            <Picker
                                                selectedValue={value}
                                                enabled={!disabled}
                                                onValueChange={(nextValue) =>
                                                    onChange(rowIndex, columnIndex, Number(nextValue))
                                                }
                                                style={styles.picker}
                                                itemStyle={styles.pickerItem}
                                            >
                                                {SCALE_OPTIONS.map((option) => (
                                                    <Picker.Item
                                                        key={option.label}
                                                        label={option.label}
                                                        value={option.value}
                                                    />
                                                ))}
                                            </Picker>
                                        </View>
                                    );
                                }

                                return (
                                    <View
                                        key={`${rowIndex}-${columnIndex}`}
                                        style={[
                                            styles.cell,
                                            isDiagonal ? styles.diagonalCell : styles.readonlyCell,
                                        ]}
                                    >
                                        <Text style={styles.valueText}>
                                            {isDiagonal ? '1' : value.toFixed(2)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.legend}>
                <Text style={styles.legendText}>1 = Sama penting</Text>
                <Text style={styles.legendText}>3 = Sedikit lebih penting</Text>
                <Text style={styles.legendText}>5 = Lebih penting</Text>
                <Text style={styles.legendText}>7 = Jauh lebih penting</Text>
                <Text style={styles.legendText}>9 = Mutlak lebih penting</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: spacing.md,
    },

    row: {
        flexDirection: 'row',
    },

    cell: {
        width: 96,
        minHeight: 58,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },

    headerCell: {
        backgroundColor: colors.surfaceLight,
        padding: spacing.xs,
    },

    headerText: {
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
        textAlign: 'center',
    },

    inputCell: {
        backgroundColor: colors.primary + '08',
    },

    diagonalCell: {
        backgroundColor: colors.borderLight,
    },

    readonlyCell: {
        backgroundColor: colors.background,
    },

    picker: {
        width: 94,
        height: 58,
    },

    pickerItem: {
        fontSize: typography.sm,
    },

    valueText: {
        fontSize: typography.sm,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    legend: {
        gap: spacing.xs,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },

    legendText: {
        fontSize: typography.xs,
        color: colors.textSecondary,
    },
});
