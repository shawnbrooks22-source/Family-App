import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors, shadows } from '../theme/index';

const { width } = Dimensions.get('window');

// ─── Color → gradient mapping ─────────────────────────────────────────────────
const GRADIENT_MAP = {
  '#FF6B6B': ['#FF6B6B', '#E63946'],
  '#FF9F43': ['#FF9F43', '#E67E00'],
  '#FEC600': ['#FEC600', '#F4A100'],
  '#0BDA92': ['#0BDA92', '#00B074'],
  '#18D4D4': ['#18D4D4', '#0097A7'],
  '#54A8FF': ['#54A8FF', '#1565C0'],
  '#A78BFA': ['#A78BFA', '#7C3AED'],
  '#F472B6': ['#F472B6', '#DB2777'],
  // Legacy colors fallbacks
  '#FF6584': ['#FF6584', '#E63946'],
  '#FFD700': ['#FEC600', '#F4A100'],
  '#43E97B': ['#0BDA92', '#00B074'],
  '#00B4D8': ['#18D4D4', '#0097A7'],
  '#FF8C42': ['#FF9F43', '#E67E00'],
  '#9B59B6': ['#A78BFA', '#7C3AED'],
  '#1ABC9C': ['#0BDA92', '#00B074'],
  '#E74C3C': ['#FF6B6B', '#E63946'],
};

function getGradient(color) {
  return GRADIENT_MAP[color] || [colors.primary, colors.primaryDark];
}

