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
    // Bounce the emoji in on mount
    Animated.spring(headerBounce, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Detect newly approved un-celebrated tasks → navigate to celebration
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Home</Text>
        </TouchableOpacity>

        {/* Kid header */}
        <View style={styles.headerSection}>
          <Animated.Text
            style={[styles.kidEmoji, { transform: [{ scale: headerBounce }] }]}
          >
            {kid.emoji}
          </Animated.Text>
          <Text style={styles.kidGreeting}>Hey, {kid.name}! 🌟</Text>
          {totalTasks > 0 && (
            <Text style={styles.kidScore}>
              ⭐ {doneTasks} of {totalTasks} quests done!
            </Text>
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
              <Text style={styles.progressLabel}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Empty state */}
        {totalTasks === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>No quests yet!</Text>
            <Text style={styles.emptySubtitle}>
              Ask your parent to add some chores.
            </Text>
          </View>
        )}

        {/* Pending tasks */}
        {pendingTasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📋 Your Quests</Text>
            {pendingTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                status="pending"
                onDone={() => handleDone(task)}
              />
            ))}
          </>
        )}

        {/* Completed (waiting for parent) */}
        {completedTasks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>⏳ Waiting for Parent</Text>
            {completedTasks.map(task => (
              <TaskCard key={task.id} task={task} status="completed" />
            ))}
          </>
        )}

        {/* Approved / celebrated */}
        {approvedTasks.filter(t => t.celebrated).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🏆 Rewards Collected!</Text>
            {approvedTasks
              .filter(t => t.celebrated)
              .map(task => (
                <TaskCard key={task.id} task={task} status="approved" />
              ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

// Derive a gradient from the kid's color
function deriveGradient(color) {
  const colorMap = {
    '#FF6584': ['#FF6584', '#FF3D5E'],
    '#FFD700': ['#FFA500', '#FF6B00'],
    '#43E97B': ['#43E97B', '#00C853'],
    '#00B4D8': ['#00B4D8', '#0077B6'],
    '#FF8C42': ['#FF8C42', '#E65100'],
    '#9B59B6': ['#9B59B6', '#6C3483'],
    '#1ABC9C': ['#1ABC9C', '#0E8A72'],
    '#E74C3C': ['#E74C3C', '#C0392B'],
  };
  return colorMap[color] || ['#667eea', '#764ba2'];
}

// ─── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, status, onDone }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false);

  function handlePress() {
    if (pressed) return;
    setPressed(true);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.93,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDone && onDone();
    });
  }

  const cardStyles = {
    pending: { bg: 'white', borderColor: '#FFD700', borderWidth: 3 },
    completed: { bg: '#FFF8F0', borderColor: '#FF8C42', borderWidth: 3 },
    approved: { bg: '#F0FFF6', borderColor: '#43E97B', borderWidth: 3 },
  }[status];

  return (
    <Animated.View
      style={[
        styles.taskCard,
        {
          backgroundColor: cardStyles.bg,
          borderColor: cardStyles.borderColor,
          borderWidth: cardStyles.borderWidth,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.taskCardTop}>
        <Text style={styles.taskEmoji}>{task.emoji}</Text>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskReward}>🎁 {task.reward}</Text>
        </View>
      </View>

      {status === 'pending' && (
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <Text style={styles.doneBtnText}>✅ I Did It!</Text>
        </TouchableOpacity>
      )}

      {status === 'completed' && (
        <View style={styles.waitingBadge}>
          <Text style={styles.waitingText}>⏳ Waiting for parent to release reward…</Text>
        </View>
      )}

      {status === 'approved' && (
        <View style={styles.approvedBadge}>
          <Text style={styles.approvedText}>🌟 REWARD COLLECTED! 🌟</Text>
        </View>
      )}
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
    marginBottom: 16,
  },
  backBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  kidEmoji: {
    fontSize: 90,
  },
  kidGreeting: {
    fontSize: 34,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  kidScore: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
    marginTop: 6,
  },
  progressContainer: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  progressTrack: {
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 13,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFD700',
    borderRadius: 13,
  },
  progressLabel: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
    zIndex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: 'white',
    marginBottom: 14,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  taskCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 7,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskEmoji: {
    fontSize: 52,
    marginRight: 16,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#333',
    marginBottom: 5,
  },
  taskReward: {
    fontSize: 15,
    color: '#777',
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  doneBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  waitingBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  waitingText: {
    color: '#FF8C42',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  approvedBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  approvedText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
});
