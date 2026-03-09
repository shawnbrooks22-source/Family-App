/**
 * AIScreen — AI Chore Suggestions powered by Claude
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. Get an API key from https://console.anthropic.com
 * 2. Replace CLAUDE_API_KEY below with your key
 *
 * For production: store the key server-side (Supabase Edge Function) and
 * call it from here. Never ship a real API key in a mobile app binary.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors, shadows } from '../theme/index';

// ⬇️  Set EXPO_PUBLIC_CLAUDE_API_KEY in your .env file
// For production, proxy this through a Supabase Edge Function instead.
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_CLAUDE_API_KEY || 'YOUR_ANTHROPIC_API_KEY';
const CLAUDE_READY   = !CLAUDE_API_KEY.includes('YOUR_');

const TASK_EMOJIS = [
  '🧹', '🧽', '🛁', '📚', '🍽️', '🌱', '🐕', '🛏️',
  '👕', '🎒', '🚿', '♻️', '💻', '🎨', '🧺', '🌿',
];

// Call Claude API via fetch
async function callClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

// Parse Claude's JSON response
function parseSuggestions(text) {
  try {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]);
  } catch {
    return [];
  }
}

export default function AIScreen({ navigation }) {
  const { family, addTask } = useApp();

  const [age,          setAge]          = useState('');
  const [interests,    setInterests]    = useState('');
  const [selectedKid,  setSelectedKid]  = useState(family?.kids?.[0]?.id || null);
  const [suggestions,  setSuggestions]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [addedIds,     setAddedIds]     = useState(new Set());

  async function handleGenerate() {
    if (!age.trim()) {
      Alert.alert("Enter your child's age", "This helps Claude suggest age-appropriate chores.");
      return;
    }
    if (!CLAUDE_READY) {
      Alert.alert(
        'Claude API not configured',
        'Add your Anthropic API key to src/screens/AIScreen.js to enable AI suggestions.'
      );
      return;
    }
    setLoading(true);
    setSuggestions([]);
    setAddedIds(new Set());

    const kid = family?.kids?.find(k => k.id === selectedKid);
    const kidDesc = kid ? `for a child named ${kid.name}` : 'for a child';
    const interestLine = interests.trim()
      ? `The child's interests/hobbies: ${interests.trim()}.`
      : '';

    const prompt = `You are a helpful family chore assistant. Suggest 6 age-appropriate household chores ${kidDesc} who is ${age} years old. ${interestLine}

Return ONLY a valid JSON array (no other text). Each item should have:
- "title": short chore name (max 5 words)
- "emoji": a single relevant emoji from this set: ${TASK_EMOJIS.join(' ')}
- "reward": a fun, specific reward a parent might give (e.g. "30 min screen time", "Choose dinner tonight", "Extra bedtime story", "Ice cream trip")
- "why": one short sentence explaining why it's good for this age

Example format:
[
  { "title": "Make your bed", "emoji": "🛏️", "reward": "30 min screen time", "why": "Builds daily routine and responsibility." }
]`;

    try {
      const text = await callClaude(prompt);
      const parsed = parseSuggestions(text);
      if (parsed.length === 0) throw new Error('Could not parse suggestions');
      setSuggestions(parsed);
    } catch (e) {
      Alert.alert('Oops!', e.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSuggestion(s) {
    if (!selectedKid) {
      Alert.alert('Select a kid', 'Choose who to assign this quest to.');
      return;
    }
    await addTask({
      title:      s.title,
      emoji:      s.emoji,
      reward:     s.reward,
      assignedTo: selectedKid,
      recurrence: 'none',
      notes:      '',
    });
    setAddedIds(prev => new Set(prev).add(s.title));
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerEmoji}>🤖</Text>
          <Text style={styles.headerTitle}>AI Quest Creator</Text>
          <Text style={styles.headerSub}>Let Claude suggest perfect chores for your kid</Text>
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
          {/* Config card */}
          <View style={styles.configCard}>
            <Text style={styles.sectionLabel}>ASSIGN TO</Text>
            <View style={styles.kidPicker}>
              {family?.kids?.map(kid => (
                <TouchableOpacity
                  key={kid.id}
                  style={[
                    styles.kidBtn,
                    { backgroundColor: kid.color + (selectedKid === kid.id ? 'FF' : '30') },
                    selectedKid === kid.id && styles.kidBtnActive,
                  ]}
                  onPress={() => setSelectedKid(kid.id)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 22 }}>{kid.emoji}</Text>
                  <Text style={[
                    styles.kidBtnText,
                    { color: selectedKid === kid.id ? '#fff' : colors.text1 }
                  ]}>
                    {kid.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>CHILD'S AGE</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 7, or 8–10"
              placeholderTextColor={colors.text3}
              keyboardType="default"
              returnKeyType="next"
            />

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>INTERESTS (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={interests}
              onChangeText={setInterests}
              placeholder="e.g. dinosaurs, art, outdoor play"
              placeholderTextColor={colors.text3}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.generateBtn, loading && { opacity: 0.7 }]}
              onPress={handleGenerate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.generateBtnEmoji}>✨</Text>
                  <Text style={styles.generateBtnText}>Generate Quests</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading shimmer */}
          {loading && (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>🤖 Claude is thinking up perfect quests...</Text>
            </View>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={styles.suggestionsTitle}>
                ✨ {suggestions.length} Quest Ideas
              </Text>
              {suggestions.map((s, idx) => {
                const added = addedIds.has(s.title);
                return (
                  <View key={idx} style={styles.suggestionCard}>
                    <View style={styles.suggestionTop}>
                      <View style={styles.suggestionEmojiBox}>
                        <Text style={{ fontSize: 30 }}>{s.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.suggestionTitle}>{s.title}</Text>
                        <Text style={styles.suggestionReward}>🎁 {s.reward}</Text>
                      </View>
                    </View>
                    {s.why ? (
                      <Text style={styles.suggestionWhy}>💡 {s.why}</Text>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.addBtn, added && styles.addBtnAdded]}
                      onPress={() => !added && handleAddSuggestion(s)}
                      activeOpacity={added ? 1 : 0.85}
                    >
                      <Ionicons
                        name={added ? 'checkmark-circle' : 'add-circle'}
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.addBtnText}>
                        {added ? 'Added!' : 'Add This Quest'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Not configured notice */}
          {!CLAUDE_READY && (
            <View style={styles.notConfiguredCard}>
              <Text style={styles.notConfiguredTitle}>🔑 Claude API Key Required</Text>
              <Text style={styles.notConfiguredText}>
                To enable AI quest suggestions, open{'\n'}
                <Text style={{ fontWeight: '700' }}>src/screens/AIScreen.js</Text>{'\n'}
                and replace CLAUDE_API_KEY with your key from{'\n'}
                console.anthropic.com
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
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
    marginBottom: 20,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },

  body: {
    padding: 20,
    gap: 16,
  },

  configCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    ...shadows.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text3,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  kidPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kidBtn: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  kidBtnActive: {
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.15)',
  },
  kidBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.text1,
    backgroundColor: '#F8FAFC',
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    ...shadows.md,
  },
  generateBtnEmoji: { fontSize: 20 },
  generateBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },

  loadingCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },

  suggestionsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text1,
    letterSpacing: -0.3,
  },

  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    ...shadows.sm,
  },
  suggestionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  suggestionEmojiBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 4,
  },
  suggestionReward: {
    fontSize: 13,
    color: colors.text2,
    fontWeight: '600',
  },
  suggestionWhy: {
    fontSize: 13,
    color: colors.text3,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addBtnAdded: {
    backgroundColor: colors.success,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  notConfiguredCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#FFE082',
  },
  notConfiguredTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5D4037',
    marginBottom: 8,
  },
  notConfiguredText: {
    fontSize: 14,
    color: '#795548',
    fontWeight: '500',
    lineHeight: 22,
  },
});
