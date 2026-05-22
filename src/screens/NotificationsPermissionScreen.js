/**
 * NotificationsPermissionScreen
 *
 * iOS "pre-permission" screen — explains WHY Kindo needs notifications
 * before the OS dialog fires. Apple recommends this pattern to maximise
 * opt-in rates (users who understand the value are far more likely to allow).
 *
 * Android 13+ also requires a runtime permission (POST_NOTIFICATIONS).
 * This screen covers both platforms transparently.
 *
 * Shown once during onboarding, after Setup / Login, before Home.
 * Parents can skip — notifications are a nice-to-have, not required.
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

// ─── What Kindo sends notifications for ───────────────────────────────────────
const NOTIFICATION_BENEFITS = [
  { icon: '✅', title: 'Task completions', desc: "Know the moment a kid marks a chore done" },
  { icon: '💰', title: 'Reward requests',  desc: "Get alerted when a child wants to cash out" },
  { icon: '⭐', title: 'Streaks & badges',  desc: "Celebrate when your kids hit milestones" },
  { icon: '📋', title: 'New quests',        desc: "Remind kids when fresh tasks are waiting" },
];

export default function NotificationsPermissionScreen({ navigation }) {
  const { markNotificationsAsked } = useApp();
  const { colors } = useTheme();

  // Entrance animation
  const slideY  = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideY,  { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  // ─── Request permission ──────────────────────────────────────────────────────
  async function handleAllow() {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (status === 'granted') {
        // Register for push token in the background — not blocking navigation
        Notifications.getExpoPushTokenAsync({
          projectId: '4efaab0a-a411-4528-a7b1-b83160f7ac1f', // from app.json extra.eas.projectId
        })
          .then(async ({ data: pushToken }) => {
            if (pushToken) {
              // Save push token to AsyncStorage for use in notifications
              try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                await AsyncStorage.setItem('@kindo_push_token', pushToken);
              } catch {/* non-critical */}
            }
          })
          .catch(() => {/* non-critical — Expo Go or simulator won't have a real token */});
      }
    } catch (_) {
      // Permission request failed — silently continue
    }
    proceedToApp();
  }

  async function proceedToApp() {
    await markNotificationsAsked();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  return (
    <LinearGradient colors={['#4C1D95', '#7C3AED', '#A855F7']} style={styles.gradient}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe}>

        <Animated.View style={[styles.container, { opacity, transform: [{ translateY: slideY }] }]}>

          {/* Hero icon */}
          <View style={styles.iconWrap}>
            <Text style={styles.heroIcon}>🔔</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>Stay in the loop</Text>
          <Text style={styles.subline}>
            Turn on notifications so you never miss a moment with your kids.
          </Text>

          {/* Benefit list */}
          <View style={styles.benefitsList}>
            {NOTIFICATION_BENEFITS.map((b) => (
              <View key={b.title} style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>{b.icon}</Text>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={styles.allowBtn}
            onPress={handleAllow}
            activeOpacity={0.85}
          >
            <Text style={styles.allowBtnText}>Allow Notifications</Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity onPress={proceedToApp} style={styles.skipBtn} activeOpacity={0.7}>
            <Text style={styles.skipText}>Not now</Text>
          </TouchableOpacity>

          {/* Fine print — iOS App Store requirement: must disclose why */}
          <Text style={styles.finePrint}>
            You can change this any time in{' '}
            {Platform.OS === 'ios' ? 'Settings → Kindo' : 'Settings → App info → Kindo'}.
          </Text>

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:     { flex: 1 },
  safe:         { flex: 1 },
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 20 },

  iconWrap:     { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heroIcon:     { fontSize: 46 },

  headline:     { fontSize: 30, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 10 },
  subline:      { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 23, marginBottom: 32 },

  benefitsList: { width: '100%', marginBottom: 36 },
  benefitRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  benefitIcon:  { fontSize: 26, marginRight: 14, marginTop: 1 },
  benefitText:  { flex: 1 },
  benefitTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  benefitDesc:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },

  allowBtn:     { width: '100%', backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  allowBtnText: { fontSize: 17, fontWeight: '800', color: '#7C3AED' },

  skipBtn:      { paddingVertical: 8, paddingHorizontal: 24, marginBottom: 20 },
  skipText:     { fontSize: 15, color: 'rgba(255,255,255,0.7)', textDecorationLine: 'underline' },

  finePrint:    { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 16, paddingHorizontal: 16 },
});
