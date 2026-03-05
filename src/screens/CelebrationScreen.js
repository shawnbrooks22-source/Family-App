import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const NUM_STARS = 16;
const STAR_EMOJIS = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🎯', '💥', '🌈', '🦋', '🎀', '🥇', '🎁', '🔥', '💎'];

const TWINKLE_POSITIONS = [
  { top: '8%', left: '6%' },
  { top: '12%', right: '10%' },
  { top: '22%', left: '18%' },
  { top: '28%', right: '22%' },
  { top: '42%', left: '4%' },
  { top: '48%', right: '6%' },
  { top: '60%', left: '12%' },
  { top: '68%', right: '14%' },
  { top: '78%', left: '20%' },
  { top: '84%', right: '20%' },
];

// ─── Phase 1: SUSPENSE — dark, mysterious, TAP TO REVEAL
// ─── Phase 2: REVEALING — gift shakes violently, white flash
// ─── Phase 3: REVEALED — full celebration explosion

export default function CelebrationScreen({ route, navigation }) {
  const { taskId, reward, kidName } = route.params || {};
  const { markCelebrated } = useApp();
  const [phase, setPhase] = useState('suspense');

  // Mark celebrated immediately so KidDashboard won't re-trigger navigation
  useEffect(() => {
    if (taskId) markCelebrated(taskId);
  }, []);

  // ─── Suspense anims
  const giftPulse = useRef(new Animated.Value(1)).current;
  const giftWiggle = useRef(new Animated.Value(0)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;
  const [twinkleAnims] = useState(() =>
    TWINKLE_POSITIONS.map(() => new Animated.Value(Math.random() * 0.4 + 0.2))
  );

  // ─── Revealing anims
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const giftRevealScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // ─── Revealed anims
  const [revealAnims] = useState(() => {
    const stars = Array.from({ length: NUM_STARS }, (_, i) => {
      const angle = (i / NUM_STARS) * Math.PI * 2;
      const dist = 120 + (i % 5) * 30;
      return {
        anim: new Animated.Value(0),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        emoji: STAR_EMOJIS[i % STAR_EMOJIS.length],
      };
    });
    return {
      titleScale: new Animated.Value(0),
      rewardSlide: new Animated.Value(80),
      rewardOpacity: new Animated.Value(0),
      trophyScale: new Animated.Value(0),
      trophyRotate: new Animated.Value(0),
      stars,
    };
  });

  // Start suspense animations on mount
  useEffect(() => {
    // Gift box pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(giftPulse, { toValue: 1.14, duration: 700, useNativeDriver: true }),
        Animated.timing(giftPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Gift box periodic wiggle
    Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(giftWiggle, { toValue: 9, duration: 70, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: -9, duration: 70, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: 6, duration: 70, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: 0, duration: 70, useNativeDriver: true }),
        Animated.delay(1800),
      ])
    ).start();

    // "TAP TO REVEAL" button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 1.07, duration: 700, useNativeDriver: true }),
        Animated.timing(buttonPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Twinkling stars
    twinkleAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 280),
          Animated.timing(anim, { toValue: 1, duration: 700 + i * 80, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: 700 + i * 80, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  function handleTapReveal() {
    setPhase('revealing');

    // Shake the gift box
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 24, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -24, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 18, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -18, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 26, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -26, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 22, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -22, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 16, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -16, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();

    // Gift grows
    Animated.timing(giftRevealScale, {
      toValue: 2.8,
      duration: 560,
      useNativeDriver: true,
    }).start();

    // Flash white then transition
    setTimeout(() => {
      Animated.timing(flashOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start(() => {
        setPhase('revealed');
        startRevealedAnimations();
      });
    }, 560);
  }

  function startRevealedAnimations() {
    const { titleScale, rewardSlide, rewardOpacity, trophyScale, trophyRotate, stars } = revealAnims;

    Animated.spring(trophyScale, {
      toValue: 1, friction: 3, tension: 120, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: -1, duration: 300, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(1400),
      ]),
    ).start();

    Animated.sequence([
      Animated.delay(150),
      Animated.spring(titleScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
    ]).start();

    Animated.stagger(35,
      stars.map(s =>
        Animated.spring(s.anim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true })
      )
    ).start();

    Animated.sequence([
      Animated.delay(350),
      Animated.parallel([
        Animated.timing(rewardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(rewardSlide, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();
  }

  const { titleScale, rewardSlide, rewardOpacity, trophyScale, trophyRotate, stars } = revealAnims;
  const trophyRotateDeg = trophyRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] });

  // ─── SUSPENSE & REVEALING PHASE ──────────────────────────────────────────────
  if (phase === 'suspense' || phase === 'revealing') {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* White flash overlay */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashOpacity, zIndex: 10 }]}
        />

        {/* Twinkling background stars */}
        {twinkleAnims.map((anim, i) => (
          <Animated.Text key={i} style={[styles.twinkleStar, TWINKLE_POSITIONS[i], { opacity: anim }]}>
            ✨
          </Animated.Text>
        ))}

        <View style={styles.suspenseContent}>
          <Text style={styles.suspenseBadge}>✨ QUEST COMPLETE ✨</Text>

          {kidName ? (
            <Text style={styles.suspenseKidName}>Nice work, {kidName}...</Text>
          ) : null}

          {/* Mystery gift box */}
          <Animated.Text
            style={[
              styles.giftEmoji,
              {
                transform: [
                  { scale: phase === 'revealing' ? giftRevealScale : giftPulse },
                  { translateX: phase === 'revealing' ? shakeAnim : giftWiggle },
                ],
              },
            ]}
          >
            🎁
          </Animated.Text>

          <Text style={styles.suspenseMystery}>
            {phase === 'suspense' ? 'Your reward is locked inside...' : '🔓 OPENING...'}
          </Text>

          {phase === 'suspense' && (
            <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
              <TouchableOpacity style={styles.revealBtn} onPress={handleTapReveal} activeOpacity={0.88}>
                <Text style={styles.revealBtnText}>TAP TO REVEAL! 🔥</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    );
  }

  // ─── REVEALED PHASE ──────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#FF6584', '#FFD700', '#43E97B']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Star burst */}
      <View style={styles.starsContainer} pointerEvents="none">
        {stars.map((star, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.star,
              {
                opacity: star.anim,
                transform: [
                  { translateX: star.anim.interpolate({ inputRange: [0, 1], outputRange: [0, star.x] }) },
                  { translateY: star.anim.interpolate({ inputRange: [0, 1], outputRange: [0, star.y] }) },
                  { scale: star.anim },
                ],
              },
            ]}
          >
            {star.emoji}
          </Animated.Text>
        ))}
      </View>

      <Animated.Text
        style={[styles.trophyEmoji, { transform: [{ scale: trophyScale }, { rotate: trophyRotateDeg }] }]}
      >
        🏆
      </Animated.Text>

      <Animated.Text style={[styles.title, { transform: [{ scale: titleScale }] }]}>
        AMAZING! 🎉
      </Animated.Text>

      {kidName ? <Text style={styles.kidNameText}>Way to go, {kidName}! 🌟</Text> : null}

      <Animated.View
        style={[styles.rewardCard, { opacity: rewardOpacity, transform: [{ translateY: rewardSlide }] }]}
      >
        <Text style={styles.rewardLabel}>🎁 Your Reward</Text>
        <Text style={styles.rewardValue}>{reward || 'Awesome job!'}</Text>
      </Animated.View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.backBtnText}>Back to My Quests! 🚀</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // ─── Suspense
  twinkleStar: {
    position: 'absolute',
    fontSize: 16,
  },
  suspenseContent: {
    alignItems: 'center',
    width: '100%',
  },
  suspenseBadge: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 2,
    marginBottom: 14,
  },
  suspenseKidName: {
    fontSize: 30,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 32,
  },
  giftEmoji: {
    fontSize: 120,
    marginBottom: 20,
  },
  suspenseMystery: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 44,
    textAlign: 'center',
  },
  revealBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 100,
    paddingVertical: 22,
    paddingHorizontal: 52,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 14,
  },
  revealBtnText: {
    color: '#1a0a00',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── Revealed
  starsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
    fontSize: 28,
  },
  trophyEmoji: {
    fontSize: 100,
    marginBottom: 12,
  },
  title: {
    fontSize: 52,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginBottom: 6,
  },
  kidNameText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 30,
  },
  rewardCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  rewardLabel: {
    fontSize: 15,
    color: '#999',
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rewardValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 100,
    paddingVertical: 18,
    paddingHorizontal: 44,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  backBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
});
