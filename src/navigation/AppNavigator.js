import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AnalisisScreen from '../screens/AnalisisScreen';
import ResultadoScreen from '../screens/ResultadoScreen';
import ParcelasScreen from '../screens/ParcelasScreen';
import ChatScreen from '../screens/ChatScreen';
import ParcelaDetalleScreen from '../screens/ParcelaDetalleScreen';
import ArbolDetalleScreen from '../screens/ArbolDetalleScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: { borderTopColor: COLORS.border, paddingBottom: insets.bottom + 4, height: 60 + insets.bottom },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerStyle: { backgroundColor: COLORS.white },
        headerTintColor: COLORS.primaryDark,
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <Tab.Screen
        name="Analizar"
        component={AnalisisScreen}
        options={{ title: 'Analizar', tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} /> }}
      />
      <Tab.Screen
        name="Parcelas"
        component={ParcelasScreen}
        options={{ title: 'Mis Parcelas', tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} /> }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat IA', tabBarIcon: ({ focused }) => <TabIcon emoji="🌳" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: COLORS.white }, headerTintColor: COLORS.primaryDark, headerTitleStyle: { fontWeight: '800' } }}>
      <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Resultado" component={ResultadoScreen} options={{ title: 'Resultado del análisis' }} />
      <Stack.Screen name="ParcelaDetalle" component={ParcelaDetalleScreen} options={({ route }) => ({ title: route.params?.parcela?.nombre || 'Parcela' })} />
      <Stack.Screen name="ArbolDetalle" component={ArbolDetalleScreen} options={({ route }) => ({ title: route.params?.arbol?.especie || 'Árbol' })} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
