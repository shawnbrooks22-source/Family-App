import React, { useState, useRef, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, shadows } from '../theme/index';

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
function NumPad({ onPress, onBackspace }) {
  return (
    <View style={styles.numpad}>
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
                  onPress={onBackspace}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numpadBackspaceText}>⌫</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={ki}
                style={styles.numpadKey}
                onPress={() => onPress(key)}
                activeOpacity={0.6}
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

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { family, tasks, verifyPin } = useApp();
  const [showPin, setShowPin]   = useState(false);
  const [pin, setPin]           = useState('');
  const [pinError, setPinError] = useState(false);
  // Which digit index is currently visible as a number (not a dot)
  const [revealIdx, setRevealIdx] = useState(-1);
  const revealTimer = useRef(null);

  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim   = useRef(new Animated.Value(600)).current;

  // Per-kid star counts
  const kidStatsMap = {};
  family.kids.forEach(kid => {
    const approved = tasks.filter(t => t.assignedTo === kid.id && t.status === 'approved').length;
    kidStatsMap[kid.id] = { stars: approved };
  });

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
  function openPin() {
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
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetAnim,   { toValue: 600, duration: 230, useNativeDriver: true }),
    ]).start(() => { setShowPin(false); setPin(''); setPinError(false); setRevealIdx(-1); });
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

  function handleNumPress(digit) {
    if (pin.length >= 4) return;
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
      if (verifyPin(newPin)) {
        closePin();
        setTimeout(() => navigation.navigate('Parent'), 280);
      } else {
        setPinError(true);
        shakeAndClear();
      }
    }
  }

  function handleBackspace() {
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
          <Text style={styles.appBarTitle}>ChoreQuest ⭐</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>{getGreeting()}! 👋</Text>
        <Text style={styles.whoTitle}>Who's here?</Text>
        <Text style={styles.familySub}>{family.parentName}'s Family</Text>

        <View style={styles.profileGrid}>
          {allProfiles.map((profile, i) => {
            const isParent = profile.type === 'parent';
            const ea       = entryAnims[i];
            const stats    = kidStatsMap[profile.id] || { stars: 0 };

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
      </ScrollView>

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
            <Text style={styles.pinSheetSub}>Enter your 4-digit PIN</Text>

            {/* PIN boxes */}
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

            {pinError && <Text style={styles.pinErrorText}>Incorrect PIN — try again</Text>}

            {/* ── Custom Numpad ── */}
            <NumPad onPress={handleNumPress} onBackspace={handleBackspace} />

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
  familySub: {
    fontSize: 15,
    color: colors.text3,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 36,
  },

  // ─── Profile grid
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
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
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
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
