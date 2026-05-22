import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import useDevice from '../hooks/useDevice';

const FEATURES = [
  { icon: '👨‍👩‍👧‍👦', title: 'Unlimited kids',       sub: 'Add as many kids as your family needs' },
  { icon: '💵', title: 'Real cash rewards',     sub: 'Pay kids automatically when quests are approved' },
  { icon: '📊', title: 'Advanced analytics',    sub: 'Weekly completion stats and streaks' },
  { icon: '📸', title: 'Photo proof',            sub: 'Kids attach photos to prove quests are done' },
  { icon: '🔔', title: 'Smart notifications',   sub: 'Instant alerts when quests are completed' },
  { icon: '🎖️', title: 'Badges & streaks',      sub: 'Keep kids motivated with achievements' },
];

export default function UpgradeScreen({ navigation }) {
  const { purchasePremium, restorePurchases, premiumPriceString, purchasing, iapReady, isPremium } = useSubscription();
  const { colors, shadows } = useTheme();
  const [restoring, setRestoring] = useState(false);

  // Navigate away when purchase completes — purchasePremium() only opens the native sheet;
  // the actual success arrives asynchronously via purchaseUpdatedListener → isPremium flipping true.
  const justMounted = useRef(true);
  useEffect(() => {
    if (justMounted.current) {
      justMounted.current = false;
      return; // Don't fire on initial mount
    }
    if (isPremium) {
      Alert.alert('Welcome to Premium! 🎉', 'All features are now unlocked for your family.');
      navigation.goBack();
    }
  }, [isPremium]);

  async function handlePurchase() {
    try {
      await purchasePremium();
      // Result arrives via purchaseUpdatedListener — handled by the useEffect above
    } catch (e) {
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase failed', e.message || 'Please try again or contact support.');
      }
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const found = await restorePurchases();
      if (found) {
        Alert.alert('Restored! ⭐', 'Your Premium subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('Nothing to restore', 'No active Premium subscription was found for this Apple/Google account.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  }

  const styles = makeStyles(colors, shadows);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#5B21B6', '#7C3AED', '#4F46E5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeTop}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.crown}>👑</Text>
          <Text style={styles.heroTitle}>Kindo Premium</Text>
          <Text style={styles.heroSub}>Everything your family needs to make chores fun and rewarding</Text>
        </View>

        {/* Pricing card */}
        <View style={[styles.pricingCard, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }]}>
          <Text style={styles.priceAmount}>{premiumPriceString}</Text>
          <Text style={styles.priceSub}>Auto-renews monthly · Cancel anytime</Text>
        </View>

        {/* Feature list */}
        <View style={[styles.featuresCard, { backgroundColor: colors.bg }]}>
          {FEATURES.map((f, i) => (
            <View
              key={f.title}
              style={[styles.featureRow, i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
            >
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: colors.text1 }]}>{f.title}</Text>
                <Text style={[styles.featureSub, { color: colors.text3 }]}>{f.sub}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#7C3AED" />
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.purchaseBtn, (purchasing || !iapReady) && { opacity: 0.7 }]}
          onPress={handlePurchase}
          disabled={purchasing || restoring}
          activeOpacity={0.88}
        >
          {purchasing
            ? <ActivityIndicator color="#7C3AED" />
            : <Text style={styles.purchaseBtnText}>Start Premium — {premiumPriceString}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={purchasing || restoring}
          activeOpacity={0.7}
        >
          {restoring
            ? <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
            : <Text style={styles.restoreBtnText}>Restore previous purchase</Text>
          }
        </TouchableOpacity>

        <Text style={styles.legal}>
          Payment will be charged to your Apple ID / Google account at confirmation of purchase. Subscription automatically renews unless auto-renewal is turned off at least 24 hours before the end of the current period. You can manage subscriptions in your account settings.
        </Text>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(colors, shadows) {
  return StyleSheet.create({
    safeTop: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    closeBtn: {
      alignSelf: 'flex-end',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 100,
      padding: 8,
    },
    scroll: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    hero: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    crown:      { fontSize: 56, marginBottom: 12 },
    heroTitle:  { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
    heroSub:    { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '500', textAlign: 'center', lineHeight: 22 },

    pricingCard: {
      borderRadius: 20,
      borderWidth: 1.5,
      paddingVertical: 20,
      alignItems: 'center',
      marginBottom: 20,
    },
    priceAmount: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    priceSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginTop: 4 },

    featuresCard: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      ...shadows.md,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    featureIcon:  { fontSize: 24, width: 32, textAlign: 'center' },
    featureTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    featureSub:   { fontSize: 13, fontWeight: '500', lineHeight: 18 },

    purchaseBtn: {
      backgroundColor: '#fff',
      borderRadius: 100,
      paddingVertical: 18,
      alignItems: 'center',
      marginBottom: 14,
      ...shadows.lg,
    },
    purchaseBtnText: {
      color: '#7C3AED',
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    restoreBtn: {
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 16,
    },
    restoreBtnText: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 14,
      fontWeight: '600',
    },
    legal: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 11,
      lineHeight: 17,
      textAlign: 'center',
    },
  });
}
