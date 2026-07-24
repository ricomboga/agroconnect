import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../types';
import { DiagnosisHomeScreen } from '../../screens/Diagnosis/DiagnosisHomeScreen';
import { DiagnosisInputScreen } from '../../screens/Diagnosis/DiagnosisInputScreen';
import { DiagnosisResultScreen } from '../../screens/Diagnosis/DiagnosisResultScreen';
import { DiagnosisFeedbackScreen } from '../../screens/Diagnosis/DiagnosisFeedbackScreen';
import { SupplierProductsScreen } from '../../screens/Market/SupplierProductsScreen';
import { SupplierProductDetailScreen } from '../../screens/Market/SupplierProductDetailScreen';

const Stack = createNativeStackNavigator<DiagnoseStackParamList>();

export function DiagnoseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DiagnosisHome"
        component={DiagnosisHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DiagnosisInput"
        component={DiagnosisInputScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DiagnosisResult"
        component={DiagnosisResultScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="DiagnosisFeedback"
        component={DiagnosisFeedbackScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SupplierProducts"
        component={SupplierProductsScreen}
        options={{ title: '', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="SupplierProductDetail"
        component={SupplierProductDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
