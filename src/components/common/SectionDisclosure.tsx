import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    LayoutAnimation,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
    ViewStyle,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';

interface SectionDisclosureProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    containerStyle?: ViewStyle;
    contentStyle?: ViewStyle;
    iconName?: keyof typeof FontAwesome5.glyphMap;
}

export const SectionDisclosure: React.FC<SectionDisclosureProps> = ({
    title,
    subtitle,
    children,
    defaultExpanded = false,
    containerStyle,
    contentStyle,
    iconName,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const rotateProgress = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;
    const contentProgress = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

    useEffect(() => {
        if (Platform.OS === 'android') {
            UIManager.setLayoutAnimationEnabledExperimental?.(true);
        }
    }, []);

    const toggleDisclosure = () => {
        const nextExpanded = !expanded;

        LayoutAnimation.configureNext({
            duration: 240,
            create: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
            update: {
                type: LayoutAnimation.Types.easeInEaseOut,
            },
            delete: {
                type: LayoutAnimation.Types.easeInEaseOut,
                property: LayoutAnimation.Properties.opacity,
            },
        });

        setExpanded(nextExpanded);

        Animated.parallel([
            Animated.timing(rotateProgress, {
                toValue: nextExpanded ? 1 : 0,
                duration: 220,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(contentProgress, {
                toValue: nextExpanded ? 1 : 0.78,
                duration: 200,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    };

    const chevronRotation = rotateProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
    });

    const contentTranslateY = contentProgress.interpolate({
        inputRange: [0.78, 1],
        outputRange: [-8, 0],
    });

    return (
        <View style={[styles.container, containerStyle]}>
            <TouchableOpacity
                style={styles.header}
                activeOpacity={0.8}
                onPress={toggleDisclosure}
            >
                <View style={styles.headerLeft}>
                    {iconName ? (
                        <View style={styles.iconWrap}>
                            <FontAwesome5
                                name={iconName}
                                size={14}
                                color={colors.primary}
                            />
                        </View>
                    ) : null}
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.title}>{title}</Text>
                        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                    </View>
                </View>
                <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                    <FontAwesome5
                        name="chevron-down"
                        size={14}
                        color={colors.textSecondary}
                    />
                </Animated.View>
            </TouchableOpacity>

            {expanded ? (
                <Animated.View
                    style={[
                        styles.content,
                        contentStyle,
                        {
                            opacity: contentProgress,
                            transform: [{ translateY: contentTranslateY }],
                        },
                    ]}
                >
                    {children}
                </Animated.View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },

    header: {
        minHeight: 58,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    iconWrap: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '14',
        marginRight: spacing.sm,
    },

    headerTextWrap: {
        flex: 1,
    },

    title: {
        fontSize: typography.base,
        fontWeight: typography.semibold,
        color: colors.textPrimary,
    },

    subtitle: {
        marginTop: spacing.xs,
        fontSize: typography.sm,
        color: colors.textSecondary,
    },

    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.lg,
        gap: spacing.md,
    },
});
