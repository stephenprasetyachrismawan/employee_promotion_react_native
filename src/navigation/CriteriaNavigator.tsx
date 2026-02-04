import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CriteriaListScreen from '../screens/CriteriaListScreen';
import CriterionFormScreen from '../screens/CriterionFormScreen';

const Stack = createNativeStackNavigator();

export default function CriteriaNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="CriteriaList"
                component={CriteriaListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CriterionForm"
                component={CriterionFormScreen}
                options={{
                    presentation: 'modal',
                    headerTitle: 'Add Criterion',
                }}
            />
        </Stack.Navigator>
    );
}
