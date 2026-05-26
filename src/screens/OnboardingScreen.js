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
    id: 'welcome',
    gradient: ['#3B0764', '#7C3AED'],
    title: 'Welcome to Kindo! 🌟',
    sub: 'Set up takes 3 minutes.\nLet\'s show you exactly how it works.',
  },
  {
    id: 'family',
    gradient: ['#1E3A5F', '#2563EB'],
    title: 'First: Set Up Your Family',
    sub: 'Add your kids with a name, emoji, and color.\nEach kid gets their own profile.',
    insight: '💡 You control everything — kids see their quests, you approve them',
  },
  {
    id: 'quests',
    gradient: ['#78350F', '#D97706'],
    title: 'Assign Quests in Seconds ⚡',
    sub: 'Tap \'Add Quest\', pick a kid, type the task.\nOr choose from 53 ready-made templates!',
    insight: '🗂️ Use templates — categories include Home, Kitchen, Brain Power & more',
  },
  {
    id: 'kids_view',
    gradient: ['#14532D', '#16A34A'],
    title: 'Kids Get Their Own View 📱',
    sub: 'On the Home screen, tap your kid\'s photo to\nswitch to their view. No separate login needed!',
    insight: '🔒 Parent Zone is PIN-protected — kids can\'t sneak in',
  },
  {
    id: 'stars',
    gradient: ['#7F1D1D', '#DC2626'],
    title: 'Complete Quest → Earn Stars ⭐',
    sub: 'Kids tap \'DO IT!\' when done. You approve it.\nThey earn stars — and their reward!',
    insight: '🔥 Hard quests = 3 stars. Medium = 2. Easy = 1. Effort is rewarded!',
  },
  {
    id: 'streaks',
    gradient: ['#134E4A', '#0D9488'],
    title: 'Build Daily Streaks 🔥',
    sub: 'Complete quests every day to build a streak.\nThe 7-day calendar shows progress visually.',
    insight: '📱 You\'ll get a 6PM alert if a streak is at risk — never miss a day',
  },
  {
    id: 'store',
    gradient: ['#312E81', '#6D28D9'],
    title: 'Stars = Real Rewards 💰',
    sub: 'Set up your Star Store: 30 min screen time = 5 stars.\nKids request, you approve.',
    sub2: 'Or set Savings Goals: complete 10 quests → earn $5!',
    insight: '🎯 Set Milestones too — \'Earn 50 stars → Pizza Night!\'',
  },
  {
    id: 'done',
    gradient: ['#1E1B4B', '#6D28D9', '#DB2777'],
    title: 'You\'re All Set! 🚀',
    sub: 'Here\'s your first 3 steps:',
    checklist: [
      { icon: '✅', text: 'Add your first kid (tap Family tab)' },
      { icon: '✅', text: 'Create your first quest (tap Add Quest)' },
      { icon: '✅', text: 'Set up a Star Store reward (optional but fun!)' },
    ],
  },
];

// ─── Mini preview components ───────────────────────────────────────────────────

