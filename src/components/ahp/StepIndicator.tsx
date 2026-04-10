import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

interface StepIndicatorProps {
    steps: string[];
    currentStep: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
    >
        {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isDone = index < currentStep;
            const statusStyle = isActive || isDone ? styles.stepNumberActive : undefined;

            return (
                <View key={step} style={styles.stepWrap}>
                    <View style={[styles.stepNumber, statusStyle]}>
                        <Text
                            style={[
                                styles.stepNumberText,
                                (isActive || isDone) && styles.stepNumberTextActive,
                            ]}
                        >
                            {index + 1}
                        </Text>
                    </View>
                    <Text
                        style={[styles.stepLabel, isActive && styles.stepLabelActive]}
                        numberOfLines={1}
                    >
                        {step}
                    </Text>
                    {index < steps.length - 1 ? <View style={styles.connector} /> : null}
                </View>
            );
        })}
    </ScrollView>
);

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
        alignItems: 'center',
    },

    stepWrap: {
        minWidth: 86,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    stepNumberActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primary,
    },

    stepNumberText: {
        fontSize: typography.xs,
        fontWeight: typography.bold,
        color: colors.textSecondary,
    },

    stepNumberTextActive: {
        color: colors.surface,
    },

    stepLabel: {
        maxWidth: 68,
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    stepLabelActive: {
        color: colors.primary,
    },

    connector: {
        width: 20,
        height: 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.border,
    },
});
