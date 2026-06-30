import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StockStackParamList } from '../types';
import { InventoryScreen } from '../../screens/Inventory/InventoryScreen';
import { AddInventoryItemScreen } from '../../screens/Inventory/AddInventoryItemScreen';

const Stack = createNativeStackNavigator<StockStackParamList>();

export function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="InventoryHome" component={InventoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddStockScreen" component={AddInventoryItemScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
