import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

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

const FAMILY_KEY = '@chorequest_family';
const TASKS_KEY  = '@chorequest_tasks';

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
      trigger: null, // fire immediately
    });
  } catch (e) {
    // Notifications not available in this environment — ignore
  }
}

export function AppProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [family,   setFamily]   = useState(null);
  const [tasks,    setTasks]    = useState([]);

  useEffect(() => {
    loadData();
    requestNotifPermissions();
  }, []);

  async function loadData() {
    try {
      const [familyRaw, tasksRaw] = await Promise.all([
        AsyncStorage.getItem(FAMILY_KEY),
        AsyncStorage.getItem(TASKS_KEY),
      ]);
      if (familyRaw) setFamily(JSON.parse(familyRaw));
      if (tasksRaw)  setTasks(JSON.parse(tasksRaw));
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoaded(true);
    }
  }

  async function saveFamily(data) {
    await AsyncStorage.setItem(FAMILY_KEY, JSON.stringify(data));
    setFamily(data);
  }

  async function saveTasks(newTasks) {
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
    setTasks(newTasks);
  }

  async function setupFamily(data) {
    await saveFamily(data);
  }

  async function addTask(task) {
    const newTask = {
      ...task,
      id: Date.now().toString(),
      status: 'pending',
      celebrated: false,
      createdAt: Date.now(),
      completedAt: null,
      approvedAt: null,
      recurrence: task.recurrence || 'none',
    };
    await saveTasks([...tasks, newTask]);
    return newTask;
  }

  async function completeTask(taskId) {
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, status: 'completed', completedAt: Date.now() } : t
    );
    await saveTasks(updated);
  }

  async function approveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);

    let updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'approved', celebrated: false, approvedAt: Date.now() }
        : t
    );

    // Auto-respawn recurring tasks so the quest resets immediately
    if (task?.recurrence && task.recurrence !== 'none') {
      const respawned = {
        ...task,
        id: (Date.now() + 1).toString(),
        status: 'pending',
        celebrated: false,
        createdAt: Date.now(),
        completedAt: null,
        approvedAt: null,
      };
      updated = [...updated, respawned];
    }

    await saveTasks(updated);

    // Notify the family that the reward was released
    const kid = family?.kids?.find(k => k.id === task?.assignedTo);
    if (kid) {
      await sendNotif(
        '⭐ Reward Released!',
        `${kid.name} earned "${task?.reward}" for completing ${task?.emoji} ${task?.title}! 🎉`
      );
    }
  }

  async function markCelebrated(taskId) {
    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, celebrated: true } : t
    );
    await saveTasks(updated);
  }

  async function deleteTask(taskId) {
    await saveTasks(tasks.filter(t => t.id !== taskId));
  }

  async function addKid(kid) {
    const newKid = { ...kid, id: Date.now().toString(), goal: null };
    const updated = { ...family, kids: [...family.kids, newKid] };
    await saveFamily(updated);
  }

  async function removeKid(kidId) {
    const updated = { ...family, kids: family.kids.filter(k => k.id !== kidId) };
    await saveFamily(updated);
    await saveTasks(tasks.filter(t => t.assignedTo !== kidId));
  }

  // goal: { name: string, stars: number } | null
  async function setKidGoal(kidId, goal) {
    const updated = {
      ...family,
      kids: family.kids.map(k => k.id === kidId ? { ...k, goal } : k),
    };
    await saveFamily(updated);
  }

  function verifyPin(pin) {
    return family?.parentPin === pin;
  }

  return (
    <AppContext.Provider
      value={{
        isLoaded,
        family,
        tasks,
        setupFamily,
        addTask,
        completeTask,
        approveTask,
        markCelebrated,
        deleteTask,
        addKid,
        removeKid,
        setKidGoal,
        verifyPin,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
