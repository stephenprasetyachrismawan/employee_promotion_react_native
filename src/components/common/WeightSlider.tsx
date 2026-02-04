import React from 'react';
import Slider from '@react-native-community/slider';

export type WeightSliderProps = React.ComponentProps<typeof Slider>;

export const WeightSlider: React.FC<WeightSliderProps> = (props) => {
    return <Slider {...props} />;
};
