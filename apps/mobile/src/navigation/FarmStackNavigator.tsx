import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FarmStackParamList } from './types';
import { FarmListScreen } from '../screens/Farm/FarmListScreen';
import { FarmProfileScreen } from '../screens/Farm/FarmProfileScreen';
import { FarmSetupWizard } from '../screens/Farm/FarmSetupWizard';
import { ActivityCalendarScreen } from '../screens/Activity/ActivityCalendarScreen';
import { ActivityFormScreen } from '../screens/Activity/ActivityFormScreen';
import { InputLogScreen } from '../screens/Input/InputLogScreen';
import { InputFormScreen } from '../screens/Input/InputFormScreen';
import { HarvestLogScreen } from '../screens/Harvest/HarvestLogScreen';
import { HarvestFormScreen } from '../screens/Harvest/HarvestFormScreen';
import { WeatherDetailScreen } from '../screens/Weather/WeatherDetailScreen';

const Stack = createNativeStackNavigator<FarmStackParamList>();

export function FarmStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="FarmList">
      <Stack.Screen name="FarmList" component={FarmListScreen} />
      <Stack.Screen name="FarmProfile" component={FarmProfileScreen} />
      <Stack.Screen name="FarmSetupWizard" component={FarmSetupWizard} options={{ presentation: 'modal' }} />
      <Stack.Screen name="ActivityCalendar" component={ActivityCalendarScreen} />
      <Stack.Screen name="ActivityForm" component={ActivityFormScreen} />
      <Stack.Screen name="InputLog" component={InputLogScreen} />
      <Stack.Screen name="InputForm" component={InputFormScreen} />
      <Stack.Screen name="HarvestLog" component={HarvestLogScreen} />
      <Stack.Screen name="HarvestForm" component={HarvestFormScreen} />
      <Stack.Screen name="WeatherDetail" component={WeatherDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
