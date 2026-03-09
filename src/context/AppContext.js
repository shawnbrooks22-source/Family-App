/**
 * Kindo — AppContext
 *
 * Persistence strategy:
 *  • Primary:  Supabase (cloud, multi-device, real-time)
 *  • Fallback: AsyncStorage (local, works offline if Supabase is not yet configured)
 *
 * The app detects whether Supabase is configured by checking if the URL/key
 * placeholders have been replaced. If not configured, it falls back to
 * pure AsyncStorage (same behaviour as before).
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  hashPin,
  checkPin,
  secureSave,
  secureLoad,
  secureDelete,
  sanitize,
  startParentSession,
  touchParentSession,
  isParentSessionValid,
  endParentSession,
} from '../lib/security';

// ─── Supabase (optional — falls back to AsyncStorage if unconfigured) ──────────
let supabase = null;
let SUPABASE_READY = false;
try {
  const { supabase: sb, SUPABASE_URL, SUPABASE_ANON } = require('../lib/supabase');
  if (
    SUPABASE_URL  && !SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
    SUPABASE_ANON && !SUPABASE_ANON.includes('YOUR_SUPABASE_ANON_KEY')
  ) {
    supabase = sb;
    SUPABASE_READY = true;
  }
} catch {
  // supabase.js doesn't exist yet — use local mode
}

// Show notifications when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

const AppContext = createContext(null);

const FAMILY_KEY     = '@kindo_family';
const TASKS_KEY      = '@kindo_tasks';
const FAMILY_ID_KEY  = 'kindo_family_id';    // stored in SecureStore
const PARENT_PIN_KEY = 'kindo_parent_pin';   // stored in SecureStore (hashed)

async function requestNotifPermissions() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function sendNotif(title, body) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // Notifications not available — ignore
  }
}

// Generate a human-friendly invite code like "KINDO-LION-3847"
function generateInviteCode() {
  const animals = ['LION', 'BEAR', 'FOX', 'OWL', 'WOLF', 'DUCK', 'FROG', 'PANDA'];
  const animal  = animals[Math.floor(Math.random() * animals.length)];
  const num     = String(Math.floor(1000 + Math.random() * 9000));
  return `KINDO-${animal}-${num}`;
}

export function AppProvider({ children }) {
  const [isLoaded, setIsLoaded]   = useState(false);
  const [family,   setFamily]     = useState(null);
  const [tasks,    setTasks]      = useState([]);
  const [familyId, setFamilyId]   = useState(null); // Supabase families.id
  const realtimeSub = useRef(null);

  useEffect(() => {
    loadData();
    requestNotifPermissions();
    return () => {
      // Cleanup real-time subscription on unmount
      realtimeSub.current?.unsubscribe();
    };
  }, []);

  // ── Subscribe to real-time task updates from Supabase ─────────────────────
  function subscribeRealtime(fid) {
    if (!SUPABASE_READY || !fid) return;
    realtimeSub.current?.unsubscribe();

    realtimeSub.current = supabase
      .channel(`kindo_tasks_${fid}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'tasks',
        filter: `family_id=eq.${fid}`,
      }, () => {
        // Re-fetch tasks whenever any change happens
        loadTasksFromSupabase(fid);
      })
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'profiles',
        filter: `family_id=eq.${fid}`,
      }, () => {
        loadFamilyFromSupabase(fid);
      })
      .subscribe();
  }

  // ── Load family data ───────────────────────────────────────────────────────
  async function loadData() {
    try {
      // Family ID is stored in SecureStore; everything else in AsyncStorage cache
      const [storedFamilyId, familyRaw, tasksRaw] = await Promise.all([
        secureLoad(FAMILY_ID_KEY),          // SecureStore (encrypted)
        AsyncStorage.getItem(FAMILY_KEY),   // AsyncStorage cache
        AsyncStorage.getItem(TASKS_KEY),
      ]);

      if (SUPABASE_READY && storedFamilyId) {
        // Load from Supabase
        setFamilyId(storedFamilyId);
        await Promise.all([
          loadFamilyFromSupabase(storedFamilyId),
          loadTasksFromSupabase(storedFamilyId),
        ]);
        subscribeRealtime(storedFamilyId);
      } else {
        // Local AsyncStorage fallback
        if (familyRaw) setFamily(JSON.parse(familyRaw));
        if (tasksRaw)  setTasks(JSON.parse(tasksRaw));
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function loadFamilyFromSupabase(fid) {
    try {
      const [{ data: famRow }, { data: profiles }] = await Promise.all([
        supabase.from('families').select('*').eq('id', fid).single(),
        supabase.from('profiles').select('*').eq('family_id', fid),
      ]);
      if (!famRow) return;
      const parent = profiles?.find(p => p.role === 'parent');
      const kids   = profiles?.filter(p => p.role === 'kid') || [];
      const familyData = {
        _supabaseFamilyId: fid,
        inviteCode:   famRow.invite_code,
        parentName:   parent?.name   || '',
        parentEmoji:  parent?.emoji  || '👩',
        parentPhone:  parent?.phone  || '',
        parentPin:    parent?.parent_pin || '',
        parentId:     parent?.id     || '',
        kids: kids.map(k => ({
          id:    k.id,
          name:  k.name,
          emoji: k.emoji,
          color: k.color,
          phone: k.phone || '',
          goal:  k.goal || null,
          streak: k.streak || 0,
          lastCompletedDate: k.last_completed_date || null,
        })),
      };
      setFamily(familyData);
      // Cache locally for offline reads
      await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(familyData));
    } catch (e) {
      console.error('Failed to load family from Supabase:', e);
    }
  }

  async function loadTasksFromSupabase(fid) {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', fid)
        .order('created_at', { ascending: true });
      if (data) {
        setTasks(data);
        await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Failed to load tasks from Supabase:', e);
    }
  }

  // ── Local save helpers (used in fallback mode) ─────────────────────────────
  async function saveFamily(data) {
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(data));
    setFamily(data);
  }

  async function saveTasks(newTasks) {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
    setTasks(newTasks);
  }

  // ── Setup family (first-time) ──────────────────────────────────────────────
  async function setupFamily(data) {
    // Hash the PIN before it ever touches storage
    const pinHash = await hashPin(data.parentPin);
    const safeData = {
      ...data,
      parentName:  sanitize(data.parentName, 60),
      parentPhone: sanitize(data.parentPhone, 20),
      parentPin:   pinHash,   // store hash, never plain text
      kids: (data.kids || []).map(k => ({ ...k, name: sanitize(k.name, 60) })),
    };
    if (SUPABASE_READY) {
      await setupFamilyInSupabase(safeData);
    } else {
      await saveFamily(safeData);
    }
  }

  async function setupFamilyInSupabase(data) {
    const inviteCode = generateInviteCode();
    // Create family row
    const { data: famRow, error: famErr } = await supabase
      .from('families')
      .insert({ name: `${data.parentName}'s Family`, invite_code: inviteCode })
      .select()
      .single();
    if (famErr) throw famErr;

    const fid = famRow.id;
    const parentId = `parent_${Date.now()}`;

    // Create parent profile
    await supabase.from('profiles').insert({
      id:         parentId,
      family_id:  fid,
      name:       data.parentName,
      emoji:      data.parentEmoji,
      phone:      data.parentPhone || '',
      role:       'parent',
      parent_pin: data.parentPin,
    });

    // Create kid profiles
    for (const kid of (data.kids || [])) {
      await supabase.from('profiles').insert({
        id:        kid.id || `kid_${Date.now()}_${Math.random()}`,
        family_id: fid,
        name:      kid.name,
        emoji:     kid.emoji,
        color:     kid.color,
        phone:     kid.phone || '',
        role:      'kid',
      });
    }

    // Persist family ID in SecureStore (encrypted on device)
    await secureSave(FAMILY_ID_KEY, fid);
    setFamilyId(fid);
    await loadFamilyFromSupabase(fid);
    subscribeRealtime(fid);
  }

  // ── Join existing family via invite code ───────────────────────────────────
  async function joinFamilyByCode(code) {
    if (!SUPABASE_READY) throw new Error('Supabase not configured');
    const { data: famRow, error } = await supabase
      .from('families')
      .select('*')
      .eq('invite_code', sanitize(code).toUpperCase())
      .single();
    if (error || !famRow) throw new Error('Invalid invite code — please check and try again.');
    const fid = famRow.id;
    await secureSave(FAMILY_ID_KEY, fid);
    setFamilyId(fid);
    await Promise.all([
      loadFamilyFromSupabase(fid),
      loadTasksFromSupabase(fid),
    ]);
    subscribeRealtime(fid);
    return fid;
  }

  // ── Task operations ────────────────────────────────────────────────────────
  async function addTask(task) {
    const newTask = {
      id:          Date.now().toString(),
      family_id:   familyId || undefined,
      status:      'pending',
      celebrated:  false,
      created_at:  Date.now(),
      completed_at: null,
      approved_at:  null,
      recurrence:  task.recurrence || 'none',
      notes:       task.notes || '',
      ...task,
    };

    if (SUPABASE_READY && familyId) {
      const { error } = await supabase.from('tasks').insert(newTask);
      if (error) throw error;
      // Realtime will refresh tasks automatically
    } else {
      await saveTasks([...tasks, newTask]);
    }
    return newTask;
  }

  async function editTask(taskId, updates) {
    if (SUPABASE_READY && familyId) {
      await supabase.from('tasks').update(updates).eq('id', taskId);
    } else {
      await saveTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }
  }

  async function completeTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const updates = { status: 'completed', completed_at: Date.now() };

    if (SUPABASE_READY && familyId) {
      await supabase.from('tasks').update(updates).eq('id', taskId);
    } else {
      await saveTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }

    // Update the kid's daily streak
    const kidId = task?.assignedTo || task?.assigned_to;
    if (kidId) await updateStreak(kidId);

    // Notify the parent so they can approve quickly
    const kid = family?.kids?.find(k => k.id === kidId);
    await sendNotif(
      '⚡ Quest Complete — Review Needed!',
      `${kid?.name || 'Your kid'} finished "${task?.emoji || ''} ${task?.title || 'a quest'}" and is waiting for your approval! 🎉`
    );
  }

  async function approveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const updates = { status: 'approved', celebrated: false, approved_at: Date.now() };

    if (SUPABASE_READY && familyId) {
      await supabase.from('tasks').update(updates).eq('id', taskId);
      // Auto-respawn recurring tasks
      if (task?.recurrence && task.recurrence !== 'none') {
        await supabase.from('tasks').insert({
          ...task,
          id:           (Date.now() + 1).toString(),
          status:       'pending',
          celebrated:   false,
          created_at:   Date.now(),
          completed_at: null,
          approved_at:  null,
        });
      }
    } else {
      let updated = tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      if (task?.recurrence && task.recurrence !== 'none') {
        updated = [...updated, {
          ...task,
          id:           (Date.now() + 1).toString(),
          status:       'pending',
          celebrated:   false,
          created_at:   Date.now(),
          completed_at: null,
          approved_at:  null,
        }];
      }
      await saveTasks(updated);
    }

    // Notify
    const kid = family?.kids?.find(k => k.id === (task?.assignedTo || task?.assigned_to));
    if (kid) {
      await sendNotif(
        '⭐ Reward Released!',
        `${kid.name} earned "${task?.reward}" for completing ${task?.emoji} ${task?.title}! 🎉`
      );
    }
  }

  async function markCelebrated(taskId) {
    if (SUPABASE_READY && familyId) {
      await supabase.from('tasks').update({ celebrated: true }).eq('id', taskId);
    } else {
      await saveTasks(tasks.map(t => t.id === taskId ? { ...t, celebrated: true } : t));
    }
  }

  async function deleteTask(taskId) {
    if (SUPABASE_READY && familyId) {
      await supabase.from('tasks').delete().eq('id', taskId);
    } else {
      await saveTasks(tasks.filter(t => t.id !== taskId));
    }
  }

  // ── Kid operations ─────────────────────────────────────────────────────────
  async function addKid(kid) {
    const newKid = { ...kid, id: Date.now().toString(), goal: null, streak: 0 };
    if (SUPABASE_READY && familyId) {
      await supabase.from('profiles').insert({
        id:        newKid.id,
        family_id: familyId,
        name:      newKid.name,
        emoji:     newKid.emoji,
        color:     newKid.color,
        phone:     newKid.phone || '',
        role:      'kid',
      });
    } else {
      const updated = { ...family, kids: [...family.kids, newKid] };
      await saveFamily(updated);
    }
  }

  async function editKid(kidId, updates) {
    if (SUPABASE_READY && familyId) {
      const dbUpdates = {};
      if (updates.name)  dbUpdates.name  = updates.name;
      if (updates.emoji) dbUpdates.emoji = updates.emoji;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      await supabase.from('profiles').update(dbUpdates).eq('id', kidId);
    } else {
      const updated = {
        ...family,
        kids: family.kids.map(k => k.id === kidId ? { ...k, ...updates } : k),
      };
      await saveFamily(updated);
    }
  }

  async function removeKid(kidId) {
    if (SUPABASE_READY && familyId) {
      await Promise.all([
        supabase.from('profiles').delete().eq('id', kidId),
        supabase.from('tasks').delete().eq('assigned_to', kidId),
      ]);
    } else {
      const updated = { ...family, kids: family.kids.filter(k => k.id !== kidId) };
      await saveFamily(updated);
      await saveTasks(tasks.filter(t => t.assignedTo !== kidId));
    }
  }

  async function setKidGoal(kidId, goal) {
    if (SUPABASE_READY && familyId) {
      await supabase.from('profiles').update({ goal }).eq('id', kidId);
    } else {
      const updated = {
        ...family,
        kids: family.kids.map(k => k.id === kidId ? { ...k, goal } : k),
      };
      await saveFamily(updated);
    }
  }

  // ── Streak tracking ────────────────────────────────────────────────────────
  async function updateStreak(kidId) {
    if (!kidId) return;
    const kid = family?.kids?.find(k => k.id === kidId);
    if (!kid) return;

    const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const last  = kid.lastCompletedDate || null;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = kid.streak || 0;
    if (last === today) {
      // Already updated today — no change
      return;
    } else if (last === yesterday) {
      // Consecutive day — extend streak
      newStreak += 1;
    } else {
      // Streak broken (or first ever) — reset to 1
      newStreak = 1;
    }

    const streakUpdates = { streak: newStreak, lastCompletedDate: today };
    if (SUPABASE_READY && familyId) {
      await supabase.from('profiles').update({
        streak: newStreak,
        last_completed_date: today,
      }).eq('id', kidId);
    } else {
      const updated = {
        ...family,
        kids: family.kids.map(k =>
          k.id === kidId ? { ...k, streak: newStreak, lastCompletedDate: today } : k
        ),
      };
      await saveFamily(updated);
    }
  }

  // ── Parent profile update ──────────────────────────────────────────────────
  async function updateParentProfile(updates) {
    // If a new plain-text PIN is being set, hash it first
    let processedUpdates = { ...updates };
    if (updates.parentPin && updates.parentPin.length === 4 && /^\d{4}$/.test(updates.parentPin)) {
      processedUpdates.parentPin = await hashPin(updates.parentPin, familyId || 'local');
    }
    if (updates.parentName)  processedUpdates.parentName  = sanitize(updates.parentName, 60);
    if (updates.parentPhone) processedUpdates.parentPhone = sanitize(updates.parentPhone, 20);

    if (SUPABASE_READY && familyId && family?.parentId) {
      const dbUpdates = {};
      if (processedUpdates.parentName)  dbUpdates.name       = processedUpdates.parentName;
      if (processedUpdates.parentEmoji) dbUpdates.emoji      = processedUpdates.parentEmoji;
      if (processedUpdates.parentPhone !== undefined) dbUpdates.phone = processedUpdates.parentPhone;
      if (processedUpdates.parentPin)   dbUpdates.parent_pin = processedUpdates.parentPin;
      await supabase.from('profiles').update(dbUpdates).eq('id', family.parentId);
    } else {
      const updated = { ...family, ...processedUpdates };
      await saveFamily(updated);
    }
  }

  // ── Clear all data ─────────────────────────────────────────────────────────
  async function clearAllData() {
    try {
      if (SUPABASE_READY && familyId) {
        // Delete family and all related data (cascade)
        await supabase.from('families').delete().eq('id', familyId);
      }
      await AsyncStorage.multiRemove([FAMILY_KEY, TASKS_KEY]);
      await secureDelete(FAMILY_ID_KEY);
      await endParentSession();
      realtimeSub.current?.unsubscribe();
      setTasks([]);
      setFamily(null);
      setFamilyId(null);
    } catch (e) {
      console.error('Failed to clear data:', e);
    }
  }

  /**
   * Verify a PIN against the stored hash.
   * Supports legacy plain-text PINs (first login after upgrade) by falling
   * back to direct comparison, then auto-migrating to the hashed version.
   */
  async function verifyPin(pin) {
    if (!family?.parentPin) return false;
    const storedPin = family.parentPin;

    // Already a SHA-256 hex hash (64 chars) — use secure comparison
    if (storedPin.length === 64) {
      const fid = familyId || 'local';
      return checkPin(pin, storedPin, fid);
    }

    // Legacy plain-text PIN — verify then silently migrate to hashed version
    if (storedPin === pin) {
      const hashed = await hashPin(pin, familyId || 'local');
      await updateParentProfile({ parentPin: hashed });
      return true;
    }
    return false;
  }

  async function lockParentZone() {
    await endParentSession();
  }

  async function unlockParentZone() {
    await startParentSession();
  }

  async function checkParentSession() {
    return isParentSessionValid();
  }

  async function refreshParentSession() {
    await touchParentSession();
  }

  return (
    <AppContext.Provider
      value={{
        isLoaded,
        family,
        tasks,
        familyId,
        isCloudEnabled: SUPABASE_READY,
        // Family setup & join
        setupFamily,
        joinFamilyByCode,
        // Task CRUD
        addTask,
        editTask,
        completeTask,
        approveTask,
        markCelebrated,
        deleteTask,
        // Kid CRUD
        addKid,
        editKid,
        removeKid,
        setKidGoal,
        // Profile
        updateParentProfile,
        clearAllData,
        // Auth / session
        verifyPin,
        lockParentZone,
        unlockParentZone,
        checkParentSession,
        refreshParentSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
