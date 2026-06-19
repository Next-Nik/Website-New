// ─────────────────────────────────────────────────────────────
// useMessages.js
//
// Hook for the messaging surface. Fetches the user's inboxes
// (personal + each owned actor), the threads in each inbox,
// the messages in a selected thread, and the filing lane each
// sender is in for each inbox.
//
// Returns:
//   inboxes:     [{ id: 'personal'|<actor_id>, name, ownerUserId, actorId|null, unread }]
//   activeInbox: id of currently selected inbox
//   selectInbox(id): switch inbox
//   threadsByInbox: { [inboxId]: [{ thread, otherUser, latestMessage, unread, lane }] }
//   activeThread:  the currently selected thread id (null when on lane list)
//   selectThread(threadId): open a thread
//   composeOpen:   boolean
//   openCompose(): open compose form
//   closeCompose(): close
//   sendMessage({ recipientUserId, recipientActorId, body, senderActorId }): RPC call
//   setLane(senderUserId, lane, reason?): RPC call (uses activeInbox)
//   refresh():    re-fetches
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../hooks/useSupabase'

const LANES = ['inner_circle','connections','general','restricted','blocked']

export function useMessages(userId) {
  const [inboxes, setInboxes]         = useState([])
  const [activeInbox, setActiveInbox] = useState('personal')
  const [threadsByInbox, setThreadsByInbox] = useState({})
  const [activeThread, setActiveThread]     = useState(null)
  const [messages, setMessages]             = useState([])
  const [composeOpen, setComposeOpen]       = useState(false)
  const [loading, setLoading] = useState(true)

  // ─── Load inbox shells (personal + each owned actor) ───
  const loadInboxes = useCallback(async () => {
    if (!userId) return
    // Owned actors of the practitioner/organisation/programme types
    // (places/groups/resources can also have inboxes — include them all
    // since owning a profile means you can receive messages on its behalf)
    const { data: owned } = await supabase
      .from('nextus_actors')
      .select('id, name, type, slug')
      .eq('profile_owner', userId)
    const { data: settings } = await supabase
      .from('nextus_inbox_settings')
      .select('inbox_actor_id, display_name')
      .eq('owner_user_id', userId)
    const settingsMap = Object.fromEntries(
      (settings || []).map(s => [s.inbox_actor_id || 'personal', s.display_name])
    )
    const personalName = settingsMap['personal'] || 'Personal'
    const list = [{
      id: 'personal',
      name: personalName,
      ownerUserId: userId,
      actorId: null,
      actorType: 'person',
    }]
    for (const a of (owned || [])) {
      list.push({
        id: a.id,
        name: settingsMap[a.id] || a.name,
        ownerUserId: userId,
        actorId: a.id,
        actorType: a.type,
        slug: a.slug,
      })
    }
    setInboxes(list)
  }, [userId])

  // ─── Load threads for the currently active inbox ───
  const loadThreadsForActive = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      // Threads where I am a party (either human side). Identity hats live on
      // actor_a / actor_b; a self-thread has me on both sides under two hats.
      const { data: threads } = await supabase
        .from('nextus_message_threads')
        .select('id, user_a, actor_a, user_b, actor_b, last_message_at, unread_for_user_a, unread_for_user_b, created_at')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (!threads || threads.length === 0) {
        setThreadsByInbox(prev => ({ ...prev, [activeInbox]: [] }))
        setLoading(false)
        return
      }

      const threadIds = threads.map(t => t.id)
      const { data: allMessages } = await supabase
        .from('nextus_messages')
        .select('id, thread_id, sender_user_id, sender_actor_id, recipient_user_id, recipient_actor_id, body, read_at, created_at')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false })

      // For each thread, resolve MY side(s) and the OTHER party on each.
      // A normal thread yields one side; a self-thread yields two (one per hat).
      const sidesByThread = new Map()
      const otherUserIds = new Set()
      const actorIds = new Set()
      for (const t of threads) {
        const sides = []
        if (t.user_a === userId) sides.push({ myActor: t.actor_a || null, otherUser: t.user_b, otherActor: t.actor_b || null, unread: t.unread_for_user_a })
        if (t.user_b === userId) sides.push({ myActor: t.actor_b || null, otherUser: t.user_a, otherActor: t.actor_a || null, unread: t.unread_for_user_b })
        sidesByThread.set(t.id, sides)
        for (const s of sides) {
          if (s.otherActor) actorIds.add(s.otherActor)
          else otherUserIds.add(s.otherUser)
        }
      }

      const [{ data: profiles }, { data: actors }] = await Promise.all([
        otherUserIds.size
          ? supabase.from('contributor_profiles_beta').select('user_id, display_name').in('user_id', Array.from(otherUserIds))
          : Promise.resolve({ data: [] }),
        actorIds.size
          ? supabase.from('nextus_actors').select('id, name').in('id', Array.from(actorIds))
          : Promise.resolve({ data: [] }),
      ])
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.display_name]))
      const actorNameMap = Object.fromEntries((actors || []).map(a => [a.id, a.name]))

      // Filing lanes, keyed (my inbox hat, sender human).
      const { data: filings } = await supabase
        .from('nextus_inbox_filing')
        .select('recipient_actor_id, sender_user_id, lane')
        .eq('owner_user_id', userId)
      const filingMap = new Map()
      for (const f of (filings || [])) {
        filingMap.set(`${f.recipient_actor_id || 'personal'}::${f.sender_user_id}`, f.lane)
      }

      const grouped = {}
      for (const ibx of inboxes) grouped[ibx.id] = []

      for (const t of threads) {
        const threadMsgs = (allMessages || []).filter(m => m.thread_id === t.id)
        if (threadMsgs.length === 0) continue
        const latest = threadMsgs[0]

        for (const side of sidesByThread.get(t.id)) {
          const inboxKey = side.myActor || 'personal'
          if (!grouped[inboxKey]) grouped[inboxKey] = []
          const otherName = side.otherActor
            ? (actorNameMap[side.otherActor] || 'Unknown')
            : (profileMap[side.otherUser] || 'Unknown')
          const lane = filingMap.get(`${inboxKey}::${side.otherUser}`) || 'general'
          if (lane === 'blocked') continue
          grouped[inboxKey].push({
            thread: t,
            otherUserId: side.otherUser,
            otherActorId: side.otherActor,
            otherName,
            latestMessage: latest,
            unread: side.unread,
            lane,
          })
        }
      }

      setThreadsByInbox(grouped)
    } finally {
      setLoading(false)
    }
  }, [userId, inboxes, activeInbox])

  // ─── Load messages for the active thread ───
  const loadMessages = useCallback(async () => {
    if (!activeThread) { setMessages([]); return }
    const { data } = await supabase
      .from('nextus_messages')
      .select('*')
      .eq('thread_id', activeThread)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }, [activeThread])

  useEffect(() => { loadInboxes() }, [loadInboxes])
  useEffect(() => { if (inboxes.length > 0) loadThreadsForActive() }, [loadThreadsForActive, inboxes.length])
  useEffect(() => { loadMessages() }, [loadMessages])

  // ─── Realtime subscription ───
  useEffect(() => {
    if (!userId) return
    const ch = supabase
      .channel(`messages-for-${userId}`)
      .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'nextus_messages' },
          () => { loadThreadsForActive(); if (activeThread) loadMessages() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [userId, loadThreadsForActive, loadMessages, activeThread])

  // ─── Send a message via RPC ───
  const sendMessage = useCallback(async ({
    recipientUserId, recipientActorId, body, senderActorId,
  }) => {
    const { data, error } = await supabase.rpc('send_message', {
      p_recipient_user_id:  recipientUserId  || null,
      p_recipient_actor_id: recipientActorId || null,
      p_body:               body,
      p_sender_actor_id:    senderActorId    || null,
    })
    if (error) throw error
    await loadThreadsForActive()
    return data
  }, [loadThreadsForActive])

  // ─── Set lane for a sender on the active inbox ───
  const setLane = useCallback(async (senderUserId, lane, reason) => {
    const ibx = inboxes.find(i => i.id === activeInbox)
    const { error } = await supabase.rpc('set_filing_lane', {
      p_recipient_actor_id: ibx?.actorId || null,
      p_sender_user_id:     senderUserId,
      p_lane:               lane,
      p_reason:             reason || null,
    })
    if (error) throw error
    await loadThreadsForActive()
  }, [inboxes, activeInbox, loadThreadsForActive])

  // ─── Mark a message read ───
  const markRead = useCallback(async (messageId) => {
    await supabase.rpc('mark_message_read', { p_message_id: messageId })
  }, [])

  // Total cross-inbox unread count
  const totalUnread = useMemo(() => {
    let sum = 0
    for (const k of Object.keys(threadsByInbox)) {
      for (const t of threadsByInbox[k]) sum += (t.unread || 0)
    }
    return sum
  }, [threadsByInbox])

  return {
    inboxes,
    activeInbox,
    selectInbox: setActiveInbox,
    threadsByInbox,
    activeThread,
    selectThread: setActiveThread,
    messages,
    composeOpen,
    openCompose: () => setComposeOpen(true),
    closeCompose: () => setComposeOpen(false),
    sendMessage,
    setLane,
    markRead,
    refresh: loadThreadsForActive,
    totalUnread,
    loading,
    LANES,
  }
}
