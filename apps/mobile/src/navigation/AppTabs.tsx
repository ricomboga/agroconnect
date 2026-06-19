import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { AppTabParamList } from './types';
import { FarmStackNavigator } from './FarmStackNavigator';
import { DiagnoseStack } from './stacks/DiagnoseStack';
import { MarketStack } from './stacks/MarketStack';
import { FinanceStack } from './stacks/FinanceStack';
import { CommunityStack } from './stacks/CommunityStack';
import { ProfileStack } from './stacks/ProfileStack';
import { GovtStack } from './stacks/GovtStack';
import { InsightsStack } from './stacks/InsightsStack';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Farm"      component={FarmStackNavigator} options={{ title: t('tabs.farm') }} />
      <Tab.Screen name="Diagnose"  component={DiagnoseStack}      options={{ title: t('tabs.diagnose') }} />
      <Tab.Screen name="Market"    component={MarketStack}         options={{ title: t('tabs.market') }} />
      <Tab.Screen name="Finance"   component={FinanceStack}        options={{ title: t('tabs.finance') }} />
      <Tab.Screen name="Community" component={CommunityStack}      options={{ title: t('tabs.community') }} />
      <Tab.Screen name="Profile"   component={ProfileStack}        options={{ title: t('tabs.profile') }} />
      <Tab.Screen name="Govt"      component={GovtStack}           options={{ title: t('tabs.govt') }} />
      <Tab.Screen name="Insights"  component={InsightsStack}       options={{ title: t('tabs.insights') }} />
    </Tab.Navigator>
  );
}
