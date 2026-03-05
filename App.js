import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider, useApp } from './src/context/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import ParentDashboard from './src/screens/ParentDashboard';
import KidDashboard from './src/screens/KidDashboard';
import CelebrationScreen from './src/screens/CelebrationScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isLoaded, family } = useApp();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6C63FF' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!family ? (
        <Stack.Screen name="Setup" component={SetupScreen} />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Parent" component={ParentDashboard} />
          <Stack.Screen name="Kid" component={KidDashboard} />
          <Stack.Screen name="Celebration" component={CelebrationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppProvider>
  );
}
