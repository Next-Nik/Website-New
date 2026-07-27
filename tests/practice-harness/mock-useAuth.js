// tests/practice-harness/mock-useAuth.js — a signed-in founder, no network.
export function useAuth() {
  return {
    user: {
      id: 'founder-harness',
      email: 'founder@harness.local',
      app_metadata: { role: 'founder' },
      user_metadata: {},
    },
    loading: false,
  }
}
