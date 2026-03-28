// Polyfill URL for Supabase (must be first import)
import 'react-native-url-polyfill/auto';
import * as Sentry from '@sentry/react-native';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';
import { initI18n } from './src/i18n/index';
import WelcomeScreen      from './src/screens/WelcomeScreen';
import HomeScreen         from './src/screens/HomeScreen';
import SetupScreen        from './src/screens/SetupScreen';
import LoginScreen        from './src/screens/LoginScreen';
import JoinScreen         from './src/screens/JoinScreen';
import ParentDashboard    from './src/screens/ParentDashboard';
import KidDashboard       from './src/screens/KidDashboard';
import CelebrationScreen  from './src/screens/CelebrationScreen';
import AIScreen           from './src/screens/AIScreen';
import PaymentsScreen     from './src/screens/PaymentsScreen';
import UpgradeScreen                  from './src/screens/UpgradeScreen';
import NotificationsPermissionScreen  from './src/screens/NotificationsPermissionScreen';

// ─── Sentry (crash reporting) ──────────────────────────────────────────────────
// Set EXPO_PUBLIC_SENTRY_DSN in your .env to enable.
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: 0.2,   // 20% of sessions captured for performance
    environment: __DEV__ ? 'development' : 'production',
  });
}

const Stack = createNativeStackNavigator();

// Deep-link configuration: kindo://join/CODE  →  JoinScreen
const linking = {
  prefixes: ['kindo://', 'https://kindo.app'],
  config: {
    screens: {
      Welcome: 'welcome',
      Join: 'join/:code',
      Home: 'home',
    },
  },
};

function AppNavigator() {
  const { isLoaded, family, notificationsAsked } = useApp();
  const { colors } = useTheme();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🌟</Text>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ fontSize: 16, color: colors.text3, fontWeight: '600', marginTop: 14 }}>
          Loading Kindo…
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!family ? (
        // ── Onboarding flow ────────────────────────────────────────────────
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Setup"   component={SetupScreen}   options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Login"   component={LoginScreen}   options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Join"    component={JoinScreen}    options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        // ── Main app ───────────────────────────────────────────────────────
        <>
          {/* Show notification permission screen once, right after onboarding */}
          {!notificationsAsked && (
            <Stack.Screen
              name="NotificationsPermission"
              component={NotificationsPermissionScreen}
              options={{ animation: 'fade' }}
            />
          )}
          <Stack.Screen name="Home"        component={HomeScreen} />
          <Stack.Screen name="Parent"      component={ParentDashboard} />
          <Stack.Screen name="Kid"         component={KidDashboard} />
          <Stack.Screen name="Celebration" component={CelebrationScreen} />
          <Stack.Screen name="AI"       component={AIScreen}       options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Payments" component={PaymentsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Upgrade"  component={UpgradeScreen}  options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
          <Stack.Screen name="Join"     component={JoinScreen}     options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

function AppRoot() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch((e) => { console.error('i18n init failed:', e); setI18nReady(true); });
  }, []);

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF8FF' }}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>🌟</Text>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <SubscriptionProvider>
          <ThemeProvider>
            <NavigationContainer linking={linking}>
              <AppNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </SubscriptionProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

// Wrap with Sentry error boundary in production
export default SENTRY_DSN ? Sentry.wrap(AppRoot) : AppRoot;
