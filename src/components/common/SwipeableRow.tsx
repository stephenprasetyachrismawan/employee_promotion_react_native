import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import {
    RectButton,
    Swipeable,
} from 'react-native-gesture-handler';
import { borderRadius, colors, typography, spacing } from '../../styles/theme';

export interface SwipeAction {
    id: string;
    label: string;
    icon: keyof typeof FontAwesome5.glyphMap;
    color: string;
    onPress: () => void;
}

interface SwipeableRowProps {
    children: React.ReactNode;
    leftActions?: SwipeAction[];
    rightActions?: SwipeAction[];
    enabled?: boolean;
    containerStyle?: StyleProp<ViewStyle>;
}

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
    children,
    leftActions,
    rightActions,
    enabled = true,
    containerStyle,
}) => {
    const swipeableRef = useRef<Swipeable>(null);
    const [rowHeight, setRowHeight] = useState(0);

    const hasLeftActions = !!leftActions && leftActions.length > 0;
    const hasRightActions = !!rightActions && rightActions.length > 0;

    const handleActionPress = (action: SwipeAction) => {
        swipeableRef.current?.close();
        action.onPress();
    };

    const renderActions = (
        actions: SwipeAction[] | undefined,
        side: 'left' | 'right',
        progress?: Animated.AnimatedInterpolation<number>
    ) => {
        if (!actions || actions.length === 0) {
            return null;
        }

        const actionsOpacity = progress
            ? progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0.2, 0.65, 1],
                extrapolate: 'clamp',
            })
            : 1;
        const actionsHeightStyle = rowHeight > 0 ? { height: rowHeight } : undefined;

        return (
            <Animated.View
                style={[styles.actionsContainer, actionsHeightStyle, { opacity: actionsOpacity }]}
            >
                {actions.map((action, index) => {
                    const animatedShift = progress
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                                side === 'left'
                                    ? -14 - index * 6
                                    : 14 + (actions.length - index - 1) * 6,
                                0,
                            ],
                            extrapolate: 'clamp',
                        })
                        : 0;

                    const buttonHeightStyle =
                        rowHeight > 0
                            ? {
                                height: rowHeight,
                                minHeight: rowHeight,
                            }
                            : styles.actionButtonFallbackHeight;

                    const roundedStyle =
                        side === 'left'
                            ? index === 0
                                ? styles.leftOuterRounded
                                : undefined
                            : index === actions.length - 1
                                ? styles.rightOuterRounded
                                : undefined;

                    return (
                        <Animated.View
                            key={action.id}
                            style={[
                                styles.actionSlot,
                                actionsHeightStyle,
                                { transform: [{ translateX: animatedShift }] },
                            ]}
                        >
                            <RectButton
                                style={[
                                    styles.actionButton,
                                    buttonHeightStyle,
                                    roundedStyle,
                                    { backgroundColor: action.color },
                                ]}
                                onPress={() => handleActionPress(action)}
                                rippleColor="rgba(255,255,255,0.22)"
                            >
                                <FontAwesome5 name={action.icon} size={14} color={colors.surface} />
                                <Text style={styles.actionText}>{action.label}</Text>
                            </RectButton>
                        </Animated.View>
                    );
                })}
            </Animated.View>
        );
    };

    const row = useMemo(() => children, [children]);

    if (!enabled || (!hasLeftActions && !hasRightActions)) {
        if (containerStyle) {
            return <View style={containerStyle}>{row}</View>;
        }

        return <>{row}</>;
    }

    return (
        <Swipeable
            ref={swipeableRef}
            renderLeftActions={
                hasLeftActions
                    ? (progress) => renderActions(leftActions, 'left', progress)
                    : undefined
            }
            renderRightActions={
                hasRightActions
                    ? (progress) => renderActions(rightActions, 'right', progress)
                    : undefined
            }
            overshootLeft={false}
            overshootRight={false}
            friction={2}
            leftThreshold={40}
            rightThreshold={40}
            containerStyle={[styles.swipeContainer, containerStyle]}
            childrenContainerStyle={styles.childrenContainer}
        >
            <View
                onLayout={(event) =>
                    setRowHeight(Math.round(event.nativeEvent.layout.height))
                }
            >
                {row}
            </View>
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    swipeContainer: {
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },

    childrenContainer: {
        borderRadius: borderRadius.lg,
    },

    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },

    actionSlot: {
        overflow: 'hidden',
    },

    actionButton: {
        width: 88,
        minWidth: 88,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.26)',
    },

    actionButtonFallbackHeight: {
        minHeight: 76,
    },

    leftOuterRounded: {
        borderTopLeftRadius: borderRadius.lg,
        borderBottomLeftRadius: borderRadius.lg,
    },

    rightOuterRounded: {
        borderTopRightRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
    },

    actionText: {
        color: colors.surface,
        fontSize: typography.xs,
        fontWeight: typography.semibold,
        textAlign: 'center',
    },
});
