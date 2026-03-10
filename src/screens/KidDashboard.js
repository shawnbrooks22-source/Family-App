import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

// ─── Gradient map ──────────────────────────────────────────────────────────────
const GRADIENT_MAP = {
  '#FF6B6B': ['#FF6B6B', '#C0392B'],
  '#FF9F43': ['#FF9F43', '#D35400'],
  '#FEC600': ['#FEC600', '#E67E00'],
  '#0BDA92': ['#0BDA92', '#00855A'],
  '#18D4D4': ['#18D4D4', '#008080'],
  '#54A8FF': ['#54A8FF', '#1A6FCC'],
  '#A78BFA': ['#A78BFA', '#6D28D9'],
  '#F472B6': ['#F472B6', '#BE185D'],
  '#FF6584': ['#FF6B6B', '#C0392B'],
  '#FFD700': ['#FEC600', '#E67E00'],
  '#43E97B': ['#0BDA92', '#00855A'],
  '#00B4D8': ['#18D4D4', '#008080'],
  '#FF8C42': ['#FF9F43', '#D35400'],
  '#9B59B6': ['#A78BFA', '#6D28D9'],
  '#1ABC9C': ['#0BDA92', '#00855A'],
  '#E74C3C': ['#FF6B6B', '#C0392B'],
};
function getGradient(color) {
  return GRADIENT_MAP[color] || ['#5C5FE4', '#3D40C4'];
}

// ─── Due date helpers ──────────────────────────────────────────────────────────
function formatQuestDueDate(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today)    return 'TODAY!';
  if (dateStr === tomorrow) return 'Tomorrow';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function isDueToday(dateStr) {
  if (!dateStr) return false;
  return dateStr <= new Date().toISOString().split('T')[0];
}

// ─── Star rank ─────────────────────────────────────────────────────────────────
function getStarTitle(stars) {
  if (stars >= 30) return '✨ STAR LEGEND';
  if (stars >= 15) return '💫 STAR HERO';
  if (stars >= 5)  return '⭐ STAR COLLECTOR';
  return '🌟 RISING STAR';
}

