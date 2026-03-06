import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
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

const { width, height } = Dimensions.get('window');

const NUM_COLS = width >= 390 ? 3 : 2;
const CARD_SIZE = (width - 48 - (NUM_COLS - 1) * 16) / NUM_COLS;
const AVATAR_SIZE = CARD_SIZE - 16;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getLevelInfo(totalStars) {
  return Math.floor(totalStars / 5) + 1;
}

// ─── Kid Profile Card with glow + stats ───────────────────────────────────────
function KidCard({ profile, onPress, stars, level }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing glow keeps card alive on screen
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.22, duration: 1600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function pressIn() {
    Animated.spring(scaleAnim, { toValue: 0.90, friction: 10, tension: 300, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={styles.profileItem}>
        {/* Pulsing glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              backgroundColor: profile.color + '38',
              width: AVATAR_SIZE + 18,
              height: AVATAR_SIZE + 18,
              borderRadius: (AVATAR_SIZE + 18) / 2,
              transform: [{ scale: glowAnim }],
            },
          ]}
        />

        {/* Avatar */}
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: profile.color,
              width: AVATAR_SIZE,
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

        {/* Stars + level */}
        <View style={styles.kidStatsRow}>
          <Text style={styles.kidStat}>⭐{stars}</Text>
          <Text style={styles.kidStatDot}>·</Text>
          <Text style={styles.kidStat}>🏆Lv{level}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Parent Profile Card ───────────────────────────────────────────────────────
function ParentCard({ profile, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scaleAnim, { toValue: 0.92, friction: 10, tension: 300, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 180, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} onPress={onPress} style={styles.profileItem}>
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: colors.primary,
              width: AVATAR_SIZE,
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

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { family, tasks, verifyPin } = useApp();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const inputRef = useRef(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(500)).current;

  // Compute per-kid stats
  const kidStatsMap = {};
  family.kids.forEach(kid => {
    const approved = tasks.filter(t => t.assignedTo === kid.id && t.status === 'approved').length;
    kidStatsMap[kid.id] = { stars: approved, level: getLevelInfo(approved) };
  });

  const allProfiles = [
    { id: 'parent', name: family.parentName, emoji: family.parentEmoji, type: 'parent' },
    ...family.kids.map(k => ({ ...k, type: 'kid' })),
  ];

  // Staggered entrance animations
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
    setShowPin(true);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheetAnim, { toValue: 0, friction: 8, tension: 90, useNativeDriver: true }),
    ]).start(() => setTimeout(() => inputRef.current?.focus(), 80));
  }

  function closePin() {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(sheetAnim, { toValue: 500, duration: 230, useNativeDriver: true }),
    ]).start(() => { setShowPin(false); setPin(''); setPinError(false); });
  }

  function handlePinChange(val) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    setPin(digits);
    setPinError(false);

    if (digits.length === 4) {
      if (verifyPin(digits)) {
        closePin();
        setTimeout(() => navigation.navigate('Parent'), 280);
      } else {
        setPinError(true);
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 13, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -13, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => setPin(''));
      }
    }
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
            const ea = entryAnims[i];
            const stats = kidStatsMap[profile.id] || { stars: 0, level: 1 };

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
                    level={stats.level}
                    onPress={() => navigation.navigate('Kid', { kidId: profile.id })}
                  />
                )}
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* ─── PIN Bottom Sheet ────────────────────────────────────────────────── */}
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

            <View style={[styles.pinSheetAvatar, { backgroundColor: colors.primary }]}>
              <Text style={{ fontSize: 38 }}>{family.parentEmoji}</Text>
            </View>

            <Text style={styles.pinSheetTitle}>Parent Zone</Text>
            <Text style={styles.pinSheetSub}>Enter your 4-digit PIN to continue</Text>

            <Pressable onPress={() => inputRef.current?.focus()} style={{ alignItems: 'center' }}>
              <Animated.View
                style={[styles.pinBoxRow, { transform: [{ translateX: shakeAnim }] }]}
              >
                {[0, 1, 2, 3].map(idx => (
                  <View
                    key={idx}
                    style={[
                      styles.pinBox,
                      pin.length > idx && styles.pinBoxFilled,
                      pin.length === idx && !pinError && styles.pinBoxCurrent,
                      pinError && styles.pinBoxError,
                    ]}
                  >
                    {pin.length > idx && (
                      <View style={[styles.pinDot, pinError && styles.pinDotError]} />
                    )}
                  </View>
                ))}
              </Animated.View>
            </Pressable>

            {pinError && <Text style={styles.pinErrorText}>Incorrect PIN — try again</Text>}

            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="number-pad"
              maxLength={4}
              caretHidden
            />

            <TouchableOpacity style={styles.cancelBtn} onPress={closePin}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
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

  // Glow ring (kids)
  glowRing: {
    position: 'absolute',
    top: -1,
  },

  // Avatar circle
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarEmoji: { fontSize: AVATAR_SIZE * 0.42 },
  lockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 4,
    ...shadows.sm,
  },

  // Name / labels
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
  kidStat: { fontSize: 11, fontWeight: '800', color: '#475569' },
  kidStatDot: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' },

  parentPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  parentPillText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  // ─── PIN Modal
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
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
    paddingBottom: 20,
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
    marginBottom: 28,
  },
  pinSheetAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pinSheetTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  pinSheetSub: {
    fontSize: 14,
    color: colors.text3,
    fontWeight: '500',
    marginBottom: 30,
    textAlign: 'center',
  },
  pinBoxRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 16,
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
  pinBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pinBoxError: { borderColor: colors.error, backgroundColor: colors.errorLight },
  pinDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary },
  pinDotError: { backgroundColor: colors.error },
  pinErrorText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: -9999,
    left: -9999,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 100,
  },
  cancelBtnText: {
    color: colors.text3,
    fontSize: 16,
    fontWeight: '600',
  },
});
