import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CommunityStackParamList } from '../types';
import { CommunityHomeScreen } from '../../screens/Community/CommunityHomeScreen';
import { ThreadDetailScreen } from '../../screens/Community/ThreadDetailScreen';
import { NewThreadScreen } from '../../screens/Community/NewThreadScreen';
import { ExpertsListScreen } from '../../screens/Community/ExpertsListScreen';
import { ExpertProfileScreen } from '../../screens/Community/ExpertProfileScreen';
import { ArticlesListScreen } from '../../screens/Community/ArticlesListScreen';
import { ArticleDetailScreen } from '../../screens/Community/ArticleDetailScreen';
import { WeatherDetailScreen } from '../../screens/Weather/WeatherDetailScreen';

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export function CommunityStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CommunityHome"  component={CommunityHomeScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="ThreadDetail"   component={ThreadDetailScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="NewThread"      component={NewThreadScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="ExpertsList"    component={ExpertsListScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="ExpertProfile"  component={ExpertProfileScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="ArticlesList"   component={ArticlesListScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="ArticleDetail"  component={ArticleDetailScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="WeatherDetail"  component={WeatherDetailScreen}  options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
