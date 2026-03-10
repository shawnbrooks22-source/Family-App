// Polyfill URL for Supabase (must be first import)
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { initI18n } from './src/i18n/index';
import WelcomeScreen      from './src/screens/WelcomeScreen';
import HomeScreen         from './src/screens/HomeScreen';
import SetupScreen        from './src/screens/SetupScreen';
import JoinScreen         from './src/screens/JoinScreen';
import ParentDashboard    from './src/screens/ParentDashboard';
import KidDashboard       from './src/screens/KidDashboard';
import CelebrationScreen  from './src/screens/CelebrationScreen';
import AIScreen           from './src/screens/AIScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isLoaded, family } = useApp();
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
          <Stack.Screen name="Join"    component={JoinScreen}    options={{ animation: 'slide_from_right' }} />
        </>
      ) : (
        // ── Main app ───────────────────────────────────────────────────────
        <>
          <Stack.Screen name="Home"        component={HomeScreen} />
          <Stack.Screen name="Parent"      component={ParentDashboard} />
          <Stack.Screen name="Kid"         component={KidDashboard} />
          <Stack.Screen name="Celebration" component={CelebrationScreen} />
          <Stack.Screen name="AI"          component={AIScreen}   options={{ animation: 'slide_from_bottom' }} />
          {/* Allow re-joining/switching family from within the app */}
          <Stack.Screen name="Join"        component={JoinScreen} options={{ animation: 'slide_from_right' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true)).catch(() => setI18nReady(true));
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
        <ThemeProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
