import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MarketStackParamList } from '../types';
import { MarketHomeScreen } from '../../screens/Market/MarketHomeScreen';
import { ProduceListingDetailScreen } from '../../screens/Market/ProduceListingDetailScreen';
import { CreateListingScreen } from '../../screens/Market/CreateListingScreen';
import { SupplierProductDetailScreen } from '../../screens/Market/SupplierProductDetailScreen';

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
        name="SupplierProductDetail"
        component={SupplierProductDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
