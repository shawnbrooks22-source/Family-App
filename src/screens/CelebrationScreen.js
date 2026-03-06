import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const { width, height } = Dimensions.get('window');

// ─── Particle config: two rings (inner tight, outer wide) ──────────────────────
const NUM_PARTICLES = 30;
const PARTICLE_EMOJIS = [
  '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🎯',
  '💥', '🌈', '🦋', '🎀', '🥇', '🎁', '🔥', '💎',
  '🚀', '❤️', '💛', '💜', '🍭', '🌸', '🎶', '🦄',
  '🍀', '🎠', '🌺', '💝', '🎆', '🎇',
];

const TWINKLE_POSITIONS = [
  { top: '6%', left: '7%' }, { top: '9%', right: '11%' },
  { top: '18%', left: '19%' }, { top: '22%', right: '20%' },
  { top: '35%', left: '4%' }, { top: '40%', right: '5%' },
  { top: '55%', left: '11%' }, { top: '62%', right: '13%' },
  { top: '74%', left: '21%' }, { top: '80%', right: '19%' },
  { top: '14%', left: '44%' },
];

export default function CelebrationScreen({ route, navigation }) {
  const { taskId, reward, kidName } = route.params || {};
  const { markCelebrated } = useApp();
  const [phase, setPhase] = useState('suspense');

  // Mark celebrated right away so KidDashboard won't re-trigger navigation
  useEffect(() => {
    if (taskId) markCelebrated(taskId);
  }, []);

  // ─── Suspense anims ──────────────────────────────────────────────────────────
  const giftPulse = useRef(new Animated.Value(1)).current;
  const giftWiggle = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const [twinkleAnims] = useState(() =>
    TWINKLE_POSITIONS.map(() => new Animated.Value(Math.random() * 0.4 + 0.15))
  );

  // ─── Revealing anims ─────────────────────────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const giftRevealScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // ─── Revealed anims ──────────────────────────────────────────────────────────
  const [revealAnims] = useState(() => {
    const particles = Array.from({ length: NUM_PARTICLES }, (_, i) => {
      const angle = (i / NUM_PARTICLES) * Math.PI * 2;
      // Alternate inner ring (closer) and outer ring (farther)
      const isInner = i % 2 === 0;
      const dist = isInner ? (90 + (i % 5) * 18) : (155 + (i % 5) * 25);
      return {
        anim: new Animated.Value(0),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        emoji: PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length],
        delay: isInner ? 0 : 80, // outer ring fires slightly after
      };
    });
    return {
      trophyScale: new Animated.Value(0),
      trophyRotate: new Animated.Value(0),
      titleScale: new Animated.Value(0),
      titleOpacity: new Animated.Value(0),
      starEarnedSlide: new Animated.Value(-40),
      starEarnedOpacity: new Animated.Value(0),
      rewardSlide: new Animated.Value(70),
      rewardOpacity: new Animated.Value(0),
      backOpacity: new Animated.Value(0),
      particles,
    };
  });

  // ─── Run suspense animations ─────────────────────────────────────────────────
  useEffect(() => {
    // Gift breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(giftPulse, { toValue: 1.13, duration: 750, useNativeDriver: true }),
        Animated.timing(giftPulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    ).start();

    // Gift tease wiggle
    Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(giftWiggle, { toValue: 11, duration: 55, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: -11, duration: 55, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: 8, duration: 55, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: 0, duration: 55, useNativeDriver: true }),
        Animated.delay(2200),
      ])
    ).start();

    // Button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.08, duration: 650, useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    ).start();

    // Twinkling stars in background
    twinkleAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 220),
          Animated.timing(anim, { toValue: 1, duration: 550 + i * 70, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.1, duration: 550 + i * 70, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  // ─── Tap to reveal ───────────────────────────────────────────────────────────
  function handleReveal() {
    setPhase('revealing');

    // Violent multi-shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 24, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -24, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 28, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -28, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 22, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -22, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 16, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -16, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 38, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 38, useNativeDriver: true }),
    ]).start();

    // Gift explodes outward
    Animated.timing(giftRevealScale, { toValue: 3.4, duration: 520, useNativeDriver: true }).start();

    // Blinding white flash → revealed phase
    setTimeout(() => {
      Animated.timing(flashOpacity, { toValue: 1, duration: 140, useNativeDriver: true }).start(() => {
        setPhase('revealed');
        playRevealedAnims();
      });
    }, 480);
  }

  // ─── Revealed animations ─────────────────────────────────────────────────────
  function playRevealedAnims() {
    const {
      trophyScale, trophyRotate, titleScale, titleOpacity,
      starEarnedSlide, starEarnedOpacity,
      rewardSlide, rewardOpacity, backOpacity, particles,
    } = revealAnims;

    // Trophy slams in
    Animated.spring(trophyScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();

    // Trophy sway loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyRotate, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: -1, duration: 240, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.delay(1800),
      ])
    ).start();

    // Title pops in
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, friction: 3, tension: 110, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();

    // Star earned badge drops in from top
    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.spring(starEarnedSlide, { toValue: 0, friction: 6, tension: 90, useNativeDriver: true }),
        Animated.timing(starEarnedOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Two-ring particle burst (inner fires first, outer 80ms later)
    const innerParticles = particles.filter((_, i) => i % 2 === 0);
    const outerParticles = particles.filter((_, i) => i % 2 !== 0);

    Animated.stagger(20, innerParticles.map(p =>
      Animated.spring(p.anim, { toValue: 1, friction: 4, tension: 65, useNativeDriver: true })
    )).start();

    setTimeout(() => {
      Animated.stagger(20, outerParticles.map(p =>
        Animated.spring(p.anim, { toValue: 1, friction: 5, tension: 55, useNativeDriver: true })
      )).start();
    }, 80);

    // Reward card slides up
    Animated.sequence([
      Animated.delay(340),
      Animated.parallel([
        Animated.timing(rewardOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(rewardSlide, { toValue: 0, friction: 7, tension: 75, useNativeDriver: true }),
      ]),
    ]).start();

    // Back button fades in last
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(backOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  const {
    trophyScale, trophyRotate, titleScale, titleOpacity,
    starEarnedSlide, starEarnedOpacity,
    rewardSlide, rewardOpacity, backOpacity, particles,
  } = revealAnims;

  const trophyDeg = trophyRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });

  // ─── SUSPENSE + REVEALING ────────────────────────────────────────────────────
  if (phase === 'suspense' || phase === 'revealing') {
    return (
      <LinearGradient colors={['#0D0B30', '#1A1560', '#0D0B30']} style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Blinding white flash */}
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

        <View style={styles.suspenseCenter}>
          {/* QUEST COMPLETE badge */}
          <View style={styles.questBadge}>
            <Text style={styles.questBadgeText}>⚡  QUEST COMPLETE  ⚡</Text>
          </View>

          {kidName ? (
            <Text style={styles.suspenseKidName}>Nice work,{'\n'}{kidName}!</Text>
          ) : null}

          {/* Pulsing / shaking gift */}
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
            {phase === 'suspense' ? 'Your reward is locked inside…' : '🔓 OPENING…'}
          </Text>

          {phase === 'suspense' && (
            <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
              <TouchableOpacity style={styles.tapBtn} onPress={handleReveal} activeOpacity={0.88}>
                <LinearGradient
                  colors={['#FF8C00', '#FFE000']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tapBtnGradient}
                >
                  <Text style={styles.tapBtnText}>⚡  TAP TO REVEAL!</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    );
  }

  // ─── REVEALED ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#7C3AED', '#DB2777', '#FF8C00', '#FFE000']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Two-ring particle burst */}
      <View style={styles.particleContainer} pointerEvents="none">
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              {
                opacity: p.anim,
                transform: [
                  { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
                  { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.y] }) },
                  { scale: p.anim },
                ],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        ))}
      </View>

      <View style={styles.revealedCenter}>
        {/* Trophy */}
        <Animated.Text
          style={[styles.trophyEmoji, { transform: [{ scale: trophyScale }, { rotate: trophyDeg }] }]}
        >
          🏆
        </Animated.Text>

        {/* AMAZING! title */}
        <Animated.View style={{ transform: [{ scale: titleScale }], opacity: titleOpacity }}>
          <Text style={styles.revealedTitle}>AMAZING!</Text>
          {kidName ? (
            <Text style={styles.revealedKidName}>Way to go, {kidName}! 🌟</Text>
          ) : null}
        </Animated.View>

        {/* ⭐ STAR EARNED badge */}
        <Animated.View
          style={[
            styles.starEarnedBadge,
            { opacity: starEarnedOpacity, transform: [{ translateY: starEarnedSlide }] },
          ]}
        >
          <Text style={styles.starEarnedText}>⭐  +1 STAR EARNED!</Text>
        </Animated.View>

        {/* Reward card */}
        <Animated.View
          style={[
            styles.rewardCard,
            { opacity: rewardOpacity, transform: [{ translateY: rewardSlide }] },
          ]}
        >
          <Text style={styles.rewardLabel}>🎁  YOUR REWARD</Text>
          <Text style={styles.rewardValue}>{reward || 'Awesome job!'}</Text>
        </Animated.View>

        {/* Back button */}
        <Animated.View style={{ opacity: backOpacity, width: '100%' }}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtnText}>Back to My Quests 🚀</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  // ─── Suspense
  twinkleStar: { position: 'absolute', fontSize: 18 },
  suspenseCenter: { alignItems: 'center', width: '100%' },

  questBadge: {
    backgroundColor: 'rgba(255,224,0,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,224,0,0.5)',
    borderRadius: 100,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 20,
  },
  questBadgeText: {
    color: '#FFE000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },

  suspenseKidName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
    lineHeight: 44,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  giftEmoji: { fontSize: 116, marginBottom: 22 },

  suspenseMystery: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginBottom: 44,
    textAlign: 'center',
  },

  tapBtn: { borderRadius: 100, overflow: 'hidden' },
  tapBtnGradient: {
    paddingVertical: 22,
    paddingHorizontal: 52,
    borderRadius: 100,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 14,
  },
  tapBtnText: {
    color: '#1A0800',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ─── Revealed
  particleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: { position: 'absolute', fontSize: 26 },

  revealedCenter: { alignItems: 'center', width: '100%' },

  trophyEmoji: {
    fontSize: 100,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },

  revealedTitle: {
    fontSize: 60,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  revealedKidName: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },

  // Star earned badge
  starEarnedBadge: {
    backgroundColor: '#FFE000',
    borderRadius: 100,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: '#FFE000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 14,
    elevation: 8,
  },
  starEarnedText: {
    color: '#1A0800',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Reward card
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  rewardLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 2.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  rewardValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // Back button
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  backBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
