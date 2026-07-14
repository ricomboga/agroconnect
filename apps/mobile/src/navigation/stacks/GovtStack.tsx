import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { GovtStackParamList } from '../types';
import { GovtHomeScreen } from '../../screens/Govt/GovtHomeScreen';
import { RegistrationsScreen } from '../../screens/Govt/RegistrationsScreen';
import { NewRegistrationScreen } from '../../screens/Govt/NewRegistrationScreen';
import { SubsidiesScreen } from '../../screens/Govt/SubsidiesScreen';
import { LicensesScreen } from '../../screens/Govt/LicensesScreen';
import { NewLicenseScreen } from '../../screens/Govt/NewLicenseScreen';

const Stack = createNativeStackNavigator<GovtStackParamList>();

export function GovtStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="GovtHome"        component={GovtHomeScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="Registrations"   component={RegistrationsScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="NewRegistration" component={NewRegistrationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Subsidies"       component={SubsidiesScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="Licenses"        component={LicensesScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="NewLicense"      component={NewLicenseScreen}      options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
