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

// UUID v4 generator — crypto.randomUUID() is not available in React Native
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const FAMILY_KEY      = '@kindo_family';
const TASKS_KEY       = '@kindo_tasks';
const FAMILY_ID_KEY   = 'kindo_family_id';    // stored in SecureStore
const PARENT_PIN_KEY  = 'kindo_parent_pin';   // stored in SecureStore (hashed)
const NOTIF_ASKED_KEY = '@kindo_notif_asked'; // true once user has seen the permission screen

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

// Generate a human-friendly invite code like "KINDO-LION-384729"
// Entropy: 20 words × 900,000 numbers = 18,000,000 combinations
function generateInviteCode() {
  const words = [
    'LION', 'BEAR', 'FOX',  'OWL',  'WOLF', 'DUCK', 'FROG', 'PANDA',
    'HAWK', 'DEER', 'SEAL', 'LYNX', 'CROW', 'MOLE', 'SWAN', 'TOAD',
    'CRAB', 'NEWT', 'VOLE', 'IBIS',
  ];
  const word = words[Math.floor(Math.random() * words.length)];
  const num  = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
  return `KINDO-${word}-${num}`;
}

export function AppProvider({ children }) {
  const [isLoaded,          setIsLoaded]          = useState(false);
  const [family,            setFamily]            = useState(null);
  const [tasks,             setTasks]             = useState([]);
  const [familyId,          setFamilyId]          = useState(null); // Supabase families.id
  const [authUser,          setAuthUser]          = useState(null);  // Supabase auth user
  const [notificationsAsked, setNotificationsAsked] = useState(false); // shown permission screen?
  const realtimeSub = useRef(null);

  useEffect(() => {
    loadData();

    // Keep authUser state in sync with the real Supabase session.
    // Without this, React state can drift from the actual session — leading to
    // RLS failures because we attempt cloud writes when no JWT is present.
    let authSub = null;
    if (SUPABASE_READY) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user || null);
      });
      authSub = data?.subscription;
    }

    return () => {
      realtimeSub.current?.unsubscribe();
      authSub?.unsubscribe?.();
    };
  }, []);

  // Returns a valid session or null. Forces a refresh attempt if the access
  // token is missing/expired so writes don't go out without a JWT.
  async function ensureSession() {
    if (!SUPABASE_READY) return null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session;
      // No token in cache — try a refresh in case there's a refresh token
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed?.session || null;
    } catch {
      return null;
    }
  }

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

  // ── Mark that the user has seen the notification permission screen ───────────
  async function markNotificationsAsked() {
    await AsyncStorage.setItem(NOTIF_ASKED_KEY, 'true');
    setNotificationsAsked(true);
  }

  // ── Load family data ───────────────────────────────────────────────────────
  async function loadData() {
    try {
      // Check if user has already seen the notification permission screen
      const notifAsked = await AsyncStorage.getItem(NOTIF_ASKED_KEY);
      if (notifAsked === 'true') setNotificationsAsked(true);

      // First try to restore an existing Supabase Auth session
      let hasSession = false;
      if (SUPABASE_READY) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          hasSession = true;
          setAuthUser(session.user);
          // Use the server's my_family_id() RPC — this returns the EXACT same
          // value that RLS policies evaluate, so local state always matches the
          // server. Supabase never throws — it returns { data, error } — so we
          // must check the error field rather than relying on a catch block.
          let fid = null;
          const { data: rpcId, error: rpcErr } = await supabase.rpc('my_family_id');
          if (!rpcErr && rpcId) {
            fid = rpcId;
          } else {
            // RPC unavailable or returned an error — fall back to direct query
            const { data: famRows } = await supabase
              .from('families').select('id')
              .eq('parent_auth_id', session.user.id)
              .order('created_at', { ascending: false }).limit(1);
            fid = famRows?.[0]?.id || null;
          }
          const famRow = fid ? { id: fid } : null;
          if (famRow) {
            setFamilyId(fid);
            await secureSave(FAMILY_ID_KEY, fid);
            await Promise.all([
              loadFamilyFromSupabase(fid),
              loadTasksFromSupabase(fid),
            ]);
            subscribeRealtime(fid);
            return;
          }
          // Authed but no family owned — clear any stale cached family id
          // so we don't try to write to a family this user doesn't own
          // (which would produce an RLS violation on the next insert).
          await secureDelete(FAMILY_ID_KEY).catch(() => {});
          await AsyncStorage.multiRemove([FAMILY_KEY, TASKS_KEY]).catch(() => {});
          return;
        }
      }

      // Fallback: SecureStore family ID (pre-auth installs or local mode)
      const [storedFamilyId, familyRaw, tasksRaw] = await Promise.all([
        secureLoad(FAMILY_ID_KEY),
        AsyncStorage.getItem(FAMILY_KEY),
        AsyncStorage.getItem(TASKS_KEY),
      ]);

      // Only use a cached familyId in cloud mode if we have a valid session;
      // otherwise we'd attempt RLS-protected writes without a JWT and fail.
      if (SUPABASE_READY && storedFamilyId && hasSession) {
        setFamilyId(storedFamilyId);
        await Promise.all([
          loadFamilyFromSupabase(storedFamilyId),
          loadTasksFromSupabase(storedFamilyId),
        ]);
        subscribeRealtime(storedFamilyId);
      } else {
        // Pure local/offline mode — read from AsyncStorage
        if (familyRaw) setFamily(JSON.parse(familyRaw));
        if (tasksRaw)  setTasks(JSON.parse(tasksRaw));
      }
    } catch (e) {
      if (__DEV__) console.error('Failed to load data:', e);
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
        notifyPrefs:  parent?.notify_prefs || { taskCompleted: true, taskApproved: true },
        // Payment fields (parent)
        stripeCardLast4: parent?.stripe_card_last4 || null,
        stripeCardBrand: parent?.stripe_card_brand || null,
        kids: kids.map(k => ({
          id:            k.id,
          name:          k.name,
          emoji:         k.emoji,
          color:         k.color,
          phone:         k.phone || '',
          goal:          k.goal || null,
          streak:        k.streak || 0,
          lastCompletedDate: k.last_completed_date || null,
          balance_cents: k.balance_cents || 0,
          milestones:    k.milestones || [],
        })),
      };
      setFamily(familyData);
      // Cache locally for offline reads
      await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(familyData));
    } catch (e) {
      if (__DEV__) console.error('Failed to load family from Supabase:', e);
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
      if (__DEV__) console.error('Failed to load tasks from Supabase:', e);
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

    // Layer 1: try Supabase cloud sync
    if (SUPABASE_READY) {
      try {
        await setupFamilyInSupabase(safeData);
        return; // success — done
      } catch (e) {
        if (__DEV__) console.warn('Supabase setup failed — falling back to local storage:', e);
      }
    }

    // Layer 2: local AsyncStorage
    try {
      await saveFamily(safeData);
      return; // success — done
    } catch (e) {
      if (__DEV__) console.warn('AsyncStorage save failed — using in-memory only:', e);
    }

    // Layer 3: in-memory only (no persistence, but navigation will work)
    setFamily(safeData);
  }

  async function setupFamilyInSupabase(data) {
    // Sign up parent with Supabase Auth (email + password required)
    let authUserId = null;
    if (data.parentEmail && data.parentPassword) {
      const email    = data.parentEmail.trim().toLowerCase();
      const password = data.parentPassword;

      const { data: authData, error: signUpErr } = await supabase.auth.signUp({ email, password });

      // Handle "User already registered" by signing in instead.
      // (Common in dev when retrying setup with the same email.)
      let session = authData?.session ?? null;
      let user    = authData?.user ?? null;

      if (signUpErr) {
        const msg = (signUpErr.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('registered')) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) throw new Error('An account with this email already exists. Please use the Sign In screen with your existing password.');
          session = signInData.session;
          user    = signInData.user;
        } else {
          throw signUpErr;
        }
      }

      // CRITICAL: signUp returns user but NO session when "Confirm email" is
      // enabled in the Supabase project (the default). Without a session, the
      // Supabase client sends no JWT, server-side auth.uid() is null, and ALL
      // RLS-protected inserts fail. Fix by signing in immediately. If sign-in
      // fails, email confirmation is required — surface that clearly.
      if (!session && user) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          throw new Error('Email confirmation is enabled on this Supabase project. Disable it in Authentication → Providers → Email → "Confirm email", or have the user confirm via email before continuing.');
        }
        session = signInData.session;
        user    = signInData.user;
      }

      authUserId = user?.id ?? null;
      if (user) setAuthUser(user);
    }

    // CRITICAL: Reuse an existing family for this auth user if one exists.
    // Otherwise re-running setup (common in dev) creates duplicate family
    // rows for the same parent_auth_id. The server's my_family_id() does
    // LIMIT 1 with no deterministic order, so it can return a different
    // family than the one in React state — causing every subsequent task
    // insert to fail the RLS check `family_id = my_family_id()`.
    let famRow = null;
    let inviteCode;
    if (authUserId) {
      const { data: existing } = await supabase
        .from('families')
        .select('*')
        .eq('parent_auth_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(1);
      famRow = existing?.[0] || null;
    }

    if (famRow) {
      inviteCode = famRow.invite_code;
    } else {
      inviteCode = generateInviteCode();
      const { data: newFam, error: famErr } = await supabase
        .from('families')
        .insert({
          name:           `${data.parentName}'s Family`,
          invite_code:    inviteCode,
          ...(authUserId ? { parent_auth_id: authUserId } : {}),
        })
        .select()
        .single();
      if (famErr) throw famErr;
      famRow = newFam;
    }

    const fid = famRow.id;

    // Reuse existing parent profile for this family if one exists, otherwise
    // create one. Same de-duping rationale as the family check above.
    let parentId;
    const { data: existingParent } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_id', fid)
      .eq('role', 'parent')
      .limit(1);
    if (existingParent && existingParent[0]) {
      parentId = existingParent[0].id;
      await supabase.from('profiles').update({
        name:       data.parentName,
        emoji:      data.parentEmoji,
        phone:      data.parentPhone || '',
        parent_pin: data.parentPin,
      }).eq('id', parentId);
    } else {
      parentId = `parent_${generateId()}`;
      const { error: parentErr } = await supabase.from('profiles').insert({
        id:         parentId,
        family_id:  fid,
        name:       data.parentName,
        emoji:      data.parentEmoji,
        phone:      data.parentPhone || '',
        role:       'parent',
        parent_pin: data.parentPin,
      });
      if (parentErr) throw parentErr;
    }

    // Create kid profiles only if this family doesn't already have kids
    // (otherwise re-running setup would duplicate them).
    const { data: existingKids } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_id', fid)
      .eq('role', 'kid');
    const kidRows = (existingKids && existingKids.length > 0)
      ? []
      : (data.kids || []).map(k => ({
          id:        k.id || `kid_${generateId()}`,
          family_id: fid,
          name:      k.name,
          emoji:     k.emoji,
          color:     k.color,
          phone:     k.phone || '',
          role:      'kid',
        }));
    if (kidRows.length > 0) {
      const { error: kidsErr } = await supabase.from('profiles').insert(kidRows);
      if (kidsErr) throw kidsErr;
    }

    // Persist family ID in SecureStore (encrypted on device)
    await secureSave(FAMILY_ID_KEY, fid);
    setFamilyId(fid);

    // Refresh family/kids/tasks from Supabase (authoritative — covers the
    // reused-family case where pre-existing kids weren't in the form data).
    // Fall back to a local snapshot if the refresh fails so navigation isn't
    // blocked even if the network drops mid-setup.
    try {
      await loadFamilyFromSupabase(fid);
      await loadTasksFromSupabase(fid);
    } catch (e) {
      if (__DEV__) console.error('Post-setup Supabase refresh failed:', e);
      const fallback = {
        _supabaseFamilyId: fid,
        inviteCode,
        parentName:  data.parentName,
        parentEmoji: data.parentEmoji,
        parentPhone: data.parentPhone || '',
        parentPin:   data.parentPin,
        parentId,
        notifyPrefs: { taskCompleted: true, taskApproved: true },
        kids: (kidRows.length ? kidRows : (data.kids || [])).map(k => ({
          id:                k.id,
          name:              k.name,
          emoji:             k.emoji,
          color:             k.color,
          phone:             k.phone || '',
          goal:              null,
          streak:            0,
          lastCompletedDate: null,
          balance_cents:     0,
          milestones:        [],
        })),
      };
      setFamily(fallback);
      await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(fallback));
    }
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
    const kidId = task.assignedTo || task.assigned_to;
    const newTask = {
      id:           generateId(),
      family_id:    familyId || undefined,
      status:       'pending',
      celebrated:   false,
      created_at:   Date.now(),
      completed_at: null,
      approved_at:  null,
      recurrence:   task.recurrence || 'none',
      notes:        task.notes || '',
      due_date:     task.due_date || null,
      ...task,
      // Ensure both naming conventions are always set
      assignedTo:   kidId,
      assigned_to:  kidId,
    };

    if (SUPABASE_READY && familyId && authUser) {
      const session = await ensureSession();
      if (!session) {
        throw new Error('Your session has expired. Please sign in again to add quests.');
      }
      const { assignedTo: _a, ...supabaseTask } = newTask;

      // Pre-flight: ask the server which family_id the RLS policy will use.
      // Doing this BEFORE the insert guarantees the INSERT always sends the
      // exact same value that my_family_id() returns — eliminating all RLS
      // mismatch errors regardless of what's cached locally.
      const { data: serverFamId, error: rpcErr } = await supabase.rpc('my_family_id');
      if (rpcErr || !serverFamId) {
        throw new Error(
          'Could not verify your family. Please sign out from Settings and sign in again, then try assigning the quest.'
        );
      }
      if (serverFamId !== supabaseTask.family_id) {
        if (__DEV__) console.warn('Pre-flight family_id correction:', { local: supabaseTask.family_id, server: serverFamId });
        setFamilyId(serverFamId);
        await secureSave(FAMILY_ID_KEY, serverFamId);
        supabaseTask.family_id = serverFamId;
        newTask.family_id      = serverFamId;
        await Promise.all([
          loadFamilyFromSupabase(serverFamId),
          loadTasksFromSupabase(serverFamId),
        ]);
      }

      const { error } = await supabase.from('tasks').insert(supabaseTask);
      if (error) throw error;

      setTasks(prev => [...prev, supabaseTask]);
    } else {
      await saveTasks([...tasks, newTask]);
    }
    return newTask;
  }

  // Fetch the most-recent family owned by the given auth user. Used to recover
  // from any local/server familyId mismatch (e.g. duplicate families created
  // during dev testing, stale SecureStore cache after re-install).
  async function fetchAuthoritativeFamilyId(authUserId) {
    if (!SUPABASE_READY || !authUserId) return null;
    try {
      const { data } = await supabase
        .from('families')
        .select('id')
        .eq('parent_auth_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0]?.id || null;
    } catch {
      return null;
    }
  }

  async function editTask(taskId, updates) {
    if (SUPABASE_READY && familyId && authUser) {
      // Strip camelCase fields — Supabase only has snake_case columns
      const { assignedTo: _a, ...supabaseUpdates } = updates;
      const { error } = await supabase.from('tasks').update(supabaseUpdates).eq('id', taskId);
      if (error) throw error;
      // Optimistic update with full updates (assignedTo kept for local state filtering)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    } else {
      await saveTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }
  }

  /**
   * Uploads a local photo URI to Supabase Storage and returns the public URL.
   * Falls back to the original local URI if upload fails (e.g. offline).
   */
  async function uploadTaskPhoto(localUri, taskId) {
    if (!SUPABASE_READY || !familyId || !authUser || !localUri) return localUri;
    try {
      // Convert local URI to a Blob using fetch (works in React Native)
      const response = await fetch(localUri);
      const blob = await response.blob();
      const ext  = localUri.split('.').pop()?.split('?')[0] || 'jpg';
      const path = `${familyId}/${taskId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('task-photos')
        .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('task-photos')
        .getPublicUrl(path);

      return publicUrl;
    } catch (e) {
      if (__DEV__) console.warn('Photo upload failed — using local URI fallback:', e);
      return localUri; // graceful fallback keeps the app functional offline
    }
  }

  async function completeTask(taskId, photoUri) {
    const task = tasks.find(t => t.id === taskId);

    // Upload photo to Supabase Storage so it's accessible on all devices
    const resolvedPhotoUri = photoUri
      ? await uploadTaskPhoto(photoUri, taskId)
      : null;

    const updates = {
      status:       'completed',
      completed_at: Date.now(),
      ...(resolvedPhotoUri ? { photo_proof_uri: resolvedPhotoUri } : {}),
    };

    if (SUPABASE_READY && familyId && authUser) {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      // Optimistic update so UI reflects the change immediately (don't wait for realtime)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    } else {
      await saveTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    }

    // Update the kid's daily streak
    const kidId = task?.assignedTo || task?.assigned_to;
    if (kidId) await updateStreak(kidId);

    // Notify the parent so they can approve quickly
    const kid = family?.kids?.find(k => k.id === kidId);
    if (family?.notifyPrefs?.taskCompleted !== false) {
      await sendNotif(
        '⚡ Quest Complete — Review Needed!',
        `${kid?.name || 'Your kid'} finished "${task?.emoji || ''} ${task?.title || 'a quest'}" and is waiting for your approval! 🎉`
      );
    }
  }

  async function approveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    const updates = { status: 'approved', celebrated: false, approved_at: Date.now() };

    if (SUPABASE_READY && familyId && authUser) {
      const { error: approveErr } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (approveErr) throw approveErr;
      // Optimistic update so UI reflects the approval immediately (don't wait for realtime)
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      // Auto-respawn recurring tasks
      if (task?.recurrence && task.recurrence !== 'none') {
        const kidId = task.assigned_to || task.assignedTo;
        // Destructure out camelCase fields before Supabase insert
        const { assignedTo: _a, approvedAt: _b, completedAt: _c, ...taskBase } = task;
        const respawnedTask = {
          ...taskBase,
          id:           generateId(),
          assigned_to:  kidId,
          status:       'pending',
          celebrated:   false,
          created_at:   Date.now(), // bigint ms — matches schema column type
          completed_at: null,
          approved_at:  null,
        };
        await supabase.from('tasks').insert(respawnedTask);
        // Add respawned task to local state optimistically
        setTasks(prev => [...prev, { ...respawnedTask, assignedTo: kidId }]);
      }
    } else {
      let updated = tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      if (task?.recurrence && task.recurrence !== 'none') {
        const kidId = task.assignedTo || task.assigned_to;
        updated = [...updated, {
          ...task,
          id:           generateId(),
          assignedTo:   kidId,
          assigned_to:  kidId,
          status:       'pending',
          celebrated:   false,
          created_at:   Date.now(),
          completed_at: null,
          approved_at:  null,
        }];
      }
      await saveTasks(updated);
    }

    // Notify task approved
    const kid = family?.kids?.find(k => k.id === (task?.assignedTo || task?.assigned_to));
    if (kid && family?.notifyPrefs?.taskApproved !== false) {
      await sendNotif(
        '⭐ Reward Released!',
        `${kid.name} earned "${task?.reward}" for completing ${task?.emoji} ${task?.title}! 🎉`
      );
    }

    // Check star milestones — count stars after this approval
    if (kid) {
      const newStarCount = tasks.filter(t =>
        (t.assignedTo || t.assigned_to) === kid.id &&
        (t.status === 'approved' || t.id === taskId)
      ).length;

      const milestones = kid.milestones || [];
      const newlyAchieved = milestones.filter(m =>
        !m.achieved && m.stars_required <= newStarCount
      );

      if (newlyAchieved.length > 0) {
        const updatedMilestones = milestones.map(m =>
          newlyAchieved.find(n => n.id === m.id)
            ? { ...m, achieved: true, achieved_at: Date.now() }
            : m
        );
        await updateKidMilestones(kid.id, updatedMilestones);

        // Notify parent for each newly achieved milestone
        for (const m of newlyAchieved) {
          await sendNotif(
            '🏆 Milestone Reached!',
            `${kid.name} hit ${m.stars_required} ⭐ and earned: "${m.reward}"! Tap to give the reward.`
          );
        }
      }
    }
  }

  async function markCelebrated(taskId) {
    // Update local state FIRST so KidDashboard won't re-navigate to the
    // celebration screen on its next render — otherwise a Supabase failure
    // here would trigger an infinite celebration loop.
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, celebrated: true } : t));
    if (SUPABASE_READY && familyId && authUser) {
      try {
        await supabase.from('tasks').update({ celebrated: true }).eq('id', taskId);
      } catch (e) {
        if (__DEV__) console.warn('markCelebrated cloud write failed (will sync later):', e);
      }
    } else {
      await saveTasks(tasks.map(t => t.id === taskId ? { ...t, celebrated: true } : t));
    }
  }

  async function deleteTask(taskId) {
    if (SUPABASE_READY && familyId && authUser) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      await saveTasks(tasks.filter(t => t.id !== taskId));
    }
  }

  // ── Kid operations ─────────────────────────────────────────────────────────
  async function addKid(kid) {
    const newKid = { ...kid, id: generateId(), goal: null, streak: 0, milestones: [] };
    if (SUPABASE_READY && familyId && authUser) {
      const { error } = await supabase.from('profiles').insert({
        id:        newKid.id,
        family_id: familyId,
        name:      newKid.name,
        emoji:     newKid.emoji,
        color:     newKid.color,
        phone:     newKid.phone || '',
        role:      'kid',
      });
      if (error) throw error;
      setFamily(prev => ({ ...prev, kids: [...(prev.kids || []), newKid] }));
    } else {
      const updated = { ...family, kids: [...family.kids, newKid] };
      await saveFamily(updated);
    }
  }

  async function editKid(kidId, updates) {
    if (SUPABASE_READY && familyId && authUser) {
      const dbUpdates = {};
      if (updates.name)  dbUpdates.name  = updates.name;
      if (updates.emoji) dbUpdates.emoji = updates.emoji;
      if (updates.color) dbUpdates.color = updates.color;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', kidId);
      if (error) throw error;
      setFamily(prev => ({
        ...prev,
        kids: prev.kids.map(k => k.id === kidId ? { ...k, ...updates } : k),
      }));
    } else {
      const updated = {
        ...family,
        kids: family.kids.map(k => k.id === kidId ? { ...k, ...updates } : k),
      };
      await saveFamily(updated);
    }
  }

  async function removeKid(kidId) {
    if (SUPABASE_READY && familyId && authUser) {
      // Delete tasks BEFORE the profile — tasks.assigned_to references
      // profiles.id with no ON DELETE cascade, so a parallel delete
      // racing the wrong way fails with a FK violation.
      await supabase.from('tasks').delete().eq('assigned_to', kidId);
      await supabase.from('profiles').delete().eq('id', kidId);
      setFamily(prev => ({ ...prev, kids: prev.kids.filter(k => k.id !== kidId) }));
      setTasks(prev => prev.filter(t => (t.assignedTo || t.assigned_to) !== kidId));
    } else {
      const updated = { ...family, kids: family.kids.filter(k => k.id !== kidId) };
      await saveFamily(updated);
      await saveTasks(tasks.filter(t => t.assignedTo !== kidId && t.assigned_to !== kidId));
    }
  }

  async function setKidGoal(kidId, goal) {
    // Optimistic update so the goal bar appears immediately
    setFamily(prev => prev ? {
      ...prev,
      kids: prev.kids.map(k => k.id === kidId ? { ...k, goal } : k),
    } : prev);
    if (SUPABASE_READY && familyId && authUser) {
      const { error } = await supabase.from('profiles').update({ goal }).eq('id', kidId);
      if (error) throw error;
    } else {
      const updated = {
        ...family,
        kids: family.kids.map(k => k.id === kidId ? { ...k, goal } : k),
      };
      await saveFamily(updated);
    }
  }

  // ── Star Milestones ────────────────────────────────────────────────────────

  async function updateKidMilestones(kidId, milestones) {
    let savedData = null;
    setFamily(prev => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        kids: prev.kids.map(k => k.id === kidId ? { ...k, milestones } : k),
      };
      savedData = updated;
      return updated;
    });
    if (SUPABASE_READY && familyId && authUser) {
      const { error } = await supabase.from('profiles').update({ milestones }).eq('id', kidId);
      if (error) throw error;
    } else if (savedData) {
      await saveFamily(savedData);
    }
  }

  async function addMilestone(kidId, { stars_required, reward }) {
    const kid = family?.kids?.find(k => k.id === kidId);
    if (!kid) return;
    const milestone = {
      id: generateId(),
      stars_required,
      reward: reward.trim(),
      achieved: false,
      achieved_at: null,
      redeemed: false,
      redeemed_at: null,
    };
    const milestones = [...(kid.milestones || []), milestone]
      .sort((a, b) => a.stars_required - b.stars_required);
    await updateKidMilestones(kidId, milestones);
  }

  async function redeemMilestone(kidId, milestoneId) {
    const kid = family?.kids?.find(k => k.id === kidId);
    if (!kid) return;
    const milestones = (kid.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, redeemed: true, redeemed_at: Date.now() } : m
    );
    await updateKidMilestones(kidId, milestones);
  }

  async function deleteMilestone(kidId, milestoneId) {
    const kid = family?.kids?.find(k => k.id === kidId);
    if (!kid) return;
    const milestones = (kid.milestones || []).filter(m => m.id !== milestoneId);
    await updateKidMilestones(kidId, milestones);
  }

  // ── Streak tracking ────────────────────────────────────────────────────────
  function localDateString(date = new Date()) {
    // Returns "YYYY-MM-DD" in the device's local timezone (not UTC)
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function updateStreak(kidId) {
    if (!kidId) return;
    const kid = family?.kids?.find(k => k.id === kidId);
    if (!kid) return;

    const today = localDateString();
    const last  = kid.lastCompletedDate || null;
    const yesterday = localDateString(new Date(Date.now() - 86400000));

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

    // Optimistic update so the streak counter is immediately visible
    setFamily(prev => prev ? {
      ...prev,
      kids: prev.kids.map(k =>
        k.id === kidId ? { ...k, streak: newStreak, lastCompletedDate: today } : k
      ),
    } : prev);
    if (SUPABASE_READY && familyId && authUser) {
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
      // Always hash with 'local' to match the salt used in setupFamily
      processedUpdates.parentPin = await hashPin(updates.parentPin, 'local');
    }
    if (updates.parentName)  processedUpdates.parentName  = sanitize(updates.parentName, 60);
    if (updates.parentPhone) processedUpdates.parentPhone = sanitize(updates.parentPhone, 20);

    if (SUPABASE_READY && familyId && authUser && family?.parentId) {
      const dbUpdates = {};
      if (processedUpdates.parentName)  dbUpdates.name       = processedUpdates.parentName;
      if (processedUpdates.parentEmoji) dbUpdates.emoji      = processedUpdates.parentEmoji;
      if (processedUpdates.parentPhone !== undefined) dbUpdates.phone = processedUpdates.parentPhone;
      if (processedUpdates.parentPin)   dbUpdates.parent_pin = processedUpdates.parentPin;
      // Optimistic update so UI reflects changes immediately without waiting for realtime
      setFamily(prev => prev ? { ...prev, ...processedUpdates } : prev);
      await supabase.from('profiles').update(dbUpdates).eq('id', family.parentId);
    } else {
      const updated = { ...family, ...processedUpdates };
      await saveFamily(updated);
    }
  }

  // ── Notification preferences ───────────────────────────────────────────────
  async function updateNotifyPrefs(prefs) {
    const merged = { ...(family?.notifyPrefs || { taskCompleted: true, taskApproved: true }), ...prefs };
    // Optimistic update so toggle is instant
    setFamily(prev => prev ? { ...prev, notifyPrefs: merged } : prev);
    if (SUPABASE_READY && familyId && authUser && family?.parentId) {
      await supabase.from('profiles').update({ notify_prefs: merged }).eq('id', family.parentId);
    } else {
      const updated = { ...family, notifyPrefs: merged };
      await saveFamily(updated);
    }
  }

  // ── Clear all data + delete auth account ──────────────────────────────────
  const DELETE_ACCOUNT_URL = process.env.EXPO_PUBLIC_SUPABASE_DELETE_ACCOUNT || '';

  async function clearAllData() {
    try {
      if (SUPABASE_READY && familyId && authUser?.id && DELETE_ACCOUNT_URL) {
        // Use the Edge Function so the service-role key can delete the auth user
        // and storage files — the anon key cannot do this.
        try {
          await fetch(DELETE_ACCOUNT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ familyId, authUserId: authUser.id }),
          });
        } catch {
          // Fallback: best-effort cascade delete via anon key
          try { await supabase.from('families').delete().eq('id', familyId); } catch { /* ignore */ }
        }
      } else if (SUPABASE_READY && familyId && authUser) {
        try { await supabase.from('families').delete().eq('id', familyId); } catch { /* ignore */ }
      }

      await AsyncStorage.multiRemove([FAMILY_KEY, TASKS_KEY]);
      await secureDelete(FAMILY_ID_KEY);
      await endParentSession();
      if (SUPABASE_READY) await supabase.auth.signOut().catch(() => {});
      realtimeSub.current?.unsubscribe();
      setTasks([]);
      setFamily(null);
      setFamilyId(null);
      setAuthUser(null);
    } catch (e) {
      if (__DEV__) console.error('Failed to clear data:', e);
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

    // Already a SHA-256 hex hash (64 chars) — use secure comparison.
    // PINs are always hashed with familyId='local' (see setupFamily / updateParentProfile),
    // so we must verify with the same salt regardless of Supabase mode.
    if (storedPin.length === 64) {
      return checkPin(pin, storedPin, 'local');
    }

    // Legacy plain-text PIN — verify then silently migrate to hashed version
    if (storedPin === pin) {
      const hashed = await hashPin(pin, 'local');
      await updateParentProfile({ parentPin: hashed });
      return true;
    }
    return false;
  }

  // ── Auth (email/password sign-in for returning parents) ────────────────────

  async function authSignIn(email, password) {
    if (!SUPABASE_READY) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    setAuthUser(data.user);

    // Use my_family_id() RPC so the family we load is guaranteed to be the
    // same one that RLS policies will evaluate — preventing mismatch on inserts.
    // Supabase never throws — must check error field, not catch block.
    let fid = null;
    const { data: rpcId, error: rpcErr } = await supabase.rpc('my_family_id');
    if (!rpcErr && rpcId) {
      fid = rpcId;
    } else {
      const { data: famRows } = await supabase
        .from('families').select('id')
        .eq('parent_auth_id', data.user.id)
        .order('created_at', { ascending: false }).limit(1);
      fid = famRows?.[0]?.id || null;
    }
    if (!fid) {
      await supabase.auth.signOut();
      setAuthUser(null);
      throw new Error('No family found for this account. Please set up a new family.');
    }
    setFamilyId(fid);
    await secureSave(FAMILY_ID_KEY, fid);
    await Promise.all([
      loadFamilyFromSupabase(fid),
      loadTasksFromSupabase(fid),
    ]);
    subscribeRealtime(fid);
  }

  async function authResetPassword(email) {
    if (!SUPABASE_READY) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'kindo://reset-password' }
    );
    if (error) throw error;
  }

  // ── Payments ───────────────────────────────────────────────────────────────

  const STRIPE_SETUP_URL  = process.env.EXPO_PUBLIC_SUPABASE_STRIPE_SETUP  || '';
  const STRIPE_CHARGE_URL = process.env.EXPO_PUBLIC_SUPABASE_STRIPE_CHARGE || '';

  /** fetch() with a 15-second timeout — prevents indefinite hangs on slow networks */
  async function fetchWithTimeout(url, options, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      return res;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Request timed out. Please check your connection and try again.');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Save a Stripe payment method to the parent's profile via Edge Function */
  async function setupPaymentMethod(paymentMethodId, last4, brand) {
    if (!SUPABASE_READY || !familyId) throw new Error('Supabase not configured');
    if (!STRIPE_SETUP_URL) throw new Error('Stripe setup URL not configured');

    const res = await fetchWithTimeout(STRIPE_SETUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentProfileId: family?.parentId,
        paymentMethodId,
        last4,
        brand,
      }),
    });
    let data = {};
    try { data = await res.json(); } catch { /* non-JSON body */ }
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    // Update local family state so the UI reflects the new card immediately
    const updated = { ...family, stripeCardLast4: last4, stripeCardBrand: brand };
    setFamily(updated);
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(updated));
  }

  /** Charge parent's card for a task reward and credit the kid's balance */
  async function chargeForTask(taskId, kidId, amountCents) {
    if (!SUPABASE_READY || !familyId) throw new Error('Supabase not configured');
    if (!STRIPE_CHARGE_URL) throw new Error('Stripe charge URL not configured');

    const res = await fetchWithTimeout(STRIPE_CHARGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parentProfileId: family?.parentId,
        kidId,
        taskId,
        amountCents,
        familyId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Payment failed');

    // Refresh family data to get updated kid balance
    await loadFamilyFromSupabase(familyId);
    return data;
  }

  /** Record a manual payout (reduces the kid's in-app balance) */
  async function recordPayout(kidId, amountCents) {
    if (!SUPABASE_READY || !familyId) throw new Error('Supabase not configured');
    const kid = family?.kids?.find(k => k.id === kidId);
    if (!kid) throw new Error('Kid not found');

    const newBalance = Math.max(0, (kid.balance_cents || 0) - amountCents);

    await supabase.from('profiles').update({ balance_cents: newBalance }).eq('id', kidId);
    await supabase.from('transactions').insert({
      family_id:    familyId,
      kid_id:       kidId,
      amount_cents: amountCents,
      type:         'payout',
      note:         'Manual payout recorded by parent',
    });

    await loadFamilyFromSupabase(familyId);
    await loadTransactions();
  }

  const [transactions, setTransactions] = useState([]);

  async function loadTransactions() {
    if (!SUPABASE_READY || !familyId) return;
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setTransactions(data);
    } catch (e) {
      if (__DEV__) console.error('Failed to load transactions:', e);
    }
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
        authUser,
        notificationsAsked,
        markNotificationsAsked,
        isCloudEnabled: SUPABASE_READY,
        // Auth
        authSignIn,
        authResetPassword,
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
        addMilestone,
        redeemMilestone,
        deleteMilestone,
        // Profile
        updateParentProfile,
        updateNotifyPrefs,
        clearAllData,
        // Auth / session
        verifyPin,
        lockParentZone,
        unlockParentZone,
        checkParentSession,
        refreshParentSession,
        // Payments
        setupPaymentMethod,
        chargeForTask,
        recordPayout,
        transactions,
        loadTransactions,
        isPaymentsEnabled: !!(process.env.EXPO_PUBLIC_SUPABASE_STRIPE_SETUP),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
