import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Pressable,
  Modal,
  AppState,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { kidColors, shadows } from '../theme/index';

const Tab = createBottomTabNavigator();

const TASK_EMOJIS = [
  '🧹', '🧽', '🛁', '📚', '🍽️', '🌱', '🐕', '🛏️',
  '👕', '🎒', '🚿', '♻️', '💻', '🎨', '🧺', '🌿',
];
const KID_EMOJIS = ['🦊', '🐱', '🐶', '🐸', '🐻', '🦁', '🐼', '🦄', '🐯', '🐰', '🦋', '🐬'];
const PARENT_EMOJIS = ['👩', '👨', '🧑', '👩‍💼', '👨‍💼', '🧑‍💼', '👸', '🤴', '🦸', '🦹', '🧙', '🧚'];

// ─── Due date helpers ──────────────────────────────────────────────────────────

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today)    return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function isDueSoon(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr <= today;
}

function getDueDateSuggestions() {
  const today    = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const nextWeek = new Date(today.getTime() + 7 * 86400000);
  const fmt = d => d.toISOString().split('T')[0];
  return [
    { label: 'Today',     value: fmt(today) },
    { label: 'Tomorrow',  value: fmt(tomorrow) },
    { label: 'This Week', value: fmt(nextWeek) },
  ];
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function ScreenHeader({ title, subtitle, rightContent }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ backgroundColor: colors.surface }}>
      <View style={[headerStyles.row, { borderBottomColor: colors.divider }]}>
        <View style={{ flex: 1 }}>
          <Text style={[headerStyles.title, { color: colors.text1 }]}>{title}</Text>
          {subtitle ? <Text style={[headerStyles.sub, { color: colors.text3 }]}>{subtitle}</Text> : null}
        </View>
        {rightContent}
      </View>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 13, fontWeight: '500', marginTop: 2 },
});

// ─── Home / Approvals Tab ──────────────────────────────────────────────────────

