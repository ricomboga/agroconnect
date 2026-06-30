import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { AppTabParamList } from './types';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { FarmStackNavigator } from './FarmStackNavigator';
import { DiagnoseStack } from './stacks/DiagnoseStack';
import { FinanceStack } from './stacks/FinanceStack';
import { CommunityStack } from './stacks/CommunityStack';
import { ProfileStack } from './stacks/ProfileStack';
import { InventoryStack } from './stacks/InventoryStack';
import { useAuthStore } from '../stores/authStore';

const Tab = createBottomTabNavigator<AppTabParamList>();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20, lineHeight: 22 }}>{emoji}</Text>;
}

export function AppTabs() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isFarmWorker = user?.role === 'farm_worker';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A6B3C',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 8, marginBottom: 2 },
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingTop: 4,
          paddingBottom: 3,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: t('tabs.home'),
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tab.Screen
        name="Farm"
        component={FarmStackNavigator}
        options={{
          title: t('tabs.farm'),
          tabBarIcon: () => <TabIcon emoji="🌾" />,
        }}
      />

      {isFarmWorker ? (
        <Tab.Screen
          name="Diagnose"
          component={DiagnoseStack}
          options={{
            title: t('tabs.diagnose'),
            tabBarIcon: () => <TabIcon emoji="🔬" />,
          }}
        />
      ) : (
        <Tab.Screen
          name="Finance"
          component={FinanceStack}
          options={{
            title: t('tabs.finance'),
            tabBarIcon: () => <TabIcon emoji="💰" />,
          }}
        />
      )}

      {isFarmWorker ? (
        <Tab.Screen
          name="Community"
          component={CommunityStack}
          options={{
            title: t('tabs.community'),
            tabBarIcon: () => <TabIcon emoji="👥" />,
          }}
        />
      ) : (
        <Tab.Screen
          name="Inventory"
          component={InventoryStack}
          options={{
            title: t('tabs.stock'),
            tabBarIcon: () => <TabIcon emoji="📦" />,
          }}
        />
      )}

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('tabs.me'),
          tabBarIcon: () => <TabIcon emoji="👤" />,
        }}
      />
    </Tab.Navigator>
  );
}
