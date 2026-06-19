import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { InsightsStackParamList } from '../types';
import { InsightsScreen } from '../../screens/Insights/InsightsScreen';

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
