import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

export default function KidDashboard({ route, navigation }) {
  const { kidId } = route.params;
  const { family, tasks, completeTask } = useApp();
  const kid = family.kids.find(k => k.id === kidId);

  const kidTasks = tasks.filter(t => t.assignedTo === kidId);
  const pendingTasks = kidTasks.filter(t => t.status === 'pending');
  const completedTasks = kidTasks.filter(t => t.status === 'completed');
  const approvedTasks = kidTasks.filter(t => t.status === 'approved');

  const totalTasks = kidTasks.length;
  const doneTasks = completedTasks.length + approvedTasks.length;
  const progress = totalTasks > 0 ? doneTasks / totalTasks : 0;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const headerBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerBounce, {
      toValue: 1, friction: 4, tension: 80, useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress, duration: 900, useNativeDriver: false,
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

  async function handleDone(task) {
    await completeTask(task.id);
  }

  if (!kid) return null;

  const bgColors = deriveGradient(kid.color);

  return (
    <LinearGradient colors={bgColors} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Back button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Home</Text>
        </TouchableOpacity>

        {/* Kid header */}
        <View style={styles.headerSection}>
          <Animated.Text style={[styles.kidEmoji, { transform: [{ scale: headerBounce }] }]}>
            {kid.emoji}
          </Animated.Text>
          <Text style={styles.kidGreeting}>Hey, {kid.name}! 🌟</Text>
          {totalTasks > 0 && (
            <Text style={styles.kidScore}>{doneTasks} of {totalTasks} quests done!</Text>
          )}
        </View>

        {/* Progress bar */}
        {totalTasks > 0 && (
          <View style={styles.progressContainer}>
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
            <Text style={styles.progressLabel}>{Math.round(progress * 100)}% complete</Text>
          </View>
        )}

        {/* Empty state */}
        {totalTasks === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>No quests yet!</Text>
            <Text style={styles.emptySubtitle}>Ask your parent to add some chores.</Text>
          </View>
        )}

        {/* Pending tasks */}
        {pendingTasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📋 Your Quests</Text>
            </View>
            {pendingTasks.map(task => (
              <TaskCard key={task.id} task={task} status="pending" onDone={() => handleDone(task)} />
            ))}
          </>
        )}

        {/* Completed — waiting for parent */}
        {completedTasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>⏳ Waiting for Parent</Text>
            </View>
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} status="completed" />
            ))}
          </>
        )}

        {/* Approved / celebrated */}
        {approvedTasks.filter(t => t.celebrated).length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🏆 Rewards Collected!</Text>
            </View>
            {approvedTasks.filter(t => t.celebrated).map(task => (
              <TaskCard key={task.id} task={task} status="approved" />
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function deriveGradient(color) {
  const map = {
    '#FF6584': ['#FF6584', '#FF3D5E'],
    '#FFD700': ['#FFA500', '#FF6B00'],
    '#43E97B': ['#43E97B', '#00C853'],
    '#00B4D8': ['#00B4D8', '#0077B6'],
    '#FF8C42': ['#FF8C42', '#E65100'],
    '#9B59B6': ['#9B59B6', '#6C3483'],
    '#1ABC9C': ['#1ABC9C', '#0E8A72'],
    '#E74C3C': ['#E74C3C', '#C0392B'],
  };
  return map[color] || ['#6C63FF', '#4834d4'];
}

// ─── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, status, onDone }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  function handlePress() {
    if (pressed) return;
    setPressed(true);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.95, friction: 6, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start(() => {
      onDone && onDone();
    });
  }

  const accentColor = {
    pending: '#6C63FF',
    completed: '#FF8C42',
    approved: '#10B981',
  }[status];

  return (
    <Animated.View style={[styles.taskCard, { transform: [{ scale: scaleAnim }] }]}>
      {/* Colored left accent bar */}
      <View style={[styles.taskAccent, { backgroundColor: accentColor }]} />

      <View style={styles.taskCardInner}>
        <View style={styles.taskCardTop}>
          <Text style={styles.taskEmoji}>{task.emoji}</Text>
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskReward}>🎁 {task.reward}</Text>
          </View>
        </View>

        {status === 'pending' && (
          <TouchableOpacity style={styles.doneBtn} onPress={handlePress} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>✅ I Did It!</Text>
          </TouchableOpacity>
        )}

        {status === 'completed' && (
          <View style={styles.statusBadge}>
            <Text style={styles.waitingText}>⏳ Waiting for parent to approve…</Text>
          </View>
        )}

        {status === 'approved' && (
          <View style={[styles.statusBadge, styles.approvedBadge]}>
            <Text style={styles.approvedText}>🌟 REWARD COLLECTED!</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 48,
  },
  backBtn: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 100,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  backBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  kidEmoji: {
    fontSize: 88,
  },
  kidGreeting: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
  },
  kidScore: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginTop: 6,
  },
  progressContainer: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  progressTrack: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 100,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFD700',
    borderRadius: 100,
  },
  progressLabel: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    opacity: 0.95,
  },

  // ─── Task card
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  taskAccent: {
    width: 5,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  taskCardInner: {
    flex: 1,
    padding: 18,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  taskEmoji: {
    fontSize: 44,
    marginRight: 14,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  taskReward: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  waitingText: {
    color: '#FF8C42',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  approvedBadge: {
    backgroundColor: '#ECFDF5',
  },
  approvedText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
