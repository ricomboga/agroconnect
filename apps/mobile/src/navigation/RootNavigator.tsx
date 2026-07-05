import React from 'react';
import { useAuthStore } from '../stores/authStore';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { SetPINScreen } from '../screens/Auth/SetPINScreen';
import { OnboardingScreen } from '../screens/Auth/OnboardingScreen';
import { FarmSelectionScreen } from '../screens/Auth/FarmSelectionScreen';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustSetPin = useAuthStore((s) => s.mustSetPin);
  const mustShowOnboarding = useAuthStore((s) => s.mustShowOnboarding);
  const mustSelectFarm = useAuthStore((s) => s.mustSelectFarm);

  if (isAuthenticated && mustSetPin) return <SetPINScreen />;
  if (isAuthenticated && mustShowOnboarding) return <OnboardingScreen />;
  if (isAuthenticated && mustSelectFarm) return <FarmSelectionScreen />;
  return isAuthenticated ? <AppTabs /> : <AuthStack />;
}
