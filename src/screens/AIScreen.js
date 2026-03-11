/**
 * AIScreen — Smart Chore Suggestions (built-in, no API required)
 * Works fully offline. No API keys needed.
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
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

// ─── Built-in Chore Database ──────────────────────────────────────────────────
// Each chore has: title, emoji, reward, why, tags (for interest matching), minAge, maxAge

const CHORE_DB = [
  // Toddler / ages 2-4
  { title: 'Put toys away', emoji: '🎒', reward: 'Extra bedtime story', why: 'Teaches tidiness from an early age.', tags: ['toys', 'play'], minAge: 2, maxAge: 4 },
  { title: 'Wipe up spills', emoji: '🧽', reward: 'Choose a sticker', why: 'Builds responsibility for accidents.', tags: [], minAge: 2, maxAge: 5 },
  { title: 'Sort laundry colors', emoji: '👕', reward: 'Pick the movie tonight', why: 'Simple sorting builds early math skills.', tags: ['laundry'], minAge: 3, maxAge: 6 },
  { title: 'Feed the pet', emoji: '🐕', reward: 'Extra playtime', why: 'Caring for animals builds empathy.', tags: ['animals', 'pets'], minAge: 3, maxAge: 7 },
  { title: 'Dust low shelves', emoji: '🧹', reward: 'Choose a snack', why: 'Easy win that makes kids feel helpful.', tags: [], minAge: 3, maxAge: 6 },
  { title: 'Help set the table', emoji: '🍽️', reward: 'Sit in the special chair', why: 'Prepares kids for meal routines.', tags: ['cooking', 'food'], minAge: 3, maxAge: 7 },

  // Young kids / ages 5-8
  { title: 'Make your bed', emoji: '🛏️', reward: '30 min screen time', why: 'Builds a daily morning routine.', tags: [], minAge: 5, maxAge: 99 },
  { title: 'Empty the dishwasher', emoji: '🍽️', reward: 'Choose dinner tonight', why: 'Teaches kitchen organization and safety.', tags: ['cooking', 'food'], minAge: 5, maxAge: 99 },
  { title: 'Water the plants', emoji: '🌱', reward: 'Pick a new seed to grow', why: 'Teaches nurturing and responsibility.', tags: ['nature', 'gardening', 'plants'], minAge: 5, maxAge: 99 },
  { title: 'Vacuum one room', emoji: '🧹', reward: '20 min extra gaming', why: 'A satisfying, visible result that builds pride.', tags: ['gaming'], minAge: 6, maxAge: 99 },
  { title: 'Take out recycling', emoji: '♻️', reward: 'Ice cream trip', why: 'Teaches environmental responsibility.', tags: ['nature', 'environment'], minAge: 6, maxAge: 99 },
  { title: 'Wipe down bathroom sink', emoji: '🚿', reward: 'Bubble bath tonight', why: 'Introduces personal hygiene habits.', tags: [], minAge: 6, maxAge: 99 },
  { title: 'Pack your school bag', emoji: '🎒', reward: 'Extra 10 min before bed', why: 'Builds independence and planning skills.', tags: ['school'], minAge: 6, maxAge: 12 },
  { title: 'Sweep the kitchen floor', emoji: '🧹', reward: 'Choose the playlist at dinner', why: 'Teaches thoroughness and follow-through.', tags: ['music'], minAge: 6, maxAge: 99 },
  { title: 'Fold your laundry', emoji: '👕', reward: 'New book or comic', why: 'Develops fine motor skills and routine.', tags: ['laundry', 'reading'], minAge: 7, maxAge: 99 },
  { title: 'Weed the garden', emoji: '🌿', reward: 'Plant your own flower', why: 'Connects kids to nature and outdoor work.', tags: ['nature', 'gardening', 'outdoor'], minAge: 7, maxAge: 99 },
  { title: 'Wash the pet', emoji: '🐕', reward: 'Pick a fun dog treat', why: 'Deepens bond with pets and teaches care.', tags: ['animals', 'pets'], minAge: 7, maxAge: 99 },
  { title: 'Organize your bookshelf', emoji: '📚', reward: 'Choose a new book', why: 'Builds organizational thinking and love of reading.', tags: ['reading', 'books'], minAge: 7, maxAge: 99 },
  { title: 'Help cook dinner', emoji: '🍽️', reward: 'Name the dish you made', why: 'Teaches real-life cooking skills early.', tags: ['cooking', 'food'], minAge: 7, maxAge: 99 },
  { title: 'Clean your desk', emoji: '💻', reward: '30 min extra screen time', why: 'Helps focus and study performance.', tags: ['school', 'art', 'drawing', 'gaming'], minAge: 7, maxAge: 99 },

  // Tweens / ages 9-12
  { title: 'Mop the kitchen floor', emoji: '🧽', reward: 'Pick a restaurant this week', why: 'Builds deep cleaning skills and stamina.', tags: ['cooking', 'food'], minAge: 9, maxAge: 99 },
  { title: 'Clean the bathroom', emoji: '🚿', reward: 'Spa night supplies', why: 'Teaches thorough hygiene cleaning.', tags: [], minAge: 9, maxAge: 99 },
  { title: 'Do a load of laundry', emoji: '🧺', reward: 'Choose a new outfit', why: 'Full laundry cycle teaches independence.', tags: ['laundry'], minAge: 9, maxAge: 99 },
  { title: 'Rake the leaves', emoji: '🌿', reward: 'Bonfire / s\'mores night', why: 'Outdoor work builds endurance and teamwork.', tags: ['outdoor', 'nature', 'gardening'], minAge: 9, maxAge: 99 },
  { title: 'Walk the dog daily', emoji: '🐕', reward: 'Adopt a new toy for the dog', why: 'Responsibility + daily exercise habit.', tags: ['animals', 'pets', 'outdoor'], minAge: 9, maxAge: 99 },
  { title: 'Research a family meal', emoji: '📚', reward: 'Cook it together on Friday', why: 'Combines research, reading and cooking.', tags: ['cooking', 'food', 'reading'], minAge: 9, maxAge: 99 },
  { title: 'Organize the pantry', emoji: '🍽️', reward: 'Pick this week\'s snacks', why: 'Planning and categorization skill builder.', tags: ['cooking', 'food'], minAge: 10, maxAge: 99 },
  { title: 'Clean out the car', emoji: '♻️', reward: 'Control the road trip playlist', why: 'Taking ownership of shared family spaces.', tags: ['music'], minAge: 10, maxAge: 99 },
  { title: 'Paint a fence or wall', emoji: '🎨', reward: 'Choose your room wall color', why: 'Creative + productive work builds confidence.', tags: ['art', 'drawing', 'creative'], minAge: 10, maxAge: 99 },
  { title: 'Batch cook a side dish', emoji: '🍽️', reward: 'Pick a cooking YouTube channel', why: 'Teaches meal prep and forward planning.', tags: ['cooking', 'food'], minAge: 10, maxAge: 99 },
  { title: 'Help with grocery list', emoji: '🛒', reward: 'Pick one treat at the store', why: 'Builds math, budgeting and nutrition awareness.', tags: ['cooking', 'food', 'math'], minAge: 10, maxAge: 99 },

  // Teens / ages 13+
  { title: 'Cook a full meal', emoji: '🍽️', reward: 'Pick any recipe, we\'ll buy it', why: 'Real-world independence and nutrition skills.', tags: ['cooking', 'food'], minAge: 13, maxAge: 99 },
  { title: 'Mow the lawn', emoji: '🌿', reward: 'Pocket money this week', why: 'Builds outdoor responsibility and physical fitness.', tags: ['outdoor', 'nature', 'gardening'], minAge: 13, maxAge: 99 },
  { title: 'Deep clean the kitchen', emoji: '🧽', reward: 'Movie night of your choice', why: 'Learning deep cleaning for future independence.', tags: ['cooking', 'food'], minAge: 13, maxAge: 99 },
  { title: 'Manage all pet care for a week', emoji: '🐕', reward: 'Name the next pet visit destination', why: 'Full ownership builds true responsibility.', tags: ['animals', 'pets'], minAge: 13, maxAge: 99 },
  { title: 'Redesign your study space', emoji: '💻', reward: 'Budget for new desk item', why: 'Environment design affects focus and results.', tags: ['school', 'art', 'drawing', 'gaming', 'creative'], minAge: 13, maxAge: 99 },
  { title: 'Do all family laundry', emoji: '🧺', reward: 'New clothing item of choice', why: 'Full household contribution builds independence.', tags: ['laundry'], minAge: 13, maxAge: 99 },
  { title: 'Plan & cook weekly meals', emoji: '🍽️', reward: 'Full control of menu for a week', why: 'Combines budgeting, nutrition and cooking.', tags: ['cooking', 'food'], minAge: 14, maxAge: 99 },
  { title: 'Fix something broken at home', emoji: '🔧', reward: 'Keep the leftover materials', why: 'DIY skills save money and build confidence.', tags: ['creative', 'building'], minAge: 14, maxAge: 99 },
  { title: 'Create a family chore schedule', emoji: '📚', reward: 'Family pizza night', why: 'Leadership and organizational thinking.', tags: ['school', 'reading'], minAge: 14, maxAge: 99 },
];

const REWARDS = [
  '30 min screen time', 'Choose dinner tonight', 'Extra bedtime story',
  'Ice cream trip', '20 min extra gaming', 'Pick the movie tonight',
  'New book or comic', 'Pocket money this week', 'Choose a snack',
  'Stay up 30 min later', 'Friend sleepover this weekend', 'Choose a fun outing',
];

// ─── Smart suggestion engine ──────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseAge(ageStr) {
  const n = parseInt(ageStr, 10);
  return isNaN(n) ? null : n;
}

function buildInterestKeywords(interestsStr) {
  return interestsStr
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
}

function scoreChore(chore, age, keywords) {
  if (age < chore.minAge || age > chore.maxAge) return -1;
  let score = 1;
  for (const kw of keywords) {
    if (chore.tags.some(t => t.includes(kw) || kw.includes(t))) score += 2;
    if (chore.title.toLowerCase().includes(kw)) score += 1;
  }
  return score;
}

function generateSuggestions(ageStr, interestsStr, count = 6) {
  const age = parseAge(ageStr);
  if (age === null) return [];

  const keywords = buildInterestKeywords(interestsStr);

  const scored = CHORE_DB
    .map(c => ({ chore: c, score: scoreChore(c, age, keywords) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Take top interest-matched chores first, then fill with random age-appropriate ones
  const top = scored.filter(x => x.score > 1).map(x => x.chore);
  const rest = shuffle(scored.filter(x => x.score === 1).map(x => x.chore));
  const pool = [...top, ...rest];

  return pool.slice(0, count).map(c => ({
    ...c,
    reward: c.reward || REWARDS[Math.floor(Math.random() * REWARDS.length)],
  }));
}

export default function AIScreen({ navigation }) {
  const { family, addTask } = useApp();
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();

  const [age,          setAge]          = useState('');
  const [interests,    setInterests]    = useState('');
  const [selectedKid,  setSelectedKid]  = useState(family?.kids?.[0]?.id || null);
  const [suggestions,  setSuggestions]  = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [addedIds,     setAddedIds]     = useState(new Set());

  function handleGenerate() {
    if (!age.trim()) {
      Alert.alert(t('ai.enterAge'), t('ai.ageHelps'));
      return;
    }
    setLoading(true);
    setSuggestions([]);
    setAddedIds(new Set());

    // Small timeout so the loading spinner is visible
    setTimeout(() => {
      try {
        const results = generateSuggestions(age.trim(), interests.trim());
        if (results.length === 0) {
          Alert.alert('No chores found', 'Try entering a different age.');
        } else {
          setSuggestions(results);
        }
      } catch (e) {
        Alert.alert(t('ai.oops'), 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 600);
  }

  async function handleAddSuggestion(s) {
    if (!selectedKid) {
      Alert.alert(t('ai.selectKid'), t('ai.chooseKid'));
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
      backgroundColor: colors.bg,
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

  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {t('back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerEmoji}>🤖</Text>
          <Text style={styles.headerTitle}>{t('ai.title')}</Text>
          <Text style={styles.headerSub}>{t('ai.subtitle')}</Text>
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
            <Text style={styles.sectionLabel}>{t('ai.assignTo')}</Text>
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

            <Text style={[styles.sectionLabel, { marginTop: 18 }]}>{t('ai.childAge')}</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder={t('ai.agePlaceholder')}
              placeholderTextColor={colors.text3}
              keyboardType="default"
              returnKeyType="next"
            />

            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>{t('ai.interests')}</Text>
            <TextInput
              style={styles.input}
              value={interests}
              onChangeText={setInterests}
              placeholder={t('ai.interestsPlaceholder')}
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
                  <Text style={styles.generateBtnText}>{t('ai.generate')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading shimmer */}
          {loading && (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingText}>{t('ai.generating')}</Text>
            </View>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={styles.suggestionsTitle}>
                {t('ai.questIdeas', { count: suggestions.length })}
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
                        {added ? t('ai.added') : t('ai.addThisQuest')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
