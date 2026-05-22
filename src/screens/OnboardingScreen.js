import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';

const { width: W, height: H } = Dimensions.get('window');

// ─── Slide data ────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    gradient: ['#3B0764', '#7C3AED'],
    emoji: '🌟',
    title: 'Welcome to Kindo!',
    sub: 'The fun way to turn everyday chores\ninto adventures your whole family loves.',
    preview: 'welcome',
  },
  {
    gradient: ['#78350F', '#D97706'],
    emoji: '⚡',
    title: 'Assign Fun Quests',
    sub: 'Turn chores into exciting missions\nwith rewards your kids actually want.',
    preview: 'quest',
  },
  {
    gradient: ['#064E3B', '#059669'],
    emoji: '⭐',
    title: 'Kids Earn Stars',
    sub: 'Quest done = star earned.\nWatch your kid level up from\n🌟 Rising Star to ✨ Legend!',
    preview: 'stars',
  },
  {
    gradient: ['#7F1D1D', '#DC2626'],
    emoji: '🔥',
    title: 'Build Daily Streaks',
    sub: "Finish quests every day to build\na streak. Don't break the chain!",
    preview: 'streak',
  },
  {
    gradient: ['#134E4A', '#0D9488'],
    emoji: '💰',
    title: 'Savings Goals',
    sub: 'Set a target: complete 5 quests\nand earn $10! Kids learn that\nhard work has real payoffs.',
    preview: 'savings',
  },
  {
    gradient: ['#1E1B4B', '#4338CA'],
    emoji: '🚀',
    title: "You're All Set!",
    sub: 'Head to the Parent Hub to create\nyour first quest. Your family\nadventure starts right now!',
    preview: 'done',
  },
];

// ─── Preview card components ───────────────────────────────────────────────────

