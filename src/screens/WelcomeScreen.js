import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import useDevice from '../hooks/useDevice';

const { width, height } = Dimensions.get('window');

// Floating bubble for background decoration
function Bubble({ size, color, x, y, delay }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color,
          left: x, top: y,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

export default function WelcomeScreen({ navigation }) {
  const { isCloudEnabled } = useApp();
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const { isTablet, fs } = useDevice();
  const [appleAvailable, setAppleAvailable] = useState(false);

  const logoAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  async function handleAppleSignIn() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Apple returns the name only on first sign-in — cache it if available
      const firstName = credential.fullName?.givenName || '';
      const lastName  = credential.fullName?.familyName || '';
      const name      = [firstName, lastName].filter(Boolean).join(' ');
      // Navigate to Setup with pre-filled parent name
      navigation.navigate('Setup', { appleUserId: credential.user, parentName: name });
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In failed', 'Please try again or create a family manually.');
      }
    }
  }

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(logoAnim,  { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#7C3AED', '#4F46E5', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative bubbles */}
      <Bubble size={80}  color="rgba(255,255,255,0.08)" x={-20}       y={height * 0.1}  delay={0}    />
      <Bubble size={120} color="rgba(255,255,255,0.06)" x={width - 80} y={height * 0.15} delay={400}  />
      <Bubble size={60}  color="rgba(255,255,255,0.10)" x={width * 0.3} y={height * 0.05} delay={200} />
      <Bubble size={90}  color="rgba(255,255,255,0.07)" x={-30}        y={height * 0.7}  delay={600}  />
      <Bubble size={140} color="rgba(255,255,255,0.05)" x={width - 60}  y={height * 0.65} delay={300} />

      <SafeAreaView style={[styles.safe, isTablet && { paddingHorizontal: 80 }]}>
        <Animated.View
          style={[
            styles.logoSection,
            { opacity: fadeAnim, transform: [{ scale: logoAnim }] },
          ]}
        >
          <View style={[styles.logoCircle, isTablet && { width: 160, height: 160, borderRadius: 80 }]}>
            <Text style={[styles.logoEmoji, isTablet && { fontSize: 84 }]}>🌟</Text>
          </View>
          <Text style={[styles.appName, { fontSize: fs(52, 68) }]}>{t('appName')}</Text>
          <Text style={[styles.tagline, { fontSize: fs(18, 22) }]}>{t('welcome.tagline')}</Text>
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.pills, { opacity: fadeAnim }]}>
          {[t('welcome.earnStars'), t('welcome.winRewards'), t('welcome.completeQuests')].map(pill => (
            <View key={pill} style={styles.pill}>
              <Text style={[styles.pillText, { fontSize: fs(14, 16) }]}>{pill}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View
          style={[
            styles.ctaSection,
            isTablet && { maxWidth: 480, alignSelf: 'center' },
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryBtn, shadows.lg]}
            onPress={() => navigation.navigate('Setup')}
            activeOpacity={0.88}
          >
            <Text style={[styles.primaryBtnText, { color: colors.primary, fontSize: fs(18, 20) }]}>{t('welcome.createFamily')}</Text>
          </TouchableOpacity>

          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={16}
              style={{ width: '100%', height: 52, marginTop: 8 }}
              onPress={handleAppleSignIn}
            />
          )}

          {isCloudEnabled && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.88}
            >
              <Text style={[styles.secondaryBtnText, { fontSize: fs(17, 19) }]}>I already have an account</Text>
            </TouchableOpacity>
          )}

          {isCloudEnabled && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Join')}
              activeOpacity={0.88}
            >
              <Text style={[styles.disclaimer, { color: 'rgba(255,255,255,0.75)', marginTop: 0 }]}>{t('welcome.joinCode')}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            {t('welcome.disclaimer')}
          </Text>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 48,
  },

  // Bubbles
  bubble: { position: 'absolute' },

  // Logo
  logoSection: { alignItems: 'center', marginTop: 20 },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoEmoji: { fontSize: 64 },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1.5,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.2,
  },

  // Feature pills
  pills: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pillText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // CTA
  ctaSection: { width: '100%', gap: 14 },
  primaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
});
