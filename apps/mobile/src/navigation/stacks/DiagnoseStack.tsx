import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DiagnoseStackParamList } from '../types';
import { DiagnoseHomeScreen } from '../../screens/Diagnose/DiagnoseHomeScreen';
import { DiagnoseCameraScreen } from '../../screens/Diagnose/DiagnoseCameraScreen';
import { DiagnoseSubjectScreen } from '../../screens/Diagnose/DiagnoseSubjectScreen';
import { DiagnoseLoadingScreen } from '../../screens/Diagnose/DiagnoseLoadingScreen';
import { DiagnoseResultScreen } from '../../screens/Diagnose/DiagnoseResultScreen';
import { DiagnoseFeedbackScreen } from '../../screens/Diagnose/DiagnoseFeedbackScreen';
import { SupplierProductsScreen } from '../../screens/Market/SupplierProductsScreen';

const Stack = createNativeStackNavigator<DiagnoseStackParamList>();

export function DiagnoseStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="DiagnoseHome"
        component={DiagnoseHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DiagnoseCamera"
        component={DiagnoseCameraScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DiagnoseSubject"
        component={DiagnoseSubjectScreen}
        options={{ title: '', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="DiagnoseLoading"
        component={DiagnoseLoadingScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="DiagnoseResult"
        component={DiagnoseResultScreen}
        options={{ title: '', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="DiagnoseFeedback"
        component={DiagnoseFeedbackScreen}
        options={{ title: '', headerBackTitle: '' }}
      />
      <Stack.Screen
        name="SupplierProducts"
        component={SupplierProductsScreen}
        options={{ title: '', headerBackTitle: '' }}
      />
    </Stack.Navigator>
  );
}
