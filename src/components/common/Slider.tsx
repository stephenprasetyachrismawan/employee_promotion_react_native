import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    PanResponder,
    Animated,
    LayoutChangeEvent,
} from 'react-native';
import { colors, typography, spacing } from '../../styles/theme';

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    showPercentage?: boolean;
    disabled?: boolean;
    locked?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    showPercentage = true,
    disabled = false,
    locked = false,
}) => {
    const [sliderWidth, setSliderWidth] = useState(0);
    const pan = new Animated.Value(0);

    const handleLayout = (event: LayoutChangeEvent) => {
        setSliderWidth(event.nativeEvent.layout.width);
    };

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled && !locked,
        onMoveShouldSetPanResponder: () => !disabled && !locked,
        onPanResponderMove: (_, gestureState) => {
            if (sliderWidth === 0) return;

            const newValue = Math.min(
                max,
                Math.max(min, (gestureState.moveX / sliderWidth) * max)
            );
            const steppedValue = Math.round(newValue / step) * step;
            onChange(steppedValue);
        },
    });

    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <View style={styles.container}>
            <View
                style={[styles.track, (disabled || locked) && styles.disabledTrack]}
                onLayout={handleLayout}
                {...panResponder.panHandlers}
            >
                <View style={[styles.fill, { width: `${percentage}%` }]} />
                <View
                    style={[
                        styles.thumb,
                        { left: `${percentage}%` },
                        (disabled || locked) && styles.disabledThumb,
                    ]}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: spacing.sm,
    },

    track: {
        height: 6,
        backgroundColor: colors.borderLight,
        borderRadius: 3,
        position: 'relative',
    },

    disabledTrack: {
        opacity: 0.5,
    },

    fill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },

    thumb: {
        position: 'absolute',
        top: -5,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        marginLeft: -8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },

    disabledThumb: {
        backgroundColor: colors.textTertiary,
    },
});
