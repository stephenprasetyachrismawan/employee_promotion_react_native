import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CriteriaListScreen from '../screens/CriteriaListScreen';
import CriterionFormScreen from '../screens/CriterionFormScreen';
import CriteriaGroupFormScreen from '../screens/CriteriaGroupFormScreen';
import CriteriaGroupDetailScreen from '../screens/CriteriaGroupDetailScreen';
import { colors } from '../styles/theme';
import { HelpIconButton } from '../components/common/HelpIconButton';

const Stack = createNativeStackNavigator();

export default function CriteriaNavigator() {
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
                name="CriteriaList"
                component={CriteriaListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CriteriaGroupDetail"
                component={CriteriaGroupDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CriteriaGroupForm"
                component={CriteriaGroupFormScreen}
                options={({ navigation }) => ({
                    presentation: 'transparentModal',
                    animation: 'fade_from_bottom',
                    gestureDirection: 'vertical',
                    headerShown: true,
                    headerTitle: 'Criteria Group',
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() =>
                                navigation.navigate('HelpArticle', { topic: 'criteria_group_form' })
                            }
                        />
                    ),
                    contentStyle: {
                        backgroundColor: colors.background + 'F2',
                    },
                })}
            />
            <Stack.Screen
                name="CriterionForm"
                component={CriterionFormScreen}
                options={({ navigation }) => ({
                    presentation: 'transparentModal',
                    animation: 'fade_from_bottom',
                    gestureDirection: 'vertical',
                    headerShown: true,
                    headerTitle: 'Add Criterion',
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() =>
                                navigation.navigate('HelpArticle', { topic: 'criterion_form' })
                            }
                        />
                    ),
                    contentStyle: {
                        backgroundColor: colors.background + 'F2',
                    },
                })}
            />
        </Stack.Navigator>
    );
}
