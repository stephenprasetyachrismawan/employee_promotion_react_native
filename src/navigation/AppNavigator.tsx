import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import CriteriaNavigator from './CriteriaNavigator';
import InputDataNavigator from './InputDataNavigator';
import ResultsScreen from '../screens/ResultsScreen';
import HelpArticleScreen from '../screens/HelpArticleScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof FontAwesome5.glyphMap = 'home';

                    if (route.name === 'Home') {
                        iconName = 'home';
                    } else if (route.name === 'Criteria') {
                        iconName = 'list';
                    } else if (route.name === 'Input') {
                        iconName = 'edit';
                    } else if (route.name === 'Results') {
                        iconName = 'trophy';
                    }

                    return <FontAwesome5 name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 8),
                    height: 72 + Math.max(insets.bottom, 8),
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    backgroundColor: colors.surface,
                },
                tabBarItemStyle: {
                    paddingVertical: 4,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Criteria" component={CriteriaNavigator} />
            <Tab.Screen name="Input" component={InputDataNavigator} />
            <Tab.Screen name="Results" component={ResultsScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    gestureEnabled: true,
                    fullScreenGestureEnabled: true,
                    animation: 'slide_from_right',
                    animationDuration: 260,
                    animationMatchesGesture: true,
                    contentStyle: {
                        backgroundColor: colors.background,
                    },
                }}
            >
                {user ? (
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
                <Stack.Screen
                    name="HelpArticle"
                    component={HelpArticleScreen}
                    options={{
                        headerShown: true,
                        headerTitle: 'Panduan Halaman',
                        animation: 'slide_from_right',
                        contentStyle: {
                            backgroundColor: colors.background,
                        },
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
});
