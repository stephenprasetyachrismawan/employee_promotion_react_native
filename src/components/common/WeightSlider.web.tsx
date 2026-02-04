import React from 'react';
import { View, StyleSheet } from 'react-native';

type WeightSliderProps = {
    value: number;
    onValueChange: (value: number) => void;
    minimumValue?: number;
    maximumValue?: number;
    disabled?: boolean;
    style?: any;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    thumbTintColor?: string;
};

export const WeightSlider: React.FC<WeightSliderProps> = ({
    value,
    onValueChange,
    minimumValue = 0,
    maximumValue = 100,
    disabled,
    style,
}) => {
    return (
        <View style={[styles.container, style]}>
            <input
                type="range"
                min={minimumValue}
                max={maximumValue}
                step={1}
                value={value}
                disabled={disabled}
                onChange={(event) => onValueChange(Number(event.currentTarget.value))}
                style={{ width: '100%' }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
});
