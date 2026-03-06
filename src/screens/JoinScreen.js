/**
 * JoinScreen — Join an existing family using an invite code.
 * Shown when a kid's device (or second parent's phone) needs to sync with the family.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, shadows } from '../theme/index';

export default function JoinScreen({ navigation }) {
  const { joinFamilyByCode } = useApp();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  function formatCode(raw) {
    // Auto-uppercase and allow letters/numbers/hyphens
    return raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('Enter your invite code', 'Ask a parent to share the code from Settings.');
      return;
    }
    setLoading(true);
    try {
      await joinFamilyByCode(trimmed);
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('Could not join', e.message || 'Please check your invite code and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#7C3AED', '#4F46E5']}
        style={styles.header}
      >
        <SafeAreaView>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerEmoji}>🔑</Text>
          <Text style={styles.headerTitle}>Join Your Family</Text>
          <Text style={styles.headerSub}>
            Get the invite code from a parent's Kindo app
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>INVITE CODE</Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={t => setCode(formatCode(t))}
              placeholder="KINDO-LION-3847"
              placeholderTextColor={colors.text3}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleJoin}
            />
            <Text style={styles.codeHint}>
              The code looks like KINDO-LION-3847.{'\n'}
              Find it in Parent → Settings → Invite Code.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.joinBtn, loading && { opacity: 0.7 }]}
            onPress={handleJoin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.joinBtnText}>🚀 Join Family</Text>
            )}
          </TouchableOpacity>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 How it works</Text>
            <Text style={styles.infoText}>
              1. Parent opens Kindo → Settings → shares their invite code{'\n'}
              2. Enter the code on this device{'\n'}
              3. Everyone's quests and rewards sync automatically!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  headerTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  headerSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    lineHeight: 22,
  },

  body: {
    padding: 24,
    gap: 20,
  },

  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    ...shadows.md,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text1,
    backgroundColor: colors.primaryLight,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 12,
  },
  codeHint: {
    fontSize: 13,
    color: colors.text3,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },

  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: 'center',
    ...shadows.md,
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  infoCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#FFE082',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5D4037',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#795548',
    fontWeight: '500',
    lineHeight: 22,
  },
});
