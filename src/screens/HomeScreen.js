import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, shadows } from '../theme/index';
import {
  recordPinFailure,
  clearPinFailures,
  getPinLockoutStatus,
} from '../lib/security';

const { width } = Dimensions.get('window');

const NUM_COLS = width >= 390 ? 3 : 2;
const CARD_SIZE = (width - 48 - (NUM_COLS - 1) * 16) / NUM_COLS;
const AVATAR_SIZE = CARD_SIZE - 16;

// Key width: sheet has 28px padding each side, 3 keys, 10px gaps
const KEY_W = Math.floor((width - 56 - 20) / 3);
const KEY_H = 58;

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStarTitle(stars) {
  if (stars >= 30) return '✨ Legend';
  if (stars >= 15) return '💫 Hero';
  if (stars >= 5)  return '⭐ Collector';
  return '🌟 Rising Star';
}

// ─── Custom In-App Numpad ───────────────────────────────────────────────────────
function NumPad({ onPress, onBackspace, disabled = false }) {
  return (
    <View style={[styles.numpad, disabled && { opacity: 0.35 }]}>
      {NUMPAD_ROWS.map((row, ri) => (
        <View key={ri} style={styles.numpadRow}>
          {row.map((key, ki) => {
            if (key === '') {
              return <View key={ki} style={{ width: KEY_W, height: KEY_H }} />;
            }
            if (key === '⌫') {
              return (
                <TouchableOpacity
                  key={ki}
                  style={[styles.numpadKey, styles.numpadBackspaceKey]}
                  onPress={disabled ? undefined : onBackspace}
                  activeOpacity={disabled ? 1 : 0.6}
                  disabled={disabled}
                >
                  <Text style={styles.numpadBackspaceText}>⌫</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={ki}
                style={styles.numpadKey}
                onPress={disabled ? undefined : () => onPress(key)}
                activeOpacity={disabled ? 1 : 0.6}
                disabled={disabled}
              >
                <Text style={styles.numpadKeyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function formatLockoutTime(seconds) {
  if (seconds <= 0) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Kid Profile Card ───────────────────────────────────────────────────────────
function KidCard({ profile, onPress, stars }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.22, duration: 1600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function pressIn()  { Animated.spring(scaleAnim, { toValue: 0.90, friction: 10, tension: 300, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(scaleAnim, { toValue: 1,    friction: 5,  tension: 180, useNativeDriver: true }).start(); }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={styles.profileItem}>
        <Animated.View
          style={[
            styles.glowRing,
            {
              backgroundColor: profile.color + '38',
              width:  AVATAR_SIZE + 18,
              height: AVATAR_SIZE + 18,
              borderRadius: (AVATAR_SIZE + 18) / 2,
              transform: [{ scale: glowAnim }],
            },
          ]}
        />
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: profile.color,
              width:  AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              shadowColor: profile.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 14,
              elevation: 8,
            },
          ]}
        >
          <Text style={styles.avatarEmoji}>{profile.emoji}</Text>
        </View>
        <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
        <View style={styles.kidStatsRow}>
          <Text style={styles.kidStat}>⭐{stars}</Text>
          <Text style={styles.kidStatDot}>·</Text>
          <Text style={styles.kidStat}>{getStarTitle(stars)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Parent Profile Card ────────────────────────────────────────────────────────
function ParentCard({ profile, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function pressIn()  { Animated.spring(scaleAnim, { toValue: 0.92, friction: 10, tension: 300, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(scaleAnim, { toValue: 1,    friction: 5,  tension: 180, useNativeDriver: true }).start(); }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={styles.profileItem}>
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: colors.primary,
              width:  AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              ...shadows.md,
            },
          ]}
        >
          <Text style={styles.avatarEmoji}>{profile.emoji}</Text>
          <View style={styles.lockBadge}>
            <Text style={{ fontSize: 12 }}>🔐</Text>
          </View>
        </View>
        <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
        <View style={styles.parentPill}>
          <Text style={styles.parentPillText}>Parent</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Leaderboard Section ────────────────────────────────────────────────────────
function LeaderboardBanner({ kidStars }) {
  if (kidStars.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];
  const sorted = [...kidStars].sort((a, b) => b.stars - a.stars);

  return (
    <View style={styles.leaderboard}>
      <View style={styles.leaderboardHeader}>
        <Text style={styles.leaderboardTitle}>🏆 Star Leaderboard</Text>
      </View>
      <View style={styles.leaderboardRows}>
        {sorted.map((item, idx) => (
          <View key={item.id} style={styles.leaderboardRow}>
            <Text style={styles.leaderboardMedal}>
              {idx < 3 ? medals[idx] : `${idx + 1}`}
            </Text>
            <View style={[styles.leaderboardAvatar, { backgroundColor: item.color }]}>
              <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
            </View>
            <Text style={styles.leaderboardName}>{item.name}</Text>
            <View style={styles.leaderboardStarBadge}>
              <Text style={styles.leaderboardStarText}>⭐ {item.stars}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Weekly Summary Modal ───────────────────────────────────────────────────────
function WeeklySummaryModal({ visible, onClose, tasks, family }) {
  const slideAnim   = useRef(new Animated.Value(700)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim,   { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim,   { toValue: 700, duration: 230, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Date range: start of this week (Monday) → today
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Mon=1 ... Sun=7
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekStartMs = weekStart.getTime();

  const weekLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const todayLabel = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const completedThisWeek = tasks.filter(
    t => t.status === 'approved' && (t.approvedAt || t.approved_at) && (t.approvedAt || t.approved_at) >= weekStartMs
  );

  const kidStats = (family?.kids || []).map(kid => ({
    kid,
    weekStars: completedThisWeek.filter(t => (t.assignedTo || t.assigned_to) === kid.id).length,
    totalStars: tasks.filter(t => (t.assignedTo || t.assigned_to) === kid.id && t.status === 'approved').length,
    streak: kid.streak || 0,
  })).sort((a, b) => b.weekStars - a.weekStars);

  const totalThisWeek = completedThisWeek.length;
  const topKid = kidStats[0];

  function getEncouragement() {
    if (totalThisWeek === 0) return "No quests finished yet this week — time to get questing! 🚀";
    if (totalThisWeek < 3)   return "Good start! Keep building that momentum 💪";
    if (totalThisWeek < 7)   return "Nice work this week! The family is crushing it 🔥";
    return "INCREDIBLE week! Your family is on fire! 🏆🔥";
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={wStyles.root}>
        <Animated.View style={[wStyles.backdrop, { opacity: overlayAnim }]} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[wStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={wStyles.handle} />

          {/* Header gradient */}
          <LinearGradient
            colors={['#7C3AED', '#4F46E5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={wStyles.headerGrad}
          >
            <View>
              <Text style={wStyles.headerTitle}>📊 Weekly Report</Text>
              <Text style={wStyles.headerSub}>{weekLabel} – {todayLabel}</Text>
            </View>
            <View style={wStyles.totalBubble}>
              <Text style={wStyles.totalNum}>{totalThisWeek}</Text>
              <Text style={wStyles.totalLabel}>quests{'\n'}done</Text>
            </View>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={wStyles.body}
            showsVerticalScrollIndicator={false}
          >
            {/* Encouragement */}
            <View style={wStyles.encourageCard}>
              <Text style={wStyles.encourageText}>{getEncouragement()}</Text>
            </View>

            {/* Per-kid breakdown */}
            {kidStats.map((item, idx) => (
              <View key={item.kid.id} style={wStyles.kidRow}>
                {/* Rank + avatar */}
                <Text style={wStyles.kidRank}>
                  {idx === 0 && item.weekStars > 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </Text>
                <View style={[wStyles.kidAvatar, { backgroundColor: item.kid.color }]}>
                  <Text style={{ fontSize: 20 }}>{item.kid.emoji}</Text>
                </View>

                {/* Name + bar */}
                <View style={{ flex: 1 }}>
                  <View style={wStyles.kidNameRow}>
                    <Text style={wStyles.kidName}>{item.kid.name}</Text>
                    {item.streak >= 2 && (
                      <Text style={wStyles.streakPill}>🔥 {item.streak}d</Text>
                    )}
                  </View>
                  {/* Progress bar proportional to week leader */}
                  <View style={wStyles.barTrack}>
                    <View
                      style={[
                        wStyles.barFill,
                        {
                          backgroundColor: item.kid.color,
                          width: kidStats[0]?.weekStars > 0
                            ? `${Math.round((item.weekStars / kidStats[0].weekStars) * 100)}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Star counts */}
                <View style={wStyles.kidStarCol}>
                  <Text style={wStyles.kidWeekStars}>+{item.weekStars} ⭐</Text>
                  <Text style={wStyles.kidTotalStars}>{item.totalStars} total</Text>
                </View>
              </View>
            ))}

            {kidStats.length === 0 && (
              <Text style={wStyles.noKids}>Add kids to see their weekly progress!</Text>
            )}

            <TouchableOpacity style={wStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={wStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const wStyles = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '88%',
    ...shadows.lg,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 0,
  },
  headerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 20,
    borderRadius: 0,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.4 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginTop: 3 },
  totalBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  totalNum:   { fontSize: 32, fontWeight: '900', color: '#FFE000', lineHeight: 34 },
  totalLabel: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: '700', textAlign: 'center', marginTop: 2 },

  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, gap: 14 },

  encourageCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  encourageText: { fontSize: 15, fontWeight: '700', color: colors.primary, lineHeight: 22, textAlign: 'center' },

  kidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F9FF',
    borderRadius: 18,
    padding: 14,
  },
  kidRank:   { fontSize: 20, width: 28, textAlign: 'center' },
  kidAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  kidNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kidName:   { fontSize: 15, fontWeight: '800', color: colors.text1 },
  streakPill: {
    fontSize: 11, fontWeight: '700', color: '#E65100',
    backgroundColor: '#FFF3E0', borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  barTrack: { height: 8, backgroundColor: colors.divider, borderRadius: 100, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 100, minWidth: 4 },
  kidStarCol:      { alignItems: 'flex-end' },
  kidWeekStars:    { fontSize: 15, fontWeight: '900', color: '#F59E0B' },
  kidTotalStars:   { fontSize: 11, fontWeight: '600', color: colors.text3, marginTop: 2 },

  noKids: { textAlign: 'center', color: colors.text3, fontSize: 15, fontWeight: '500', paddingVertical: 24 },

  closeBtn: {
    backgroundColor: colors.divider,
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  closeBtnText: { color: colors.text2, fontSize: 15, fontWeight: '700' },
});

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { family, tasks, verifyPin, unlockParentZone } = useApp();
  const [showPin,      setShowPin]      = useState(false);
  const [showWeekly,   setShowWeekly]   = useState(false);
  const [pin,          setPin]          = useState('');
  const [pinError,     setPinError]     = useState(false);
  const [lockoutSecs,  setLockoutSecs]  = useState(0);
  const [pinAttempts,  setPinAttempts]  = useState(0);
  // Which digit index is currently visible as a number (not a dot)
  const [revealIdx,    setRevealIdx]    = useState(-1);
  const revealTimer   = useRef(null);
  const lockoutTimer  = useRef(null);

  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(600)).current;

  const lockoutActive = lockoutSecs > 0;

  // ─── Lockout countdown tick ───────────────────────────────────────────────
  useEffect(() => {
    if (lockoutSecs <= 0) {
      if (lockoutTimer.current) clearInterval(lockoutTimer.current);
      return;
    }
    lockoutTimer.current = setInterval(() => {
      setLockoutSecs(s => {
        if (s <= 1) {
          clearInterval(lockoutTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(lockoutTimer.current);
  }, [lockoutSecs > 0]);

  // Per-kid star counts
  const kidStarsMap = {};
  family.kids.forEach(kid => {
    const approved = tasks.filter(t => t.assignedTo === kid.id && t.status === 'approved').length;
    kidStarsMap[kid.id] = { stars: approved };
  });

  const kidStarsForLeaderboard = family.kids.map(kid => ({
    id: kid.id,
    name: kid.name,
    emoji: kid.emoji,
    color: kid.color,
    stars: tasks.filter(t => t.assignedTo === kid.id && t.status === 'approved').length,
  }));

  const allProfiles = [
    { id: 'parent', name: family.parentName, emoji: family.parentEmoji, type: 'parent' },
    ...family.kids.map(k => ({ ...k, type: 'kid' })),
  ];

  const entryAnims = useRef(
    allProfiles.map(() => ({ opacity: new Animated.Value(0), y: new Animated.Value(28) }))
  ).current;

  useEffect(() => {
    Animated.stagger(
      70,
      entryAnims.map(a =>
        Animated.parallel([
          Animated.timing(a.opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.spring(a.y, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }),
        ])
      )
    ).start();
  }, []);

  // ─── PIN sheet ───────────────────────────────────────────────────────────────
  async function openPin() {
    // Always check current lockout state when opening
    const status = await getPinLockoutStatus();
    if (status.locked) {
      setLockoutSecs(status.secondsLeft);
      setPinAttempts(status.attempts);
    } else {
      setLockoutSecs(0);
      setPinAttempts(status.attempts);
    }
    setPin('');
    setPinError(false);
    setRevealIdx(-1);
    setShowPin(true);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheetAnim,   { toValue: 0, friction: 8,   tension: 90,  useNativeDriver: true }),
    ]).start();
  }

  function closePin() {
    if (revealTimer.current) clearTimeout(revealTimer.current);
    if (lockoutTimer.current) clearInterval(lockoutTimer.current);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetAnim,   { toValue: 600, duration: 230, useNativeDriver: true }),
    ]).start(() => {
      setShowPin(false);
      setPin('');
      setPinError(false);
      setRevealIdx(-1);
    });
  }

  function shakeAndClear() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  13, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -13, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 50, useNativeDriver: true }),
    ]).start(() => setPin(''));
  }

  async function handleNumPress(digit) {
    if (pin.length >= 4 || lockoutActive) return;
    const idx    = pin.length;
    const newPin = pin + digit;

    setPin(newPin);
    setPinError(false);

    // Show the digit for 600 ms, then replace with a dot
    setRevealIdx(idx);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    revealTimer.current = setTimeout(() => setRevealIdx(-1), 600);

    if (newPin.length === 4) {
      clearTimeout(revealTimer.current);
      setRevealIdx(-1);

      const ok = await verifyPin(newPin);
      if (ok) {
        await clearPinFailures();
        await unlockParentZone();   // start the 30-min session timer
        setPinAttempts(0);
        setLockoutSecs(0);
        closePin();
        setTimeout(() => navigation.navigate('Parent'), 280);
      } else {
        const lockStatus = await recordPinFailure();
        setPinAttempts(lockStatus.attempts);
        if (lockStatus.locked) {
          setLockoutSecs(lockStatus.secondsLeft);
          setPin('');
          setPinError(false);
        } else {
          setPinError(true);
          shakeAndClear();
        }
      }
    }
  }

  function handleBackspace() {
    if (lockoutActive) return;
    if (revealTimer.current) clearTimeout(revealTimer.current);
    setRevealIdx(-1);
    setPin(p => p.slice(0, -1));
    setPinError(false);
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <SafeAreaView style={{ backgroundColor: colors.bg }}>
        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>Kindo 🌟</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{getGreeting()}! 👋</Text>
        <Text style={styles.whoTitle}>Who's here?</Text>
        <View style={styles.familySubRow}>
          <Text style={styles.familySub}>{family.parentName}'s Family</Text>
          <TouchableOpacity
            style={styles.weeklyBtn}
            onPress={() => setShowWeekly(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.weeklyBtnText}>📊 This Week</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileGrid}>
          {allProfiles.map((profile, i) => {
            const isParent = profile.type === 'parent';
            const ea       = entryAnims[i] || { opacity: new Animated.Value(1), y: new Animated.Value(0) };
            const stats    = kidStarsMap[profile.id] || { stars: 0 };

            return (
              <Animated.View
                key={profile.id}
                style={{ opacity: ea.opacity, transform: [{ translateY: ea.y }] }}
              >
                {isParent ? (
                  <ParentCard profile={profile} onPress={openPin} />
                ) : (
                  <KidCard
                    profile={profile}
                    stars={stats.stars}
                    onPress={() => navigation.navigate('Kid', { kidId: profile.id })}
                  />
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* ── Leaderboard ─────────────────────────────────────────────────── */}
        {family.kids.length >= 2 && (
          <LeaderboardBanner kidStars={kidStarsForLeaderboard} />
        )}
      </ScrollView>

      {/* ─── Weekly Summary Modal ─────────────────────────────────────────────── */}
      <WeeklySummaryModal
        visible={showWeekly}
        onClose={() => setShowWeekly(false)}
        tasks={tasks}
        family={family}
      />

      {/* ─── PIN Bottom Sheet ─────────────────────────────────────────────────── */}
      <Modal visible={showPin} transparent animationType="none" onRequestClose={closePin}>
        <View style={styles.modalRoot}>
          <Animated.View
            style={[styles.modalBackdrop, { opacity: overlayAnim }]}
            pointerEvents="box-none"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closePin} />
          </Animated.View>

          <Animated.View style={[styles.pinSheet, { transform: [{ translateY: sheetAnim }] }]}>
            <View style={styles.sheetHandle} />

            {/* Avatar */}
            <View style={[styles.pinSheetAvatar, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: 36 }}>{family.parentEmoji}</Text>
            </View>

            <Text style={styles.pinSheetTitle}>Parent Zone</Text>
            <Text style={styles.pinSheetSub}>
              {lockoutActive ? '🔒 Too many attempts' : 'Enter your 4-digit PIN'}
            </Text>

            {/* Lockout banner */}
            {lockoutActive && (
              <View style={styles.lockoutBanner}>
                <Text style={styles.lockoutEmoji}>⏳</Text>
                <View>
                  <Text style={styles.lockoutTitle}>Try again in</Text>
                  <Text style={styles.lockoutTimer}>{formatLockoutTime(lockoutSecs)}</Text>
                </View>
              </View>
            )}

            {/* PIN boxes */}
            {!lockoutActive && (
              <>
                <Animated.View style={[styles.pinBoxRow, { transform: [{ translateX: shakeAnim }] }]}>
                  {[0, 1, 2, 3].map(idx => (
                    <View
                      key={idx}
                      style={[
                        styles.pinBox,
                        pin.length > idx  && styles.pinBoxFilled,
                        pin.length === idx && !pinError && styles.pinBoxCurrent,
                        pinError && styles.pinBoxError,
                      ]}
                    >
                      {pin.length > idx && revealIdx === idx ? (
                        /* Show the actual digit for 600ms */
                        <Text style={[styles.pinDigitText, pinError && styles.pinDigitError]}>
                          {pin[idx]}
                        </Text>
                      ) : pin.length > idx ? (
                        /* Show a dot */
                        <View style={[styles.pinDot, pinError && styles.pinDotError]} />
                      ) : null}
                    </View>
                  ))}
                </Animated.View>

                {pinError && (
                  <Text style={styles.pinErrorText}>
                    Incorrect PIN — {pinAttempts >= 9 ? 'last chance before 30-min lockout' :
                      pinAttempts >= 4 ? 'next failure locks for 5 min' : 'try again'}
                  </Text>
                )}
              </>
            )}

            {/* ── Custom Numpad ── */}
            <NumPad
              onPress={handleNumPress}
              onBackspace={handleBackspace}
              disabled={lockoutActive}
            />

            <TouchableOpacity style={styles.cancelBtn} onPress={closePin}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: Platform.OS === 'ios' ? 16 : 8 }} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  appBar: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 24,
  },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text1,
    letterSpacing: -0.3,
  },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 60,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text3,
    textAlign: 'center',
    marginBottom: 4,
  },
  whoTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text1,
    textAlign: 'center',
    letterSpacing: -0.6,
  },
  familySubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 36,
  },
  familySub: {
    fontSize: 15,
    color: colors.text3,
    fontWeight: '500',
  },
  weeklyBtn: {
    backgroundColor: colors.primaryLight,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  weeklyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },

  // ─── Profile grid
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 32,
  },
  profileItem: {
    width: CARD_SIZE,
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: -1,
  },
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarEmoji:  { fontSize: AVATAR_SIZE * 0.42 },
  lockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    ...shadows.sm,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text1,
    textAlign: 'center',
    marginBottom: 5,
  },
  kidStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  kidStat:    { fontSize: 11, fontWeight: '800', color: '#475569' },
  kidStatDot: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' },
  parentPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  parentPillText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // ─── Leaderboard
  leaderboard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  leaderboardHeader: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  leaderboardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#5D4037',
    letterSpacing: -0.2,
  },
  leaderboardRows: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leaderboardMedal: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  leaderboardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaderboardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text1,
  },
  leaderboardStarBadge: {
    backgroundColor: '#FFF8E1',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  leaderboardStarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F59E0B',
  },

  // ─── PIN Modal
  modalRoot:    { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  pinSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 20,
  },
  pinSheetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinSheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  pinSheetSub: {
    fontSize: 14,
    color: colors.text3,
    fontWeight: '500',
    marginBottom: 22,
    textAlign: 'center',
  },
  pinBoxRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  pinBox: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinBoxCurrent: { borderColor: colors.primary, borderWidth: 2.5 },
  pinBoxFilled:  { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pinBoxError:   { borderColor: colors.error,   backgroundColor: colors.errorLight },
  pinDot:        { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary },
  pinDotError:   { backgroundColor: colors.error },
  pinDigitText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
  },
  pinDigitError: { color: colors.error },
  pinErrorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 16,
  },

  lockoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FFB74D',
    width: '100%',
  },
  lockoutEmoji: { fontSize: 32 },
  lockoutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E65100',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lockoutTimer: {
    fontSize: 36,
    fontWeight: '900',
    color: '#BF360C',
    letterSpacing: -1,
    lineHeight: 40,
  },

  // ─── Custom Numpad
  numpad: {
    width: '100%',
    marginTop: 12,
    gap: 10,
  },
  numpadRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  numpadKey: {
    width: KEY_W,
    height: KEY_H,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  numpadKeyText: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.text1,
  },
  numpadBackspaceKey: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  numpadBackspaceText: {
    fontSize: 22,
    color: '#DC2626',
    fontWeight: '600',
  },

  cancelBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 48,
    borderRadius: 100,
  },
  cancelBtnText: {
    color: colors.text3,
    fontSize: 16,
    fontWeight: '600',
  },
});