function HomeTab({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { tasks, family, approveTask } = useApp();
  const pendingApproval = tasks.filter(t => t.status === 'completed');

  const totalTasks   = tasks.length;
  const doneTasks    = tasks.filter(t => t.status === 'approved').length;
  const waitingTasks = tasks.filter(t => t.status === 'completed').length;

  // ── Weekly analytics ──────────────────────────────────────────────────────
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completedThisWeek = tasks.filter(
    t => t.status === 'approved' && (t.approvedAt || t.approved_at) && (t.approvedAt || t.approved_at) >= oneWeekAgo
  );

  // Per-kid star tally for leaderboard snippet
  const kidStars = family.kids.map(kid => ({
    kid,
    stars: tasks.filter(t => t.assignedTo === kid.id && t.status === 'approved').length,
    weekStars: completedThisWeek.filter(t => t.assignedTo === kid.id).length,
  })).sort((a, b) => b.stars - a.stars);

  const topKid = kidStars[0];

  async function handleApprove(task) {
    await approveTask(task.id);
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScreenHeader
        title={t('parentDashboard.parentHub')}
        subtitle={t('parentDashboard.welcomeBack', { name: family.parentName })}
        rightContent={
          <View style={[styles.avatarSm, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 20 }}>{family.parentEmoji}</Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label={t('parentDashboard.total')} value={totalTasks} color={colors.primary} icon="list" />
          <StatCard label={t('parentDashboard.waiting')} value={waitingTasks} color={colors.warning} icon="time" />
          <StatCard label={t('parentDashboard.approved')} value={doneTasks} color={colors.success} icon="checkmark-circle" />
        </View>

        {/* Weekly Analytics Card */}
        {family.kids.length > 0 && (
          <View style={[styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <View style={styles.analyticsHeader}>
              <Text style={[styles.analyticsTitle, { color: colors.text1 }]}>{t('parentDashboard.thisWeek')}</Text>
              <Text style={[styles.analyticsCount, { color: colors.primary, backgroundColor: colors.primaryLight }]}>{completedThisWeek.length} {t('parentDashboard.questsDone')}</Text>
            </View>

            {kidStars.length > 0 && (
              <View style={styles.kidRankList}>
                {kidStars.map((item, idx) => (
                  <View key={item.kid.id} style={styles.kidRankRow}>
                    <Text style={styles.kidRankNum}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </Text>
                    <View style={[styles.kidRankAvatar, { backgroundColor: item.kid.color }]}>
                      <Text style={{ fontSize: 14 }}>{item.kid.emoji}</Text>
                    </View>
                    <Text style={[styles.kidRankName, { color: colors.text1 }]}>{item.kid.name}</Text>
                    <View style={styles.kidRankStars}>
                      <Text style={[styles.kidRankStarText, { color: colors.text2 }]}>⭐ {item.stars} total</Text>
                      {item.weekStars > 0 && (
                        <Text style={[styles.kidRankWeekText, { color: colors.success }]}>+{item.weekStars} this week</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {completedThisWeek.length === 0 && (
              <Text style={[styles.analyticsEmpty, { color: colors.text3 }]}>No quests completed this week yet — assign some!</Text>
            )}
          </View>
        )}

        {/* Needs approval */}
        <SectionHeader
          title={t('parentDashboard.needsApproval')}
          count={pendingApproval.length}
          countColor={colors.warning}
        />

        {pendingApproval.length === 0 ? (
          <EmptyState
            icon="✨"
            title={t('parentDashboard.allCaughtUp')}
            sub={t('parentDashboard.noTasksWaiting')}
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
          style={[styles.homeBtn, { borderColor: colors.border }]}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.85}
        >
          <Text style={[styles.homeBtnText, { color: colors.text2 }]}>{t('parentDashboard.backToHome')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, color, icon }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3, backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={20} color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.text3 }]}>{label}</Text>
    </View>
  );
}

function ApprovalCard({ task, kid, onApprove }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.approvalCard, { backgroundColor: colors.surface }]}>
      {/* Kid info */}
      <View style={styles.approvalKidRow}>
        <View style={[styles.kidAvatar, { backgroundColor: kid?.color || colors.primary }]}>
          <Text style={{ fontSize: 22 }}>{kid?.emoji || '🎉'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.approvalKidName, { color: colors.text1 }]}>{kid?.name || 'Unknown'}</Text>
          <Text style={[styles.approvalKidLabel, { color: colors.text3 }]}>{t('parentDashboard.completedQuest')}</Text>
        </View>
        <View style={[styles.waitBadge, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.waitBadgeText, { color: colors.warning }]}>{t('parentDashboard.waiting')}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.approvalDivider, { backgroundColor: colors.divider }]} />

      {/* Task info */}
      <Text style={[styles.approvalTaskTitle, { color: colors.text1 }]}>
        {task.emoji}  {task.title}
      </Text>
      {task.notes ? (
        <Text style={[styles.approvalNotes, { color: colors.text2 }]}>📝 {task.notes}</Text>
      ) : null}
      <View style={styles.approvalRewardRow}>
        <Ionicons name="gift-outline" size={15} color={colors.text3} />
        <Text style={[styles.approvalRewardText, { color: colors.text2 }]}>{task.reward}</Text>
      </View>

      {/* Approve button */}
      <TouchableOpacity style={[styles.approveBtn, { backgroundColor: colors.success }]} onPress={onApprove} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={styles.approveBtnText}>{t('parentDashboard.releaseReward')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Tasks Tab ─────────────────────────────────────────────────────────────────

const RECURRENCE_OPTS = [
  { key: 'none',   labelKey: 'parentDashboard.oneTime', icon: '1️⃣' },
  { key: 'daily',  labelKey: 'parentDashboard.daily',   icon: '📅' },
  { key: 'weekly', labelKey: 'parentDashboard.weekly',  icon: '📆' },
];

function TasksTab() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { tasks, family, deleteTask, editTask } = useApp();
  const [filter, setFilter] = useState('all');
  const [editingTask, setEditingTask] = useState(null);

  // Edit modal state
  const [editTitle,      setEditTitle]      = useState('');
  const [editReward,     setEditReward]     = useState('');
  const [editEmoji,      setEditEmoji]      = useState('🧹');
  const [editRecurrence, setEditRecurrence] = useState('none');
  const [editKidId,      setEditKidId]      = useState(null);
  const [editNotes,      setEditNotes]      = useState('');
  const [editDueDate,    setEditDueDate]    = useState('');

  const FILTERS = [
    { key: 'all',       label: t('parentDashboard.all') },
    { key: 'pending',   label: t('parentDashboard.toDo') },
    { key: 'completed', label: t('parentDashboard.waiting') },
    { key: 'approved',  label: t('parentDashboard.done') },
  ];

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  function statusInfo(status) {
    if (status === 'pending')   return { label: 'To Do',   color: colors.primary, bg: colors.primaryLight };
    if (status === 'completed') return { label: 'Waiting', color: colors.warning, bg: colors.warningLight };
    return { label: 'Done', color: colors.success, bg: colors.successLight };
  }

  function confirmDelete(task) {
    Alert.alert(t('parentDashboard.deleteQuest'), t('parentDashboard.removeQuest', { title: task.title }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('parentDashboard.delete'), style: 'destructive', onPress: () => deleteTask(task.id) },
    ]);
  }

  function openEdit(task) {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditReward(task.reward);
    setEditEmoji(task.emoji);
    setEditRecurrence(task.recurrence || 'none');
    setEditKidId(task.assignedTo || task.assigned_to);
    setEditNotes(task.notes || '');
    setEditDueDate(task.due_date || '');
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) { Alert.alert('Enter a quest name'); return; }
    if (!editReward.trim()) { Alert.alert('Add a reward'); return; }
    if (editDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(editDueDate)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD (e.g. 2025-06-15)');
      return;
    }
    await editTask(editingTask.id, {
      title: editTitle.trim(),
      reward: editReward.trim(),
      emoji: editEmoji,
      recurrence: editRecurrence,
      assignedTo: editKidId,
      assigned_to: editKidId,
      notes: editNotes.trim(),
      due_date: editDueDate.trim() || null,
    });
    setEditingTask(null);
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('parentDashboard.allQuests')} subtitle={t('parentDashboard.total_quests', { count: tasks.length })} />

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterScroll, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              { backgroundColor: colors.border },
              filter === f.key && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.filterChipText,
              { color: colors.text3 },
              filter === f.key && { color: colors.primary },
            ]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <EmptyState icon="📝" title={t('parentDashboard.noQuestsHere')} sub={t('parentDashboard.tryDifferentFilter')} />
        ) : (
          filtered.map(task => {
            const kid = family.kids.find(k => k.id === task.assignedTo);
            const s = statusInfo(task.status);
            return (
              <View key={task.id} style={[styles.taskRow, { backgroundColor: colors.surface }]}>
                <View style={styles.taskRowLeft}>
                  <Text style={styles.taskRowEmoji}>{task.emoji}</Text>
                </View>
                <View style={styles.taskRowMiddle}>
                  <View style={styles.taskTitleRow}>
                    <Text style={[styles.taskRowTitle, { color: colors.text1 }]} numberOfLines={1}>{task.title}</Text>
                    {task.recurrence && task.recurrence !== 'none' && (
                      <View style={[styles.recurringBadge, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.recurringBadgeText, { color: colors.primary }]}>🔁 {task.recurrence}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.taskRowKid, { color: colors.text3 }]}>
                    {kid ? `${kid.emoji} ${kid.name}` : 'Unknown'}
                  </Text>
                  {task.due_date ? (
                    <Text style={[styles.taskRowNotes, { color: colors.text3 }, isDueSoon(task.due_date) && { color: colors.error }]}>
                      📅 Due {formatDueDate(task.due_date)}
                    </Text>
                  ) : null}
                  {task.notes ? (
                    <Text style={[styles.taskRowNotes, { color: colors.text3 }]} numberOfLines={1}>📝 {task.notes}</Text>
                  ) : null}
                </View>
                <View style={styles.taskRowRight}>
                  <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusPillText, { color: s.color }]}>{s.label}</Text>
                  </View>
                  <View style={styles.taskActions}>
                    {/* Only allow editing pending tasks */}
                    {task.status === 'pending' && (
                      <TouchableOpacity
                        onPress={() => openEdit(task)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => confirmDelete(task)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.text3} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Edit Task Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={!!editingTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingTask(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => setEditingTask(null)}>
              <Text style={[styles.modalCancelText, { color: colors.text3 }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('parentDashboard.editQuest')}</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text style={[styles.modalSaveText, { color: colors.primary }]}>{t('save')}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            <FormLabel label={t('parentDashboard.questName')} />
            <TextInput
              style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={colors.text3}
              returnKeyType="next"
            />

            <FormLabel label={t('parentDashboard.questIcon')} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {TASK_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[
                    styles.taskEmojiBtn,
                    { backgroundColor: colors.surface },
                    editEmoji === e && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setEditEmoji(e)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 28 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FormLabel label={t('parentDashboard.reward')} />
            <TextInput
              style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              value={editReward}
              onChangeText={setEditReward}
              placeholderTextColor={colors.text3}
              returnKeyType="next"
            />

            <FormLabel label={t('parentDashboard.notes')} />
            <TextInput
              style={[styles.formInput, { minHeight: 72, textAlignVertical: 'top', borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder={t('parentDashboard.notesPlaceholder')}
              placeholderTextColor={colors.text3}
              multiline
            />

            <FormLabel label={t('parentDashboard.dueDate')} />
            <View style={styles.dueDateRow}>
              {getDueDateSuggestions().map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.dueDateChip,
                    { backgroundColor: colors.border },
                    editDueDate === s.value && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => setEditDueDate(editDueDate === s.value ? '' : s.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.dueDateChipText,
                    { color: colors.text3 },
                    editDueDate === s.value && { color: colors.primary },
                  ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.formInput, { marginTop: 8, borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              value={editDueDate}
              onChangeText={setEditDueDate}
              placeholder={t('parentDashboard.dueDatePlaceholder')}
              placeholderTextColor={colors.text3}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <FormLabel label={t('parentDashboard.repeats')} />
            <View style={styles.recurrenceRow}>
              {RECURRENCE_OPTS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.recurrenceBtn,
                    { backgroundColor: colors.border },
                    editRecurrence === opt.key && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => setEditRecurrence(opt.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.recurrenceIcon}>{opt.icon}</Text>
                  <Text style={[
                    styles.recurrenceLabel,
                    { color: colors.text3 },
                    editRecurrence === opt.key && { color: colors.primary },
                  ]}>
                    {t(opt.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FormLabel label={t('parentDashboard.assignTo')} />
            <View style={styles.kidPicker}>
              {family.kids.map(kid => (
                <TouchableOpacity
                  key={kid.id}
                  style={[
                    styles.kidPickerBtn,
                    { backgroundColor: kid.color + (editKidId === kid.id ? 'FF' : '30') },
                    editKidId === kid.id && styles.kidPickerBtnActive,
                  ]}
                  onPress={() => setEditKidId(kid.id)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 26 }}>{kid.emoji}</Text>
                  <Text
                    style={[
                      styles.kidPickerName,
                      { color: editKidId === kid.id ? '#fff' : colors.text1 },
                    ]}
                  >
                    {kid.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.assignBtn, { marginBottom: 32, backgroundColor: colors.primary }]} onPress={handleSaveEdit} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.assignBtnText}>{t('parentDashboard.saveChanges')}</Text>
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Add Task Tab ──────────────────────────────────────────────────────────────

function AddTaskTab() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { family, addTask } = useApp();
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🧹');
  const [recurrence, setRecurrence] = useState('none');
  const [dueDate, setDueDate] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleAdd() {
    if (!title.trim())  { Alert.alert(t('parentDashboard.questName'), 'What do you want your kid to do?'); return; }
    if (!reward.trim()) { Alert.alert(t('parentDashboard.reward'), "What will your kid earn for completing this?"); return; }
    if (!selectedKid)   { Alert.alert(t('parentDashboard.assignTo'), 'Choose who should complete this quest.'); return; }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD (e.g. 2025-06-15)');
      return;
    }

    await addTask({
      title: title.trim(),
      reward: reward.trim(),
      notes: notes.trim(),
      assignedTo: selectedKid,
      assigned_to: selectedKid,
      emoji: selectedEmoji,
      recurrence,
      due_date: dueDate.trim() || null,
    });

    setTitle('');
    setReward('');
    setNotes('');
    setSelectedKid(null);
    setRecurrence('none');
    setDueDate('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('parentDashboard.newQuest')} subtitle={t('parentDashboard.assignChoreReward')} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.tabScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          {success && (
          <View style={[styles.successBanner, { backgroundColor: colors.successLight, borderColor: colors.success + '40' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.successBannerText, { color: colors.success }]}>{t('parentDashboard.questAssigned')}</Text>
          </View>
        )}

        {/* Task name */}
        <FormLabel label={t('parentDashboard.questName')} />
        <TextInput
          style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
          placeholder={t('parentDashboard.questNamePlaceholder')}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.text3}
          returnKeyType="next"
        />

        {/* Emoji */}
        <FormLabel label={t('parentDashboard.questIcon')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        >
          {TASK_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[
                styles.taskEmojiBtn,
                { backgroundColor: colors.surface },
                selectedEmoji === e && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
              ]}
              onPress={() => setSelectedEmoji(e)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 28 }}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reward */}
        <FormLabel label={t('parentDashboard.reward')} />
        <TextInput
          style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
          placeholder={t('parentDashboard.rewardPlaceholder')}
          value={reward}
          onChangeText={setReward}
          placeholderTextColor={colors.text3}
          returnKeyType="next"
        />

        {/* Notes */}
        <FormLabel label={t('parentDashboard.notes')} />
        <TextInput
          style={[styles.formInput, { minHeight: 72, textAlignVertical: 'top', borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
          placeholder={t('parentDashboard.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          placeholderTextColor={colors.text3}
          multiline
        />

        {/* Due Date */}
        <FormLabel label={t('parentDashboard.dueDate')} />
        <View style={styles.dueDateRow}>
          {getDueDateSuggestions().map(s => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.dueDateChip,
                { backgroundColor: colors.border },
                dueDate === s.value && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setDueDate(dueDate === s.value ? '' : s.value)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.dueDateChipText,
                { color: colors.text3 },
                dueDate === s.value && { color: colors.primary },
              ]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={[styles.formInput, { marginTop: 8, borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
          placeholder={t('parentDashboard.dueDatePlaceholder')}
          value={dueDate}
          onChangeText={setDueDate}
          placeholderTextColor={colors.text3}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        {/* Recurrence */}
        <FormLabel label={t('parentDashboard.repeats')} />
        <View style={styles.recurrenceRow}>
          {RECURRENCE_OPTS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.recurrenceBtn,
                { backgroundColor: colors.border },
                recurrence === opt.key && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
              onPress={() => setRecurrence(opt.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.recurrenceIcon}>{opt.icon}</Text>
              <Text style={[
                styles.recurrenceLabel,
                { color: colors.text3 },
                recurrence === opt.key && { color: colors.primary },
              ]}>
                {t(opt.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Assign to */}
        <FormLabel label={t('parentDashboard.assignTo')} />
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

        <TouchableOpacity style={[styles.assignBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} activeOpacity={0.85}>
          <Ionicons name="add-circle" size={22} color="#fff" />
          <Text style={styles.assignBtnText}>{t('parentDashboard.assignQuest')}</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Family Tab ────────────────────────────────────────────────────────────────

function FamilyTab({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { family, addKid, removeKid, editKid } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [kidName, setKidName] = useState('');
  const [kidPhone, setKidPhone] = useState('');
  const [kidEmoji, setKidEmoji] = useState('🦊');
  const [kidColor, setKidColor] = useState(kidColors[0]);

  // Edit kid state
  const [editingKid,      setEditingKid]      = useState(null);
  const [editKidName,     setEditKidName]     = useState('');
  const [editKidPhone,    setEditKidPhone]    = useState('');
  const [editKidEmoji,    setEditKidEmoji]    = useState('🦊');
  const [editKidColor,    setEditKidColor]    = useState(kidColors[0]);

  async function handleAddKid() {
    if (!kidName.trim()) { Alert.alert(t('parentDashboard.name')); return; }
    await addKid({ name: kidName.trim(), emoji: kidEmoji, color: kidColor, phone: kidPhone.trim() });
    setKidName('');
    setKidPhone('');
    setShowAdd(false);
  }

  function confirmRemove(kid) {
    Alert.alert(t('parentDashboard.removeKid', { name: kid.name }), t('parentDashboard.removeKidConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('parentDashboard.remove'), style: 'destructive', onPress: () => removeKid(kid.id) },
    ]);
  }

  function openEditKid(kid) {
    setEditingKid(kid);
    setEditKidName(kid.name);
    setEditKidPhone(kid.phone || '');
    setEditKidEmoji(kid.emoji);
    setEditKidColor(kid.color);
  }

  async function handleSaveKid() {
    if (!editKidName.trim()) { Alert.alert(t('parentDashboard.name')); return; }
    await editKid(editingKid.id, {
      name: editKidName.trim(),
      phone: editKidPhone.trim(),
      emoji: editKidEmoji,
      color: editKidColor,
    });
    setEditingKid(null);
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('parentDashboard.family')} subtitle={t('parentDashboard.familyMembers', { count: family.kids.length + 1 })} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.tabScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
        {/* Parent */}
        <Text style={[styles.sectionLabel, { color: colors.text3 }]}>{t('parentDashboard.parent_label')}</Text>
        <View style={[styles.memberCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.memberAvatar, { backgroundColor: colors.primary }]}>
            <Text style={{ fontSize: 26 }}>{family.parentEmoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.memberName, { color: colors.text1 }]}>{family.parentName}</Text>
            {family.parentPhone ? (
              <Text style={[styles.memberPhone, { color: colors.text3 }]}>{family.parentPhone}</Text>
            ) : null}
          </View>
          <View style={[styles.parentRolePill, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.parentRolePillText, { color: colors.primary }]}>{t('parentDashboard.parent_label')}</Text>
          </View>
        </View>

        {/* Kids */}
        <Text style={[styles.sectionLabel, { marginTop: 24, color: colors.text3 }]}>{t('parentDashboard.kids_label', { count: family.kids.length })}</Text>
        {family.kids.map(kid => (
          <View key={kid.id} style={[styles.memberCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.memberAvatar, { backgroundColor: kid.color }]}>
              <Text style={{ fontSize: 26 }}>{kid.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: colors.text1 }]}>{kid.name}</Text>
              {kid.phone ? <Text style={[styles.memberPhone, { color: colors.text3 }]}>{kid.phone}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={() => openEditKid(kid)}
              style={[styles.removeBtn, { marginRight: 4 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
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
          <TouchableOpacity style={[styles.addKidDashedBtn, { borderColor: colors.border }]} onPress={() => setShowAdd(true)}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={[styles.addKidDashedText, { color: colors.primary }]}>{t('parentDashboard.addAnotherKid')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.addKidForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.addKidFormTitle, { color: colors.text1 }]}>{t('parentDashboard.newKid')}</Text>

            <FormLabel label={t('parentDashboard.name')} />
            <TextInput
              style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
              placeholder={t('parentDashboard.kidNameDots')}
              value={kidName}
              onChangeText={setKidName}
              placeholderTextColor={colors.text3}
            />

            <FormLabel label={t('parentDashboard.phone')} />
            <TextInput
              style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
              placeholder={t('optional')}
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
                  style={[
                    styles.taskEmojiBtn,
                    { backgroundColor: colors.surface },
                    kidEmoji === e && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
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
                    kidColor === c && [styles.colorDotActive, { borderColor: colors.text1 }],
                  ]}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            <View style={styles.addKidFormBtns}>
              <TouchableOpacity
                style={[styles.assignBtn, { flex: 1, backgroundColor: colors.primary }]}
                onPress={handleAddKid}
                activeOpacity={0.85}
              >
                <Text style={styles.assignBtnText}>{t('add')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => setShowAdd(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelFormBtnText, { color: colors.text3 }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Edit Kid Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!editingKid}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingKid(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={() => setEditingKid(null)}>
              <Text style={[styles.modalCancelText, { color: colors.text3 }]}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text1 }]}>{t('parentDashboard.editKid')}</Text>
            <TouchableOpacity onPress={handleSaveKid}>
              <Text style={[styles.modalSaveText, { color: colors.primary }]}>{t('save')}</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            <FormLabel label={t('parentDashboard.name')} />
            <TextInput
              style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              value={editKidName}
              onChangeText={setEditKidName}
              placeholderTextColor={colors.text3}
            />

            <FormLabel label={t('parentDashboard.phone')} />
            <TextInput
              style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
              value={editKidPhone}
              onChangeText={setEditKidPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.text3}
              placeholder={t('optional')}
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
                  style={[
                    styles.taskEmojiBtn,
                    { backgroundColor: colors.surface },
                    editKidEmoji === e && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setEditKidEmoji(e)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 26 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <FormLabel label="Color" />
            <View style={[styles.colorRow, { marginBottom: 32 }]}>
              {kidColors.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setEditKidColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    editKidColor === c && [styles.colorDotActive, { borderColor: colors.text1 }],
                  ]}
                  activeOpacity={0.8}
                />
              ))}
            </View>

            <TouchableOpacity style={[styles.assignBtn, { marginBottom: 32, backgroundColor: colors.primary }]} onPress={handleSaveKid} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.assignBtnText}>{t('parentDashboard.saveChanges')}</Text>
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { family, updateParentProfile, updateNotifyPrefs, clearAllData, verifyPin, isCloudEnabled } = useApp();

  // Parent profile edit
  const [editName,  setEditName]  = useState(family.parentName);
  const [editPhone, setEditPhone] = useState(family.parentPhone || '');
  const [editEmoji, setEditEmoji] = useState(family.parentEmoji);
  const [profileSaved, setProfileSaved] = useState(false);

  // PIN change
  const [currentPin, setCurrentPin] = useState('');
  const [newPin,     setNewPin]     = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState(null); // { text, ok }

  // Notification preferences
  const defaultPrefs = { taskCompleted: true, taskApproved: true };
  const notifyPrefs = family?.notifyPrefs || defaultPrefs;
  const [notifTaskCompleted, setNotifTaskCompleted] = useState(notifyPrefs.taskCompleted !== false);
  const [notifTaskApproved,  setNotifTaskApproved]  = useState(notifyPrefs.taskApproved  !== false);

  async function handleSaveProfile() {
    if (!editName.trim()) { Alert.alert(t('settings.enterName')); return; }
    await updateParentProfile({
      parentName:  editName.trim(),
      parentPhone: editPhone.trim(),
      parentEmoji: editEmoji,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  async function handleChangePin() {
    setPinMsg(null);
    // ✅ FIXED: verifyPin is async — must await it
    const pinOk = await verifyPin(currentPin);
    if (!pinOk) {
      setPinMsg({ text: t('settings.pinIncorrect'), ok: false });
      return;
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMsg({ text: t('settings.pinMustBe4'), ok: false });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ text: t('settings.pinsDontMatch'), ok: false });
      return;
    }
    await updateParentProfile({ parentPin: newPin });
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMsg({ text: t('settings.pinUpdated'), ok: true });
    setTimeout(() => setPinMsg(null), 3000);
  }

  async function toggleNotif(type, value) {
    if (type === 'taskCompleted') {
      setNotifTaskCompleted(value);
      await updateNotifyPrefs({ taskCompleted: value });
    } else {
      setNotifTaskApproved(value);
      await updateNotifyPrefs({ taskApproved: value });
    }
  }

  function confirmClearData() {
    Alert.alert(
      t('settings.resetTitle'),
      t('settings.resetMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('settings.resetEverything'),
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            navigation.navigate('Home');
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('parentDashboard.settings')} subtitle={t('settings.manageAccount')} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.tabScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* ── Parent Profile ──────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { color: colors.text3 }]}>{t('settings.parentProfile')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          {profileSaved && (
            <View style={[styles.successBanner, { marginBottom: 14, backgroundColor: colors.successLight, borderColor: colors.success + '40' }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.successBannerText, { color: colors.success }]}>{t('settings.profileSaved')}</Text>
            </View>
          )}

          <FormLabel label={t('settings.displayName')} />
          <TextInput
            style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
            value={editName}
            onChangeText={setEditName}
            placeholderTextColor={colors.text3}
            returnKeyType="done"
          />

          <FormLabel label={t('settings.phone')} />
          <TextInput
            style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
            placeholder={t('optional')}
            placeholderTextColor={colors.text3}
          />

          <FormLabel label={t('settings.avatarEmoji')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {PARENT_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.taskEmojiBtn,
                  { backgroundColor: colors.surface },
                  editEmoji === e && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
                onPress={() => setEditEmoji(e)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 26 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[styles.assignBtn, { marginTop: 18, backgroundColor: colors.primary }]} onPress={handleSaveProfile} activeOpacity={0.85}>
            <Ionicons name="save-outline" size={20} color="#fff" />
            <Text style={styles.assignBtnText}>{t('settings.saveProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Change PIN ──────────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.changePin')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          {pinMsg && (
            <View style={[
              styles.successBanner,
              { marginBottom: 14, backgroundColor: pinMsg.ok ? colors.successLight : colors.errorLight, borderColor: (pinMsg.ok ? colors.success : colors.error) + '40' }
            ]}>
              <Ionicons
                name={pinMsg.ok ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={pinMsg.ok ? colors.success : colors.error}
              />
              <Text style={[styles.successBannerText, { color: pinMsg.ok ? colors.success : colors.error }]}>
                {pinMsg.text}
              </Text>
            </View>
          )}

          <FormLabel label={t('settings.currentPin')} />
          <TextInput
            style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
            value={currentPin}
            onChangeText={v => setCurrentPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('settings.currentPinPlaceholder')}
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          <FormLabel label={t('settings.newPin')} />
          <TextInput
            style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
            value={newPin}
            onChangeText={v => setNewPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('settings.newPinPlaceholder')}
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          <FormLabel label={t('settings.confirmNewPin')} />
          <TextInput
            style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
            value={confirmPin}
            onChangeText={v => setConfirmPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder={t('settings.confirmPinPlaceholder')}
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
          />

          <TouchableOpacity
            style={[styles.assignBtn, { marginTop: 18, backgroundColor: colors.warning }]}
            onPress={handleChangePin}
            activeOpacity={0.85}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#fff" />
            <Text style={styles.assignBtnText}>{t('settings.updatePin')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Notification Preferences ──────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.notifications')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.text1 }]}>{t('settings.questCompleted')}</Text>
              <Text style={[styles.notifSub, { color: colors.text3 }]}>{t('settings.questCompletedSub')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, notifTaskCompleted && { backgroundColor: colors.primary }]}
              onPress={() => toggleNotif('taskCompleted', !notifTaskCompleted)}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleThumb, notifTaskCompleted && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
          <View style={[styles.notifRow, { marginTop: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.text1 }]}>{t('settings.rewardReleased')}</Text>
              <Text style={[styles.notifSub, { color: colors.text3 }]}>{t('settings.rewardReleasedSub')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, notifTaskApproved && { backgroundColor: colors.primary }]}
              onPress={() => toggleNotif('taskApproved', !notifTaskApproved)}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleThumb, notifTaskApproved && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── AI Quest Creator ──────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.aiFeatures')}</Text>
        <TouchableOpacity
          style={[styles.settingsCard, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 14 }]}
          onPress={() => navigation.navigate('AI')}
          activeOpacity={0.85}
        >
          <View style={[styles.aiIconBox, { backgroundColor: colors.primaryLight }]}>
            <Text style={{ fontSize: 26 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.aiCardTitle, { color: colors.text1 }]}>{t('settings.aiQuestCreator')}</Text>
            <Text style={[styles.aiCardSub, { color: colors.text3 }]}>{t('settings.aiQuestSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text3} />
        </TouchableOpacity>

        {/* ── Invite Code ───────────────────────────────────────────────── */}
        {isCloudEnabled && family?.inviteCode && (
          <>
            <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.familyInviteCode')}</Text>
            <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.inviteCodeLabel, { color: colors.text2 }]}>{t('settings.inviteCodeLabel')}</Text>
              <View style={[styles.inviteCodeBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
                <Text style={[styles.inviteCodeText, { color: colors.primary }]}>{family.inviteCode}</Text>
              </View>
              <Text style={[styles.inviteCodeHint, { color: colors.text3 }]}>
                {t('settings.inviteCodeHint')}
              </Text>
            </View>
          </>
        )}

        {/* ── Danger Zone ─────────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.error }]}>{t('settings.dangerZone')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.error + '30', borderWidth: 1.5 }]}>
          <Text style={[styles.dangerText, { color: colors.text2 }]}>
            {t('settings.dangerText')}
          </Text>
          <TouchableOpacity
            style={[styles.assignBtn, { backgroundColor: colors.error, marginTop: 16 }]}
            onPress={confirmClearData}
            activeOpacity={0.85}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.assignBtnText}>{t('settings.resetAllData')}</Text>
          </TouchableOpacity>
        </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Shared mini-components ────────────────────────────────────────────────────

function SectionHeader({ title, count, countColor }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={[styles.sectionHeaderTitle, { color: colors.text1 }]}>{title}</Text>
      {count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: countColor }]}>
          <Text style={styles.countBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function EmptyState({ icon, title, sub }) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={[styles.emptyTitle, { color: colors.text1 }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.text3 }]}>{sub}</Text>
    </View>
  );
}

function FormLabel({ label }) {
  const { colors } = useTheme();
  return <Text style={[styles.formLabel, { color: colors.text2 }]}>{label}</Text>;
}

// ─── ParentDashboard root ──────────────────────────────────────────────────────

export default function ParentDashboard({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { tasks, checkParentSession, refreshParentSession } = useApp();
  const pendingCount = tasks.filter(t => t.status === 'completed').length;
  const sessionCheckRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // ─── Session guard: auto-lock after 30 min inactivity ──────────────────────
  async function guardSession() {
    const valid = await checkParentSession();
    if (!valid) {
      // Clear any pending checks
      if (sessionCheckRef.current) clearInterval(sessionCheckRef.current);
      // Navigate back to Home — parent must re-enter PIN
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
      Alert.alert(
        '🔒 Parent Zone Locked',
        'Your session expired after 30 minutes of inactivity. Please enter your PIN again.',
        [{ text: t('done') }]
      );
    }
  }

  useEffect(() => {
    // Check session validity immediately on mount
    guardSession();

    // Poll every 60 seconds
    sessionCheckRef.current = setInterval(guardSession, 60_000);

    // Also check when app comes back to foreground
    const sub = AppState.addEventListener('change', nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        guardSession();
      }
      appStateRef.current = nextState;
    });

    return () => {
      clearInterval(sessionCheckRef.current);
      sub.remove();
    };
  }, []);

  // Extend session on any user interaction within the dashboard
  function onUserInteraction() {
    refreshParentSession?.();
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.divider }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text3,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home:     focused ? 'home'         : 'home-outline',
            Tasks:    focused ? 'list'         : 'list-outline',
            AddTask:  focused ? 'add-circle'   : 'add-circle-outline',
            Family:   focused ? 'people'       : 'people-outline',
            Settings: focused ? 'settings'     : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarLabel: t('parentDashboard.home'),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.warning, fontSize: 10 },
        }}
      >
        {props => <HomeTab {...props} navigation={navigation} />}
      </Tab.Screen>

      <Tab.Screen
        name="Tasks"
        component={TasksTab}
        options={{ tabBarLabel: t('parentDashboard.quests') }}
      />

      <Tab.Screen
        name="AddTask"
        component={AddTaskTab}
        options={{ tabBarLabel: t('parentDashboard.add') }}
      />

      <Tab.Screen
        name="Family"
        options={{ tabBarLabel: t('parentDashboard.family') }}
      >
        {props => <FamilyTab {...props} navigation={navigation} />}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{ tabBarLabel: t('parentDashboard.settings') }}
      >
        {props => <SettingsTab {...props} navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabWrapper: {
    flex: 1,
  },
  tabScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  tabBar: {
    borderTopWidth: 1,
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
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
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
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Analytics card
  analyticsCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    ...shadows.sm,
    borderWidth: 1,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  analyticsTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  analyticsCount: {
    fontSize: 13,
    fontWeight: '700',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  kidRankList: { gap: 10 },
  kidRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  kidRankNum: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  kidRankAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kidRankName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  kidRankStars: { alignItems: 'flex-end' },
  kidRankStarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  kidRankWeekText: {
    fontSize: 11,
    fontWeight: '600',
  },
  analyticsEmpty: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 8,
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
  },
  approvalKidLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  waitBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  waitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  approvalDivider: {
    height: 1,
    marginBottom: 12,
  },
  approvalTaskTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  approvalNotes: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  approvalRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  approvalRewardText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  approveBtn: {
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
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  taskRowLeft:   { marginRight: 12 },
  taskRowEmoji:  { fontSize: 30 },
  taskRowMiddle: { flex: 1 },
  taskRowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  taskRowKid: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  taskRowNotes: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  taskRowRight: { alignItems: 'flex-end', gap: 6 },
  taskActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
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

  // ─── Filter chips
  filterScroll: {
    borderBottomWidth: 1,
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
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ─── Edit Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // ─── Form
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 18,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
  },
  taskEmojiBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
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
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  successBannerText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ─── Family tab
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  memberPhone: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },
  parentRolePill: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  parentRolePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    padding: 6,
  },
  addKidDashedBtn: {
    borderWidth: 2,
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
    fontSize: 15,
    fontWeight: '700',
  },
  addKidForm: {
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
  },
  addKidFormTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── Settings Tab
  settingsSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  settingsCard: {
    borderRadius: 20,
    padding: 18,
    ...shadows.sm,
  },
  dangerText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },

  // ─── AI card
  aiIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  aiCardSub: {
    fontSize: 13,
    fontWeight: '500',
  },

  // ─── Invite code
  inviteCodeLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
  },
  inviteCodeBox: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 10,
  },
  inviteCodeText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  inviteCodeHint: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ─── Recurrence picker
  recurrenceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recurrenceBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 4,
  },
  recurrenceIcon: { fontSize: 22 },
  recurrenceLabel: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ─── Recurring badge on task list
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  recurringBadge: {
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  recurringBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
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
    alignItems: 'center',
  },
  homeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // ─── Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon:  { fontSize: 56, marginBottom: 14 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 240,
  },

  // ─── Due date picker
  dueDateRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dueDateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dueDateChipText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ─── Notification toggle
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  notifSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  toggleBtn: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
});
