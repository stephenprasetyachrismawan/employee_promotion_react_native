import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InputDataScreen from '../screens/InputDataScreen';
import ManualEntryScreen from '../screens/ManualEntryScreen';
import ExcelUploadScreen from '../screens/ExcelUploadScreen';
import InputGroupFormScreen from '../screens/InputGroupFormScreen';
import { colors } from '../styles/theme';
import { HelpIconButton } from '../components/common/HelpIconButton';

const Stack = createNativeStackNavigator();

export default function InputDataNavigator() {
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
                name="InputDataMain"
                component={InputDataScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ManualEntry"
                component={ManualEntryScreen}
                options={({ navigation }) => ({
                    headerShown: true,
                    headerTitle: 'Add Candidate',
                    animation: 'fade_from_bottom',
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() => navigation.navigate('HelpArticle', { topic: 'manual_entry' })}
                        />
                    ),
                    contentStyle: {
                        backgroundColor: colors.background + 'FA',
                    },
                })}
            />
            <Stack.Screen
                name="ExcelUpload"
                component={ExcelUploadScreen}
                options={({ navigation }) => ({
                    headerShown: true,
                    headerTitle: 'Upload Excel',
                    animation: 'fade_from_bottom',
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() => navigation.navigate('HelpArticle', { topic: 'excel_upload' })}
                        />
                    ),
                    contentStyle: {
                        backgroundColor: colors.background + 'FA',
                    },
                })}
            />
            <Stack.Screen
                name="InputGroupForm"
                component={InputGroupFormScreen}
                options={({ navigation }) => ({
                    presentation: 'transparentModal',
                    animation: 'fade_from_bottom',
                    gestureDirection: 'vertical',
                    headerShown: true,
                    headerTitle: 'Input Group',
                    headerRight: () => (
                        <HelpIconButton
                            onPress={() => navigation.navigate('HelpArticle', { topic: 'input_group_form' })}
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
