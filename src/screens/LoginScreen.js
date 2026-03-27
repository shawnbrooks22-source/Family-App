import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }) {
  const { authSignIn, authResetPassword } = useApp();
  const { colors, shadows } = useTheme();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await authSignIn(email, password);
      // Navigation is automatic — family state becomes non-null
    } catch (e) {
      Alert.alert('Login failed', e.message || 'Please check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Enter your email', 'Type your email address above, then tap "Forgot password".');
      return;
    }
    setResetting(true);
    try {
      await authResetPassword(email);
      Alert.alert(
        'Reset email sent 📬',
        `We've sent a password reset link to ${email.trim()}. Check your inbox.`
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send reset email. Please try again.');
    } finally {
      setResetting(false);
    }
  }

  const styles = makeStyles(colors, shadows);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#7C3AED', '#4F46E5', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.logoSection}>
          <Text style={styles.logoEmoji}>🌟</Text>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.subtitle}>Sign in to access your family</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.bg }]}>
            <Text style={[styles.fieldLabel, { color: colors.text2 }]}>EMAIL ADDRESS</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.text3}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={[styles.fieldLabel, { color: colors.text2, marginTop: 18 }]}>PASSWORD</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              placeholder="Your password"
              placeholderTextColor={colors.text3}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={handleForgotPassword}
              disabled={resetting}
              activeOpacity={0.7}
            >
              {resetting
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.forgotBtnText, { color: colors.primary }]}>Forgot password?</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            New to Kindo? Tap "Create a Family" on the previous screen.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(colors, shadows) {
  return StyleSheet.create({
    container:    { flex: 1 },
    flex:         { flex: 1 },
    safe: {
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    backBtn: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 100,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 24,
    },
    backBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
    logoSection:  { alignItems: 'center', marginBottom: 8 },
    logoEmoji:    { fontSize: 52, marginBottom: 12 },
    title: {
      fontSize: 32,
      fontWeight: '900',
      color: '#fff',
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
    },
    formContainer: {
      padding: 20,
      paddingTop: 24,
      flexGrow: 1,
    },
    card: {
      borderRadius: 24,
      padding: 24,
      ...shadows.lg,
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1.5,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 16,
    },
    loginBtn: {
      backgroundColor: '#7C3AED',
      borderRadius: 100,
      paddingVertical: 17,
      alignItems: 'center',
      marginTop: 24,
      ...shadows.md,
    },
    loginBtnText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
    forgotBtn: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    forgotBtnText: {
      fontSize: 15,
      fontWeight: '600',
    },
    disclaimer: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 20,
    },
  });
}
