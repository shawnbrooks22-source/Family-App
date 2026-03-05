import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext(null);

const FAMILY_KEY = '@chorequest_family';
const TASKS_KEY = '@chorequest_tasks';

export function AppProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [family, setFamily] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [familyRaw, tasksRaw] = await Promise.all([
        AsyncStorage.getItem(FAMILY_KEY),
        AsyncStorage.getItem(TASKS_KEY),
      ]);
      if (familyRaw) setFamily(JSON.parse(familyRaw));
      if (tasksRaw) setTasks(JSON.parse(tasksRaw));
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
    const updated = tasks.map(t =>
      t.id === taskId
        ? { ...t, status: 'approved', celebrated: false, approvedAt: Date.now() }
        : t
    );
    await saveTasks(updated);
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
    const newKid = { ...kid, id: Date.now().toString() };
    const updated = { ...family, kids: [...family.kids, newKid] };
    await saveFamily(updated);
  }

  async function removeKid(kidId) {
    const updated = { ...family, kids: family.kids.filter(k => k.id !== kidId) };
    await saveFamily(updated);
    // Also remove their tasks
    await saveTasks(tasks.filter(t => t.assignedTo !== kidId));
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
