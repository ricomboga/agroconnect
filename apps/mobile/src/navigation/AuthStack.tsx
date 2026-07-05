import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { LanguageSelectScreen } from '../screens/Auth/LanguageSelectScreen';
import { WelcomeScreen } from '../screens/Auth/WelcomeScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { OtpVerifyScreen } from '../screens/Auth/OtpVerifyScreen';
import { ForgotPinScreen } from '../screens/Auth/ForgotPinScreen';
import { ResetPinScreen } from '../screens/Auth/ResetPinScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="LanguageSelect" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="Welcome"        component={WelcomeScreen} />
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="OtpVerify"      component={OtpVerifyScreen} />
      <Stack.Screen name="ForgotPin"      component={ForgotPinScreen} />
      <Stack.Screen name="ResetPin"       component={ResetPinScreen} />
    </Stack.Navigator>
  );
}