// ─── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ emoji, value, label }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Active Quest Card ─────────────────────────────────────────────────────────
function QuestCard({ task, index, onDone, kidColor }) {
  const slideAnim = useRef(new Animated.Value(70)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered bounce-in entrance
    Animated.sequence([
      Animated.delay(index * 100),
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 65, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Heartbeat pulse on DO IT button — keeps kids' eyes on it
    Animated.loop(
      Animated.sequence([
        Animated.timing(btnScale, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(btnScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.delay(800),
      ])
    ).start();
  }, []);

  function handlePress() {
    Animated.sequence([
      Animated.spring(cardScale, { toValue: 0.93, friction: 6, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
    ]).start(() => onDone && onDone());
  }

  return (
    <Animated.View
      style={[
        styles.questCard,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale: cardScale }] },
      ]}
    >
      {/* Color bar at top */}
      <View style={[styles.questCardBar, { backgroundColor: kidColor }]} />

      <View style={styles.questCardBody}>
        {/* Emoji + title */}
        <View style={styles.questTop}>
          <View style={[styles.questEmojiBox, { backgroundColor: kidColor + '28' }]}>
            <Text style={styles.questEmojiText}>{task.emoji}</Text>
          </View>
          <View style={styles.questInfo}>
            <Text style={styles.questTitle}>{task.title}</Text>
            <View style={styles.questRewardRow}>
              <Text style={styles.questRewardStar}>⭐</Text>
              <Text style={styles.questRewardText} numberOfLines={1}>
                {task.reward}
              </Text>
            </View>
            {task.due_date ? (
              <Text style={[styles.questDueDate, isDueToday(task.due_date) && styles.questDueDateUrgent]}>
                📅 Due {formatQuestDueDate(task.due_date)}
              </Text>
            ) : null}
          </View>
        </View>

        {/* DO IT! button */}
        <Animated.View style={[styles.doItWrap, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity onPress={handlePress} activeOpacity={0.88} style={styles.doItOuter}>
            <LinearGradient
              colors={['#FF8C00', '#FFE000']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doItGradient}
            >
              <Text style={styles.doItText}>⚡  DO IT!</Text>
            </LinearGradient>
            {/* Note: DO IT text is intentionally kept universal/iconic */}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Waiting Card ──────────────────────────────────────────────────────────────
function WaitingCard({ task }) {
  const dotOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.waitingCard}>
      <View style={styles.waitingEmojiBox}>
        <Text style={{ fontSize: 26 }}>{task.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.waitingTitle}>{task.title}</Text>
        <Animated.Text style={[styles.waitingStatus, { opacity: dotOpacity }]}>
          ⏳ Parent is checking your work...
        </Animated.Text>
      </View>
    </View>
  );
}

// ─── Done Card ─────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function DoneCard({ task }) {
  return (
    <View style={styles.doneCard}>
      <View style={styles.doneEmojiBox}>
        <Text style={{ fontSize: 26 }}>{task.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.doneTitle}>{task.title}</Text>
        <Text style={styles.doneReward}>⭐ {task.reward}</Text>
        {(task.approvedAt || task.approved_at) ? (
          <Text style={styles.doneDate}>Earned {formatDate(task.approvedAt || task.approved_at)}</Text>
        ) : null}
      </View>
      <Text style={styles.doneTick}>✅</Text>
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function KidDashboard({ route, navigation }) {
  const { kidId } = route.params;
  const { family, tasks, completeTask, setKidGoal } = useApp();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const kid = family.kids.find(k => k.id === kidId);

  // Normalize both field naming conventions (local = assignedTo, Supabase = assigned_to)
  const kidTasks = tasks.filter(t => t.assignedTo === kidId || t.assigned_to === kidId);
  const pendingTasks = kidTasks.filter(t => t.status === 'pending');
  const waitingTasks = kidTasks.filter(t => t.status === 'completed');
  const approvedTasks = kidTasks.filter(t => t.status === 'approved');
  const celebratedTasks = approvedTasks.filter(t => t.celebrated);

  const totalStars = approvedTasks.length;
  const completedCount = waitingTasks.length + approvedTasks.length;
  const totalCount = kidTasks.length;
  const todayProgress = totalCount > 0 ? completedCount / totalCount : 0;

  // Streak
  const streak = kid?.streak || 0;

  // Goal state
  const goal = kid?.goal || null; // { name, stars } | null
  const starGoalProgress = goal ? Math.min(totalStars / goal.stars, 1) : 0;
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalStarsInput, setGoalStarsInput] = useState('');

  async function handleSaveGoal() {
    const stars = parseInt(goalStarsInput, 10);
    if (!goalNameInput.trim() || isNaN(stars) || stars < 1) return;
    await setKidGoal(kidId, { name: goalNameInput.trim(), stars });
    setShowGoalForm(false);
    setGoalNameInput('');
    setGoalStarsInput('');
  }

  async function handleClearGoal() {
    await setKidGoal(kidId, null);
    setShowGoalForm(false);
  }

  // Header animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const avatarScale   = useRef(new Animated.Value(0.7)).current;
  const glowScale     = useRef(new Animated.Value(1)).current;
  const progressAnim  = useRef(new Animated.Value(0)).current;
  const goalAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: todayProgress,
      duration: 1100,
      delay: 600,
      useNativeDriver: false,
    }).start();

    Animated.timing(goalAnim, {
      toValue: starGoalProgress,
      duration: 1200,
      delay: 700,
      useNativeDriver: false,
    }).start();

    // Pulsing glow ring behind avatar
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.18, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Guard flag — prevents stacking multiple navigation calls at once
  const isCelebrating = useRef(false);

  // Auto-navigate to celebration for newly approved tasks — one at a time
  useEffect(() => {
    const uncelebrated = approvedTasks.filter(t => !t.celebrated);
    if (uncelebrated.length > 0 && !isCelebrating.current) {
      isCelebrating.current = true;
      navigation.navigate('Celebration', {
        taskId: uncelebrated[0].id,
        reward: uncelebrated[0].reward,
        kidName: kid?.name,
      });
    }
  }, [tasks]);

  // When kid returns from a celebration, reset the guard so the next
  // uncelebrated reward (if any) triggers automatically
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      isCelebrating.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  if (!kid) return null;

  const gradient = getGradient(kid.color);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0F0A1E' : '#F8F9FF' }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ─── Gradient Header ──────────────────────────────────────────────── */}
        <LinearGradient colors={[gradient[0], gradient[1]]} style={styles.header}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>{t('kidDashboard.backHome')}</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.headerMain, { opacity: headerOpacity }]}>
            {/* Avatar with glow ring */}
            <View style={styles.avatarWrapper}>
              <Animated.View
                style={[
                  styles.glowRing,
                  { backgroundColor: '#ffffff28', transform: [{ scale: glowScale }] },
                ]}
              />
              <Animated.View
                style={[styles.avatarCircle, { transform: [{ scale: avatarScale }] }]}
              >
                <Text style={styles.avatarEmoji}>{kid.emoji}</Text>
              </Animated.View>
            </View>

            {/* Name */}
            <Text style={styles.kidName}>{kid.name.toUpperCase()}</Text>

            {/* Star rank badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{getStarTitle(totalStars)}</Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatChip emoji="⭐" value={totalStars} label={t('kidDashboard.stars')} />
              <View style={styles.statDivider} />
              <StatChip emoji="✅" value={completedCount} label={t('kidDashboard.done')} />
              <View style={styles.statDivider} />
              <StatChip emoji="🔥" value={streak} label={streak === 1 ? t('kidDashboard.day') : t('kidDashboard.streak')} />
            </View>

            {/* Today's goal bar */}
            {totalCount > 0 && (
              <View style={styles.xpSection}>
                <View style={styles.xpLabelRow}>
                  <Text style={styles.xpLabel}>{t('kidDashboard.todaysGoal')}</Text>
                  <Text style={styles.xpCount}>{t('kidDashboard.doneFraction', { completed: completedCount, total: totalCount })}</Text>
                </View>
                <View style={styles.xpTrack}>
                  <Animated.View
                    style={[
                      styles.xpFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* ─── Quest Board Content ───────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* ── Star Goal Card ─────────────────────────────────────────────── */}
          <View style={styles.goalCard}>
            {goal ? (
              /* Goal exists — show progress */
              <>
                <View style={styles.goalCardHeader}>
                  <Text style={styles.goalCardTitle}>🎯 {goal.name}</Text>
                  <TouchableOpacity onPress={handleClearGoal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.goalChangeBtn}>{t('kidDashboard.change')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.goalCountRow}>
                  <Text style={styles.goalCountText}>
                    {Math.min(totalStars, goal.stars)} / {goal.stars} ⭐
                  </Text>
                  {totalStars >= goal.stars && (
                    <Text style={styles.goalReachedText}>{t('kidDashboard.goalReached')}</Text>
                  )}
                </View>
                <View style={styles.goalTrack}>
                  <Animated.View
                    style={[
                      styles.goalFill,
                      {
                        width: goalAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </>
            ) : showGoalForm ? (
              /* Goal form */
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <Text style={styles.goalFormTitle}>{t('kidDashboard.setGoalTitle')}</Text>
                <TextInput
                  style={styles.goalInput}
                  placeholder={t('kidDashboard.goalWhatWant')}
                  placeholderTextColor="#94A3B8"
                  value={goalNameInput}
                  onChangeText={setGoalNameInput}
                />
                <TextInput
                  style={[styles.goalInput, { marginTop: 8 }]}
                  placeholder={t('kidDashboard.goalHowManyStars')}
                  placeholderTextColor="#94A3B8"
                  value={goalStarsInput}
                  onChangeText={setGoalStarsInput}
                  keyboardType="number-pad"
                />
                <View style={styles.goalFormBtns}>
                  <TouchableOpacity style={styles.goalSaveBtn} onPress={handleSaveGoal} activeOpacity={0.85}>
                    <Text style={styles.goalSaveBtnText}>{t('kidDashboard.saveGoal')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowGoalForm(false)}>
                    <Text style={styles.goalCancelText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            ) : (
              /* No goal — invite to set one */
              <TouchableOpacity style={styles.setGoalTap} onPress={() => setShowGoalForm(true)} activeOpacity={0.8}>
                <Text style={styles.setGoalEmoji}>🎯</Text>
                <Text style={styles.setGoalTitle}>{t('kidDashboard.setAGoal')}</Text>
                <Text style={styles.setGoalSub}>{t('kidDashboard.setGoalSub')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Streak banner */}
          {streak >= 2 && (
            <View style={styles.streakBanner}>
              <Text style={styles.streakFire}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.streakTitle}>{t('kidDashboard.streakTitle', { streak })}</Text>
                <Text style={styles.streakSub}>{t('kidDashboard.streakSub')}</Text>
              </View>
            </View>
          )}

          {/* Empty state */}
          {kidTasks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyTitle}>{t('kidDashboard.noQuestsYet')}</Text>
              <Text style={styles.emptySub}>
                {t('kidDashboard.askForQuests')}
              </Text>
            </View>
          )}

          {/* All done! */}
          {kidTasks.length > 0 && pendingTasks.length === 0 && waitingTasks.length === 0 && (
            <View style={styles.allDoneCard}>
              <Text style={styles.allDoneEmoji}>🎊</Text>
              <Text style={styles.allDoneTitle}>{t('kidDashboard.youreAStar')}</Text>
              <Text style={styles.allDoneSub}>{t('kidDashboard.allComplete')}</Text>
            </View>
          )}

          {/* ── Active quests */}
          {pendingTasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{t('kidDashboard.activeQuests')}</Text>
                <View style={[styles.sectionBadge, { backgroundColor: '#FF8C00' }]}>
                  <Text style={styles.sectionBadgeText}>{pendingTasks.length}</Text>
                </View>
              </View>
              {pendingTasks.map((task, i) => (
                <QuestCard
                  key={task.id}
                  task={task}
                  index={i}
                  kidColor={kid.color}
                  onDone={() => completeTask(task.id)}
                />
              ))}
            </View>
          )}

          {/* ── Waiting for approval */}
          {waitingTasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: '#B45309' }]}>{t('kidDashboard.beingChecked')}</Text>
                <View style={[styles.sectionBadge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.sectionBadgeText}>{waitingTasks.length}</Text>
                </View>
              </View>
              {waitingTasks.map(task => (
                <WaitingCard key={task.id} task={task} />
              ))}
            </View>
          )}

          {/* ── Rewards won */}
          {celebratedTasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: '#065F46' }]}>{t('kidDashboard.rewardsWon')}</Text>
                <View style={[styles.sectionBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.sectionBadgeText}>{celebratedTasks.length}</Text>
                </View>
              </View>
              {/* All-time stars summary */}
              <View style={styles.allTimeCard}>
                <Text style={styles.allTimeEmoji}>⭐</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.allTimeTitle}>{t('kidDashboard.starsEarnedAllTime', { count: totalStars })}</Text>
                  <Text style={styles.allTimeSub}>{getStarTitle(totalStars)} — keep it up!</Text>
                </View>
              </View>
              {celebratedTasks.slice().reverse().map(task => (
                <DoneCard key={task.id} task={task} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' }, // overridden inline with dynamic color

  // ─── Header
  header: {
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 22,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  headerMain: { alignItems: 'center' },

  // Avatar
  avatarWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  glowRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  avatarCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3.5,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 60 },

  // Name + badge
  kidName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 100,
    paddingHorizontal: 18,
    paddingVertical: 7,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  levelBadgeText: {
    color: '#FFE000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginBottom: 18,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statChip: { alignItems: 'center', flex: 1 },
  statEmoji: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '900', color: '#fff' },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.25)' },

  // XP bar
  xpSection: { width: '100%' },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  xpLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  xpCount: { fontSize: 12, color: '#FFE000', fontWeight: '800' },
  xpTrack: {
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 100,
    overflow: 'hidden',
    position: 'relative',
  },
  xpFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: '#FFE000',
    borderRadius: 100,
  },

  // ─── Content
  content: { padding: 20 },

  // Section
  section: { marginBottom: 30 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionBadge: {
    borderRadius: 100,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  sectionBadgeText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // ─── Quest card
  questCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  questCardBar: {
    height: 5,
    width: '100%',
  },
  questCardBody: { padding: 18 },
  questTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questEmojiBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  questEmojiText: { fontSize: 32 },
  questInfo: { flex: 1 },
  questTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
    lineHeight: 24,
  },
  questRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  questRewardStar: { fontSize: 15 },
  questRewardText: { fontSize: 14, color: '#64748B', fontWeight: '600', flex: 1 },
  questDueDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  questDueDateUrgent: {
    color: '#DC2626',
    fontWeight: '800',
  },

  // DO IT button
  doItWrap: {
    borderRadius: 16,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  doItOuter: { borderRadius: 16, overflow: 'hidden' },
  doItGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doItText: {
    color: '#1A0800',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },

  // ─── Waiting card
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  waitingEmojiBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  waitingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 5,
  },
  waitingStatus: { fontSize: 13, color: '#D97706', fontWeight: '700' },

  // ─── Done card
  doneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#6EE7B7',
  },
  doneEmojiBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  doneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  doneReward: { fontSize: 13, color: '#059669', fontWeight: '700' },
  doneDate: { fontSize: 11, color: '#94A3B8', fontWeight: '500', marginTop: 2 },
  doneTick: { fontSize: 24, marginLeft: 8 },

  // ─── Streak banner
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFB74D',
    gap: 14,
  },
  streakFire: { fontSize: 36 },
  streakTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#E65100',
    marginBottom: 2,
  },
  streakSub: {
    fontSize: 12,
    color: '#BF360C',
    fontWeight: '600',
  },

  // ─── All-time stars summary
  allTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    gap: 12,
  },
  allTimeEmoji: { fontSize: 32 },
  allTimeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  allTimeSub: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },

  // ─── Goal card
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#5C5FE4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#EEF2FF',
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalCardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    flex: 1,
  },
  goalChangeBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5C5FE4',
  },
  goalCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  goalCountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  goalReachedText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
  },
  goalTrack: {
    height: 14,
    backgroundColor: '#EEF2FF',
    borderRadius: 100,
    overflow: 'hidden',
  },
  goalFill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    backgroundColor: '#5C5FE4',
    borderRadius: 100,
  },
  // Goal form
  goalFormTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 12,
  },
  goalInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 13,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  goalFormBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
  },
  goalSaveBtn: {
    backgroundColor: '#5C5FE4',
    borderRadius: 100,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#5C5FE4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  goalSaveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  goalCancelText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  // No goal state
  setGoalTap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  setGoalEmoji: { fontSize: 36, marginBottom: 6 },
  setGoalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  setGoalSub: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // ─── States
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyEmoji: { fontSize: 72, marginBottom: 16 },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  allDoneCard: {
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
    borderRadius: 28,
    padding: 32,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  allDoneEmoji: { fontSize: 64, marginBottom: 12 },
  allDoneTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
    marginBottom: 8,
  },
  allDoneSub: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
});
