import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../types';
import { ProfileHomeScreen } from '../../screens/Profile/ProfileHomeScreen';
import { EditProfileScreen } from '../../screens/Profile/EditProfileScreen';
import { NotificationSettingsScreen } from '../../screens/Profile/NotificationSettingsScreen';
import { FarmSummaryExportScreen } from '../../screens/Profile/FarmSummaryExportScreen';
import { OfflineStatusScreen } from '../../screens/Profile/OfflineStatusScreen';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FarmSummaryExport" component={FarmSummaryExportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OfflineStatus" component={OfflineStatusScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
