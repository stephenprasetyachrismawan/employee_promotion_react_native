import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { borderRadius, colors, shadows } from '../../styles/theme';

interface HelpIconButtonProps {
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}

export const HelpIconButton: React.FC<HelpIconButtonProps> = ({
    onPress,
    style,
}) => {
    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={onPress}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Buka bantuan halaman"
        >
            <FontAwesome5 name="question" size={14} color={colors.primary} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 34,
        height: 34,
        borderRadius: borderRadius.full,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
});
