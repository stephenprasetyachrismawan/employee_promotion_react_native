import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FontAwesome5 } from '@expo/vector-icons';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../styles/theme';
import { useAuth } from '../contexts/AuthContext';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import CriteriaNavigator from './CriteriaNavigator';
import WeightDistributionScreen from '../screens/WeightDistributionScreen';
import InputDataNavigator from './InputDataNavigator';
import ResultsScreen from '../screens/ResultsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof FontAwesome5.glyphMap = 'home';

                    if (route.name === 'Home') {
                        iconName = 'home';
                    } else if (route.name === 'Criteria') {
                        iconName = 'list';
                    } else if (route.name === 'Weights') {
                        iconName = 'balance-scale';
                    } else if (route.name === 'Input') {
                        iconName = 'edit';
                    } else if (route.name === 'Results') {
                        iconName = 'trophy';
                    }

                    return <FontAwesome5 name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textTertiary,
                tabBarStyle: {
                    paddingBottom: 8,
                    height: 64,
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Criteria" component={CriteriaNavigator} />
            <Tab.Screen name="Weights" component={WeightDistributionScreen} />
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
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
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
