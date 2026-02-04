import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    LayoutChangeEvent,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';

interface ScaleSliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

export const ScaleSlider: React.FC<ScaleSliderProps> = ({
    value,
    onChange,
    min = 1,
    max = 5,
    disabled = false,
}) => {
    const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    return (
        <View style={styles.container}>
            <View style={styles.track}>
                {points.map((point, index) => {
                    const isSelected = point === value;
                    const isInRange = point <= value;

                    return (
                        <React.Fragment key={point}>
                            <TouchableOpacity
                                style={[
                                    styles.point,
                                    isSelected && styles.selectedPoint,
                                    disabled && styles.disabledPoint,
                                ]}
                                onPress={() => !disabled && onChange(point)}
                                disabled={disabled}
                            >
                                <Text
                                    style={[
                                        styles.pointText,
                                        isSelected && styles.selectedPointText,
                                    ]}
                                >
                                    {point}
                                </Text>
                            </TouchableOpacity>
                            {index < points.length - 1 && (
                                <View
                                    style={[
                                        styles.connector,
                                        isInRange && styles.activeConnector,
                                    ]}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: spacing.md,
    },

    track: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    point: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },

    selectedPoint: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },

    disabledPoint: {
        opacity: 0.5,
    },

    pointText: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textSecondary,
    },

    selectedPointText: {
        color: colors.surface,
    },

    connector: {
        flex: 1,
        height: 3,
        backgroundColor: colors.borderLight,
        marginHorizontal: spacing.xs,
    },

    activeConnector: {
        backgroundColor: colors.primary,
    },
});
