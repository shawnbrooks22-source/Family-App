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
  Pressable,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors, kidColors, shadows } from '../theme/index';

const Tab = createBottomTabNavigator();

const TASK_EMOJIS = [
  '🧹', '🧽', '🛁', '📚', '🍽️', '🌱', '🐕', '🛏️',
  '👕', '🎒', '🚿', '♻️', '💻', '🎨', '🧺', '🌿',
];
const KID_EMOJIS = ['🦊', '🐱', '🐶', '🐸', '🐻', '🦁', '🐼', '🦄', '🐯', '🐰', '🦋', '🐬'];

// ─── Shared helpers ────────────────────────────────────────────────────────────

function useKid(kidId) {
  const { family } = useApp();
  return family.kids.find(k => k.id === kidId);
}

function ScreenHeader({ title, subtitle, rightContent }) {
  return (
    <SafeAreaView style={headerStyles.safe}>
      <View style={headerStyles.row}>
        <View style={{ flex: 1 }}>
          <Text style={headerStyles.title}>{title}</Text>
          {subtitle ? <Text style={headerStyles.sub}>{subtitle}</Text> : null}
        </View>
        {rightContent}
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  safe: { backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text1, letterSpacing: -0.4 },
  sub: { fontSize: 13, color: colors.text3, fontWeight: '500', marginTop: 2 },
});

// ─── Home / Approvals Tab ──────────────────────────────────────────────────────

