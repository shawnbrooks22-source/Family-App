import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  StatusBar,
  Platform,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { shadows } from '../theme/index';
import {
  recordPinFailure,
  clearPinFailures,
  getPinLockoutStatus,
} from '../lib/security';
import useDevice from '../hooks/useDevice';

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

function getStarTitle(stars) {
  if (stars >= 30) return '✨ Legend';
  if (stars >= 15) return '💫 Hero';
  if (stars >= 5)  return '⭐ Collector';
  return '🌟 Rising Star';
}

// ─── Custom In-App Numpad ───────────────────────────────────────────────────────
function NumPad({ onPress, onBackspace, disabled = false, colors }) {
  const numpadStyles = StyleSheet.create({
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
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
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
  });

  return (
    <View style={[numpadStyles.numpad, disabled && { opacity: 0.35 }]}>
      {NUMPAD_ROWS.map((row, ri) => (
        <View key={ri} style={numpadStyles.numpadRow}>
          {row.map((key, ki) => {
            if (key === '') {
              return <View key={ki} style={{ width: KEY_W, height: KEY_H }} />;
            }
            if (key === '⌫') {
              return (
                <TouchableOpacity
                  key={ki}
                  style={[numpadStyles.numpadKey, numpadStyles.numpadBackspaceKey]}
                  onPress={disabled ? undefined : onBackspace}
                  activeOpacity={disabled ? 1 : 0.6}
                  disabled={disabled}
                >
                  <Text style={numpadStyles.numpadBackspaceText}>⌫</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={ki}
                style={numpadStyles.numpadKey}
                onPress={disabled ? undefined : () => onPress(key)}
                activeOpacity={disabled ? 1 : 0.6}
                disabled={disabled}
              >
                <Text style={numpadStyles.numpadKeyText}>{key}</Text>
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
function KidCard({ profile, onPress, stars, colors }) {
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

  const kidCardStyles = StyleSheet.create({
    profileItem: { width: CARD_SIZE, alignItems: 'center' },
    avatarCircle: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarEmoji: { fontSize: AVATAR_SIZE * 0.42 },
    profileName: {
      fontSize: 16, fontWeight: '700', color: colors.text1,
      textAlign: 'center', marginBottom: 5,
    },
    kidStatsRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4, gap: 4,
      borderWidth: 1, borderColor: colors.border,
    },
    kidStat: { fontSize: 11, fontWeight: '800', color: colors.text2 },
    kidStatDot: { fontSize: 11, color: colors.text3, fontWeight: '600' },
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={kidCardStyles.profileItem}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -1,
              backgroundColor: profile.color + '38',
              width:  AVATAR_SIZE + 18,
              height: AVATAR_SIZE + 18,
              borderRadius: (AVATAR_SIZE + 18) / 2,
              transform: [{ scale: glowAnim }],
            },
          ]}
        />
        <LinearGradient
          colors={[profile.color, profile.color + 'AA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            kidCardStyles.avatarCircle,
            {
              width:  AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              shadowColor: profile.color,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.55,
              shadowRadius: 16,
              elevation: 10,
            },
          ]}
        >
          <Text style={kidCardStyles.avatarEmoji}>{profile.emoji}</Text>
        </LinearGradient>
        <Text style={kidCardStyles.profileName} numberOfLines={1}>{profile.name}</Text>
        <View style={kidCardStyles.kidStatsRow}>
          <Text style={kidCardStyles.kidStat}>⭐{stars}</Text>
          <Text style={kidCardStyles.kidStatDot}>·</Text>
          <Text style={kidCardStyles.kidStat}>{getStarTitle(stars)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Parent Profile Card ────────────────────────────────────────────────────────
function ParentCard({ profile, onPress, colors, t }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function pressIn()  { Animated.spring(scaleAnim, { toValue: 0.92, friction: 10, tension: 300, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(scaleAnim, { toValue: 1,    friction: 5,  tension: 180, useNativeDriver: true }).start(); }

  const parentCardStyles = StyleSheet.create({
    profileItem: { width: CARD_SIZE, alignItems: 'center' },
    avatarCircle: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarEmoji: { fontSize: AVATAR_SIZE * 0.42 },
    lockBadge: {
      position: 'absolute', bottom: 4, right: 4,
      backgroundColor: '#fff', borderRadius: 14, padding: 4,
      ...shadows.sm,
    },
    profileName: {
      fontSize: 16, fontWeight: '700', color: colors.text1,
      textAlign: 'center', marginBottom: 5,
    },
    parentPill: {
      backgroundColor: colors.primaryLight,
      borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3,
    },
    parentPillText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={parentCardStyles.profileItem}>
        <View
          style={[
            parentCardStyles.avatarCircle,
            {
              backgroundColor: colors.primary,
              width:  AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: AVATAR_SIZE / 2,
              ...shadows.md,
            },
          ]}
        >
          <Text style={parentCardStyles.avatarEmoji}>{profile.emoji}</Text>
          <View style={parentCardStyles.lockBadge}>
            <Text style={{ fontSize: 12 }}>🔐</Text>
          </View>
        </View>
        <Text style={parentCardStyles.profileName} numberOfLines={1}>{profile.name}</Text>
        <View style={parentCardStyles.parentPill}>
          <Text style={parentCardStyles.parentPillText}>{t('home.parent')}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Leaderboard Section ────────────────────────────────────────────────────────
function LeaderboardBanner({ kidStars, colors, t }) {
  if (kidStars.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉'];
  const sorted = [...kidStars].sort((a, b) => b.stars - a.stars);

  const leaderboardStyles = StyleSheet.create({
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
      fontSize: 17, fontWeight: '900', color: '#5D4037', letterSpacing: -0.2,
    },
    leaderboardRows: {
      paddingHorizontal: 16, paddingVertical: 12, gap: 12,
    },
    leaderboardRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    leaderboardMedal: { fontSize: 20, width: 28, textAlign: 'center' },
    leaderboardAvatar: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    leaderboardName: {
      flex: 1, fontSize: 15, fontWeight: '700', color: colors.text1,
    },
    leaderboardStarBadge: {
      backgroundColor: '#FFF8E1', borderRadius: 100,
      paddingHorizontal: 12, paddingVertical: 5,
      borderWidth: 1, borderColor: '#FFE082',
    },
    leaderboardStarText: { fontSize: 13, fontWeight: '800', color: '#F59E0B' },
  });

  return (
    <View style={leaderboardStyles.leaderboard}>
      <View style={leaderboardStyles.leaderboardHeader}>
        <Text style={leaderboardStyles.leaderboardTitle}>{t('home.starLeaderboard')}</Text>
      </View>
      <View style={leaderboardStyles.leaderboardRows}>
        {sorted.map((item, idx) => (
          <View key={item.id} style={leaderboardStyles.leaderboardRow}>
            <Text style={leaderboardStyles.leaderboardMedal}>
              {idx < 3 ? medals[idx] : `${idx + 1}`}
            </Text>
            <View style={[leaderboardStyles.leaderboardAvatar, { backgroundColor: item.color }]}>
              <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
            </View>
            <Text style={leaderboardStyles.leaderboardName}>{item.name}</Text>
            <View style={leaderboardStyles.leaderboardStarBadge}>
              <Text style={leaderboardStyles.leaderboardStarText}>⭐ {item.stars}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Analytics Summary Modal ────────────────────────────────────────────────────
function WeeklySummaryModal({ visible, onClose, tasks, family, colors, t }) {
  const slideAnim   = useRef(new Animated.Value(700)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [view, setView] = useState('week'); // 'week' | 'month' | 'alltime'

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

  // Month start
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartMs = monthStart.getTime();

  const weekLabel  = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const todayLabel = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const monthLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const approvedTasks = tasks.filter(tk => tk.status === 'approved');

  const completedThisWeek = approvedTasks.filter(
    tk => (tk.approvedAt || tk.approved_at) && (tk.approvedAt || tk.approved_at) >= weekStartMs
  );
  const completedThisMonth = approvedTasks.filter(
    tk => (tk.approvedAt || tk.approved_at) && (tk.approvedAt || tk.approved_at) >= monthStartMs
  );

  function getSlicedTasks() {
    if (view === 'week')    return completedThisWeek;
    if (view === 'month')   return completedThisMonth;
    return approvedTasks;
  }

  const slicedTasks = getSlicedTasks();

  const kidStats = (family?.kids || []).map(kid => ({
    kid,
    slicedStars: slicedTasks.filter(tk => (tk.assignedTo || tk.assigned_to) === kid.id).length,
    weekStars:   completedThisWeek.filter(tk => (tk.assignedTo || tk.assigned_to) === kid.id).length,
    totalStars:  approvedTasks.filter(tk => (tk.assignedTo || tk.assigned_to) === kid.id).length,
    streak: kid.streak || 0,
  })).sort((a, b) => b.slicedStars - a.slicedStars);

  const totalThisWeek = completedThisWeek.length;
  const totalSliced   = slicedTasks.length;

  function getEncouragement() {
    if (view === 'alltime') {
      const grand = approvedTasks.length;
      if (grand === 0) return t('home.encourageNoneAllTime');
      if (grand < 10)  return t('home.encourageStartAllTime');
      if (grand < 30)  return t('home.encourageProgressAllTime');
      return t('home.encourageLegendAllTime');
    }
    if (totalThisWeek === 0) return t('home.encourageNoneWeek');
    if (totalThisWeek < 3)   return t('home.encourageStartWeek');
    if (totalThisWeek < 7)   return t('home.encourageGoodWeek');
    return t('home.encourageIncredibleWeek');
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
      backgroundColor: colors.border,
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
    tabRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 100,
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    tabBtnActive: {
      backgroundColor: colors.primaryLight,
    },
    tabBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text3,
    },
    tabBtnTextActive: {
      color: colors.primary,
    },
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
      backgroundColor: colors.bg,
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
              <Text style={wStyles.headerTitle}>📊 {t('home.familyStats')}</Text>
              <Text style={wStyles.headerSub}>
                {view === 'week'    ? `${weekLabel} – ${todayLabel}`  :
                 view === 'month'   ? monthLabel :
                 t('home.allTime')}
              </Text>
            </View>
            <View style={wStyles.totalBubble}>
              <Text style={wStyles.totalNum}>{totalSliced}</Text>
              <Text style={wStyles.totalLabel}>{t('home.questsDone')}</Text>
            </View>
          </LinearGradient>

          {/* ─── Tab switcher */}
          <View style={wStyles.tabRow}>
            {[
              { key: 'week',    label: t('home.thisWeek') },
              { key: 'month',   label: t('home.thisMonth') },
              { key: 'alltime', label: t('home.allTime') },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[wStyles.tabBtn, view === tab.key && wStyles.tabBtnActive]}
                onPress={() => setView(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[wStyles.tabBtnText, view === tab.key && wStyles.tabBtnTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
                  {idx === 0 && item.slicedStars > 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
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
                  {/* Progress bar proportional to leader */}
                  <View style={wStyles.barTrack}>
                    <View
                      style={[
                        wStyles.barFill,
                        {
                          backgroundColor: item.kid.color,
                          width: kidStats[0]?.slicedStars > 0
                            ? `${Math.round((item.slicedStars / kidStats[0].slicedStars) * 100)}%`
                            : '0%',
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Star counts */}
                <View style={wStyles.kidStarCol}>
                  <Text style={wStyles.kidWeekStars}>+{item.slicedStars} ⭐</Text>
                  <Text style={wStyles.kidTotalStars}>{item.totalStars} {t('home.total')}</Text>
                </View>
              </View>
            ))}

            {kidStats.length === 0 && (
              <Text style={wStyles.noKids}>{t('home.addKidsProgress')}</Text>
            )}

            <TouchableOpacity style={wStyles.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={wStyles.closeBtnText}>{t('home.close')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { family, tasks, verifyPin, unlockParentZone, updateParentProfile, isCloudEnabled } = useApp();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { isTablet, width, fs, pad, modalWidth } = useDevice();

  // Responsive grid: 2 cols on small phones, 3 on phones, 5 on tablets
  const NUM_COLS   = isTablet ? 5 : (width >= 390 ? 3 : 2);
  const CARD_SIZE  = (width - pad * 2 - (NUM_COLS - 1) * 16) / NUM_COLS;
  const AVATAR_SIZE = CARD_SIZE - 16;
  // Numpad key width — scoped inside sheet (maxWidth 520 on tablet)
  const sheetInner = isTablet ? Math.min(520, width * 0.72) : width;
  const KEY_W = Math.floor((sheetInner - 56 - 20) / 3);
  const KEY_H = isTablet ? 68 : 58;
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

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType,      setBiometricType]      = useState(null); // 'face' | 'fingerprint' | null

  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled   = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          setBiometricAvailable(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
          setBiometricType(hasFace ? 'face' : 'fingerprint');
        }
      } catch { /* silently ignore on simulators/emulators */ }
    })();
  }, []);

  async function tryBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:    'Unlock Parent Zone',
        fallbackLabel:    'Use PIN',
        cancelLabel:      'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        await unlockParentZone();
        closePin();
        setTimeout(() => navigation.navigate('Parent'), 280);
      }
    } catch {
      // Biometric not available — user falls back to PIN
    }
  }

  // PIN Recovery
  const [showRecovery,    setShowRecovery]    = useState(false);
  const [recoveryStep,    setRecoveryStep]    = useState('verify'); // 'verify' | 'newpin' | 'confirm'
  const [recoveryCode,    setRecoveryCode]    = useState('');
  const [recoveryNewPin,  setRecoveryNewPin]  = useState('');
  const [recoveryConfirm, setRecoveryConfirm] = useState('');
  const [recoveryError,   setRecoveryError]   = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

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
  }, [lockoutSecs]);

  // Per-kid star counts — normalize both field naming conventions
  // (Supabase returns assigned_to; local mode uses assignedTo)
  function taskBelongsToKid(task, kidId) {
    return (task.assignedTo === kidId || task.assigned_to === kidId);
  }

  const kidStarsMap = {};
  family.kids.forEach(kid => {
    const approved = tasks.filter(tk => taskBelongsToKid(tk, kid.id) && tk.status === 'approved').length;
    kidStarsMap[kid.id] = { stars: approved };
  });

  const kidStarsForLeaderboard = family.kids.map(kid => ({
    id: kid.id,
    name: kid.name,
    emoji: kid.emoji,
    color: kid.color,
    stars: tasks.filter(tk => taskBelongsToKid(tk, kid.id) && tk.status === 'approved').length,
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

  // ─── PIN Recovery ─────────────────────────────────────────────────────────────
  function openRecovery() {
    setRecoveryStep('verify');
    setRecoveryCode('');
    setRecoveryNewPin('');
    setRecoveryConfirm('');
    setRecoveryError('');
    setShowRecovery(true);
  }

  async function handleRecoveryVerify() {
    const code = recoveryCode.trim().toUpperCase();
    if (!code) { setRecoveryError(t('home.enterInviteCode')); return; }
    // Verify invite code matches the family's stored code
    if (family?.inviteCode && code !== family.inviteCode) {
      setRecoveryError(t('home.inviteCodeMismatch'));
      return;
    }
    if (!family?.inviteCode && !isCloudEnabled) {
      // Local-only mode has no invite code — allow any non-empty entry as verification
      // (best we can do without a server)
    }
    setRecoveryError('');
    setRecoveryStep('newpin');
  }

  async function handleRecoverySetPin() {
    if (recoveryLoading) return;
    if (!/^\d{4}$/.test(recoveryNewPin)) {
      setRecoveryError(t('home.pinMustBe4'));
      return;
    }
    if (recoveryNewPin !== recoveryConfirm) {
      setRecoveryError(t('home.pinsDontMatch'));
      return;
    }
    setRecoveryLoading(true);
    try {
      await updateParentProfile({ parentPin: recoveryNewPin });
      await clearPinFailures();
      setShowRecovery(false);
      setLockoutSecs(0);
      setPinAttempts(0);
      Alert.alert(t('home.pinReset'), t('home.pinUpdated'));
    } finally {
      setRecoveryLoading(false);
    }
  }

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

  const styles = StyleSheet.create({
    container: { flex: 1 },

    appBar: {
      alignItems: 'center',
      paddingTop: 14,
      paddingBottom: 4,
      paddingHorizontal: pad,
    },
    appBarTitle: {
      fontSize: fs(20, 24),
      fontWeight: '800',
      color: colors.text1,
      letterSpacing: -0.3,
    },

    scrollContent: {
      paddingHorizontal: pad,
      paddingTop: isTablet ? 40 : 28,
      paddingBottom: 60,
      alignItems: isTablet ? 'center' : undefined,
    },
    scrollInner: {
      width: '100%',
      maxWidth: isTablet ? 900 : undefined,
    },
    greeting: {
      fontSize: fs(15, 18),
      fontWeight: '600',
      color: colors.text3,
      textAlign: 'center',
      marginBottom: 4,
    },
    whoTitle: {
      fontSize: fs(34, 42),
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

    // ─── PIN Modal
    modalRoot: {
      flex: 1,
      justifyContent: isTablet ? 'center' : 'flex-end',
      alignItems: isTablet ? 'center' : undefined,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15,23,42,0.55)',
    },
    pinSheet: {
      backgroundColor: colors.surface,
      borderRadius: isTablet ? 32 : undefined,
      borderTopLeftRadius: isTablet ? 32 : 32,
      borderTopRightRadius: isTablet ? 32 : 32,
      paddingHorizontal: 28,
      paddingTop: 14,
      paddingBottom: isTablet ? 28 : 12,
      alignItems: 'center',
      width: modalWidth,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: isTablet ? 8 : -8 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 20,
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
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
      fontSize: fs(24, 28),
      fontWeight: '800',
      color: colors.text1,
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    pinSheetSub: {
      fontSize: fs(14, 16),
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
      backgroundColor: colors.bg,
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

    forgotPinText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#E65100',
      textDecorationLine: 'underline',
    },

    // ─── Recovery modal
    recoverySheet: {
      backgroundColor: colors.surface,
      borderRadius: isTablet ? 32 : undefined,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 28,
      paddingTop: 14,
      paddingBottom: isTablet ? 28 : 12,
      alignItems: 'center',
      width: modalWidth,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: isTablet ? 8 : -8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 20,
    },
    recoveryTitle: {
      fontSize: fs(24, 28),
      fontWeight: '800',
      color: colors.text1,
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    recoverySub: {
      fontSize: fs(14, 16),
      color: colors.text3,
      fontWeight: '500',
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 20,
    },
    recoveryError: {
      backgroundColor: colors.errorLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 14,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.error + '40',
    },
    recoveryErrorText: {
      color: colors.error,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
    recoveryInput: {
      width: '100%',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      fontSize: 16,
      color: colors.text1,
      backgroundColor: colors.bg,
      textAlign: 'center',
      letterSpacing: 2,
    },
    recoveryBtn: {
      backgroundColor: colors.primary,
      borderRadius: 100,
      paddingVertical: 16,
      paddingHorizontal: 48,
      marginTop: 18,
      width: '100%',
      alignItems: 'center',
    },
    recoveryBtnText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '800',
    },
  });

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <LinearGradient
      colors={isDark ? ['#0F0A1E', '#0D1B3E', '#1A0F35'] : ['#B8DEFF', '#FFF9D4', '#FFD6F5']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

      <SafeAreaView style={{ backgroundColor: 'transparent' }}>
        <View style={styles.appBar}>
          <Text style={styles.appBarTitle}>Kindo 🌟</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.scrollInner}>
        <Text style={styles.greeting}>{t('home.greeting')} 👋</Text>
        <Text style={styles.whoTitle}>{t('home.whoIsHere')}</Text>
        <View style={styles.familySubRow}>
          <Text style={styles.familySub}>{family.parentName}'s {t('home.family')}</Text>
          <TouchableOpacity
            style={styles.weeklyBtn}
            onPress={() => setShowWeekly(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.weeklyBtnText}>📊 {t('home.thisWeek')}</Text>
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
                  <ParentCard profile={profile} onPress={openPin} colors={colors} t={t} />
                ) : (
                  <KidCard
                    profile={profile}
                    stars={stats.stars}
                    onPress={() => navigation.navigate('Kid', { kidId: profile.id })}
                    colors={colors}
                  />
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* ── Leaderboard ─────────────────────────────────────────────────── */}
        {family.kids.length >= 2 && (
          <LeaderboardBanner kidStars={kidStarsForLeaderboard} colors={colors} t={t} />
        )}
        </View>
      </ScrollView>

      {/* ─── Weekly Summary Modal ─────────────────────────────────────────────── */}
      <WeeklySummaryModal
        visible={showWeekly}
        onClose={() => setShowWeekly(false)}
        tasks={tasks}
        family={family}
        colors={colors}
        t={t}
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

            <Text style={styles.pinSheetTitle}>{t('home.parentZone')}</Text>
            <Text style={styles.pinSheetSub}>
              {lockoutActive ? t('home.tooManyAttempts') : t('home.enter4DigitPin')}
            </Text>

            {/* Lockout banner */}
            {lockoutActive && (
              <View style={styles.lockoutBanner}>
                <Text style={styles.lockoutEmoji}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockoutTitle}>{t('home.tryAgainIn')}</Text>
                  <Text style={styles.lockoutTimer}>{formatLockoutTime(lockoutSecs)}</Text>
                  <TouchableOpacity onPress={openRecovery} style={{ marginTop: 8 }}>
                    <Text style={styles.forgotPinText}>{t('home.forgotPin')}</Text>
                  </TouchableOpacity>
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
                    {pinAttempts >= 9 ? t('home.pinErrorLastChance') :
                     pinAttempts >= 4 ? t('home.pinErrorNextLockout') :
                     t('home.pinErrorTryAgain')}
                  </Text>
                )}
              </>
            )}

            {/* ── Custom Numpad ── */}
            <NumPad
              onPress={handleNumPress}
              onBackspace={handleBackspace}
              disabled={lockoutActive}
              colors={colors}
            />

            {/* ── Biometric button ── */}
            {biometricAvailable && !lockoutActive && (
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.primaryLight, marginTop: 4 }]}
                onPress={tryBiometric}
              >
                <Text style={[styles.cancelBtnText, { color: colors.primary, fontWeight: '700' }]}>
                  {biometricType === 'face' ? '🔬 Use Face ID' : '👆 Use Touch ID'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={closePin}>
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>

            <View style={{ height: Platform.OS === 'ios' ? 16 : 8 }} />
          </Animated.View>
        </View>
      </Modal>

      {/* ─── PIN Recovery Modal ───────────────────────────────────────────────── */}
      <Modal visible={showRecovery} transparent animationType="slide" onRequestClose={() => setShowRecovery(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowRecovery(false)} />
          <View style={styles.recoverySheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.recoveryTitle}>🔑 {t('home.resetPin')}</Text>
            <Text style={styles.recoverySub}>
              {recoveryStep === 'verify'
                ? t('home.recoveryVerifySub')
                : t('home.recoveryNewPinSub')}
            </Text>

            {!!recoveryError && (
              <View style={styles.recoveryError}>
                <Text style={styles.recoveryErrorText}>{recoveryError}</Text>
              </View>
            )}

            {recoveryStep === 'verify' ? (
              <>
                <TextInput
                  style={styles.recoveryInput}
                  value={recoveryCode}
                  onChangeText={v => setRecoveryCode(v.toUpperCase())}
                  placeholder="KINDO-LION-3847"
                  placeholderTextColor={colors.text3}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity style={styles.recoveryBtn} onPress={handleRecoveryVerify} activeOpacity={0.85}>
                  <Text style={styles.recoveryBtnText}>{t('home.verifyCode')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.recoveryInput}
                  value={recoveryNewPin}
                  onChangeText={v => setRecoveryNewPin(v.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t('home.newPinPlaceholder')}
                  placeholderTextColor={colors.text3}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
                <TextInput
                  style={[styles.recoveryInput, { marginTop: 10 }]}
                  value={recoveryConfirm}
                  onChangeText={v => setRecoveryConfirm(v.replace(/\D/g, '').slice(0, 4))}
                  placeholder={t('home.confirmPinPlaceholder')}
                  placeholderTextColor={colors.text3}
                  keyboardType="number-pad"
                  secureTextEntry
                  maxLength={4}
                />
                <TouchableOpacity style={[styles.recoveryBtn, recoveryLoading && { opacity: 0.6 }]} onPress={handleRecoverySetPin} activeOpacity={0.85} disabled={recoveryLoading}>
                  <Text style={styles.recoveryBtnText}>{recoveryLoading ? '...' : t('home.setNewPin')}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRecovery(false)}>
              <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
            </TouchableOpacity>

            <View style={{ height: Platform.OS === 'ios' ? 20 : 12 }} />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}
