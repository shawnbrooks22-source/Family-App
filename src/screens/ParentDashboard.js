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

// ─── Approvals Tab ─────────────────────────────────────────────────────────────

function ApprovalsTab({ navigation }) {
  const { tasks, family, approveTask } = useApp();
  const pendingApproval = tasks.filter(t => t.status === 'completed');

  function getKid(kidId) {
    return family.kids.find(k => k.id === kidId);
  }

  async function handleApprove(task) {
    const kid = getKid(task.assignedTo);
    await approveTask(task.id);
    Alert.alert('🎉 Reward Released!', `${kid?.name || 'Your kid'} can now claim: ${task.reward}!`);
  }

  return (
    <View style={styles.tabWrapper}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.tabScroll}>
        <Text style={styles.tabTitle}>Approvals</Text>

        {pendingApproval.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No tasks waiting for approval.</Text>
          </View>
        ) : (
          pendingApproval.map(task => {
            const kid = getKid(task.assignedTo);
            return (
              <View key={task.id} style={styles.approvalCard}>
                <View style={styles.approvalKidRow}>
                  <View style={[styles.approvalKidAvatar, { backgroundColor: kid?.color || '#6C63FF' }]}>
                    <Text style={styles.approvalKidAvatarText}>{kid?.emoji || '🎉'}</Text>
                  </View>
                  <View>
                    <Text style={styles.approvalKidName}>{kid?.name || 'Unknown'}</Text>
                    <Text style={styles.approvalKidLabel}>completed a task!</Text>
                  </View>
                </View>

                <Text style={styles.approvalTaskTitle}>{task.emoji} {task.title}</Text>

                <View style={styles.approvalRewardRow}>
                  <Text style={styles.approvalRewardLabel}>Reward</Text>
                  <Text style={styles.approvalRewardValue}>🎁 {task.reward}</Text>
                </View>

                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(task)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.approveBtnText}>Release Reward 🎉</Text>
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
    if (status === 'pending') return { label: 'To Do', color: '#6C63FF' };
    if (status === 'completed') return { label: 'Waiting', color: '#FF8C42' };
    return { label: 'Done', color: '#10B981' };
  }

  function confirmDelete(task) {
    Alert.alert('Delete Task?', `Remove "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  }

  return (
    <View style={styles.tabWrapper}>
      <ScrollView contentContainerStyle={styles.tabScroll}>
        <Text style={styles.tabTitle}>All Tasks</Text>

        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyText}>No tasks yet!</Text>
            <Text style={styles.emptySubtext}>Add tasks in the Add tab.</Text>
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
                  <Text style={styles.taskRowKid}>{kid?.emoji} {kid?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.taskRowRight}>
                  <View style={[styles.statusPill, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.statusPillText, { color }]}>{label}</Text>
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

    await addTask({ title: title.trim(), reward: reward.trim(), assignedTo: selectedKid, emoji: selectedEmoji });
    setTitle('');
    setReward('');
    setSelectedKid(null);
    Alert.alert('✅ Task Added!', 'Your kid can now see this quest!');
  }

  return (
    <View style={styles.tabWrapper}>
      <ScrollView contentContainerStyle={styles.tabScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.tabTitle}>Add Task</Text>

        <View style={styles.formCard}>
          <Text style={styles.formLabel}>TASK NAME</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. Clean your room, Do homework..."
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#C4B5FD"
          />

          <Text style={styles.formLabel}>TASK ICON</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
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

          <Text style={styles.formLabel}>REWARD 🎁</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g. 30 min screen time, Ice cream!"
            value={reward}
            onChangeText={setReward}
            placeholderTextColor="#C4B5FD"
          />

          <Text style={styles.formLabel}>ASSIGN TO</Text>
          <View style={styles.kidSelector}>
            {family.kids.map(kid => (
              <TouchableOpacity
                key={kid.id}
                style={[
                  styles.kidSelectBtn,
                  { backgroundColor: kid.color + (selectedKid === kid.id ? 'FF' : '55') },
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

          <TouchableOpacity style={styles.primaryBtn} onPress={handleAdd} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Assign Quest ✨</Text>
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
  const [kidPhone, setKidPhone] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🦊');
  const [selectedColor, setSelectedColor] = useState(KID_COLORS[0]);

  async function handleAddKid() {
    if (!kidName.trim()) { Alert.alert('Oops!', 'Enter a name!'); return; }
    await addKid({ name: kidName.trim(), emoji: selectedEmoji, color: selectedColor, phone: kidPhone.trim() });
    setKidName('');
    setKidPhone('');
    setShowAddForm(false);
    Alert.alert('✅ Kid Added!', `${kidName} joined the family!`);
  }

  function confirmRemoveKid(kid) {
    Alert.alert(`Remove ${kid.name}?`, 'This will also remove all their tasks.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeKid(kid.id) },
    ]);
  }

  return (
    <View style={styles.tabWrapper}>
      <ScrollView contentContainerStyle={styles.tabScroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.tabTitle}>Family</Text>

        <View style={styles.formCard}>
          {/* Parent */}
          <Text style={styles.sectionHeader}>PARENT</Text>
          <View style={styles.memberRow}>
            <View style={[styles.memberAvatar, { backgroundColor: '#6C63FF' }]}>
              <Text style={styles.memberAvatarEmoji}>{family.parentEmoji}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{family.parentName}</Text>
              {family.parentPhone ? (
                <Text style={styles.memberPhone}>📞 {family.parentPhone}</Text>
              ) : null}
            </View>
            <View style={styles.parentPill}>
              <Text style={styles.parentPillText}>👑 Parent</Text>
            </View>
          </View>

          {/* Kids */}
          <Text style={[styles.sectionHeader, { marginTop: 24 }]}>KIDS</Text>
          {family.kids.map(kid => (
            <View key={kid.id} style={styles.memberRow}>
              <View style={[styles.memberAvatar, { backgroundColor: kid.color }]}>
                <Text style={styles.memberAvatarEmoji}>{kid.emoji}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{kid.name}</Text>
                {kid.phone ? (
                  <Text style={styles.memberPhone}>📞 {kid.phone}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => confirmRemoveKid(kid)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
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
              <Text style={styles.formLabel}>KID'S NAME</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter name..."
                value={kidName}
                onChangeText={setKidName}
                placeholderTextColor="#C4B5FD"
              />

              <Text style={styles.formLabel}>PHONE NUMBER (optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 555-867-5309"
                value={kidPhone}
                onChangeText={setKidPhone}
                keyboardType="phone-pad"
                placeholderTextColor="#C4B5FD"
              />

              <Text style={styles.formLabel}>EMOJI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
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

              <Text style={styles.formLabel}>COLOR</Text>
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
                  style={[styles.primaryBtn, { flex: 1, marginRight: 8, marginTop: 0 }]}
                  onPress={handleAddKid}
                >
                  <Text style={styles.primaryBtnText}>Add!</Text>
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

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#FF6584', marginTop: 24 }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryBtnText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── ParentDashboard root ──────────────────────────────────────────────────────

export default function ParentDashboard({ navigation }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen name="Approvals" options={{ tabBarLabel: '🔔 Approve' }}>
        {props => <ApprovalsTab {...props} navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="AllTasks" component={AllTasksTab} options={{ tabBarLabel: '📋 Tasks' }} />
      <Tab.Screen name="AddTask" component={AddTaskTab} options={{ tabBarLabel: '➕ Add' }} />
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
    backgroundColor: '#F8F7FF',
  },
  tabScroll: {
    paddingTop: 64,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  tabTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A2E',
    marginBottom: 22,
  },
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F3F0FF',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── Approval card
  approvalCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6C63FF',
  },
  approvalKidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  approvalKidAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  approvalKidAvatarText: {
    fontSize: 22,
  },
  approvalKidName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  approvalKidLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  approvalTaskTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A2E',
    marginBottom: 10,
  },
  approvalRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  approvalRewardLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  approvalRewardValue: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '700',
  },
  approveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 100,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },

  // ─── Task row
  taskRow: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  taskRowEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  taskRowMiddle: {
    flex: 1,
  },
  taskRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  taskRowKid: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '600',
    marginTop: 2,
  },
  taskRowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusPill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 18,
  },

  // ─── Form card
  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 1,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: '#EDE9FF',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFF',
  },
  emojiScroll: {
    marginBottom: 4,
  },
  emojiBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F5F3FF',
    marginRight: 8,
  },
  emojiBtnSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#EDE9FF',
  },
  emojiBtnText: {
    fontSize: 26,
  },
  kidSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  kidSelectBtn: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  kidSelectBtnActive: {
    borderWidth: 3,
    borderColor: '#1A1A2E',
  },
  kidSelectEmoji: {
    fontSize: 26,
  },
  kidSelectName: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },

  // ─── Family tab
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 12,
    letterSpacing: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 4,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  memberAvatarEmoji: {
    fontSize: 26,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  memberPhone: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  parentPill: {
    backgroundColor: '#EDE9FF',
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  parentPillText: {
    color: '#6C63FF',
    fontWeight: '800',
    fontSize: 12,
  },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  removeBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  addKidDashedBtn: {
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 18,
  },
  addKidDashedText: {
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: '700',
  },
  addKidInlineForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FAFAFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE9FF',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1A1A2E',
    transform: [{ scale: 1.18 }],
  },
  addKidFormActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
});