// ─── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, status, onDone }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const doneAnim = useRef(new Animated.Value(1)).current;

  function handlePress() {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start(() => {
      if (onDone) onDone();
    });
  }

  const accent = {
    pending: '#fff',
    completed: 'rgba(255,255,255,0.5)',
    approved: 'rgba(255,255,255,0.3)',
  }[status];

  const cardBg = {
    pending: 'rgba(255,255,255,0.97)',
    completed: 'rgba(255,255,255,0.75)',
    approved: 'rgba(255,255,255,0.6)',
  }[status];

  return (
    <Animated.View style={[styles.taskCard, { backgroundColor: cardBg, transform: [{ scale: scaleAnim }] }]}>
      {/* Left accent strip */}
      <View
        style={[
          styles.taskStrip,
          {
            backgroundColor:
              status === 'pending' ? 'rgba(92,95,228,0.8)' :
              status === 'completed' ? 'rgba(245,158,11,0.8)' :
              'rgba(16,185,129,0.8)',
          },
        ]}
      />

      <View style={styles.taskCardBody}>
        {/* Top row: emoji + info */}
        <View style={styles.taskTopRow}>
          <View style={styles.taskEmojiWrap}>
            <Text style={styles.taskEmoji}>{task.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardIcon}>🎁</Text>
              <Text style={styles.rewardText}>{task.reward}</Text>
            </View>
          </View>

          {/* Status badge for completed/approved */}
          {status === 'completed' && (
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingBadgeText}>⏳</Text>
            </View>
          )}
          {status === 'approved' && (
            <View style={styles.doneBadge}>
              <Text style={styles.doneBadgeText}>✓</Text>
            </View>
          )}
        </View>

        {/* Action row */}
        {status === 'pending' && (
          <TouchableOpacity style={styles.doneBtn} onPress={handlePress} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>I Did It! ✅</Text>
          </TouchableOpacity>
        )}

        {status === 'completed' && (
          <View style={styles.pendingApprovalRow}>
            <Text style={styles.pendingApprovalText}>Waiting for parent to check…</Text>
          </View>
        )}

        {status === 'approved' && (
          <View style={styles.approvedRow}>
            <Text style={styles.approvedText}>🌟 Reward collected!</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function KidDashboard({ route, navigation }) {
  const { kidId } = route.params;
  const { family, tasks, completeTask } = useApp();
  const kid = family.kids.find(k => k.id === kidId);

  const kidTasks = tasks.filter(t => t.assignedTo === kidId);
  const pendingTasks = kidTasks.filter(t => t.status === 'pending');
  const waitingTasks = kidTasks.filter(t => t.status === 'completed');
  const approvedTasks = kidTasks.filter(t => t.status === 'approved');
  const celebratedTasks = approvedTasks.filter(t => t.celebrated);

  const totalTasks = kidTasks.length;
  const doneTasks = waitingTasks.length + approvedTasks.length;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0.8)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Navigate to celebration for newly approved, uncelebrated tasks
  useEffect(() => {
    const uncelebrated = approvedTasks.filter(t => !t.celebrated);
    if (uncelebrated.length > 0) {
      navigation.navigate('Celebration', {
        taskId: uncelebrated[0].id,
        reward: uncelebrated[0].reward,
        kidName: kid?.name,
      });
    }
  }, [tasks]);

  if (!kid) return null;

  const gradientColors = getGradient(kid.color);
  const progressPercent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Gradient Header ─────────────────────────────────────────────── */}
        <LinearGradient colors={gradientColors} style={styles.header}>
          {/* Back */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.backBtnText}>← Home</Text>
          </TouchableOpacity>

          {/* Kid info */}
          <Animated.View
            style={[
              styles.kidInfoBlock,
              { transform: [{ scale: headerScale }], opacity: headerOpacity },
            ]}
          >
            <View style={styles.kidAvatarCircle}>
              <Text style={styles.kidAvatarEmoji}>{kid.emoji}</Text>
            </View>
            <Text style={styles.kidName}>{kid.name}</Text>
            {totalTasks > 0 && (
              <Text style={styles.kidSubline}>
                {doneTasks} of {totalTasks} quests done
              </Text>
            )}
          </Animated.View>

          {/* Progress bar */}
          {totalTasks > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{progressPercent}%</Text>
            </View>
          )}
        </LinearGradient>

        {/* ─── Task content ─────────────────────────────────────────────────── */}
        <View style={styles.taskContent}>
          {totalTasks === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={styles.emptyTitle}>No quests yet!</Text>
              <Text style={styles.emptySub}>Ask your parent to add some chores for you.</Text>
            </View>
          )}

          {/* Pending */}
          {pendingTasks.length > 0 && (
            <Section title="Your Quests" count={pendingTasks.length} accent={colors.primary}>
              {pendingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  status="pending"
                  onDone={() => completeTask(task.id)}
                />
              ))}
            </Section>
          )}

          {/* Waiting */}
          {waitingTasks.length > 0 && (
            <Section title="Waiting for Approval" count={waitingTasks.length} accent={colors.warning}>
              {waitingTasks.map(task => (
                <TaskCard key={task.id} task={task} status="completed" />
              ))}
            </Section>
          )}

          {/* Done */}
          {celebratedTasks.length > 0 && (
            <Section title="Rewards Collected" count={celebratedTasks.length} accent={colors.success}>
              {celebratedTasks.map(task => (
                <TaskCard key={task.id} task={task} status="approved" />
              ))}
            </Section>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, count, accent, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccentDot, { backgroundColor: accent }]} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={[styles.sectionCount, { backgroundColor: accent + '20' }]}>
          <Text style={[styles.sectionCountText, { color: accent }]}>{count}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4F8',
  },

  // ─── Header
  header: {
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  kidInfoBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  kidAvatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  kidAvatarEmoji: {
    fontSize: 54,
  },
  kidName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  kidSubline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },

  // Progress
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderRadius: 100,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },

  // ─── Task content area
  taskContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // ─── Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text1,
    letterSpacing: -0.2,
  },
  sectionCount: {
    borderRadius: 100,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Task card
  taskCard: {
    borderRadius: 18,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.md,
  },
  taskStrip: {
    width: 5,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  taskCardBody: {
    flex: 1,
    padding: 16,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskEmojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskEmoji: {
    fontSize: 26,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 4,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rewardIcon: { fontSize: 13 },
  rewardText: {
    fontSize: 13,
    color: colors.text2,
    fontWeight: '600',
    flex: 1,
  },
  waitingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  waitingBadgeText: { fontSize: 15 },
  doneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  doneBadgeText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '800',
  },

  // Action rows
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 13,
    alignItems: 'center',
    ...shadows.sm,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  pendingApprovalRow: {
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  pendingApprovalText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  approvedRow: {
    backgroundColor: colors.successLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  approvedText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: colors.text3,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
  },
});
