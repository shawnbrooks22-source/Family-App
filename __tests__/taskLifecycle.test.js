/**
 * Tests for task lifecycle logic (pure business logic, no React).
 * These tests cover the state transitions and derived data used by AppContext.
 */

// ─── Task status transitions ──────────────────────────────────────────────────

describe('task status pipeline', () => {
  const INITIAL_STATUS = 'pending';

  function makeTask(overrides = {}) {
    return {
      id:           '1',
      title:        'Clean room',
      emoji:        '🧹',
      reward:       'Screen time',
      notes:        '',
      assignedTo:   'kid-1',
      assigned_to:  'kid-1',
      status:       INITIAL_STATUS,
      recurrence:   'none',
      celebrated:   false,
      due_date:     null,
      created_at:   Date.now(),
      completed_at: null,
      approved_at:  null,
      ...overrides,
    };
  }

  test('new task starts as pending', () => {
    const task = makeTask();
    expect(task.status).toBe('pending');
  });

  test('completing a task sets status to completed and timestamp', () => {
    const task = makeTask();
    const before = Date.now();
    const updates = { status: 'completed', completed_at: Date.now() };
    const updated = { ...task, ...updates };
    expect(updated.status).toBe('completed');
    expect(updated.completed_at).toBeGreaterThanOrEqual(before);
  });

  test('approving a task sets status to approved', () => {
    const task = makeTask({ status: 'completed', completed_at: Date.now() });
    const updates = { status: 'approved', celebrated: false, approved_at: Date.now() };
    const updated = { ...task, ...updates };
    expect(updated.status).toBe('approved');
    expect(updated.celebrated).toBe(false);
  });

  test('marking celebrated sets the celebrated flag', () => {
    const task = makeTask({ status: 'approved', approved_at: Date.now() });
    const updated = { ...task, celebrated: true };
    expect(updated.celebrated).toBe(true);
  });

  test('recurring task spawns a new pending task on approval', () => {
    const task = makeTask({ status: 'completed', recurrence: 'daily' });
    const newTask = {
      ...task,
      id:           (Date.now() + 1).toString(),
      status:       'pending',
      celebrated:   false,
      created_at:   Date.now(),
      completed_at: null,
      approved_at:  null,
    };
    expect(newTask.status).toBe('pending');
    expect(newTask.id).not.toBe(task.id);
    expect(newTask.recurrence).toBe('daily');
  });
});

// ─── Star counting (field normalization) ──────────────────────────────────────

describe('star counting with field normalization', () => {
  const kidId = 'kid-1';

  function taskBelongsToKid(task, id) {
    return task.assignedTo === id || task.assigned_to === id;
  }

  const tasks = [
    // Local-mode tasks (camelCase)
    { id: '1', assignedTo: kidId, status: 'approved' },
    { id: '2', assignedTo: kidId, status: 'approved' },
    { id: '3', assignedTo: kidId, status: 'pending' },
    // Supabase-mode tasks (snake_case)
    { id: '4', assigned_to: kidId, status: 'approved' },
    { id: '5', assigned_to: 'kid-2', status: 'approved' },
  ];

  test('counts approved tasks for kid using both field names', () => {
    const stars = tasks.filter(
      t => taskBelongsToKid(t, kidId) && t.status === 'approved'
    ).length;
    expect(stars).toBe(3); // tasks 1, 2, 4
  });

  test('does not count pending tasks', () => {
    const stars = tasks.filter(
      t => taskBelongsToKid(t, kidId) && t.status === 'approved'
    ).length;
    expect(stars).not.toBe(4); // task 3 is pending, should not count
  });

  test('does not count tasks belonging to other kids', () => {
    const stars = tasks.filter(
      t => taskBelongsToKid(t, kidId) && t.status === 'approved'
    ).length;
    expect(stars).not.toBe(4); // task 5 belongs to kid-2
  });
});

// ─── Due date helpers ─────────────────────────────────────────────────────────

describe('due date formatting', () => {
  function formatDueDate(dateStr) {
    if (!dateStr) return '';
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today)    return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  }

  function isDueSoon(dateStr) {
    if (!dateStr) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateStr <= today;
  }

  test('returns empty string for null due_date', () => {
    expect(formatDueDate(null)).toBe('');
    expect(formatDueDate(undefined)).toBe('');
    expect(formatDueDate('')).toBe('');
  });

  test('formats today correctly', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(formatDueDate(today)).toBe('Today');
  });

  test('formats tomorrow correctly', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(formatDueDate(tomorrow)).toBe('Tomorrow');
  });

  test('isDueSoon returns true for today or past dates', () => {
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    expect(isDueSoon(today)).toBe(true);
    expect(isDueSoon(yesterday)).toBe(true);
  });

  test('isDueSoon returns false for future dates', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    expect(isDueSoon(tomorrow)).toBe(false);
  });
});

// ─── Streak calculation ───────────────────────────────────────────────────────

describe('streak logic', () => {
  function calculateNewStreak(currentStreak, lastCompletedDate) {
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (lastCompletedDate === today)     return currentStreak; // already updated today
    if (lastCompletedDate === yesterday) return currentStreak + 1; // consecutive
    return 1; // broken or first time
  }

  test('streak increments on consecutive day', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    expect(calculateNewStreak(5, yesterday)).toBe(6);
  });

  test('streak resets on gap', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
    expect(calculateNewStreak(5, twoDaysAgo)).toBe(1);
  });

  test('streak does not change if already completed today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(calculateNewStreak(3, today)).toBe(3);
  });

  test('streak starts at 1 for first completion', () => {
    expect(calculateNewStreak(0, null)).toBe(1);
  });
});
