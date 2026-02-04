import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CriteriaListScreen from '../screens/CriteriaListScreen';
import CriterionFormScreen from '../screens/CriterionFormScreen';
import CriteriaGroupFormScreen from '../screens/CriteriaGroupFormScreen';
import CriteriaGroupDetailScreen from '../screens/CriteriaGroupDetailScreen';

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
                name="CriteriaGroupDetail"
                component={CriteriaGroupDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CriteriaGroupForm"
                component={CriteriaGroupFormScreen}
                options={{
                    presentation: 'modal',
                    headerTitle: 'Criteria Group',
                }}
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