function PreviewWelcome() {
  return (
    <View style={p.card}>
      <View style={p.avatarRow}>
        {[
          { e: '👩', c: '#7C3AED' },
          { e: '🦊', c: '#F59E0B' },
          { e: '🐱', c: '#10B981' },
          { e: '🦁', c: '#EF4444' },
        ].map((a, i) => (
          <View key={i} style={[p.avatar, { backgroundColor: a.c }]}>
            <Text style={{ fontSize: 20 }}>{a.e}</Text>
          </View>
        ))}
      </View>
      <Text style={p.cardHeading}>Kindo</Text>
      <Text style={p.cardLabel}>Your family adventure starts here</Text>
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

function PreviewFamily() {
  const kids = [
    { e: '🦊', name: 'Lily', color: '#F59E0B' },
    { e: '🐱', name: 'Jake', color: '#10B981' },
  ];
  return (
    <View style={p.card}>
      <Text style={p.sectionLabel}>YOUR KIDS</Text>
      {kids.map((kid, i) => (
        <View key={i} style={p.profileRow}>
          <View style={[p.profileEmoji, { backgroundColor: kid.color + '33' }]}>
            <Text style={{ fontSize: 22 }}>{kid.e}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={p.profileName}>{kid.name}</Text>
            <Text style={p.profileSub}>0 quests · 0 stars</Text>
          </View>
          <View style={[p.colorDot, { backgroundColor: kid.color }]} />
        </View>
      ))}
      <View style={p.addKidBtn}>
        <Text style={p.addKidText}>➕  Add a Kid</Text>
      </View>
    </View>
  );
}

function PreviewQuests() {
  return (
    <View style={p.card}>
      <View style={p.questRow}>
        <View style={[p.questEmoji, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={{ fontSize: 24 }}>🧹</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={p.questTitle}>Clean Your Room</Text>
          <Text style={p.questMeta}>🎁 30 min screen time  ·  ⭐⭐ Medium</Text>
        </View>
      </View>
      <View style={p.divider} />
      <View style={p.questRow}>
        <View style={[p.questEmoji, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={{ fontSize: 24 }}>📚</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={p.questTitle}>Read for 20 Minutes</Text>
          <Text style={p.questMeta}>🎁 Extra dessert  ·  ⭐ Easy</Text>
        </View>
      </View>
      <View style={p.addQuestBtn}>
        <Text style={p.addQuestText}>⚡  Add Quest</Text>
      </View>
    </View>
  );
}

function PreviewKidsView() {
  return (
    <View style={p.card}>
      <Text style={p.sectionLabel}>WHO'S HERE?</Text>
      <View style={p.profileGrid}>
        <View style={p.gridItem}>
          <View style={[p.gridAvatar, { backgroundColor: '#7C3AED' }]}>
            <Text style={{ fontSize: 20 }}>👩</Text>
          </View>
          <View style={p.parentBadge}>
            <Text style={p.parentBadgeText}>PARENT</Text>
          </View>
        </View>
        <View style={p.gridItem}>
          <View style={[p.gridAvatar, { backgroundColor: '#F59E0B' }]}>
            <Text style={{ fontSize: 20 }}>🦊</Text>
          </View>
          <Text style={p.gridName}>Lily</Text>
        </View>
        <View style={p.gridItem}>
          <View style={[p.gridAvatar, { backgroundColor: '#10B981' }]}>
            <Text style={{ fontSize: 20 }}>🐱</Text>
          </View>
          <Text style={p.gridName}>Jake</Text>
        </View>
      </View>
      <View style={p.pinRow}>
        <Text style={p.pinIcon}>🔒</Text>
        <Text style={p.pinText}>Parent Zone · PIN protected</Text>
      </View>
    </View>
  );
}

function PreviewStars() {
  return (
    <View style={p.card}>
      {/* Quest card */}
      <View style={p.questRow}>
        <View style={[p.questEmoji, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={{ fontSize: 24 }}>🧹</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={p.questTitle}>Clean Your Room</Text>
          <Text style={p.questMeta}>🎁 30 min screen time</Text>
        </View>
      </View>
      {/* DO IT button */}
      <LinearGradient
        colors={['#FF8C00', '#FFE000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={p.doItBtn}
      >
        <Text style={p.doItText}>⚡  DO IT!</Text>
      </LinearGradient>
      {/* Approval flow */}
      <View style={p.flowRow}>
        <View style={p.flowStep}>
          <Text style={p.flowEmoji}>👧</Text>
          <Text style={p.flowLabel}>Kid taps</Text>
        </View>
        <Text style={p.flowArrow}>→</Text>
        <View style={p.flowStep}>
          <Text style={p.flowEmoji}>👩</Text>
          <Text style={p.flowLabel}>You approve</Text>
        </View>
        <Text style={p.flowArrow}>→</Text>
        <View style={p.flowStep}>
          <Text style={p.flowEmoji}>⭐</Text>
          <Text style={p.flowLabel}>Stars!</Text>
        </View>
      </View>
    </View>
  );
}

function PreviewStreaks() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const filled = [true, true, true, true, false, false, false];
  return (
    <View style={p.card}>
      <View style={p.streakHeader}>
        <Text style={p.streakFire}>🔥</Text>
        <Text style={p.streakNum}>4-Day Streak!</Text>
      </View>
      <View style={p.calendarRow}>
        {days.map((d, i) => (
          <View key={i} style={[p.calDot, filled[i] ? p.calDotOn : p.calDotOff]}>
            <Text style={[p.calLabel, { color: filled[i] ? '#fff' : 'rgba(255,255,255,0.4)' }]}>{d}</Text>
          </View>
        ))}
      </View>
      <View style={p.alertBox}>
        <Text style={p.alertText}>🔔  6PM reminder if streak is at risk</Text>
      </View>
    </View>
  );
}

function PreviewStore() {
  const items = [
    { e: '📱', label: '30 min screen time', cost: '5 ⭐' },
    { e: '🍦', label: 'Ice cream trip',     cost: '8 ⭐' },
  ];
  return (
    <View style={p.card}>
      <Text style={p.sectionLabel}>STAR STORE</Text>
      {items.map((item, i) => (
        <View key={i} style={p.storeRow}>
          <View style={p.storeEmoji}>
            <Text style={{ fontSize: 20 }}>{item.e}</Text>
          </View>
          <Text style={[p.questTitle, { flex: 1, marginLeft: 10 }]}>{item.label}</Text>
          <View style={p.costBadge}>
            <Text style={p.costText}>{item.cost}</Text>
          </View>
        </View>
      ))}
      <View style={p.divider} />
      <View style={p.savingsRow}>
        <Text style={p.savingsEmoji}>💰</Text>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={p.questTitle}>New Bike  →  $10 goal</Text>
          <View style={p.progressTrack}>
            <View style={[p.progressFill, { width: '60%', backgroundColor: '#10B981' }]} />
          </View>
          <Text style={p.cardLabel}>6 / 10 quests done</Text>
        </View>
      </View>
    </View>
  );
}

function PreviewDone({ checklist }) {
  return (
    <View style={p.card}>
      <Text style={p.doneHeading}>Your first 3 steps:</Text>
      {checklist.map((item, i) => (
        <View key={i} style={p.checkRow}>
          <View style={p.checkNumBadge}>
            <Text style={p.checkNum}>{i + 1}</Text>
          </View>
          <Text style={p.checkText}>
            {item.icon}  {item.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── Insight box ───────────────────────────────────────────────────────────────

function InsightBox({ text }) {
  return (
    <View style={styles.insightBox}>
      <Text style={styles.insightText}>{text}</Text>
    </View>
  );
}

// ─── Single slide ──────────────────────────────────────────────────────────────

function Slide({ slide, index, total, activeIdx, onSkip, onNext }) {
  const insets = useSafeAreaInsets();
  const isLast = index === total - 1;

  function renderPreview() {
    switch (slide.id) {
      case 'welcome':   return <PreviewWelcome />;
      case 'family':    return <PreviewFamily />;
      case 'quests':    return <PreviewQuests />;
      case 'kids_view': return <PreviewKidsView />;
      case 'stars':     return <PreviewStars />;
      case 'streaks':   return <PreviewStreaks />;
      case 'store':     return <PreviewStore />;
      case 'done':      return <PreviewDone checklist={slide.checklist} />;
      default:          return null;
    }
  }

  return (
    <LinearGradient
      colors={slide.gradient}
      style={[
        styles.slide,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
      ]}
    >
      {/* Top row: skip + counter */}
      <View style={styles.topRow}>
        {!isLast ? (
          <TouchableOpacity
            onPress={onSkip}
            style={styles.skipBtn}
            activeOpacity={0.75}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={styles.counter}>{index + 1} / {total}</Text>
      </View>

      {/* Scrollable content area */}
      <ScrollView
        style={{ flex: 1, width: '100%' }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Mini UI preview */}
        {renderPreview()}

        {/* Title */}
        <Text style={styles.title}>{slide.title}</Text>

        {/* Subtitle */}
        <Text style={styles.sub}>{slide.sub}</Text>

        {/* Optional second subtitle (store slide) */}
        {slide.sub2 ? (
          <Text style={[styles.sub, { marginTop: 8 }]}>{slide.sub2}</Text>
        ) : null}

        {/* Insight box */}
        {slide.insight ? <InsightBox text={slide.insight} /> : null}

        {/* Spacer so bottom controls don't overlap last content */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Progress dots */}
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
  const scrollRef = useRef(null);
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
            key={slide.id}
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
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    padding: 16,
    marginBottom: 20,
  },

  // Shared
  cardHeading: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 10,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },

  // Welcome
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Family / profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileEmoji: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  profileSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 8,
  },
  addKidBtn: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  addKidText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '700',
  },

  // Quests
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  questEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  questMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '500',
  },
  addQuestBtn: {
    marginTop: 4,
    backgroundColor: 'rgba(255,140,0,0.55)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  addQuestText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Kids view / home screen grid
  profileGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridItem: {
    alignItems: 'center',
    gap: 4,
  },
  gridAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  parentBadge: {
    backgroundColor: 'rgba(124,58,237,0.6)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  parentBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 7,
  },
  pinIcon: {
    fontSize: 14,
  },
  pinText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Stars / DO IT
  doItBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  doItText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  flowStep: {
    alignItems: 'center',
    gap: 3,
  },
  flowEmoji: {
    fontSize: 20,
  },
  flowLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '600',
  },
  flowArrow: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 2,
    marginBottom: 12,
  },

  // Streaks
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  streakFire: {
    fontSize: 28,
  },
  streakNum: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  calendarRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    marginBottom: 12,
  },
  calDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDotOn: {
    backgroundColor: '#EF4444',
  },
  calDotOff: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  calLabel: {
    fontSize: 10,
    fontWeight: '800',
  },
  alertBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  alertText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Store
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeEmoji: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  costBadge: {
    backgroundColor: 'rgba(109,40,217,0.5)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  costText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  savingsEmoji: {
    fontSize: 20,
    marginRight: 2,
    marginTop: 2,
  },

  // Done checklist
  doneHeading: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  checkNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkNum: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  checkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
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
    paddingHorizontal: 28,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  sub: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  insightBox: {
    marginTop: 14,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  insightText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
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
