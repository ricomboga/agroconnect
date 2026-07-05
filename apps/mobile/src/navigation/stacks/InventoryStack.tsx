import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { StockStackParamList } from '../types';
import { InventoryScreen } from '../../screens/Inventory/InventoryScreen';
import { AddInventoryItemScreen } from '../../screens/Inventory/AddInventoryItemScreen';
import { RestockScreen } from '../../screens/Inventory/RestockScreen';
import { RecordUseScreen } from '../../screens/Inventory/RecordUseScreen';
import { RecordAnimalProductScreen } from '../../screens/Inventory/RecordAnimalProductScreen';
import { RecordHarvestSaleScreen } from '../../screens/Inventory/RecordHarvestSaleScreen';
import { UpdateHarvestStockScreen } from '../../screens/Inventory/UpdateHarvestStockScreen';
import { AddHarvestScreen } from '../../screens/Inventory/AddHarvestScreen';
import { AddCollectionScreen } from '../../screens/Inventory/AddCollectionScreen';

const Stack = createNativeStackNavigator<StockStackParamList>();

export function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="InventoryHome"              component={InventoryScreen}            options={{ headerShown: false }} />
      <Stack.Screen name="AddStockScreen"             component={AddInventoryItemScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="RestockScreen"              component={RestockScreen}              options={{ headerShown: false }} />
      <Stack.Screen name="RecordUseScreen"            component={RecordUseScreen}            options={{ headerShown: false }} />
      <Stack.Screen name="RecordAnimalProductScreen"  component={RecordAnimalProductScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="RecordHarvestSaleScreen"    component={RecordHarvestSaleScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="UpdateHarvestStockScreen"   component={UpdateHarvestStockScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="AddHarvestScreen"           component={AddHarvestScreen}           options={{ headerShown: false }} />
      <Stack.Screen name="AddCollectionScreen"        component={AddCollectionScreen}        options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