function HomeTab({ navigation }) {
  const { tasks, family, approveTask } = useApp();
  const pendingApproval = tasks.filter(t => t.status === 'completed');

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'approved').length;
  const waitingTasks = tasks.filter(t => t.status === 'completed').length;

  async function handleApprove(task) {
    await approveTask(task.id);
  }

  return (
    <View style={styles.tabWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      <ScreenHeader
        title="Parent Hub"
        subtitle={`Welcome back, ${family.parentName}!`}
        rightContent={
          <View style={[styles.avatarSm, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 20 }}>{family.parentEmoji}</Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Total" value={totalTasks} color={colors.primary} icon="list" />
          <StatCard label="Waiting" value={waitingTasks} color={colors.warning} icon="time" />
          <StatCard label="Approved" value={doneTasks} color={colors.success} icon="checkmark-circle" />
        </View>

        {/* Needs approval */}
        <SectionHeader
          title="Needs Approval"
          count={pendingApproval.length}
          countColor={colors.warning}
        />

        {pendingApproval.length === 0 ? (
          <EmptyState
            icon="✨"
            title="All caught up!"
            sub="No tasks waiting for your approval right now."
          />
        ) : (
          pendingApproval.map(task => {
            const kid = family.kids.find(k => k.id === task.assignedTo);
            return (
              <ApprovalCard
                key={task.id}
                task={task}
                kid={kid}
                onApprove={() => handleApprove(task)}
              />
            );
          })
        )}

        {/* Back to home */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.homeBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ApprovalCard({ task, kid, onApprove }) {
  return (
    <View style={styles.approvalCard}>
      {/* Kid info */}
      <View style={styles.approvalKidRow}>
        <View style={[styles.kidAvatar, { backgroundColor: kid?.color || colors.primary }]}>
          <Text style={{ fontSize: 22 }}>{kid?.emoji || '🎉'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.approvalKidName}>{kid?.name || 'Unknown'}</Text>
          <Text style={styles.approvalKidLabel}>completed a quest!</Text>
        </View>
        <View style={styles.waitBadge}>
          <Text style={styles.waitBadgeText}>Waiting</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.approvalDivider} />

      {/* Task info */}
      <Text style={styles.approvalTaskTitle}>
        {task.emoji}  {task.title}
      </Text>
      <View style={styles.approvalRewardRow}>
        <Ionicons name="gift-outline" size={15} color={colors.text3} />
        <Text style={styles.approvalRewardText}>{task.reward}</Text>
      </View>

      {/* Approve button */}
      <TouchableOpacity style={styles.approveBtn} onPress={onApprove} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.approveBtnText}>Release Reward</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab() {
  const { tasks, family, deleteTask } = useApp();
  const [filter, setFilter] = useState('all');

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'To Do' },
    { key: 'completed', label: 'Waiting' },
    { key: 'approved', label: 'Done' },
  ];

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  function statusInfo(status) {
    if (status === 'pending') return { label: 'To Do', color: colors.primary, bg: colors.primaryLight };
    if (status === 'completed') return { label: 'Waiting', color: colors.warning, bg: colors.warningLight };
    return { label: 'Done', color: colors.success, bg: colors.successLight };
  }

  function confirmDelete(task) {
    Alert.alert('Delete Quest?', `Remove "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  }

  return (
    <View style={styles.tabWrapper}>
      <ScreenHeader title="All Quests" subtitle={`${tasks.length} total`} />

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState icon="📝" title="No quests here" sub="Try a different filter or add new quests." />
        ) : (
          filtered.map(task => {
            const kid = family.kids.find(k => k.id === task.assignedTo);
            const s = statusInfo(task.status);
            return (
              <View key={task.id} style={styles.taskRow}>
                <View style={styles.taskRowLeft}>
                  <Text style={styles.taskRowEmoji}>{task.emoji}</Text>
                </View>
                <View style={styles.taskRowMiddle}>
                  <Text style={styles.taskRowTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskRowKid}>
                    {kid ? `${kid.emoji} ${kid.name}` : 'Unknown'}
                  </Text>
                </View>
                <View style={styles.taskRowRight}>
                  <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusPillText, { color: s.color }]}>{s.label}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(task)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginTop: 4 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.text3} />
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
  const [success, setSuccess] = useState(false);

  async function handleAdd() {
    if (!title.trim()) { Alert.alert('Enter a quest name', 'What do you want your kid to do?'); return; }
    if (!reward.trim()) { Alert.alert('Add a reward', "What will your kid earn for completing this?"); return; }
    if (!selectedKid) { Alert.alert('Assign to a kid', 'Choose who should complete this quest.'); return; }

    await addTask({
      title: title.trim(),
      reward: reward.trim(),
      assignedTo: selectedKid,
      emoji: selectedEmoji,
    });

    setTitle('');
    setReward('');
    setSelectedKid(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <View style={styles.tabWrapper}>
      <ScreenHeader title="New Quest" subtitle="Assign a chore with a reward" />

      <ScrollView
        contentContainerStyle={styles.tabScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {success && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.successBannerText}>Quest assigned!</Text>
          </View>
        )}

        {/* Task name */}
        <FormLabel label="Quest Name" />
        <TextInput
          style={styles.formInput}
          placeholder="e.g. Clean your room, Do homework…"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.text3}
          returnKeyType="next"
        />

        {/* Emoji */}
        <FormLabel label="Quest Icon" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {TASK_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.taskEmojiBtn, selectedEmoji === e && styles.taskEmojiBtnActive]}
              onPress={() => setSelectedEmoji(e)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reward */}
        <FormLabel label="Reward 🎁" />
        <TextInput
          style={styles.formInput}
          placeholder="e.g. 30 min screen time, Ice cream!"
          value={reward}
          onChangeText={setReward}
          placeholderTextColor={colors.text3}
          returnKeyType="done"
        />

        {/* Assign to */}
        <FormLabel label="Assign To" />
        <View style={styles.kidPicker}>
          {family.kids.map(kid => (
            <TouchableOpacity
              key={kid.id}
              style={[
                styles.kidPickerBtn,
                { backgroundColor: kid.color + (selectedKid === kid.id ? 'FF' : '30') },
                selectedKid === kid.id && styles.kidPickerBtnActive,
              ]}
              onPress={() => setSelectedKid(kid.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 26 }}>{kid.emoji}</Text>
              <Text
                style={[
                  styles.kidPickerName,
                  { color: selectedKid === kid.id ? '#fff' : colors.text1 },
                ]}
              >
                {kid.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.assignBtn} onPress={handleAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.assignBtnText}>Assign Quest</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Family Tab ────────────────────────────────────────────────────────────────

function FamilyTab({ navigation }) {
  const { family, addKid, removeKid } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [kidName, setKidName] = useState('');
  const [kidPhone, setKidPhone] = useState('');
  const [kidEmoji, setKidEmoji] = useState('🦊');
  const [kidColor, setKidColor] = useState(kidColors[0]);

  async function handleAddKid() {
    if (!kidName.trim()) { Alert.alert('Enter a name'); return; }
    await addKid({ name: kidName.trim(), emoji: kidEmoji, color: kidColor, phone: kidPhone.trim() });
    setKidName('');
    setKidPhone('');
    setShowAdd(false);
  }

  function confirmRemove(kid) {
    Alert.alert(`Remove ${kid.name}?`, 'This will also remove all their quests.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeKid(kid.id) },
    ]);
  }

  return (
    <View style={styles.tabWrapper}>
      <ScreenHeader title="Family" subtitle={`${family.kids.length + 1} members`} />

      <ScrollView
        contentContainerStyle={styles.tabScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Parent */}
        <Text style={styles.sectionLabel}>PARENT</Text>
        <View style={styles.memberCard}>
          <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 26 }}>{family.parentEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{family.parentName}</Text>
            {family.parentPhone ? (
              <Text style={styles.memberPhone}>{family.parentPhone}</Text>
            ) : null}
          </View>
          <View style={styles.parentRolePill}>
            <Text style={styles.parentRolePillText}>Parent</Text>
          </View>
        </View>

        {/* Kids */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>KIDS ({family.kids.length})</Text>
        {family.kids.map(kid => (
          <View key={kid.id} style={styles.memberCard}>
            <View style={[styles.memberAvatar, { backgroundColor: kid.color }]}>
              <Text style={{ fontSize: 26 }}>{kid.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{kid.name}</Text>
              {kid.phone ? <Text style={styles.memberPhone}>{kid.phone}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={() => confirmRemove(kid)}
              style={styles.removeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="person-remove-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add kid */}
        {!showAdd ? (
          <TouchableOpacity style={styles.addKidDashedBtn} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addKidDashedText}>Add Another Kid</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addKidForm}>
            <Text style={styles.addKidFormTitle}>New Kid</Text>

            <FormLabel label="Name" />
            <TextInput
              style={styles.formInput}
              placeholder="Kid's name…"
              value={kidName}
              onChangeText={setKidName}
              placeholderTextColor={colors.text3}
            />

            <FormLabel label="Phone" />
            <TextInput
              style={styles.formInput}
              placeholder="Optional"
              value={kidPhone}
              onChangeText={setKidPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.text3}
            />

            <FormLabel label="Emoji" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {KID_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.taskEmojiBtn, kidEmoji === e && styles.taskEmojiBtnActive]}
                  onPress={() => setKidEmoji(e)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FormLabel label="Color" />
            <View style={styles.colorRow}>
              {kidColors.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setKidColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    kidColor === c && styles.colorDotActive,
                  ]}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            <View style={styles.addKidFormBtns}>
              <TouchableOpacity
                style={[styles.assignBtn, { flex: 1 }]}
                onPress={handleAddKid}
                activeOpacity={0.85}
              >
                <Text style={styles.assignBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => setShowAdd(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelFormBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Shared mini-components ────────────────────────────────────────────────────

function SectionHeader({ title, count, countColor }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
      {count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: countColor }]}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>{sub}</Text>
    </View>
  );
}

function FormLabel({ label }) {
  return <Text style={styles.formLabel}>{label}</Text>;
}

// ─── ParentDashboard root ──────────────────────────────────────────────────────

export default function ParentDashboard({ navigation }) {
  const { tasks } = useApp();
  const pendingCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text3,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Tasks: focused ? 'list' : 'list-outline',
            AddTask: focused ? 'add-circle' : 'add-circle-outline',
            Family: focused ? 'people' : 'people-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: 'Home',
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.warning, fontSize: 10 },
        }}
      >
        {props => <HomeTab {...props} navigation={navigation} />}
      </Tab.Screen>

      <Tab.Screen
        name="Tasks"
        component={TasksTab}
        options={{ tabBarLabel: 'Quests' }}
      />

      <Tab.Screen
        name="AddTask"
        component={AddTaskTab}
        options={{ tabBarLabel: 'Add' }}
      />

      <Tab.Screen
        name="Family"
        options={{ tabBarLabel: 'Family' }}
      >
        {props => <FamilyTab {...props} navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabWrapper: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
    ...shadows.sm,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ─── Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text3,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text1,
    letterSpacing: -0.2,
  },
  countBadge: {
    borderRadius: 100,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Approval card
  approvalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    ...shadows.md,
  },
  approvalKidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kidAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  approvalKidName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text1,
  },
  approvalKidLabel: {
    fontSize: 12,
    color: colors.text3,
    fontWeight: '500',
  },
  waitBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  waitBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  approvalDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 12,
  },
  approvalTaskTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 8,
  },
  approvalRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  approvalRewardText: {
    fontSize: 14,
    color: colors.text2,
    fontWeight: '600',
    flex: 1,
  },
  approveBtn: {
    backgroundColor: colors.success,
    borderRadius: 100,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.sm,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── Task row
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  taskRowLeft: { marginRight: 12 },
  taskRowEmoji: { fontSize: 30 },
  taskRowMiddle: { flex: 1 },
  taskRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text1,
  },
  taskRowKid: {
    fontSize: 12,
    color: colors.text3,
    fontWeight: '500',
    marginTop: 3,
  },
  taskRowRight: { alignItems: 'flex-end', gap: 6 },
  statusPill: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ─── Filter chips
  filterScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text3,
  },
  filterChipTextActive: {
    color: colors.primary,
  },

  // ─── Form
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: colors.text1,
    backgroundColor: '#F8FAFC',
  },
  taskEmojiBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
  },
  taskEmojiBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  kidPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kidPickerBtn: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 70,
  },
  kidPickerBtnActive: {
    borderWidth: 2.5,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  kidPickerName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  assignBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 22,
    ...shadows.md,
  },
  assignBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ─── Success banner
  successBanner: {
    backgroundColor: colors.successLight,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  successBannerText: {
    color: colors.success,
    fontSize: 15,
    fontWeight: '700',
  },

  // ─── Family tab
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text3,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text1,
  },
  memberPhone: {
    fontSize: 12,
    color: colors.text3,
    fontWeight: '500',
    marginTop: 3,
  },
  parentRolePill: {
    backgroundColor: colors.primaryLight,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  parentRolePillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    padding: 6,
  },
  addKidDashedBtn: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  addKidDashedText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  addKidForm: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addKidFormTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 4,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.text1,
    transform: [{ scale: 1.2 }],
  },
  addKidFormBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    alignItems: 'center',
  },
  cancelFormBtn: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cancelFormBtnText: {
    color: colors.text3,
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── Home btn / avatar
  avatarSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBtn: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  homeBtnText: {
    color: colors.text2,
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text1,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    color: colors.text3,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
  },
});
