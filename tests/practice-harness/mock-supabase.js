// tests/practice-harness/mock-supabase.js
//
// A stateful in-memory stand-in for the supabase client, shaped to exactly
// the query chain PracticeWorkspace actually runs against `practice_events`.
// Inserts land in an array and subsequent selects see them — so the harness
// exercises the real append-only flow, not a stub that always answers the
// same thing.

const practiceRows = []
let nextId = 1

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { access_token: 'harness-token' } } }),
  },
  from(table) {
    if (table === 'practice_events') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [...practiceRows].reverse(), error: null }),
            }),
          }),
        }),
        insert: (row) => ({
          select: () => ({
            single: async () => {
              const stored = { id: `evt-${nextId++}`, at: new Date().toISOString(), ...row }
              practiceRows.push(stored)
              return { data: stored, error: null }
            },
          }),
        }),
        delete: () => ({ eq: async () => ({ data: null, error: null }) }),
      }
    }
    return {
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }
  },
}
