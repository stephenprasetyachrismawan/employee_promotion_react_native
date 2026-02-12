import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    StyleProp,
    ViewStyle,
} from 'react-native';

interface MotionViewProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    duration?: number;
    delay?: number;
    offsetY?: number;
}

export const MotionView: React.FC<MotionViewProps> = ({
    children,
    style,
    duration = 240,
    delay = 0,
    offsetY = 14,
}) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(offsetY)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay, duration, opacity, translateY]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};
