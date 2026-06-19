import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MarketStackParamList } from '../types';
import { MarketHomeScreen } from '../../screens/Market/MarketHomeScreen';
import { ProduceListingDetailScreen } from '../../screens/Market/ProduceListingDetailScreen';
import { CreateListingScreen } from '../../screens/Market/CreateListingScreen';
import { CartScreen } from '../../screens/Market/CartScreen';
import { CheckoutScreen } from '../../screens/Market/CheckoutScreen';
import { PriceAlertsScreen } from '../../screens/Market/PriceAlertsScreen';

const Stack = createNativeStackNavigator<MarketStackParamList>();

export function MarketStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MarketHome"
        component={MarketHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProduceListingDetail"
        component={ProduceListingDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PriceAlerts"
        component={PriceAlertsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
