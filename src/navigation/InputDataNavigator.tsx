import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InputDataScreen from '../screens/InputDataScreen';
import ManualEntryScreen from '../screens/ManualEntryScreen';
import ExcelUploadScreen from '../screens/ExcelUploadScreen';

const Stack = createNativeStackNavigator();

export default function InputDataNavigator() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="InputDataMain"
                component={InputDataScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ManualEntry"
                component={ManualEntryScreen}
                options={{ headerTitle: 'Add Candidate' }}
            />
            <Stack.Screen
                name="ExcelUpload"
                component={ExcelUploadScreen}
                options={{ headerTitle: 'Upload Excel' }}
            />
        </Stack.Navigator>
    );
}
