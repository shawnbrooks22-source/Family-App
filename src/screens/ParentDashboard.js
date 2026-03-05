import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const Tab = createBottomTabNavigator();

const TASK_EMOJIS = [
  '🧹', '🧽', '🛁', '📚', '🍽️', '🌱', '🐕', '🛏️',
  '👕', '🎒', '🚿', '♻️', '💻', '🎨', '🧺', '🌿',
];

const KID_EMOJIS = ['🦊', '🐱', '🐶', '🐸', '🐻', '🦁', '🐼', '🦄', '🐯', '🐰', '🦋', '🐬'];
const KID_COLORS = [
  '#FF6584', '#FFD700', '#43E97B', '#00B4D8',
  '#FF8C42', '#9B59B6', '#1ABC9C', '#E74C3C',
];

// ─── Approvals Tab ────────────────────────────────────────────────────────────

function ApprovalsTab({ navigation }) {
  const { tasks, family, approveTask } = useApp();
  const pendingApproval = tasks.filter(t => t.status === 'completed');

  function getKid(kidId) {
    return family.kids.find(k => k.id === kidId);
  }

  async function handleApprove(task) {
    const kid = getKid(task.assignedTo);
    await approveTask(task.id);
    Alert.alert(
      '🎉 Reward Released!',
      `${kid?.name || 'Your kid'} can now claim: ${task.reward}!`,
    );
  }

  return (
    <View style={styles.tabWrapper}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.tabScroll}>
        <Text style={styles.tabTitle}>🔔 Waiting for Approval</Text>
        {pendingApproval.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No completed tasks waiting.</Text>
          </View>
        ) : (
          pendingApproval.map(task => {
            const kid = getKid(task.assignedTo);
            return (
              <View key={task.id} style={styles.approvalCard}>
                <View style={styles.approvalKidRow}>
                  <Text style={styles.approvalKidEmoji}>{kid?.emoji || '🎉'}</Text>
                  <Text style={styles.approvalKidName}>{kid?.name || 'Unknown'}</Text>
                  <Text style={styles.approvalKidLabel}> completed a task!</Text>
                </View>
                <Text style={styles.approvalTaskTitle}>{task.emoji} {task.title}</Text>
                <View style={styles.approvalRewardRow}>
                  <Text style={styles.approvalRewardLabel}>Reward: </Text>
                  <Text style={styles.approvalRewardValue}>🎁 {task.reward}</Text>
                </View>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(task)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.approveBtnText}>Release Reward! 🎉</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── All Tasks Tab ─────────────────────────────────────────────────────────────

function AllTasksTab() {
  const { tasks, family, deleteTask } = useApp();

  function getKid(kidId) {
    return family.kids.find(k => k.id === kidId);
  }

  function statusInfo(status) {
    if (status === 'pending') return { label: '📋 To Do', color: '#FFD700' };
    if (status === 'completed') return { label: '⏳ Waiting', color: '#FF8C42' };
    return { label: '✅ Done', color: '#43E97B' };
  }

  function confirmDelete(task) {
    Alert.alert(
      'Delete Task?',
      `Remove "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
      ],
    );
  }

  return (
    <View style={styles.tabWrapper}>
      <ScrollView contentContainerStyle={styles.tabScroll}>
        <Text style={styles.tabTitle}>📋 All Tasks</Text>
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No tasks yet!</Text>
            <Text style={styles.emptySubtext}>Add some tasks in the Add Task tab.</Text>
          </View>
        ) : (
          tasks.map(task => {
            const kid = getKid(task.assignedTo);
            const { label, color } = statusInfo(task.status);
            return (
              <View key={task.id} style={styles.taskRow}>
                <Text style={styles.taskRowEmoji}>{task.emoji}</Text>
                <View style={styles.taskRowMiddle}>
                  <Text style={styles.taskRowTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskRowKid}>
                    {kid?.emoji} {kid?.name || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.taskRowRight}>
                  <View style={[styles.statusPill, { backgroundColor: color }]}>
                    <Text style={styles.statusPillText}>{label}</Text>
                  </View>
                  <TouchableOpacity onPress={() => confirmDelete(task)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── Add Task Tab ──────────────────────────────────────────────────────────────

function AddTaskTab() {
  const { family, addTask } = useApp();
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🧹');

  async function handleAdd() {
    if (!title.trim()) { Alert.alert('Oops!', 'Enter a task name! 📝'); return; }
    if (!reward.trim()) { Alert.alert('Oops!', 'Enter a reward! 🎁'); return; }
    if (!selectedKid) { Alert.alert('Oops!', 'Choose a kid! 👧'); return; }

    await addTask({
      title: title.trim(),
      reward: reward.trim(),
      assignedTo: selectedKid,
      emoji: selectedEmoji,
    });

    setTitle('');
    setReward('');
    setSelectedKid(null);
    Alert.alert('✅ Task Added!', 'Your kid can now see this quest!');
  }

  return (
    <View style={styles.tabWrapper}>
      <ScrollView
        contentContainerStyle={styles.tabScroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.tabTitle}>➕ Add New Task</Text>

        <View style={styles.formCard}>
          <Text style={styles.formLabel}>Task Name</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Clean your room, Do homework..."
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#ccc"
          />

          <Text style={styles.formLabel}>Task Emoji</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TASK_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnSelected]}
                onPress={() => setSelectedEmoji(e)}
              >
                <Text style={styles.emojiBtnText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.formLabel}>Reward 🎁</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. 30 min screen time, Ice cream!"
            value={reward}
            onChangeText={setReward}
            placeholderTextColor="#ccc"
          />

          <Text style={styles.formLabel}>Assign To</Text>
          <View style={styles.kidSelector}>
            {family.kids.map(kid => (
              <TouchableOpacity
                key={kid.id}
                style={[
                  styles.kidSelectBtn,
                  { backgroundColor: kid.color },
                  selectedKid === kid.id && styles.kidSelectBtnActive,
                ]}
                onPress={() => setSelectedKid(kid.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.kidSelectEmoji}>{kid.emoji}</Text>
                <Text style={styles.kidSelectName}>{kid.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.addTaskBtn} onPress={handleAdd} activeOpacity={0.85}>
            <Text style={styles.addTaskBtnText}>Assign Quest! ✨</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Family Tab ────────────────────────────────────────────────────────────────

function FamilyTab({ navigation }) {
  const { family, addKid, removeKid } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [kidName, setKidName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🦊');
  const [selectedColor, setSelectedColor] = useState(KID_COLORS[0]);

  async function handleAddKid() {
    if (!kidName.trim()) { Alert.alert('Oops!', 'Enter a name!'); return; }
    await addKid({ name: kidName.trim(), emoji: selectedEmoji, color: selectedColor });
    setKidName('');
    setShowAddForm(false);
    Alert.alert('✅ Kid Added!', `${kidName} joined the family!`);
  }

  function confirmRemoveKid(kid) {
    Alert.alert(
      `Remove ${kid.name}?`,
      'This will also remove all their tasks.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeKid(kid.id),
        },
      ],
    );
  }

  return (
    <View style={styles.tabWrapper}>
      <ScrollView
        contentContainerStyle={styles.tabScroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.tabTitle}>👨‍👩‍👧‍👦 Family</Text>

        <View style={styles.formCard}>
          {/* Parent row */}
          <Text style={styles.sectionHeader}>Parent</Text>
          <View style={styles.memberRow}>
            <View style={[styles.memberAvatarCircle, { backgroundColor: '#6C63FF' }]}>
              <Text style={styles.memberAvatarEmoji}>{family.parentEmoji}</Text>
            </View>
            <Text style={styles.memberName}>{family.parentName}</Text>
            <View style={styles.parentPill}>
              <Text style={styles.parentPillText}>👑 Parent</Text>
            </View>
          </View>

          {/* Kids */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Kids</Text>
          {family.kids.map(kid => (
            <View key={kid.id} style={styles.memberRow}>
              <View style={[styles.memberAvatarCircle, { backgroundColor: kid.color }]}>
                <Text style={styles.memberAvatarEmoji}>{kid.emoji}</Text>
              </View>
              <Text style={styles.memberName}>{kid.name}</Text>
              <TouchableOpacity onPress={() => confirmRemoveKid(kid)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add kid form */}
          {!showAddForm ? (
            <TouchableOpacity style={styles.addKidDashedBtn} onPress={() => setShowAddForm(true)}>
              <Text style={styles.addKidDashedText}>+ Add Another Kid</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.addKidInlineForm}>
              <Text style={styles.formLabel}>Kid's Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter name..."
                value={kidName}
                onChangeText={setKidName}
                placeholderTextColor="#ccc"
              />
              <Text style={styles.formLabel}>Emoji</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {KID_EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnSelected]}
                    onPress={() => setSelectedEmoji(e)}
                  >
                    <Text style={styles.emojiBtnText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorRow}>
                {KID_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorDotSelected,
                    ]}
                    onPress={() => setSelectedColor(c)}
                  />
                ))}
              </View>
              <View style={styles.addKidFormActions}>
                <TouchableOpacity
                  style={[styles.addTaskBtn, { flex: 1, marginRight: 8 }]}
                  onPress={handleAddKid}
                >
                  <Text style={styles.addTaskBtnText}>Add!</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelBtn, { flex: 1 }]}
                  onPress={() => setShowAddForm(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Back to home */}
          <TouchableOpacity
            style={[styles.addTaskBtn, { backgroundColor: '#FF6584', marginTop: 28 }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.addTaskBtnText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── ParentDashboard (root screen with tab navigator) ──────────────────────────

export default function ParentDashboard({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarShowIcon: false,
      }}
    >
      <Tab.Screen name="Approvals" options={{ tabBarLabel: '🔔 Approve' }}>
        {props => <ApprovalsTab {...props} navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen
        name="AllTasks"
        component={AllTasksTab}
        options={{ tabBarLabel: '📋 Tasks' }}
      />
      <Tab.Screen
        name="AddTask"
        component={AddTaskTab}
        options={{ tabBarLabel: '➕ Add' }}
      />
      <Tab.Screen name="Family" options={{ tabBarLabel: '👨‍👩‍👧 Family' }}>
        {props => <FamilyTab {...props} navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabWrapper: {
    flex: 1,
    backgroundColor: '#F5F0FF',
  },
  tabScroll: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  tabTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#333',
    marginBottom: 22,
  },
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#555',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#aaa',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Approval card
  approvalCard: {
    backgroundColor: 'white',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    borderLeftWidth: 6,
    borderLeftColor: '#FF8C42',
  },
  approvalKidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvalKidEmoji: {
    fontSize: 22,
    marginRight: 6,
  },
  approvalKidName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#555',
  },
  approvalKidLabel: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },
  approvalTaskTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#333',
    marginBottom: 10,
  },
  approvalRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  approvalRewardLabel: {
    fontSize: 15,
    color: '#999',
    fontWeight: '700',
  },
  approvalRewardValue: {
    fontSize: 16,
    color: '#555',
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: '#43E97B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#43E97B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  approveBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },

  // Task row
  taskRow: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  taskRowEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  taskRowMiddle: {
    flex: 1,
  },
  taskRowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
  },
  taskRowKid: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '700',
    marginTop: 3,
  },
  taskRowRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  statusPillText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 20,
  },

  // Form card
  formCard: {
    backgroundColor: 'white',
    borderRadius: 26,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#555',
    marginTop: 16,
    marginBottom: 9,
  },
  formInput: {
    borderWidth: 2.5,
    borderColor: '#DDD0FF',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  emojiBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: '#F5F0FF',
    marginRight: 8,
    marginBottom: 6,
  },
  emojiBtnSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#EAE4FF',
  },
  emojiBtnText: {
    fontSize: 28,
  },
  kidSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  kidSelectBtn: {
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    margin: 5,
    opacity: 0.65,
  },
  kidSelectBtnActive: {
    opacity: 1,
    borderWidth: 3.5,
    borderColor: '#333',
  },
  kidSelectEmoji: {
    fontSize: 28,
  },
  kidSelectName: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
    marginTop: 5,
  },
  addTaskBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  addTaskBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '900',
  },

  // Family tab
  sectionHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: '#444',
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  memberAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  memberAvatarEmoji: {
    fontSize: 28,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    flex: 1,
  },
  parentPill: {
    backgroundColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  parentPillText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
  removeText: {
    color: '#FF6584',
    fontWeight: '800',
    fontSize: 14,
  },
  addKidDashedBtn: {
    borderWidth: 2.5,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  addKidDashedText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '800',
  },
  addKidInlineForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F5FF',
    borderRadius: 18,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 5,
  },
  colorDotSelected: {
    borderWidth: 3.5,
    borderColor: '#333',
    transform: [{ scale: 1.2 }],
  },
  addKidFormActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelBtn: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#777',
    fontSize: 16,
    fontWeight: '700',
  },
});
