// Mock for expo-secure-store in tests — in-memory store
const store = {};

module.exports = {
  setItemAsync: jest.fn(async (key, value) => { store[key] = value; }),
  getItemAsync:    jest.fn(async key => store[key] ?? null),
  deleteItemAsync: jest.fn(async key => { delete store[key]; }),

  // Helper to reset between tests
  __reset: () => { Object.keys(store).forEach(k => delete store[k]); },
};
