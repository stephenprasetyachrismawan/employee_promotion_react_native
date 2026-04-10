import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../styles/theme';
import { HelpIconButton } from '../components/common/HelpIconButton';
import AHPProjectListScreen from '../screens/ahp/AHPProjectListScreen';
import AHPProjectWizardScreen from '../screens/ahp/AHPProjectWizardScreen';
import AHPWeightingScreen from '../screens/ahp/AHPWeightingScreen';

const Stack = createNativeStackNavigator();

export default function AHPNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                fullScreenGestureEnabled: true,
                animation: 'slide_from_right',
                animationDuration: 260,
                animationMatchesGesture: true,
            }}
        >
            <Stack.Screen
                name="AHPProjectList"
                component={AHPProjectListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="AHPProjectWizard"
                component={AHPProjectWizardScreen}
                options={({ navigation }) => ({
                    headerShown: false,
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() =>
                                navigation.navigate('HelpArticle', { topic: 'ahp_pairwise' })
                            }
                        />
                    ),
                    contentStyle: {
                        backgroundColor: colors.background,
                    },
                })}
            />
            <Stack.Screen
                name="AHPWeighting"
                component={AHPWeightingScreen}
                options={({ navigation }) => ({
                    headerShown: false,
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() =>
                                navigation.navigate('HelpArticle', { topic: 'ahp_weighting' })
                            }
                        />
                    ),
                    contentStyle: {
                        backgroundColor: colors.background,
                    },
                })}
            />
        </Stack.Navigator>
    );
}