function PreviewWelcome() {
  return (
    <View style={p.card}>
      <View style={p.avatarRow}>
        {[{ e: '👩', c: '#7C3AED' }, { e: '🦊', c: '#F59E0B' }, { e: '🐱', c: '#10B981' }].map((a, i) => (
          <View key={i} style={[p.avatar, { backgroundColor: a.c }]}>
            <Text style={{ fontSize: 22 }}>{a.e}</Text>
          </View>
        ))}
      </View>
      <Text style={p.cardLabel}>Parent + kids, all in one app</Text>
      <View style={p.tagRow}>
        {['Free', 'No ads', 'Works offline'].map(tag => (
          <View key={tag} style={p.tag}>
            <Text style={p.tagText}>✓  {tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PreviewQuest() {
  return (
    <View style={p.card}>
      <View style={p.questRow}>
        <View style={p.questEmoji}>
          <Text style={{ fontSize: 26 }}>🧹</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.questTitle}>Clean Your Room</Text>
          <Text style={p.questReward}>⭐  Reward: 30 min screen time</Text>
        </View>
      </View>
      <LinearGradient
        colors={['#FF8C00', '#FFE000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={p.doItBtn}
      >
        <Text style={p.doItText}>⚡  DO IT!</Text>
      </LinearGradient>
    </View>
  );
}

function PreviewStars() {
  return (
    <View style={p.card}>
      <Text style={p.starsRow}>⭐⭐⭐⭐⭐</Text>
      <View style={p.rankBadge}>
        <Text style={p.rankText}>⭐  STAR COLLECTOR</Text>
      </View>
      <Text style={p.cardLabel}>5 stars earned all-time</Text>
      <View style={p.progressTrack}>
        <View style={[p.progressFill, { width: '80%', backgroundColor: '#F59E0B' }]} />
      </View>
      <Text style={[p.cardLabel, { marginTop: 4 }]}>3 more stars to reach ✨ Hero</Text>
    </View>
  );
}

function PreviewStreak() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return (
    <View style={p.card}>
      <Text style={p.streakFire}>🔥</Text>
      <Text style={p.streakNum}>3-Day Streak!</Text>
      <View style={p.dayRow}>
        {days.map((d, i) => (
          <View key={d} style={[p.dayDot, i < 3 ? p.dayDotOn : p.dayDotOff]}>
            <Text style={[p.dayLabel, { color: i < 3 ? '#fff' : '#94A3B8' }]}>{d}</Text>
          </View>
        ))}
      </View>
      <Text style={[p.cardLabel, { color: '#FCA5A5' }]}>Keep going — don't break it!</Text>
    </View>
  );
}

function PreviewSavings() {
  return (
    <View style={p.card}>
      <View style={p.savingsHeader}>
        <Text style={p.savingsTitle}>🚲  New Bike</Text>
        <Text style={p.savingsAmt}>$10.00</Text>
      </View>
      <Text style={p.cardLabel}>3 / 5 quests completed</Text>
      <View style={p.progressTrack}>
        <View style={[p.progressFill, { width: '60%', backgroundColor: '#10B981' }]} />
      </View>
      <Text style={[p.cardLabel, { marginTop: 6, color: '#6EE7B7' }]}>
        2 more quests to earn your reward!
      </Text>
    </View>
  );
}

function PreviewDone() {
  return (
    <View style={p.card}>
      {[
        '✅  Assign quests to your kids',
        '⭐  Track stars & streaks',
        '💰  Set savings goals',
        '🔔  Get notified instantly',
      ].map(line => (
        <Text key={line} style={p.checkLine}>{line}</Text>
      ))}
    </View>
  );
}

const PREVIEW_MAP = {
  welcome: PreviewWelcome,
  quest:   PreviewQuest,
  stars:   PreviewStars,
  streak:  PreviewStreak,
  savings: PreviewSavings,
  done:    PreviewDone,
};

// ─── Single slide ──────────────────────────────────────────────────────────────

function Slide({ slide, index, total, activeIdx, onSkip, onNext }) {
  const insets = useSafeAreaInsets();
  const isLast = index === total - 1;
  const PreviewComp = PREVIEW_MAP[slide.preview];

  return (
    <LinearGradient
      colors={slide.gradient}
      style={[styles.slide, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
    >
      {/* Skip */}
      <View style={styles.topRow}>
        {!isLast ? (
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : <View />}
        {/* Slide counter */}
        <Text style={styles.counter}>{index + 1} / {total}</Text>
      </View>

      {/* Emoji */}
      <Text style={styles.emoji}>{slide.emoji}</Text>

      {/* Preview card */}
      <PreviewComp />

      {/* Title + subtitle */}
      <Text style={styles.title}>{slide.title}</Text>
      <Text style={styles.sub}>{slide.sub}</Text>

      {/* Push dots + button to bottom */}
      <View style={{ flex: 1 }} />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === activeIdx ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Next / Let's Go button */}
      <TouchableOpacity
        style={styles.nextBtn}
        onPress={onNext}
        activeOpacity={0.88}
      >
        <View style={styles.nextBtnInner}>
          <Text style={styles.nextBtnText}>
            {isLast ? "Let's Go! 🚀" : 'Next  →'}
          </Text>
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { markOnboardingDone } = useApp();
  const scrollRef  = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  function handleScrollEnd(e) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIdx(idx);
  }

  function goNext() {
    if (activeIdx < SLIDES.length - 1) {
      const next = activeIdx + 1;
      scrollRef.current?.scrollTo({ x: next * W, animated: true });
      setActiveIdx(next);
    } else {
      markOnboardingDone();
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        scrollEnabled={true}
      >
        {SLIDES.map((slide, i) => (
          <Slide
            key={i}
            slide={slide}
            index={i}
            total={SLIDES.length}
            activeIdx={activeIdx}
            onSkip={markOnboardingDone}
            onNext={goNext}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Preview card styles ───────────────────────────────────────────────────────

const p = StyleSheet.create({
  card: {
    width: W - 64,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    padding: 18,
    marginBottom: 22,
    alignItems: 'center',
    backdropFilter: 'blur(12px)',
  },

  // Welcome
  avatarRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  avatar:      { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  tagRow:      { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  tag:         { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:     { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Quest
  questRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', marginBottom: 12 },
  questEmoji:  { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  questTitle:  { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  questReward: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  doItBtn:     { width: '100%', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  doItText:    { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // Stars
  starsRow:   { fontSize: 26, letterSpacing: 2, marginBottom: 10 },
  rankBadge:  { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 10 },
  rankText:   { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },

  // Streak
  streakFire: { fontSize: 40, marginBottom: 4 },
  streakNum:  { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  dayRow:     { flexDirection: 'row', gap: 6, marginBottom: 10 },
  dayDot:     { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayDotOn:   { backgroundColor: '#EF4444' },
  dayDotOff:  { backgroundColor: 'rgba(255,255,255,0.15)' },
  dayLabel:   { fontSize: 10, fontWeight: '700' },

  // Savings
  savingsHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
  savingsTitle:  { color: '#fff', fontSize: 15, fontWeight: '700' },
  savingsAmt:    { color: '#6EE7B7', fontSize: 18, fontWeight: '800' },

  // Done
  checkLine: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8, alignSelf: 'flex-start' },

  // Shared
  cardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500', textAlign: 'center' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8, overflow: 'hidden' },
  progressFill:  { height: 8, borderRadius: 4 },
});

// ─── Screen styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: W,
    minHeight: H,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  counter: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 14,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#fff',
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  nextBtn: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  nextBtnInner: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
