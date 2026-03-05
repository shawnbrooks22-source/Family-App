import React, { useEffect, useState } from 'react';
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

const NUM_STARS = 14;
const STAR_EMOJIS = ['⭐', '🌟', '✨', '💫', '🎉', '🎊', '🏆', '🎯', '💥', '🌈', '🦋', '🎀', '🥇', '🎁'];

export default function CelebrationScreen({ route, navigation }) {
  const { taskId, reward, kidName } = route.params || {};
  const { markCelebrated } = useApp();

  // Create all animated values lazily in state (valid hook usage)
  const [anims] = useState(() => {
    const stars = Array.from({ length: NUM_STARS }, (_, i) => {
      const angle = (i / NUM_STARS) * Math.PI * 2;
      const dist = 110 + (i % 5) * 28;
      return {
        anim: new Animated.Value(0),
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        emoji: STAR_EMOJIS[i % STAR_EMOJIS.length],
      };
    });
    return {
      titleScale: new Animated.Value(0),
      rewardSlide: new Animated.Value(60),
      rewardOpacity: new Animated.Value(0),
      trophyScale: new Animated.Value(0),
      trophyRotate: new Animated.Value(0),
      stars,
    };
  });

  useEffect(() => {
    // Mark task as celebrated so it doesn't trigger again
    if (taskId) {
      markCelebrated(taskId);
    }

    const { titleScale, rewardSlide, rewardOpacity, trophyScale, trophyRotate, stars } = anims;

    // Trophy pops in
    Animated.spring(trophyScale, {
      toValue: 1,
      friction: 3,
      tension: 120,
      useNativeDriver: true,
    }).start();

    // Trophy wiggles
    Animated.loop(
      Animated.sequence([
        Animated.timing(trophyRotate, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: -1, duration: 300, useNativeDriver: true }),
        Animated.timing(trophyRotate, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(1200),
      ]),
    ).start();

    // Title scales in
    Animated.sequence([
      Animated.delay(200),
      Animated.spring(titleScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Stars burst out
    Animated.stagger(
      45,
      stars.map(s =>
        Animated.spring(s.anim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ),
    ).start();

    // Reward card slides in
    Animated.sequence([
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(rewardOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(rewardSlide, {
          toValue: 0,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const { titleScale, rewardSlide, rewardOpacity, trophyScale, trophyRotate, stars } = anims;

  const trophyRotateDeg = trophyRotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

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
                  {
                    translateX: star.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, star.x],
                    }),
                  },
                  {
                    translateY: star.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, star.y],
                    }),
                  },
                  { scale: star.anim },
                ],
              },
            ]}
          >
            {star.emoji}
          </Animated.Text>
        ))}
      </View>

      {/* Trophy */}
      <Animated.Text
        style={[
          styles.trophyEmoji,
          {
            transform: [
              { scale: trophyScale },
              { rotate: trophyRotateDeg },
            ],
          },
        ]}
      >
        🏆
      </Animated.Text>

      {/* Title */}
      <Animated.Text
        style={[styles.title, { transform: [{ scale: titleScale }] }]}
      >
        AMAZING! 🎉
      </Animated.Text>

      {kidName ? (
        <Text style={styles.kidNameText}>Way to go, {kidName}! 🌟</Text>
      ) : null}

      {/* Reward card */}
      <Animated.View
        style={[
          styles.rewardCard,
          {
            opacity: rewardOpacity,
            transform: [{ translateY: rewardSlide }],
          },
        ]}
      >
        <Text style={styles.rewardLabel}>🎁 Your Reward:</Text>
        <Text style={styles.rewardValue}>{reward || 'Awesome job!'}</Text>
      </Animated.View>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.85}
      >
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
    fontSize: 54,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 8,
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
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  rewardLabel: {
    fontSize: 18,
    color: '#888',
    fontWeight: '700',
    marginBottom: 10,
  },
  rewardValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  backBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
