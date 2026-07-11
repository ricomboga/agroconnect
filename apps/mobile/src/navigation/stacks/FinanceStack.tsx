import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { FinanceStackParamList } from '../types';
import { FinanceHomeScreen } from '../../screens/Finance/FinanceHomeScreen';
import { AddTransactionScreen } from '../../screens/Finance/AddTransactionScreen';
import { LoanProductsScreen } from '../../screens/Finance/LoanProductsScreen';
import { LoanProductDetailScreen } from '../../screens/Finance/LoanProductDetailScreen';
import { LoanApplicationScreen } from '../../screens/Finance/LoanApplicationScreen';
import { LoanStatusScreen } from '../../screens/Finance/LoanStatusScreen';

const Stack = createNativeStackNavigator<FinanceStackParamList>();

export function FinanceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="FinanceHome"        component={FinanceHomeScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="AddTransaction"     component={AddTransactionScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="LoanProducts"       component={LoanProductsScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="LoanProductDetail"  component={LoanProductDetailScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="LoanApplication"    component={LoanApplicationScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="LoanStatus"         component={LoanStatusScreen}         options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
