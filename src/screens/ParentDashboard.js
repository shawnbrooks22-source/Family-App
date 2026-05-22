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
  ActivityIndicator,
  Image,
  Share,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../i18n/index';
import { kidColors, shadows } from '../theme/index';
import useDevice from '../hooks/useDevice';
import { QUEST_CATEGORIES, ALL_QUESTS, searchQuests } from '../data/questTemplates';

const Tab = createBottomTabNavigator();

// Tablet-aware content wrapper used inside each tab's ScrollView
function TabContent({ children }) {
  const { isTablet } = useDevice();
  if (!isTablet) return <>{children}</>;
  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={{ width: '100%', maxWidth: 800 }}>
        {children}
      </View>
    </View>
  );
}

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
  // Returns true only for today — use isOverdue() to distinguish past dates
  return dateStr === today;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
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
  const { tasks, family, approveTask, chargeForTask, refreshParentSession, completeSavingsChallenge, setKidGoal, redeemMilestone, approveQuestRequest, declineQuestRequest } = useApp();
  const { isPremium } = useSubscription();
  const { isTablet, pad } = useDevice();
  const pendingApproval = tasks.filter(t => t.status === 'completed');
  const requestedTasks = tasks.filter(t => t.status === 'requested');

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
    stars: tasks.filter(t => (t.assignedTo || t.assigned_to) === kid.id && t.status === 'approved').length,
    weekStars: completedThisWeek.filter(t => (t.assignedTo || t.assigned_to) === kid.id).length,
  })).sort((a, b) => b.stars - a.stars);

  const topKid = kidStars[0];

  async function handleApprove(task) {
    refreshParentSession?.();
    const hasCard = !!(family?.stripeCardLast4);
    // Cash rewards require Premium — gate free tier users to the upgrade screen
    if (task.amount_cents && !isPremium) {
      Alert.alert(
        '👑 Premium Feature',
        'Real cash rewards require Kindo Premium. Upgrade to pay kids automatically when quests are approved.',
        [
          { text: 'Approve Without Pay', onPress: async () => {
            try { await approveTask(task.id); } catch (e) {
              Alert.alert('Could not approve quest', e?.message || 'Something went wrong.');
            }
          }},
          { text: 'Upgrade →', onPress: () => navigation.navigate('Upgrade') },
        ]
      );
      return;
    }
    if (task.amount_cents && chargeForTask && hasCard) {
      const dollars = `$${(task.amount_cents / 100).toFixed(2)}`;
      const kid = family.kids.find(k => k.id === (task.assignedTo || task.assigned_to));
      Alert.alert(
        `💳 Pay ${dollars} to ${kid?.name || 'kid'}?`,
        `This will charge your ${family.stripeCardBrand || 'card'} ending in ${family.stripeCardLast4} and add ${dollars} to ${kid?.name || 'their'} balance.`,
        [
          { text: 'Skip Payment', onPress: async () => {
            try { await approveTask(task.id); } catch (e) {
              Alert.alert('Could not approve quest', e?.message || 'Something went wrong.');
            }
          }},
          {
            text: `Pay ${dollars}`,
            onPress: async () => {
              let charged = false;
              try {
                await chargeForTask(task.id, task.assignedTo || task.assigned_to, task.amount_cents);
                charged = true;
              } catch (e) {
                Alert.alert('Payment Failed', (e?.message || 'Could not charge card.') + '\n\nThe quest will still be approved without payment.');
              }
              try {
                await approveTask(task.id);
              } catch (e) {
                Alert.alert(
                  charged ? 'Payment succeeded but approval failed' : 'Could not approve quest',
                  e?.message || 'Please try again.'
                );
              }
            },
          },
        ]
      );
    } else if (task.amount_cents && !hasCard) {
      // Task has a cash reward but no card saved — prompt to set one up
      const dollars = `$${(task.amount_cents / 100).toFixed(2)}`;
      Alert.alert(
        `No card saved`,
        `This quest has a ${dollars} reward but you haven't added a payment method yet.\n\nApprove the quest without payment, or go to Payments to add a card.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve Without Pay', onPress: async () => {
            try { await approveTask(task.id); } catch (e) {
              Alert.alert('Could not approve quest', e?.message || 'Something went wrong.');
            }
          }},
        ]
      );
    } else {
      try {
        await approveTask(task.id);
      } catch (e) {
        Alert.alert('Could not approve quest', e?.message || 'Something went wrong. Please try again.');
      }
    }
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

      <ScrollView
        contentContainerStyle={[styles.tabScroll, isTablet && { paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
      >
        <TabContent>
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

        {/* Savings goal payout banners */}
        {family.kids
          .filter(k => k.goal?.savings?.earned && !k.goal?.savings?.paidOut)
          .map(kid => {
            const s = kid.goal.savings;
            const amt = `$${(s.rewardAmountCents / 100).toFixed(2)}`;
            return (
              <View key={kid.id} style={[styles.savingsPayoutCard, { backgroundColor: '#F0FDF4', borderColor: '#10B981' }]}>
                <View style={[styles.kidAvatar, { backgroundColor: kid.color, marginRight: 12 }]}>
                  <Text style={{ fontSize: 22 }}>{kid.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.savingsPayoutTitle, { color: '#065F46' }]}>
                    💰 {t('parentDashboard.savingsPayoutTitle')}
                  </Text>
                  <Text style={[styles.savingsPayoutSub, { color: '#047857' }]}>
                    {t('parentDashboard.savingsPayoutSub', { name: kid.name, count: s.questsRequired, amount: amt })}
                  </Text>
                  {s.label ? <Text style={[styles.savingsPayoutSub, { color: '#6B7280', marginTop: 2 }]}>🎯 {s.label}</Text> : null}
                </View>
                <TouchableOpacity
                  style={[styles.savingsPayBtn, { backgroundColor: '#10B981' }]}
                  onPress={() => {
                    Alert.alert(
                      `Pay ${amt} to ${kid.name}?`,
                      `This will mark the savings goal "${s.label || 'Savings Goal'}" as paid and reset it for a new round.`,
                      [
                        { text: 'Not yet', style: 'cancel' },
                        { text: `Pay ${amt} ✅`, onPress: async () => {
                          try {
                            // completeSavingsChallenge sets paidOut:true on the current round
                            // and then clears the challenge so a new one can be started.
                            await completeSavingsChallenge(kid.id);
                          } catch (e) {
                            Alert.alert('Error', e?.message || 'Could not mark as paid.');
                          }
                        }},
                      ]
                    );
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.savingsPayBtnText}>{t('parentDashboard.savingsMarkPaid')}</Text>
                </TouchableOpacity>
              </View>
            );
          })}

        {/* ── Star goal reached banners ───────────────────────────────────── */}
        {family.kids
          .filter(k => k.goal?.name && k.goal?.stars > 0 && k.goal?.reached && !k.goal?.rewarded)
          .map(kid => (
            <View key={kid.id} style={styles.goalReachedCard}>
              <View style={styles.goalReachedGlow} />
              <Text style={styles.goalReachedCrown}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalReachedTitle}>
                  {kid.name} reached their goal!
                </Text>
                <Text style={styles.goalReachedSub}>
                  ⭐ {kid.goal.stars} stars earned · Unlock: <Text style={{ fontWeight: '800' }}>"{kid.goal.name}"</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.goalRewardBtn}
                activeOpacity={0.85}
                onPress={() => Alert.alert(
                  `Give reward to ${kid.name}? 🎉`,
                  `They earned "${kid.goal.name}" by reaching ${kid.goal.stars} ⭐! Mark it as given when you hand it over.`,
                  [
                    { text: 'Not Yet', style: 'cancel' },
                    { text: 'Give Reward ✅', onPress: async () => {
                      try {
                        await setKidGoal(kid.id, { ...kid.goal, rewarded: true, rewardedAt: Date.now() });
                      } catch (e) {
                        Alert.alert('Error', e?.message || 'Could not update goal.');
                      }
                    }},
                  ]
                )}
              >
                <Text style={styles.goalRewardBtnText}>Give Reward</Text>
              </TouchableOpacity>
            </View>
          ))}

        {/* ── Milestone reached banners (achieved but not redeemed) ───────── */}
        {family.kids.flatMap(kid =>
          (kid.milestones || [])
            .filter(m => m.achieved && !m.redeemed)
            .map(m => ({ kid, milestone: m }))
        ).map(({ kid, milestone }) => (
          <View key={`${kid.id}-${milestone.id}`} style={[styles.goalReachedCard, { borderColor: '#F59E0B' }]}>
            <Text style={styles.goalReachedCrown}>🎖️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalReachedTitle}>{kid.name} hit a milestone!</Text>
              <Text style={styles.goalReachedSub}>
                ⭐ {milestone.stars_required} stars · Reward: <Text style={{ fontWeight: '800' }}>"{milestone.reward}"</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.goalRewardBtn, { backgroundColor: '#F59E0B' }]}
              activeOpacity={0.85}
              onPress={() => Alert.alert(
                `Milestone reward for ${kid.name}! 🎖️`,
                `They earned "${milestone.reward}" by reaching ${milestone.stars_required} ⭐!`,
                [
                  { text: 'Not Yet', style: 'cancel' },
                  { text: 'Redeem ✅', onPress: async () => {
                    try {
                      await redeemMilestone(kid.id, milestone.id);
                    } catch (e) {
                      Alert.alert('Error', e?.message || 'Could not redeem milestone.');
                    }
                  }},
                ]
              )}
            >
              <Text style={styles.goalRewardBtnText}>Redeem</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* ── Quest Requests from Kids ──────────────────────────────────── */}
        {requestedTasks.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[styles.sectionLabel, { color: colors.text1, fontSize: 15, fontWeight: '800', textTransform: 'none', letterSpacing: 0 }]}>
              📋 Quest Requests ({requestedTasks.length})
            </Text>
            <Text style={[styles.sectionLabel, { color: colors.text3, marginBottom: 12, textTransform: 'none', letterSpacing: 0, fontSize: 13, fontWeight: '500' }]}>
              Your kids want to do these quests — approve to add them!
            </Text>
            {requestedTasks.map(task => {
              const kid = family?.kids?.find(k => k.id === (task.assignedTo || task.assigned_to));
              return (
                <View
                  key={task.id}
                  style={[styles.approvalCard, { backgroundColor: colors.surface, borderLeftColor: '#7C3AED', borderLeftWidth: 4 }]}
                >
                  <View style={styles.approvalKidRow}>
                    <Text style={{ fontSize: 28, marginRight: 12 }}>{kid?.emoji || '🌟'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.approvalKidName, { color: colors.text1 }]}>
                        {kid?.name || 'Unknown'} wants to do:
                      </Text>
                      <Text style={[styles.approvalTaskTitle, { color: colors.text1, fontSize: 16, marginTop: 2 }]}>
                        {task.title}
                      </Text>
                      {task.reward ? (
                        <Text style={[styles.approvalKidLabel, { color: colors.text3, marginTop: 2 }]}>
                          🎁 Requested reward: {task.reward}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: colors.success || '#10B981', flex: 1, marginTop: 0 }]}
                      onPress={async () => {
                        try {
                          await approveQuestRequest(task.id);
                        } catch (e) {
                          Alert.alert('Error', e?.message || 'Could not approve quest.');
                        }
                      }}
                    >
                      <Text style={styles.approveBtnText}>✅ Add Quest</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approveBtn, { flex: 1, marginTop: 0, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.error }]}
                      onPress={() => Alert.alert(
                        'Decline Quest Request',
                        `Decline ${kid?.name || 'your kid'}'s request to do "${task.title}"?`,
                        [
                          { text: 'Keep it', style: 'cancel' },
                          { text: 'Decline', style: 'destructive', onPress: async () => {
                            try { await declineQuestRequest(task.id); }
                            catch (e) { Alert.alert('Error', e?.message || 'Could not decline.'); }
                          }},
                        ]
                      )}
                    >
                      <Text style={[styles.approveBtnText, { color: colors.error }]}>❌ Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
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
            const kid = family.kids.find(k => k.id === (task.assignedTo || task.assigned_to));
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
        </TabContent>
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
        {task.amount_cents > 0 && (
          <View style={[styles.cashBadge, { backgroundColor: '#D1FAE5' }]}>
            <Text style={[styles.cashBadgeText, { color: '#065F46' }]}>
              💵 ${(task.amount_cents / 100).toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Photo proof thumbnail */}
      {task.photo_proof_uri ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.approvalNotes, { color: colors.text3, marginBottom: 6 }]}>📸 Photo Proof</Text>
          <Image
            source={{ uri: task.photo_proof_uri }}
            style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.divider }}
            resizeMode="cover"
          />
        </View>
      ) : null}

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
  const { isTablet, pad } = useDevice();
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
  const [editLoading,    setEditLoading]    = useState(false);

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
      { text: t('parentDashboard.delete'), style: 'destructive', onPress: async () => {
        try { await deleteTask(task.id); } catch (e) {
          Alert.alert('Could not delete quest', e?.message || 'Please try again.');
        }
      }},
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
    setEditLoading(true);
    try {
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
    } catch (e) {
      Alert.alert('Failed to save', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setEditLoading(false);
    }
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

      <ScrollView
        contentContainerStyle={[styles.tabScroll, isTablet && { paddingHorizontal: pad }]}
        showsVerticalScrollIndicator={false}
      >
        <TabContent>
        {filtered.length === 0 ? (
          <EmptyState icon="📝" title={t('parentDashboard.noQuestsHere')} sub={t('parentDashboard.tryDifferentFilter')} />
        ) : (
          filtered.map(task => {
            const kid = family.kids.find(k => k.id === (task.assignedTo || task.assigned_to));
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
                    <Text style={[
                      styles.taskRowNotes,
                      { color: colors.text3 },
                      isDueSoon(task.due_date) && { color: colors.warning },
                      isOverdue(task.due_date) && { color: colors.error },
                    ]}>
                      {isOverdue(task.due_date) ? '⚠️ OVERDUE' : isDueSoon(task.due_date) ? '📅 TODAY' : `📅 Due ${formatDueDate(task.due_date)}`}
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
        </TabContent>
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
            <TouchableOpacity onPress={handleSaveEdit} disabled={editLoading}>
              <Text style={[styles.modalSaveText, { color: editLoading ? colors.text3 : colors.primary }]}>
                {t('save')}
              </Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Assign To — shown first */}
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

            <TouchableOpacity
              style={[styles.assignBtn, { marginBottom: 32, backgroundColor: editLoading ? colors.text3 : colors.primary }]}
              onPress={handleSaveEdit}
              activeOpacity={0.85}
              disabled={editLoading}
            >
              {editLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark-circle" size={22} color="#fff" />
              }
              <Text style={styles.assignBtnText}>
                {editLoading ? 'Saving…' : t('parentDashboard.saveChanges')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Add Task Tab ──────────────────────────────────────────────────────────────

// ─── Quest Template Browser Modal ─────────────────────────────────────────────

function QuestTemplatesBrowser({ visible, onClose, onSelect }) {
  const { colors } = useTheme();
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [searchText,    setSearchText]    = useState('');

  const quests = searchText.trim()
    ? searchQuests(searchText)
    : selectedCatId
      ? QUEST_CATEGORIES.find(c => c.id === selectedCatId)?.quests.map(q => ({
          ...q,
          categoryColor: QUEST_CATEGORIES.find(c => c.id === selectedCatId)?.color,
        })) || []
      : ALL_QUESTS;

  function handleClose() {
    setSelectedCatId(null);
    setSearchText('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: '#5B21B6' }}>
        {/* Header */}
        <SafeAreaView>
          <View style={tplStyles.header}>
            <TouchableOpacity onPress={handleClose} style={tplStyles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={tplStyles.headerTitle}>⚡ Mission Library</Text>
              <Text style={tplStyles.headerSub}>{ALL_QUESTS.length} quests ready to assign</Text>
            </View>
          </View>

          {/* Search */}
          <View style={tplStyles.searchWrap}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" style={{ marginRight: 8 }} />
            <TextInput
              style={tplStyles.searchInput}
              placeholder="Search missions…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category chips */}
          {!searchText && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tplStyles.catRow}>
              <TouchableOpacity
                style={[tplStyles.catChip, !selectedCatId && tplStyles.catChipActive]}
                onPress={() => setSelectedCatId(null)} activeOpacity={0.75}
              >
                <Text style={[tplStyles.catChipText, !selectedCatId && tplStyles.catChipTextActive]}>🌟 All</Text>
              </TouchableOpacity>
              {QUEST_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[tplStyles.catChip, selectedCatId === cat.id && tplStyles.catChipActive]}
                  onPress={() => setSelectedCatId(selectedCatId === cat.id ? null : cat.id)}
                  activeOpacity={0.75}
                >
                  <Text style={[tplStyles.catChipText, selectedCatId === cat.id && tplStyles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>

        {/* Quest list */}
        <ScrollView
          style={{ flex: 1, backgroundColor: '#F5F3FF' }}
          contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {quests.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
              <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '600' }}>No missions found</Text>
            </View>
          ) : quests.map((quest, i) => {
            const diffColor  = quest.difficulty === 'easy' ? '#059669' : quest.difficulty === 'medium' ? '#D97706' : '#DC2626';
            const diffBg     = quest.difficulty === 'easy' ? '#D1FAE5' : quest.difficulty === 'medium' ? '#FEF3C7' : '#FEE2E2';
            const diffLabel  = quest.difficulty === 'easy' ? '⭐ Easy' : quest.difficulty === 'medium' ? '⭐⭐ Medium' : '⭐⭐⭐ Hard';
            return (
              <TouchableOpacity
                key={`${quest.categoryId || 'all'}-${quest.title}`}
                style={[tplStyles.questCard, { borderLeftColor: quest.categoryColor || '#7C3AED' }]}
                onPress={() => { onSelect(quest); handleClose(); }}
                activeOpacity={0.75}
              >
                <Text style={tplStyles.questEmoji}>{quest.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={tplStyles.questTitle}>{quest.title}</Text>
                  <Text style={tplStyles.questNotes} numberOfLines={1}>{quest.notes}</Text>
                  <View style={tplStyles.questBadgeRow}>
                    <View style={[tplStyles.diffBadge, { backgroundColor: diffBg }]}>
                      <Text style={[tplStyles.diffBadgeText, { color: diffColor }]}>{diffLabel}</Text>
                    </View>
                    <View style={tplStyles.ageBadge}>
                      <Text style={tplStyles.ageBadgeText}>Age {quest.ageMin}+</Text>
                    </View>
                  </View>
                </View>
                <View style={[tplStyles.addBtn, { backgroundColor: quest.categoryColor || '#7C3AED' }]}>
                  <Ionicons name="add" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const tplStyles = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 12 },
  closeBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },
  headerSub:       { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500', marginTop: 1 },
  searchWrap:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:     { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },
  catRow:          { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  catChip:         { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
  catChipActive:   { backgroundColor: '#fff', borderColor: '#fff' },
  catChipText:     { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  catChipTextActive: { color: '#5B21B6' },
  questCard:       { backgroundColor: '#fff', borderRadius: 16, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderLeftWidth: 4, ...shadows.sm },
  questEmoji:      { fontSize: 30, width: 40, textAlign: 'center' },
  questTitle:      { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 3 },
  questNotes:      { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  questBadgeRow:   { flexDirection: 'row', gap: 6 },
  diffBadge:       { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  diffBadgeText:   { fontSize: 11, fontWeight: '700' },
  ageBadge:        { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#EDE9FE' },
  ageBadgeText:    { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  addBtn:          { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

// ─── Add Task / Quest Tab ──────────────────────────────────────────────────────

function AddTaskTab() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { family, addTask, refreshParentSession } = useApp();
  const { isTablet, pad } = useDevice();
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedKid, setSelectedKid] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState('🧹');
  const [recurrence, setRecurrence] = useState('none');
  const [dueDate,    setDueDate]    = useState('');
  const [cashAmount,     setCashAmount]     = useState(''); // optional dollar reward e.g. "5.00"
  const [success,        setSuccess]        = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);

  async function handleAdd() {
    refreshParentSession?.();
    if (!title.trim())  { Alert.alert(t('parentDashboard.questName'), 'What do you want your kid to do?'); return; }
    if (!reward.trim()) { Alert.alert(t('parentDashboard.reward'), "What will your kid earn for completing this?"); return; }
    if (!selectedKid)   { Alert.alert(t('parentDashboard.assignTo'), 'Choose who should complete this quest.'); return; }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      Alert.alert('Invalid date', 'Use format YYYY-MM-DD (e.g. 2025-06-15)');
      return;
    }
    const amountCents = cashAmount.trim() ? Math.round(parseFloat(cashAmount) * 100) : null;
    if (cashAmount.trim() && (isNaN(amountCents) || amountCents < 1)) {
      Alert.alert('Invalid amount', 'Enter a valid dollar amount like 5 or 2.50');
      return;
    }

    setLoading(true);
    try {
      await addTask({
        title:        title.trim(),
        reward:       reward.trim(),
        notes:        notes.trim(),
        assignedTo:   selectedKid,
        assigned_to:  selectedKid,
        emoji:        selectedEmoji,
        recurrence,
        due_date:     dueDate.trim() || null,
        amount_cents: amountCents,
      });
      setTitle('');
      setReward('');
      setNotes('');
      setSelectedKid(null);
      setSelectedEmoji('🧹');
      setRecurrence('none');
      setDueDate('');
      setCashAmount('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      Alert.alert('Failed to assign quest', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleTemplateSelect(quest) {
    setTitle(quest.title);
    setSelectedEmoji(quest.emoji);
    setReward(quest.reward || '');
    setNotes(quest.notes || '');
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('parentDashboard.newQuest')} subtitle={t('parentDashboard.assignChoreReward')} />

      {/* Quest Template Browser Modal */}
      <QuestTemplatesBrowser
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={handleTemplateSelect}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.tabScroll, isTablet && { paddingHorizontal: pad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          <TabContent>
          {success && (
          <View style={[styles.successBanner, { backgroundColor: colors.successLight, borderColor: colors.success + '40' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={[styles.successBannerText, { color: colors.success }]}>{t('parentDashboard.questAssigned')}</Text>
          </View>
        )}

        {/* Mission template browser — big dopamine button at the top */}
        <TouchableOpacity
          style={styles.templateBrowseBtn}
          onPress={() => setShowTemplates(true)}
          activeOpacity={0.82}
        >
          <Text style={styles.templateBrowseBtnEmoji}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.templateBrowseBtnTitle}>Browse Mission Templates</Text>
            <Text style={styles.templateBrowseBtnSub}>{ALL_QUESTS.length} ready-to-go quests — one tap to assign</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
        </TouchableOpacity>

        {/* Assign to — shown FIRST so parents never miss it */}
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

        {/* Cash Reward (optional) */}
        <FormLabel label={t('parentDashboard.cashReward')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
          <View style={[styles.dollarSign, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 17, color: colors.text2, fontWeight: '700' }}>$</Text>
          </View>
          <TextInput
            style={[styles.formInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderColor: colors.border, color: colors.text1, backgroundColor: colors.surface }]}
            placeholder={t('parentDashboard.cashRewardPlaceholder')}
            value={cashAmount}
            onChangeText={v => setCashAmount(v.replace(/[^0-9.]/g, ''))}
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
        </View>

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

        <TouchableOpacity
          style={[styles.assignBtn, { backgroundColor: loading ? colors.text3 : colors.primary }]}
          onPress={handleAdd}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="add-circle" size={22} color="#fff" />
          }
          <Text style={styles.assignBtnText}>
            {loading ? 'Assigning…' : t('parentDashboard.assignQuest')}
          </Text>
        </TouchableOpacity>
          </TabContent>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Family Tab ────────────────────────────────────────────────────────────────

function FamilyTab({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { family, tasks, addKid, removeKid, editKid, refreshParentSession, addMilestone, redeemMilestone, deleteMilestone, setSavingsChallenge, completeSavingsChallenge, updateParentProfile } = useApp();
  const { canAddKid, isPremium } = useSubscription();
  const { isTablet, pad } = useDevice();
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
  const [kidLoading,      setKidLoading]      = useState(false);

  // Milestone state
  const [newMilestoneStars,  setNewMilestoneStars]  = useState('');
  const [newMilestoneReward, setNewMilestoneReward] = useState('');
  const [milestoneLoading,   setMilestoneLoading]   = useState(false);

  // Savings challenge state (in edit kid modal)
  const [savingsLabel,      setSavingsLabel]      = useState('');
  const [savingsQuestCount, setSavingsQuestCount] = useState('5');
  const [savingsDollars,    setSavingsDollars]    = useState('');
  const [savingsLoading,    setSavingsLoading]    = useState(false);

  // Star Store state
  const [newStoreName,  setNewStoreName]  = useState('');
  const [newStoreEmoji, setNewStoreEmoji] = useState('🎮');
  const [newStoreCost,  setNewStoreCost]  = useState('5');

  async function handleAddKid() {
    refreshParentSession?.();
    if (!kidName.trim()) { Alert.alert(t('parentDashboard.name')); return; }
    setKidLoading(true);
    try {
      await addKid({ name: kidName.trim(), emoji: kidEmoji, color: kidColor, phone: kidPhone.trim() });
      setKidName('');
      setKidPhone('');
      setShowAdd(false);
    } catch (e) {
      Alert.alert('Failed to add kid', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setKidLoading(false);
    }
  }

  function confirmRemove(kid) {
    Alert.alert(t('parentDashboard.removeKid', { name: kid.name }), t('parentDashboard.removeKidConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('parentDashboard.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeKid(kid.id);
          } catch (e) {
            Alert.alert('Could not remove kid', e?.message || 'Please try again.');
          }
        },
      },
    ]);
  }

  function openEditKid(kid) {
    setEditingKid(kid);
    setEditKidName(kid.name);
    setEditKidPhone(kid.phone || '');
    setEditKidEmoji(kid.emoji);
    setEditKidColor(kid.color);
  }

  function closeEditKidModal() {
    setEditingKid(null);
    setNewMilestoneStars('');
    setNewMilestoneReward('');
    setSavingsLabel('');
    setSavingsQuestCount('5');
    setSavingsDollars('');
  }

  async function handleSaveKid() {
    if (!editKidName.trim()) { Alert.alert(t('parentDashboard.name')); return; }
    setKidLoading(true);
    try {
      await editKid(editingKid.id, {
        name: editKidName.trim(),
        phone: editKidPhone.trim(),
        emoji: editKidEmoji,
        color: editKidColor,
      });
      closeEditKidModal();
    } catch (e) {
      Alert.alert('Failed to save', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setKidLoading(false);
    }
  }

  // ── Star Store helpers ──────────────────────────────────────────────────────
  async function handleAddStoreItem() {
    if (!newStoreName.trim()) return;
    const cost = parseInt(newStoreCost, 10);
    if (isNaN(cost) || cost < 1) { Alert.alert('Star cost must be at least 1'); return; }

    const newItem = {
      id:       Date.now().toString(),
      name:     newStoreName.trim(),
      emoji:    newStoreEmoji || '🎁',
      starCost: cost,
      active:   true,
    };

    const updatedItems = [...(family?.storeItems || []), newItem];
    try {
      await updateParentProfile({ storeItems: updatedItems });
      setNewStoreName('');
      setNewStoreEmoji('🎮');
      setNewStoreCost('5');
    } catch (e) {
      Alert.alert('Error', 'Could not save store item. Please try again.');
    }
  }

  async function handleRemoveStoreItem(itemId) {
    const updatedItems = (family?.storeItems || []).filter(i => i.id !== itemId);
    try {
      await updateParentProfile({ storeItems: updatedItems });
    } catch (e) {
      Alert.alert('Error', 'Could not remove store item.');
    }
  }

  return (
    <View style={[styles.tabWrapper, { backgroundColor: colors.bg }]}>
      <ScreenHeader title={t('parentDashboard.family')} subtitle={t('parentDashboard.familyMembers', { count: family.kids.length + 1 })} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.tabScroll, isTablet && { paddingHorizontal: pad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
        <TabContent>
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
          <TouchableOpacity
            style={[styles.addKidDashedBtn, { borderColor: colors.border }]}
            onPress={() => {
              if (!canAddKid(family.kids.length)) {
                navigation.navigate('Upgrade');
              } else {
                setShowAdd(true);
              }
            }}
          >
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
                style={[styles.assignBtn, { flex: 1, backgroundColor: kidLoading ? colors.text3 : colors.primary }]}
                onPress={handleAddKid}
                activeOpacity={0.85}
                disabled={kidLoading}
              >
                {kidLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : null
                }
                <Text style={styles.assignBtnText}>{kidLoading ? 'Adding…' : t('add')}</Text>
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

        {/* ── Star Store ──────────────────────────────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <Text style={[styles.sectionLabel, { color: colors.text3 }]}>⭐ STAR STORE</Text>
          <View style={[styles.addKidForm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.addKidFormTitle, { color: colors.text1, marginBottom: 2 }]}>⭐ Star Store</Text>
            <Text style={[styles.memberPhone, { color: colors.text3, marginBottom: 12 }]}>
              Rewards kids can spend stars on
            </Text>

            {/* Existing store items */}
            {(family?.storeItems || []).map(item => (
              <View key={item.id} style={[styles.storeItemRow, { borderBottomColor: colors.divider }]}>
                <Text style={styles.storeItemEmoji}>{item.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeItemName, { color: colors.text1 }]}>{item.name}</Text>
                  <Text style={[styles.storeItemCost, { color: colors.text3 }]}>⭐ {item.starCost} stars</Text>
                </View>
                <TouchableOpacity
                  onPress={() => Alert.alert('Remove Item', `Remove "${item.name}" from the store?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => handleRemoveStoreItem(item.id) },
                  ])}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {(family?.storeItems || []).length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.text3 }]}>
                No store items yet. Add rewards kids can spend their stars on!
              </Text>
            )}

            {/* Add new item form */}
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.formLabel, { color: colors.text2, marginTop: 0 }]}>Add a store item</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput
                  style={[styles.formInput, { width: 56, textAlign: 'center', color: colors.text1, backgroundColor: colors.bg, borderColor: colors.border, padding: 10 }]}
                  value={newStoreEmoji}
                  onChangeText={setNewStoreEmoji}
                  maxLength={2}
                  placeholder="🎮"
                  placeholderTextColor={colors.text3}
                />
                <TextInput
                  style={[styles.formInput, { flex: 1, color: colors.text1, backgroundColor: colors.bg, borderColor: colors.border, padding: 10 }]}
                  value={newStoreName}
                  onChangeText={setNewStoreName}
                  placeholder="e.g. 30 min screen time"
                  placeholderTextColor={colors.text3}
                  maxLength={50}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.formInput, { width: 72, textAlign: 'center', color: colors.text1, backgroundColor: colors.bg, borderColor: colors.border, padding: 10 }]}
                  value={newStoreCost}
                  onChangeText={setNewStoreCost}
                  placeholder="Stars"
                  placeholderTextColor={colors.text3}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Text style={[{ color: colors.text3, fontSize: 14 }]}>stars</Text>
                <TouchableOpacity
                  onPress={handleAddStoreItem}
                  style={[styles.assignBtn, { backgroundColor: colors.primary, flex: 1, marginTop: 0, paddingVertical: 12 }]}
                >
                  <Text style={styles.assignBtnText}>+ Add to Store</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        </TabContent>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Edit Kid Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!editingKid}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditKidModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={closeEditKidModal}>
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

            <TouchableOpacity
              style={[styles.assignBtn, { marginBottom: 32, backgroundColor: kidLoading ? colors.text3 : colors.primary }]}
              onPress={handleSaveKid}
              activeOpacity={0.85}
              disabled={kidLoading}
            >
              {kidLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark-circle" size={22} color="#fff" />
              }
              <Text style={styles.assignBtnText}>
                {kidLoading ? 'Saving…' : t('parentDashboard.saveChanges')}
              </Text>
            </TouchableOpacity>

            {/* ── Star Milestones ──────────────────────────────────────────── */}
            <View style={[styles.milestoneSection, { borderTopColor: colors.divider }]}>
              <Text style={[styles.milestoneSectionTitle, { color: colors.text1 }]}>🏆 Star Milestones</Text>
              <Text style={[styles.milestoneSectionSub, { color: colors.text3 }]}>
                Set rewards that unlock when {editingKid?.name || 'your kid'} reaches a star count.
              </Text>

              {/* Existing milestones */}
              {(editingKid ? (family?.kids?.find(k => k.id === editingKid.id)?.milestones || []) : [])
                .sort((a, b) => a.stars_required - b.stars_required)
                .map(m => (
                <View key={m.id} style={[styles.milestoneRow, { backgroundColor: colors.surface, borderColor: m.achieved && !m.redeemed ? '#F59E0B' : colors.border }]}>
                  <View style={styles.milestoneRowLeft}>
                    <Text style={styles.milestoneStarBadge}>⭐ {m.stars_required}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.milestoneRewardText, { color: colors.text1 }]}>{m.reward}</Text>
                      {m.redeemed
                        ? <Text style={[styles.milestoneStatus, { color: '#10B981' }]}>✅ Given</Text>
                        : m.achieved
                        ? <Text style={[styles.milestoneStatus, { color: '#F59E0B' }]}>🎉 Earned — tap to give!</Text>
                        : <Text style={[styles.milestoneStatus, { color: colors.text3 }]}>Locked</Text>
                      }
                    </View>
                  </View>
                  <View style={styles.milestoneRowRight}>
                    {m.achieved && !m.redeemed && (
                      <TouchableOpacity
                        style={[styles.milestoneGiveBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={async () => {
                          Alert.alert(
                            '🎉 Give the reward?',
                            `Give "${m.reward}" to ${editingKid?.name}?`,
                            [
                              { text: 'Not yet', style: 'cancel' },
                              { text: 'Yes, given!', onPress: async () => {
                                try {
                                  await redeemMilestone(editingKid.id, m.id);
                                  setEditingKid({ ...editingKid });
                                } catch (e) {
                                  Alert.alert('Could not save', e?.message || 'Please try again.');
                                }
                              }},
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Give 🎁</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => Alert.alert('Delete milestone?', `Remove "${m.reward}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: async () => {
                          try { await deleteMilestone(editingKid.id, m.id); } catch (e) {
                            Alert.alert('Could not delete', e?.message || 'Please try again.');
                          }
                        }},
                      ])}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.text3} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Add new milestone */}
              <View style={[styles.milestoneAddRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.milestoneStarInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
                  value={newMilestoneStars}
                  onChangeText={setNewMilestoneStars}
                  placeholder="Stars"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.text3}
                  maxLength={3}
                />
                <TextInput
                  style={[styles.milestoneRewardInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
                  value={newMilestoneReward}
                  onChangeText={setNewMilestoneReward}
                  placeholder="Reward (e.g. Pizza night 🍕)"
                  placeholderTextColor={colors.text3}
                  maxLength={60}
                />
                <TouchableOpacity
                  style={[styles.milestoneAddBtn, { backgroundColor: milestoneLoading ? colors.text3 : colors.primary }]}
                  disabled={milestoneLoading}
                  onPress={async () => {
                    const stars = parseInt(newMilestoneStars, 10);
                    if (!stars || stars < 1) { Alert.alert('Enter a star count (e.g. 5)'); return; }
                    if (!newMilestoneReward.trim()) { Alert.alert('Enter a reward description'); return; }
                    setMilestoneLoading(true);
                    try {
                      await addMilestone(editingKid.id, { stars_required: stars, reward: newMilestoneReward });
                      setNewMilestoneStars('');
                      setNewMilestoneReward('');
                    } catch (e) {
                      Alert.alert('Could not add milestone', e?.message || 'Please try again.');
                    } finally {
                      setMilestoneLoading(false);
                    }
                  }}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Savings Goal ─────────────────────────────────────────────── */}
            {(() => {
              const currentKidData = editingKid
                ? (family?.kids?.find(k => k.id === editingKid.id))
                : null;
              const activeSavings = currentKidData?.goal?.savings || null;
              const kidApproved = editingKid
                ? tasks.filter(t => (t.assignedTo || t.assigned_to) === editingKid.id && t.status === 'approved').length
                : 0;
              const progress = activeSavings
                ? Math.min(kidApproved - activeSavings.startCount, activeSavings.questsRequired)
                : 0;

              return (
                <View style={[styles.milestoneSection, { borderTopColor: colors.divider, marginTop: 8 }]}>
                  <Text style={[styles.milestoneSectionTitle, { color: colors.text1 }]}>💰 {t('parentDashboard.savingsGoal')}</Text>
                  <Text style={[styles.milestoneSectionSub, { color: colors.text3 }]}>
                    {t('parentDashboard.savingsGoalSub', { name: editingKid?.name || 'your kid' })}
                  </Text>

                  {activeSavings ? (
                    /* Active challenge card */
                    <View style={[styles.savingsActiveCard, { backgroundColor: '#F0FDF4', borderColor: '#10B981' }]}>
                      <View style={styles.savingsActiveHeader}>
                        <Text style={[styles.savingsActiveTitle, { color: '#065F46' }]}>
                          🎯 {activeSavings.label || t('parentDashboard.savingsGoal')}
                        </Text>
                        <Text style={[styles.savingsActiveAmt, { color: '#10B981' }]}>
                          ${(activeSavings.rewardAmountCents / 100).toFixed(2)}
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View style={styles.savingsProgressRow}>
                        <Text style={[styles.savingsProgressText, { color: '#047857' }]}>
                          {t('parentDashboard.savingsProgress', { done: Math.max(0, progress), total: activeSavings.questsRequired })}
                        </Text>
                        {activeSavings.earned && (
                          <Text style={[styles.savingsEarnedBadge, { color: '#065F46', backgroundColor: '#BBF7D0' }]}>
                            🎉 Earned!
                          </Text>
                        )}
                      </View>
                      <View style={[styles.savingsTrack, { backgroundColor: '#D1FAE5' }]}>
                        <View style={[styles.savingsFill, {
                          width: `${Math.min((Math.max(0, progress) / activeSavings.questsRequired) * 100, 100)}%`,
                          backgroundColor: '#10B981',
                        }]} />
                      </View>

                      {activeSavings.earned ? (
                        <TouchableOpacity
                          style={[styles.assignBtn, { marginTop: 14, backgroundColor: '#10B981' }]}
                          onPress={() => {
                            Alert.alert(
                              t('parentDashboard.savingsMarkPaid'),
                              `Pay $${(activeSavings.rewardAmountCents / 100).toFixed(2)} to ${editingKid?.name} and reset for the next round?`,
                              [
                                { text: t('cancel'), style: 'cancel' },
                                { text: t('parentDashboard.savingsMarkPaid'), onPress: async () => {
                                  try {
                                    // completeSavingsChallenge sets paidOut:true on the current round
                                    // and then clears the challenge so a new one can be started.
                                    await completeSavingsChallenge(editingKid.id);
                                  } catch (e) {
                                    Alert.alert('Error', e?.message || 'Please try again.');
                                  }
                                }},
                              ]
                            );
                          }}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.assignBtnText}>{t('parentDashboard.savingsMarkPaid')}</Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        style={{ marginTop: 12, alignSelf: 'center' }}
                        onPress={() => {
                          Alert.alert(
                            t('parentDashboard.savingsRemove'),
                            'This will delete the current savings goal. The kid\'s quest progress is kept.',
                            [
                              { text: t('cancel'), style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: async () => {
                                try { await setSavingsChallenge(editingKid.id, null); } catch (e) {
                                  Alert.alert('Error', e?.message || 'Please try again.');
                                }
                              }},
                            ]
                          );
                        }}
                      >
                        <Text style={[styles.savingsRemoveText, { color: colors.text3 }]}>{t('parentDashboard.savingsRemove')}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Create new challenge form */
                    <View style={[styles.milestoneAddRow, { flexDirection: 'column', gap: 10, backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.formInput, { borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
                        value={savingsLabel}
                        onChangeText={setSavingsLabel}
                        placeholder={t('parentDashboard.savingsWhatFor')}
                        placeholderTextColor={colors.text3}
                        maxLength={60}
                      />
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                          style={[styles.formInput, { flex: 1, borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
                          value={savingsQuestCount}
                          onChangeText={v => setSavingsQuestCount(v.replace(/[^0-9]/g, ''))}
                          placeholder={t('parentDashboard.savingsQuestCount')}
                          placeholderTextColor={colors.text3}
                          keyboardType="number-pad"
                          maxLength={3}
                        />
                        <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                          <View style={[styles.dollarSign, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Text style={{ fontSize: 17, color: colors.text2, fontWeight: '700' }}>$</Text>
                          </View>
                          <TextInput
                            style={[styles.formInput, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
                            value={savingsDollars}
                            onChangeText={v => setSavingsDollars(v.replace(/[^0-9.]/g, ''))}
                            placeholder={t('parentDashboard.savingsRewardPlaceholder')}
                            placeholderTextColor={colors.text3}
                            keyboardType="decimal-pad"
                            maxLength={8}
                          />
                        </View>
                      </View>
                      <TouchableOpacity
                        style={[styles.assignBtn, { backgroundColor: savingsLoading ? colors.text3 : '#10B981', marginBottom: 4 }]}
                        disabled={savingsLoading}
                        onPress={async () => {
                          const count = parseInt(savingsQuestCount, 10);
                          if (!count || count < 1) { Alert.alert(t('parentDashboard.savingsEnterCount')); return; }
                          const cents = Math.round(parseFloat(savingsDollars) * 100);
                          if (!savingsDollars.trim() || isNaN(cents) || cents < 1) {
                            Alert.alert(t('parentDashboard.savingsEnterAmount'));
                            return;
                          }
                          setSavingsLoading(true);
                          try {
                            const startCount = tasks.filter(t =>
                              (t.assignedTo || t.assigned_to) === editingKid.id && t.status === 'approved'
                            ).length;
                            await setSavingsChallenge(editingKid.id, {
                              label:              savingsLabel.trim() || t('parentDashboard.savingsGoal'),
                              questsRequired:     count,
                              rewardAmountCents:  cents,
                              startCount,
                              earned:             false,
                              earnedAt:           null,
                              paidOut:            false,
                            });
                            setSavingsLabel('');
                            setSavingsQuestCount('5');
                            setSavingsDollars('');
                          } catch (e) {
                            Alert.alert('Error', e?.message || 'Could not save savings goal. Please try again.');
                          } finally {
                            setSavingsLoading(false);
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        {savingsLoading
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={{ fontSize: 16 }}>💰</Text>
                        }
                        <Text style={styles.assignBtnText}>
                          {savingsLoading ? 'Saving…' : t('parentDashboard.savingsStartGoal')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })()}

          </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

// ── Built-in parenting tips engine (no external API required) ─────────────────
const PARENTING_TIPS = [
  {
    keywords: ['motivat', 'bored', 'interest', 'engag', 'excit'],
    reply: 'Try rotating rewards every 2–3 weeks to keep things fresh. Let kids choose between 2–3 reward options so they feel ownership. Bonus stars for streaks (3 days in a row) also boost engagement significantly.',
  },
  {
    keywords: ['reward', 'prize', 'earn', 'incentiv'],
    reply: 'Mix tangible rewards (extra screen time, a small treat) with experience rewards (a special outing, choosing dinner). Research shows experience rewards create stronger positive memories than objects.',
  },
  {
    keywords: ['argu', 'refus', 'won\'t', 'resist', 'fight', 'battle'],
    reply: 'Try the "when/then" technique: "When you finish your chore, then you can play." Avoid power struggles — give two acceptable choices ("Do you want to clean your room before or after dinner?") so they feel control.',
  },
  {
    keywords: ['age', 'old enough', 'too young', 'too old', 'appropriate'],
    reply: 'Ages 2–4: simple tasks like putting toys away. Ages 5–8: making their bed, setting the table. Ages 9–12: laundry, vacuuming, meal prep. Teens: most household tasks plus budgeting their own rewards.',
  },
  {
    keywords: ['forget', 'remind', 'remember', 'consistenc'],
    reply: 'Consistency beats intensity. Set a fixed chore time each day (e.g. after school) so it becomes automatic. A short family check-in at dinner helps kids feel accountable without nagging.',
  },
  {
    keywords: ['sibling', 'fair', 'jealous', 'compet'],
    reply: 'Give each child age-appropriate chores so comparisons feel fair. Avoid pitting siblings against each other — instead, celebrate when the whole family hits a weekly goal together.',
  },
  {
    keywords: ['star', 'point', 'track', 'progress', 'chart'],
    reply: 'Visual progress trackers work wonders for kids under 10. Seeing stars accumulate gives a dopamine boost. For older kids, tie stars to a weekly allowance so the math feels real and meaningful.',
  },
  {
    keywords: ['allowance', 'money', 'pay', 'cash', 'dollar'],
    reply: 'A simple rule: $0.50–$1 per year of age per week is a common starting point. Link payment to chore completion — not just behaviour — so kids learn that effort = reward, a life skill that transfers to work.',
  },
  {
    keywords: ['screen', 'phone', 'tablet', 'game', 'tv'],
    reply: 'Screen time as a reward is very effective for ages 6–14. Set a clear rule: "Earn 30 minutes of screen time by completing your daily quest." Make it automatic so you\'re not the bad guy — the system is.',
  },
  {
    keywords: ['praise', 'encour', 'positiv', 'compliment'],
    reply: 'Specific praise beats generic praise. Instead of "Good job!", try "I noticed you scrubbed the sink really well — that takes effort!" This builds intrinsic motivation over time.',
  },
];

function getLocalSettingsAiResponse(question) {
  const q = question.toLowerCase();
  for (const tip of PARENTING_TIPS) {
    if (tip.keywords.some(kw => q.includes(kw))) return tip.reply;
  }
  return 'Great question! Here are three universal tips: (1) Keep chore expectations consistent and age-appropriate. (2) Celebrate effort as much as results — "You tried hard" matters. (3) Make it fun when possible — music, timers, or friendly races all help kids build positive habits around responsibilities.';
}

function SettingsTab({ navigation }) {
  const { colors, isDark, toggleDark } = useTheme();
  const { t, i18n } = useTranslation();
  const { family, updateParentProfile, updateNotifyPrefs, clearAllData, verifyPin, isCloudEnabled, resetOnboarding } = useApp();
  const { isPremium, premiumPriceString, restorePurchases, purchasing } = useSubscription();
  const { isTablet, pad } = useDevice();
  const [restoringPurchases, setRestoringPurchases] = useState(false);

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
  const [pinAttempts,   setPinAttempts]   = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState(0);

  // AI Assistant state
  const [aiInput,    setAiInput]    = useState('');
  const [aiReply,    setAiReply]    = useState('');
  const [aiLoading,  setAiLoading]  = useState(false);

  function handleAiAsk() {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiReply('');
    // Small delay for UX feedback
    setTimeout(() => {
      const reply = getLocalSettingsAiResponse(aiInput.trim());
      setAiReply(reply);
      setAiLoading(false);
    }, 500);
  }

  // Notification preferences
  const defaultPrefs = { taskCompleted: true, taskApproved: true };
  const notifyPrefs = family?.notifyPrefs || defaultPrefs;
  const [notifTaskCompleted, setNotifTaskCompleted] = useState(notifyPrefs.taskCompleted !== false);
  const [notifTaskApproved,  setNotifTaskApproved]  = useState(notifyPrefs.taskApproved  !== false);

  // Sync notification toggles when family.notifyPrefs changes externally
  useEffect(() => {
    setNotifTaskCompleted(family?.notifyPrefs?.taskCompleted !== false);
    setNotifTaskApproved(family?.notifyPrefs?.taskApproved !== false);
  }, [family?.notifyPrefs?.taskCompleted, family?.notifyPrefs?.taskApproved]);

  async function handleSaveProfile() {
    if (!editName.trim()) { Alert.alert(t('settings.enterName')); return; }
    try {
      await updateParentProfile({
        parentName:  editName.trim(),
        parentPhone: editPhone.trim(),
        parentEmoji: editEmoji,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (e) {
      Alert.alert('Could not save profile', e?.message || 'Something went wrong. Please try again.');
    }
  }

  async function handleChangePin() {
    // Rate limiting: check if currently locked out
    if (Date.now() < pinLockedUntil) {
      const secs = Math.ceil((pinLockedUntil - Date.now()) / 1000);
      setPinMsg({ text: `Too many attempts. Try again in ${secs}s.`, ok: false });
      return;
    }
    setPinMsg(null);
    try {
      const pinOk = await verifyPin(currentPin);
      if (!pinOk) {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        if (newAttempts >= 5) {
          setPinLockedUntil(Date.now() + 30000);
          setPinAttempts(0);
          setPinMsg({ text: 'Too many incorrect attempts. Locked for 30 seconds.', ok: false });
          return;
        }
        setPinMsg({ text: t('settings.pinIncorrect'), ok: false });
        return;
      }
      // Successful verify — reset attempt counter
      setPinAttempts(0);
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
    } catch (e) {
      setPinMsg({ text: e?.message || 'Could not update PIN. Please try again.', ok: false });
    }
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
            // AppNavigator automatically redirects to WelcomeScreen when family becomes null
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
          contentContainerStyle={[styles.tabScroll, isTablet && { paddingHorizontal: pad }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={true}
        >
          <TabContent>
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

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.appearance')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.notifRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.text1 }]}>{t('settings.nightMode')}</Text>
              <Text style={[styles.notifSub, { color: colors.text3 }]}>{t('settings.nightModeSub')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggleBtn, isDark && { backgroundColor: colors.primary }]}
              onPress={toggleDark}
              activeOpacity={0.85}
            >
              <View style={[styles.toggleThumb, isDark && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Language ──────────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.language')}</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.notifSub, { color: colors.text3, marginBottom: 12 }]}>{t('settings.languageSub')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ code: 'en', label: t('settings.english') }, { code: 'es', label: t('settings.spanish') }].map(({ code, label }) => {
              const active = i18n.language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.assignBtn, { flex: 1, backgroundColor: active ? colors.primary : colors.bg, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border }]}
                  onPress={() => changeLanguage(code)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.assignBtnText, { color: active ? '#fff' : colors.text2 }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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

        {/* ── Subscription ──────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>SUBSCRIPTION</Text>
        {isPremium ? (
          <View style={[styles.settingsCard, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC', borderWidth: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 26 }}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.aiCardTitle, { color: '#166534' }]}>Kindo Premium — Active</Text>
                <Text style={[styles.aiCardSub, { color: '#15803D' }]}>Unlimited kids · Cash rewards · All features</Text>
              </View>
            </View>
            <TouchableOpacity
              style={{ marginTop: 14, alignItems: 'center', paddingVertical: 8 }}
              disabled={restoringPurchases}
              onPress={async () => {
                setRestoringPurchases(true);
                await restorePurchases().catch(() => {});
                setRestoringPurchases(false);
              }}
            >
              {restoringPurchases
                ? <ActivityIndicator size="small" color="#166534" />
                : <Text style={{ color: '#166534', fontSize: 13, fontWeight: '600' }}>Restore Purchases</Text>
              }
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.settingsCard, { backgroundColor: '#FAF5FF', borderColor: '#C4B5FD', borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 14 }]}
            onPress={() => navigation.navigate('Upgrade')}
            activeOpacity={0.85}
          >
            <View style={[styles.aiIconBox, { backgroundColor: '#EDE9FE' }]}>
              <Text style={{ fontSize: 26 }}>👑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiCardTitle, { color: '#5B21B6' }]}>Upgrade to Premium</Text>
              <Text style={[styles.aiCardSub, { color: '#7C3AED' }]}>{premiumPriceString} · Unlimited kids + cash rewards</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
          </TouchableOpacity>
        )}

        {/* ── Payments ──────────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.payments')}</Text>
        <TouchableOpacity
          style={[styles.settingsCard, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 14 }]}
          onPress={() => navigation.navigate('Payments')}
          activeOpacity={0.85}
        >
          <View style={[styles.aiIconBox, { backgroundColor: '#D1FAE5' }]}>
            <Text style={{ fontSize: 26 }}>💳</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.aiCardTitle, { color: colors.text1 }]}>{t('settings.paymentsTitle')}</Text>
            <Text style={[styles.aiCardSub, { color: colors.text3 }]}>{t('settings.paymentsSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text3} />
        </TouchableOpacity>

        {/* ── AI Features ───────────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text3 }]}>{t('settings.aiFeatures')}</Text>

        {/* AI Quest Creator shortcut */}
        <TouchableOpacity
          style={[styles.settingsCard, { backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }]}
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

        {/* AI Assistant inline chat */}
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Text style={{ fontSize: 22 }}>✨</Text>
            <View>
              <Text style={[styles.aiCardTitle, { color: colors.text1 }]}>{t('settings.aiAssistant')}</Text>
              <Text style={[styles.aiCardSub, { color: colors.text3 }]}>{t('settings.aiAssistantSub')}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.formInput, { flex: 1, marginBottom: 0, borderColor: colors.border, color: colors.text1, backgroundColor: colors.bg }]}
              placeholder={t('settings.aiAssistantPlaceholder')}
              placeholderTextColor={colors.text3}
              value={aiInput}
              onChangeText={setAiInput}
              returnKeyType="send"
              onSubmitEditing={handleAiAsk}
            />
            <TouchableOpacity
              style={[styles.assignBtn, { paddingHorizontal: 18, backgroundColor: colors.primary, marginBottom: 0 }]}
              onPress={handleAiAsk}
              disabled={aiLoading}
              activeOpacity={0.85}
            >
              {aiLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontSize: 18 }}>→</Text>}
            </TouchableOpacity>
          </View>

          {aiReply ? (
            <View style={[{ marginTop: 14, backgroundColor: colors.primaryLight, borderRadius: 14, padding: 14 }]}>
              <Text style={[{ color: colors.primary, fontSize: 14, lineHeight: 22, fontWeight: '500' }]}>{aiReply}</Text>
            </View>
          ) : null}

          {/* Quick prompts */}
          {!aiReply && !aiLoading && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {[t('settings.aiPrompt1'), t('settings.aiPrompt2'), t('settings.aiPrompt3')].map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[{ borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border }]}
                  onPress={() => { setAiInput(prompt); }}
                  activeOpacity={0.8}
                >
                  <Text style={[{ fontSize: 12, fontWeight: '600', color: colors.text2 }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

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
              <TouchableOpacity
                style={[styles.assignBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => {
                  Share.share({
                    title: 'Join my Kindo family!',
                    message: `Hey! Join my family on Kindo 🌟\n\nUse invite code: ${family.inviteCode}\nOr tap this link: kindo://join/${family.inviteCode}`,
                  });
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.assignBtnText}>Share Invite Link</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Replay Onboarding ──────────────────────────────────────────── */}
        <Text style={[styles.settingsSectionLabel, { marginTop: 28, color: colors.text2 }]}>🎓 App Walkthrough</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.dangerText, { color: colors.text2 }]}>
            Watch the intro walkthrough again — great for showing new family members how Kindo works.
          </Text>
          <TouchableOpacity
            style={[styles.assignBtn, { backgroundColor: '#7C3AED', marginTop: 14 }]}
            onPress={() => {
              Alert.alert(
                '🎓 Replay Walkthrough?',
                'This will show the intro walkthrough the next time you return to the app.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Replay Intro',
                    onPress: async () => {
                      await resetOnboarding();
                      Alert.alert('✅ Done!', 'Close the app and reopen it to see the walkthrough.');
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle-outline" size={20} color="#fff" />
            <Text style={styles.assignBtnText}>Replay Intro Walkthrough</Text>
          </TouchableOpacity>
        </View>

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
          </TabContent>
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
    <View style={{ flex: 1, backgroundColor: colors.bg }} onTouchStart={onUserInteraction}>
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
    </View>
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
  cashBadge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cashBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dollarSign: {
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
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

  // ─── Milestones
  milestoneSection:       { marginTop: 8, paddingTop: 20, borderTopWidth: 1 },
  milestoneSectionTitle:  { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  milestoneSectionSub:    { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  milestoneRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 10 },
  milestoneRowLeft:       { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  milestoneRowRight:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneStarBadge:     { fontSize: 15, fontWeight: '800', minWidth: 48 },
  milestoneRewardText:    { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  milestoneStatus:        { fontSize: 12, fontWeight: '500' },
  milestoneGiveBtn:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  milestoneAddRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginTop: 4, marginBottom: 32 },
  milestoneStarInput:     { width: 56, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, textAlign: 'center', fontSize: 14, fontWeight: '700' },
  milestoneRewardInput:   { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  milestoneAddBtn:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

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

  // ── Savings Goal styles ──────────────────────────────────────────────────────
  savingsPayoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 14,
  },
  savingsPayoutTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  savingsPayoutSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  savingsPayBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  savingsPayBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  savingsActiveCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 12,
  },
  savingsActiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  savingsActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  savingsActiveAmt: {
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 8,
  },
  savingsProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  savingsProgressText: {
    fontSize: 13,
    fontWeight: '600',
  },
  savingsEarnedBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  savingsTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  savingsFill: {
    height: 8,
    borderRadius: 4,
  },
  savingsRemoveText: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },

  // ── Template browse button ──────────────────────────────────────────────────
  templateBrowseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#7C3AED30',
    padding: 14,
    marginBottom: 20,
  },
  templateBrowseBtnEmoji: {
    fontSize: 26,
    width: 36,
    textAlign: 'center',
  },
  templateBrowseBtnTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#5B21B6',
    marginBottom: 2,
  },
  templateBrowseBtnSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7C3AED',
  },

  // ── Goal reached / milestone banners ───────────────────────────────────────
  goalReachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#7C3AED',
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  goalReachedGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C3AED20',
  },
  goalReachedCrown: {
    fontSize: 32,
  },
  goalReachedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4C1D95',
    marginBottom: 3,
  },
  goalReachedSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6D28D9',
  },
  goalRewardBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  goalRewardBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },

  // ── Star Store ──────────────────────────────────────────────────────────────
  storeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  storeItemEmoji: {
    fontSize: 24,
    width: 32,
    textAlign: 'center',
  },
  storeItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  storeItemCost: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  emptyHint: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
});
