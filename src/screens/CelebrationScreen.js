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

const NUM_PARTICLES = 18;
const PARTICLE_EMOJIS = [
  '⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🎯',
  '💥', '🌈', '🦋', '🎀', '🥇', '🎁', '🔥', '💎', '🚀', '❤️',
];

const TWINKLE_POSITIONS = [
  { top: '7%', left: '8%' }, { top: '10%', right: '12%' },
  { top: '20%', left: '20%' }, { top: '25%', right: '18%' },
  { top: '38%', left: '5%' }, { top: '44%', right: '7%' },
  { top: '58%', left: '14%' }, { top: '65%', right: '12%' },
  { top: '76%', left: '22%' }, { top: '82%', right: '20%' },
];

// ─── Phase: suspense → revealing → revealed ────────────────────────────────────
export default function CelebrationScreen({ route, navigation }) {
  const { taskId, reward, kidName } = route.params || {};
  const { markCelebrated } = useApp();
  const [phase, setPhase] = useState('suspense');

  useEffect(() => {
    if (taskId) markCelebrated(taskId);
  }, []);

  // ─── Suspense animations ─────────────────────────────────────────────────────
  const giftPulse = useRef(new Animated.Value(1)).current;
  const giftWiggle = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(1)).current;
  const [twinkleAnims] = useState(() =>
    TWINKLE_POSITIONS.map(() => new Animated.Value(Math.random() * 0.4 + 0.2))
  );

  // ─── Reveal transition ───────────────────────────────────────────────────────
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const giftRevealScale = useRef(new Animated.Value(1)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;

  // ─── Revealed phase animations ───────────────────────────────────────────────
  const [revealAnims] = useState(() => {
    const particles = Array.from({ length: NUM_PARTICLES }, (_, i) => {
      const angle = (i / NUM_PARTICLES) * Math.PI * 2;
      const dist = 110 + (i % 5) * 32;
      return {
        anim: new Animated.Value(0),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        emoji: PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length],
      };
    });
    return {
      titleScale: new Animated.Value(0),
      titleOpacity: new Animated.Value(0),
      rewardSlide: new Animated.Value(60),
      rewardOpacity: new Animated.Value(0),
      trophyScale: new Animated.Value(0),
      trophyRotate: new Animated.Value(0),
      backBtnOpacity: new Animated.Value(0),
      particles,
    };
  });

  // ─── Start suspense on mount ─────────────────────────────────────────────────
  useEffect(() => {
    // Gift breathing pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(giftPulse, { toValue: 1.12, duration: 800, useNativeDriver: true }),
        Animated.timing(giftPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    // Gift wiggle (teaser)
    Animated.loop(
      Animated.sequence([
        Animated.delay(1500),
        Animated.timing(giftWiggle, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: 7, duration: 60, useNativeDriver: true }),
        Animated.timing(giftWiggle, { toValue: 0, duration: 60, useNativeDriver: true }),
        Animated.delay(2000),
      ])
    ).start();

    // Tap button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1.06, duration: 700, useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    // Twinkling stars
    twinkleAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 250),
          Animated.timing(anim, { toValue: 1, duration: 600 + i * 80, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.1, duration: 600 + i * 80, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  // ─── Tap to reveal ───────────────────────────────────────────────────────────
  function handleReveal() {
    setPhase('revealing');

    // Violent shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 22, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -22, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 26, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -26, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -20, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 14, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();

    // Gift grows
    Animated.timing(giftRevealScale, { toValue: 3.2, duration: 540, useNativeDriver: true }).start();

    // Flash white → transition
    setTimeout(() => {
      Animated.timing(flashOpacity, { toValue: 1, duration: 160, useNativeDriver: true }).start(() => {
        setPhase('revealed');
        playRevealedAnims();
      });
    }, 500);
  }

  // ─── Revealed phase ──────────────────────────────────────────────────────────
  function playRevealedAnims() {
    const { titleScale, titleOpacity, rewardSlide, rewardOpacity, trophyScale, trophyRotate, backBtnOpacity, particles } =
      revealAnims;

    // Trophy enters
    Animated.spring(trophyScale, { toValue: 1, friction: 3, tension: 100, useNativeDriver: true }).start();

    // Trophy wiggle loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyRotate, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: -1, duration: 260, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.delay(1600),
      ])
    ).start();

    // Title
    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Particles burst
    Animated.stagger(
      30,
      particles.map(p =>
        Animated.spring(p.anim, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true })
      )
    ).start();

    // Reward card slides up
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(rewardOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(rewardSlide, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]),
    ]).start();

    // Back button fades in
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(backBtnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }

  const { titleScale, titleOpacity, rewardSlide, rewardOpacity, trophyScale, trophyRotate, backBtnOpacity, particles } =
    revealAnims;
  const trophyDeg = trophyRotate.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] });

  // ─── Suspense / Revealing ────────────────────────────────────────────────────
  if (phase === 'suspense' || phase === 'revealing') {
    return (
      <LinearGradient colors={['#0D0B30', '#1E1A60', '#0D0B30']} style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* White flash */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: flashOpacity, zIndex: 10 }]}
        />

        {/* Twinkling stars */}
        {twinkleAnims.map((anim, i) => (
          <Animated.Text key={i} style={[styles.twinkleStar, TWINKLE_POSITIONS[i], { opacity: anim }]}>
            ✨
          </Animated.Text>
        ))}

        <View style={styles.suspenseCenter}>
          {/* Badge */}
          <View style={styles.questBadge}>
            <Text style={styles.questBadgeText}>QUEST COMPLETE</Text>
          </View>

          {kidName ? (
            <Text style={styles.suspenseKidName}>
              Nice work,{'\n'}{kidName}!
            </Text>
          ) : null}

          {/* Gift box */}
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
            {phase === 'suspense' ? 'Your reward is waiting inside…' : '🔓 Opening…'}
          </Text>

          {phase === 'suspense' && (
            <Animated.View style={{ transform: [{ scale: btnPulse }] }}>
              <TouchableOpacity
                style={styles.tapRevealBtn}
                onPress={handleReveal}
                activeOpacity={0.88}
              >
                <Text style={styles.tapRevealBtnText}>TAP TO REVEAL  🔥</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    );
  }

  // ─── Revealed ────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={['#7C3AED', '#EC4899', '#F59E0B']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Particle burst */}
      <View style={styles.particlesContainer} pointerEvents="none">
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

        {/* Title */}
        <Animated.View style={{ transform: [{ scale: titleScale }], opacity: titleOpacity }}>
          <Text style={styles.revealedTitle}>AMAZING!</Text>
          {kidName ? (
            <Text style={styles.revealedKidName}>Way to go, {kidName}! 🌟</Text>
          ) : null}
        </Animated.View>

        {/* Reward card */}
        <Animated.View
          style={[
            styles.rewardCard,
            { opacity: rewardOpacity, transform: [{ translateY: rewardSlide }] },
          ]}
        >
          <Text style={styles.rewardCardLabel}>🎁  YOUR REWARD</Text>
          <Text style={styles.rewardCardValue}>{reward || 'Awesome job!'}</Text>
        </Animated.View>

        {/* Back button */}
        <Animated.View style={{ opacity: backBtnOpacity, width: '100%' }}>
          <TouchableOpacity
            style={styles.backToQuestsBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backToQuestsBtnText}>Back to My Quests 🚀</Text>
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
  twinkleStar: {
    position: 'absolute',
    fontSize: 18,
  },
  suspenseCenter: {
    alignItems: 'center',
    width: '100%',
  },
  questBadge: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.4)',
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginBottom: 18,
  },
  questBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
  suspenseKidName: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  giftEmoji: {
    fontSize: 110,
    marginBottom: 24,
  },
  suspenseMystery: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    marginBottom: 44,
    textAlign: 'center',
  },
  tapRevealBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 100,
    paddingVertical: 20,
    paddingHorizontal: 48,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  tapRevealBtnText: {
    color: '#1A0800',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // ─── Revealed
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 26,
  },
  revealedCenter: {
    alignItems: 'center',
    width: '100%',
  },
  trophyEmoji: {
    fontSize: 96,
    marginBottom: 10,
  },
  revealedTitle: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -1,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  revealedKidName: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Reward card
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  rewardCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 2,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  rewardCardValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // Back button
  backToQuestsBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  backToQuestsBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
