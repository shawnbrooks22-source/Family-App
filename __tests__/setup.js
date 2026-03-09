// Global test setup
// Reset in-memory secure store before each test to prevent bleed-over
beforeEach(() => {
  const secureStore = require('expo-secure-store');
  if (secureStore.__reset) secureStore.__reset();
  jest.clearAllMocks();
});
