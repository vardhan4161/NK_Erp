/**
 * Root Layout — App entry with all providers
 * Initializes database, fonts, theme, auth
 */
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider, useDatabaseStatus } from '@/contexts/DatabaseContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, isLoading: authLoading } = useAuth();
  const { isReady: dbReady, error: dbError } = useDatabaseStatus();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!dbReady || authLoading) return;
    const inTabs = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';

    if (!user && !inLogin) {
      router.replace('/login');
    } else if (user && inLogin) {
      router.replace('/(tabs)');
    }
  }, [user, authLoading, dbReady, segments]);

  if (dbError) {
    return (
      <View style={[styles.center, { backgroundColor: '#0D1117' }]}>
        <Text style={styles.errorText}>❌ Database Error</Text>
        <Text style={styles.errorSub}>{dbError}</Text>
      </View>
    );
  }

  if (!dbReady || authLoading) {
    return (
      <View style={[styles.center, { backgroundColor: '#0D1117' }]}>
        <Text style={styles.logo}>NK Enterprises</Text>
        <ActivityIndicator color="#3B82F6" size="large" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Setting up...</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colors.statusBar === 'light' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, headerShadowVisible: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Product Details' }} />
        <Stack.Screen name="product/add" options={{ title: 'Add Product' }} />
        <Stack.Screen name="customer/[id]" options={{ title: 'Customer Details' }} />
        <Stack.Screen name="sale/[id]" options={{ title: 'Invoice' }} />
        <Stack.Screen name="inventory" options={{ title: 'Inventory' }} />
        <Stack.Screen name="reports" options={{ title: 'Reports' }} />
        <Stack.Screen name="sales-history" options={{ title: 'Sales History' }} />
        <Stack.Screen name="expenses" options={{ title: 'Expenses' }} />
        <Stack.Screen name="users" options={{ title: 'User Management' }} />
        <Stack.Screen name="categories-brands" options={{ title: 'Categories & Brands' }} />
        <Stack.Screen name="suppliers" options={{ title: 'Suppliers' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <DatabaseProvider>
            <AuthProvider>
              <CartProvider>
                <RootLayoutNav />
              </CartProvider>
            </AuthProvider>
          </DatabaseProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 28, fontWeight: '700', color: '#E6EDF3', letterSpacing: 0.5 },
  loadingText: { fontSize: 14, color: '#8B949E', marginTop: 12 },
  errorText: { fontSize: 20, fontWeight: '700', color: '#EF4444' },
  errorSub: { fontSize: 14, color: '#8B949E', marginTop: 8, paddingHorizontal: 32, textAlign: 'center' },
});
