import React, { useRef, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import type { AppTabParamList } from './types';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { FarmStackNavigator } from './FarmStackNavigator';
import { DiagnoseStack } from './stacks/DiagnoseStack';
import { MarketStack } from './stacks/MarketStack';
import { FinanceStack } from './stacks/FinanceStack';
import { CommunityStack } from './stacks/CommunityStack';
import { ProfileStack } from './stacks/ProfileStack';
import { InventoryStack } from './stacks/InventoryStack';
import { GovtStack } from './stacks/GovtStack';
import { InsightsStack } from './stacks/InsightsStack';
import { useAuthStore } from '../stores/authStore';

const Tab = createBottomTabNavigator<AppTabParamList>();

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20, lineHeight: 22 }}>{emoji}</Text>;
}

const SCROLL_STEP = 160;

function ScrollableTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(0);
  const containerWidth = useRef(0);
  const contentWidth = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    setCanScrollLeft(scrollX.current > 4);
    setCanScrollRight(scrollX.current + containerWidth.current < contentWidth.current - 4);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
    updateArrows();
  };

  const onLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    containerWidth.current = e.nativeEvent.layout.width;
    updateArrows();
  };

  const onContentSizeChange = (w: number) => {
    contentWidth.current = w;
    updateArrows();
  };

  const scrollBy = (delta: number) => {
    const next = Math.max(0, Math.min(scrollX.current + delta, contentWidth.current - containerWidth.current));
    scrollRef.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        scrollEventThrottle={16}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? '#1A6B3C' : '#9CA3AF';
          const label = (options.title ?? route.name) as string;
          const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 22 });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            >
              {icon}
              <Text style={[styles.label, { color }]}>{label}</Text>
              {isFocused && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {canScrollLeft && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowLeft]}
          onPress={() => scrollBy(-SCROLL_STEP)}
          accessibilityRole="button"
          accessibilityLabel="Scroll tabs back"
        >
          <Text style={styles.navArrowLabel}>‹</Text>
        </TouchableOpacity>
      )}
      {canScrollRight && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowRight]}
          onPress={() => scrollBy(SCROLL_STEP)}
          accessibilityRole="button"
          accessibilityLabel="Scroll tabs forward"
        >
          <Text style={styles.navArrowLabel}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 6,
    position: 'relative',
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
    }),
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 68,
    position: 'relative',
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    bottom: -4,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#1A6B3C',
  },
  navArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  navArrowLeft: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  navArrowRight: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  navArrowLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A6B3C',
  },
});

export function AppTabs() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isFarmWorker = user?.role === 'farm_worker';

  return (
    <Tab.Navigator
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" />,
        }}
      />
      <Tab.Screen
        name="Farm"
        component={FarmStackNavigator}
        options={{
          title: t('tabs.farm'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🌾" />,
        }}
      />
      <Tab.Screen
        name="Diagnose"
        component={DiagnoseStack}
        options={{
          title: t('tabs.diagnose'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🔬" />,
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketStack}
        options={{
          title: t('tabs.market'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🛒" />,
        }}
      />
      <Tab.Screen
        name="FarmersCommunity"
        component={CommunityStack}
        options={{
          title: t('tabs.farmersCommunity'),
          tabBarIcon: ({ color }) => <TabIcon emoji="👨‍👩‍👧‍👦" />,
        }}
      />
      {isFarmWorker && (
        <Tab.Screen
          name="Community"
          component={CommunityStack}
          options={{
            title: t('tabs.community'),
            tabBarIcon: ({ color }) => <TabIcon emoji="👥" />,
          }}
        />
      )}
      {!isFarmWorker && (
        <Tab.Screen
          name="Finance"
          component={FinanceStack}
          options={{
            title: t('tabs.finance'),
            tabBarIcon: ({ color }) => <TabIcon emoji="💰" />,
          }}
        />
      )}
      {!isFarmWorker && (
        <Tab.Screen
          name="Inventory"
          component={InventoryStack}
          options={{
            title: t('tabs.farmInventory'),
            tabBarIcon: ({ color }) => <TabIcon emoji="📋" />,
          }}
        />
      )}
      {!isFarmWorker && (
        <Tab.Screen
          name="Govt"
          component={GovtStack}
          options={{
            title: t('tabs.govt'),
            tabBarIcon: ({ color }) => <TabIcon emoji="🏛️" />,
          }}
        />
      )}
      {!isFarmWorker && (
        <Tab.Screen
          name="Insights"
          component={InsightsStack}
          options={{
            title: t('tabs.insights'),
            tabBarIcon: ({ color }) => <TabIcon emoji="📊" />,
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: t('tabs.me'),
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" />,
        }}
      />
    </Tab.Navigator>
  );
}
