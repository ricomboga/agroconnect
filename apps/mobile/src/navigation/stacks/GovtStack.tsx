import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GovtStackParamList } from '../types';
import { GovtHomeScreen } from '../../screens/Govt/GovtHomeScreen';
import { RegistrationsScreen } from '../../screens/Govt/RegistrationsScreen';
import { SubsidiesScreen } from '../../screens/Govt/SubsidiesScreen';
import { LicensesScreen } from '../../screens/Govt/LicensesScreen';

const Stack = createNativeStackNavigator<GovtStackParamList>();

export function GovtStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="GovtHome"      component={GovtHomeScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Registrations" component={RegistrationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Subsidies"     component={SubsidiesScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Licenses"      component={LicensesScreen}      options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
