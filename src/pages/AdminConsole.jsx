import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuth } from '../hooks/useAuth'
import { Nav } from '../components/Nav'

// ── Founder check — uses user_metadata.role set in Supabase ──
// Resilient to project changes. Set via: supabase.auth.updateUser({ data: { role: 'founder' } })
function isFounder(user) {
  return user?.user_metadata?.role === 'founder'
}

const sc    = { fontFamily: "'Cormorant SC', Georgia, serif" }
const body = { fontFamily: "'Lora', Georgia, serif" }
const gold  = '#A8721A'
const bg    = '#FAFAF7'

const TIER_OPTIONS    = ['full', 'beta', 'preview']
const SOURCE_OPTIONS  = ['admin', 'beta', 'gift', 'purchase', 'trial']
const STATUS_OPTIONS  = ['active', 'suspended', 'banned']
const ENTITLE_TYPES   = ['access', 'discount', 'trial']

// ── Shared UI primitives ──────────────────────────────────────

function Eyebrow({ children }) {
  return (
    <span style={{ ...sc, fontSize: '15px', letterSpacing: '0.2em', color: gold,
      textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
      {children}
    </span>
  )
}

function Btn({ onClick, children, variant = 'primary', small, disabled }) {
  const styles = {
    primary: { background: 'rgba(200,146,42,0.05)', border: '1.5px solid rgba(200,146,42,0.78)', color: gold },
    danger:  { background: 'rgba(180,40,40,0.05)',  border: '1.5px solid rgba(180,40,40,0.5)',   color: '#8A2020' },
    ghost:   { background: 'transparent',           border: '1px solid rgba(200,146,42,0.30)',    color: 'rgba(15,21,35,0.72)' },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...sc, fontSize: small ? '15px' : '17px', letterSpacing: '0.12em',
      padding: small ? '6px 14px' : '10px 20px',
      borderRadius: '40px', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, ...styles[variant],
    }}>
      {children}
    </button>
  )
}

function Input({ value, onChange, placeholder, type = 'text', style, onKeyDown }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      style={{
        ...body, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.35)',
        background: '#FFFFFF', outline: 'none', width: '100%',
        ...style,
      }}
    />
  )
}

function Select({ value, onChange, options, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        ...body, fontSize: '15px', color: '#0F1523',
        padding: '9px 14px', borderRadius: '8px',
        border: '1.5px solid rgba(200,146,42,0.35)',
        background: '#FFFFFF', outline: 'none', ...style,
      }}>
      {options.map(o => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1.5px solid rgba(200,146,42,0.20)',
      borderRadius: '14px', padding: '20px 22px', marginBottom: '10px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ label, color = gold }) {
  return (
    <span style={{
      ...sc, fontSize: '15px', letterSpacing: '0.12em',
      padding: '3px 9px', borderRadius: '40px',
      border: `1px solid ${color}40`, color,
      background: `${color}12`,
    }}>
      {label}
    </span>
  )
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: '#0F1523', color: '#FAFAF7',
      ...body, fontSize: '17px',
      padding: '12px 20px', borderRadius: '10px',
      boxShadow: '0 8px 28px rgba(15,21,35,0.3)',
    }}>
      {message}
    </div>
  )
}

// ── Tab navigation ────────────────────────────────────────────

const TABS = ['Now', 'Platform', 'Actors', 'Extract', 'Place', 'Nominations', 'Domain Data', 'Subdomains', 'Needs', 'Contributions', 'Waitlist', 'Groups', 'Members', 'Entitlements', 'Users', 'Grants']

function TabBar({ active, setActive }) {
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '32px',
      borderBottom: '1px solid rgba(200,146,42,0.20)', paddingBottom: '0' }}>
      {TABS.map(tab => (
        <button key={tab} onClick={() => setActive(tab)} style={{
          ...sc, fontSize: '15px', letterSpacing: '0.12em',
          padding: '10px 18px', background: 'none', border: 'none',
          cursor: 'pointer',
          color: active === tab ? gold : 'rgba(15,21,35,0.55)',
          borderBottom: active === tab
            ? `2px solid ${gold}` : '2px solid transparent',
          marginBottom: '-1px',
        }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

// ── NOW TAB ───────────────────────────────────────────────────

function NowTab() {
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [
          { count: totalUsers },
          { count: mapCount },
          { count: ppCount },
          { count: sprintCount },
          { data: recentUsers },
          { data: recentGrants },
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('map_results').select('*', { count: 'exact', head: true }).eq('complete', true),
          supabase.from('purpose_piece_results').select('*', { count: 'exact', head: true }),
          supabase.from('target_sprint_sessions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('users').select('id, email, first_name, last_name, created_at, status')
            .order('created_at', { ascending: false }).limit(8),
          supabase.from('access').select('*, users(email)')
            .order('granted_at', { ascending: false }).limit(5),
        ])
        setStats({ totalUsers, mapCount, ppCount, sprintCount })
        setRecent({ users: recentUsers ?? [], grants: recentGrants ?? [] })
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p>

  return (
    <div>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523', marginBottom: '28px' }}>
        Live snapshot
      </h2>

      {/* Stats grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '12px', marginBottom: '36px' }}>
          {[
            { label: 'Total users',      value: stats.totalUsers  ?? 0 },
            { label: 'Maps completed',   value: stats.mapCount    ?? 0 },
            { label: 'Purpose Pieces',   value: stats.ppCount     ?? 0 },
            { label: 'Active sprints',   value: stats.sprintCount ?? 0 },
          ].map(s => (
            <Card key={s.label} style={{ textAlign: 'center', padding: '20px 16px' }}>
              <div style={{ ...body, fontSize: '36px', fontWeight: 300,
                color: gold, lineHeight: 1, marginBottom: '6px' }}>{s.value}</div>
              <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em',
                color: 'rgba(15,21,35,0.72)', textTransform: 'uppercase' }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Recent signups */}
        <div>
          <Eyebrow>Recent signups</Eyebrow>
          {recent.users?.length === 0
            ? <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>No users yet.</p>
            : recent.users?.map(u => {
              const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email?.split('@')[0]
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center',
                  gap: '10px', padding: '9px 0',
                  borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...body, fontSize: '17px', color: '#0F1523' }}>{name}</div>
                    <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>{u.email}</div>
                  </div>
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
                    color: 'rgba(15,21,35,0.55)', flexShrink: 0 }}>
                    {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              )
            })
          }
        </div>

        {/* Recent access grants */}
        <div>
          <Eyebrow>Recent grants</Eyebrow>
          {recent.grants?.length === 0
            ? <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>No grants yet.</p>
            : recent.grants?.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center',
                gap: '10px', padding: '9px 0',
                borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ ...body, fontSize: '17px', color: '#0F1523' }}>
                    {g.users?.email}
                  </div>
                  <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.10em', color: gold }}>
                    {g.product} · {g.tier}
                  </div>
                </div>
                <div style={{ ...sc, fontSize: '15px', letterSpacing: '0.08em',
                  color: 'rgba(15,21,35,0.55)', flexShrink: 0 }}>
                  {new Date(g.granted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ── GROUPS TAB ────────────────────────────────────────────────

function GroupsTab({ toast }) {
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({
    name: '', slug: '', code: '', description: '',
    requires_approval: false, grace_period_days: 0,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .order('created_at', { ascending: false })
    setGroups(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save() {
    const { error } = await supabase.from('groups').insert({
      ...form,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '-'),
    })
    if (error) { toast(error.message); return }
    toast('Group created')
    setShowForm(false)
    setForm({ name: '', slug: '', code: '', description: '',
      requires_approval: false, grace_period_days: 0 })
    load()
  }

  async function toggleActive(g) {
    await supabase.from('groups').update({ active: !g.active }).eq('id', g.id)
    toast(g.active ? 'Group deactivated' : 'Group activated')
    load()
  }

  const joinUrl = (g) => `${window.location.origin}/join/${g.slug}`

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523' }}>
          Groups
        </h2>
        <Btn onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New group'}
        </Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: '20px', background: 'rgba(200,146,42,0.02)' }}>
          <Eyebrow>New group</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>Name *</label>
              <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))}
                placeholder="NextMen Inner Circle" />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>Access code *</label>
              <Input value={form.code} onChange={v => setForm(f => ({ ...f, code: v }))}
                placeholder="NEXTMEN2026" />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>URL slug</label>
              <Input value={form.slug} onChange={v => setForm(f => ({ ...f, slug: v }))}
                placeholder="auto-generated from name" />
            </div>
            <div>
              <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                display: 'block', marginBottom: '4px' }}>Grace period (days on leave)</label>
              <Input value={form.grace_period_days} type="number"
                onChange={v => setForm(f => ({ ...f, grace_period_days: parseInt(v) || 0 }))} />
            </div>
          </div>
          <div>
            <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
              display: 'block', marginBottom: '4px' }}>Description</label>
            <Input value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))}
              placeholder="Optional notes about this group" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 18px' }}>
            <input type="checkbox" id="req_approval"
              checked={form.requires_approval}
              onChange={e => setForm(f => ({ ...f, requires_approval: e.target.checked }))}
              style={{ width: '16px', height: '16px', accentColor: gold }} />
            <label htmlFor="req_approval" style={{ ...body, fontSize: '17px', color: '#0F1523' }}>
              Requires approval to join
            </label>
          </div>
          <Btn onClick={save}>Create group</Btn>
        </Card>
      )}

      {loading ? <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p> : (
        groups.map(g => (
          <Card key={g.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start',
              justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ ...body, fontSize: '17px', fontWeight: 400, color: '#0F1523' }}>
                    {g.name}
                  </span>
                  <Badge label={g.active ? 'active' : 'inactive'}
                    color={g.active ? '#3B6B4A' : 'rgba(15,21,35,0.55)'} />
                  {g.requires_approval && <Badge label="approval required" />}
                </div>
                <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                  marginBottom: '8px' }}>
                  Code: <strong style={{ color: gold }}>{g.code}</strong>
                  {g.grace_period_days > 0 && ` · ${g.grace_period_days}d grace period`}
                </div>
                {g.description && (
                  <div style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>
                    {g.description}
                  </div>
                )}
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <a href={joinUrl(g)} target="_blank" rel="noopener noreferrer"
                    style={{ ...sc, fontSize: '15px', color: gold, textDecoration: 'none',
                      letterSpacing: '0.10em' }}>
                    Join URL ↗
                  </a>
                  <span style={{ color: '#A8721A' }}>·</span>
                  <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                    letterSpacing: '0.10em' }}>
                    {g.group_members?.[0]?.count ?? 0} member{(g.group_members?.[0]?.count ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <Btn onClick={() => toggleActive(g)}
                variant={g.active ? 'ghost' : 'primary'} small>
                {g.active ? 'Deactivate' : 'Activate'}
              </Btn>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

// ── MEMBERS TAB ───────────────────────────────────────────────

function MembersTab({ toast }) {
  const [groups, setGroups]       = useState([])
  const [selectedGroup, setGroup] = useState('')
  const [members, setMembers]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [addEmail, setAddEmail]   = useState('')

  useEffect(() => {
    supabase.from('groups').select('id, name').eq('active', true)
      .then(({ data }) => { setGroups(data ?? []) })
  }, [])

  const loadMembers = useCallback(async (groupId) => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('group_members')
      .select('*, users(id, email, first_name, last_name, status)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: false })
    setMembers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadMembers(selectedGroup) }, [selectedGroup, loadMembers])

  async function addMember() {
    if (!addEmail || !selectedGroup) return
    // Look up user
    const { data: users } = await supabase
      .from('users').select('id').eq('email', addEmail.trim()).limit(1)
    if (!users?.length) { toast('No user found with that email'); return }

    const { error } = await supabase.from('group_members').upsert({
      group_id: selectedGroup, user_id: users[0].id,
      status: 'active', joined_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    }, { onConflict: 'group_id,user_id' })
    if (error) { toast(error.message); return }
    toast('Member added')
    setAddEmail('')
    loadMembers(selectedGroup)
  }

  async function updateStatus(memberId, status) {
    const update = { status }
    if (status === 'active') update.approved_at = new Date().toISOString()
    if (status === 'removed') update.removed_at = new Date().toISOString()
    await supabase.from('group_members').update(update).eq('id', memberId)
    toast(`Member ${status}`)
    loadMembers(selectedGroup)
  }

  const pending  = members.filter(m => m.status === 'pending')
  const active   = members.filter(m => m.status === 'active')
  const removed  = members.filter(m => m.status === 'removed')

  function MemberRow({ m }) {
    const u = m.users
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...body, fontSize: '15px', color: '#0F1523' }}>{name}</div>
          <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
            {u?.email}
            {u?.status !== 'active' && (
              <Badge label={u.status} color="#8A2020" />
            )}
          </div>
        </div>
        <div style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
          letterSpacing: '0.08em' }}>
          {new Date(m.joined_at).toLocaleDateString()}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {m.status === 'pending' && (
            <Btn onClick={() => updateStatus(m.id, 'active')} small>Approve</Btn>
          )}
          {m.status === 'active' && (
            <Btn onClick={() => updateStatus(m.id, 'removed')} variant="danger" small>Remove</Btn>
          )}
          {m.status === 'removed' && (
            <Btn onClick={() => updateStatus(m.id, 'active')} small>Reinstate</Btn>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...body, fontSize: '22px', fontWeight: 300 }}>Members</h2>
        <Select value={selectedGroup} onChange={setGroup}
          options={[{ value: '', label: 'Select a group…' },
            ...groups.map(g => ({ value: g.id, label: g.name }))]}
          style={{ minWidth: '220px' }} />
      </div>

      {selectedGroup && (
        <>
          {/* Add member */}
          <Card style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Eyebrow>Add member by email</Eyebrow>
              <Input value={addEmail} onChange={setAddEmail}
                placeholder="user@email.com" type="email" />
            </div>
            <Btn onClick={addMember}>Add</Btn>
          </Card>

          {loading ? <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p> : (
            <>
              {pending.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <Eyebrow>Pending approval ({pending.length})</Eyebrow>
                  {pending.map(m => <MemberRow key={m.id} m={m} />)}
                </div>
              )}
              <div style={{ marginBottom: '24px' }}>
                <Eyebrow>Active ({active.length})</Eyebrow>
                {active.length === 0
                  ? <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>No active members.</p>
                  : active.map(m => <MemberRow key={m.id} m={m} />)
                }
              </div>
              {removed.length > 0 && (
                <details>
                  <summary style={{ ...sc, fontSize: '15px', letterSpacing: '0.14em',
                    color: 'rgba(15,21,35,0.72)', cursor: 'pointer', marginBottom: '8px' }}>
                    Removed ({removed.length})
                  </summary>
                  {removed.map(m => <MemberRow key={m.id} m={m} />)}
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── ENTITLEMENTS TAB ──────────────────────────────────────────

function EntitlementsTab({ toast }) {
  const [groups, setGroups]       = useState([])
  const [products, setProducts]   = useState([])
  const [selectedGroup, setGroup] = useState('')
  const [entitlements, setEnts]   = useState([])
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({
    product_key: '', type: 'access', tier: 'full',
    discount_pct: 20, trial_days: 7,
    uses_allowed: '', expires_after_days: '',
    notes: '',
  })

  useEffect(() => {
    supabase.from('groups').select('id, name').eq('active', true)
      .then(({ data }) => setGroups(data ?? []))
    supabase.from('products').select('key, name').eq('active', true)
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  const loadEnts = useCallback(async (groupId) => {
    if (!groupId) return
    const { data } = await supabase
      .from('group_entitlements')
      .select('*')
      .eq('group_id', groupId)
    setEnts(data ?? [])
  }, [])

  useEffect(() => { loadEnts(selectedGroup) }, [selectedGroup, loadEnts])

  async function addEntitlement() {
    const payload = {
      group_id: selectedGroup,
      product_key: form.product_key,
      type: form.type,
      notes: form.notes || null,
      uses_allowed: form.uses_allowed ? parseInt(form.uses_allowed) : null,
      expires_after_days: form.expires_after_days !== ''
        ? parseInt(form.expires_after_days) : null,
    }
    if (form.type === 'access')   payload.tier         = form.tier
    if (form.type === 'discount') payload.discount_pct = parseInt(form.discount_pct)
    if (form.type === 'trial')    payload.trial_days   = parseInt(form.trial_days)

    const { error } = await supabase.from('group_entitlements')
      .upsert(payload, { onConflict: 'group_id,product_key,type' })
    if (error) { toast(error.message); return }
    toast('Entitlement saved')
    setShowForm(false)
    loadEnts(selectedGroup)
  }

  async function deleteEnt(id) {
    await supabase.from('group_entitlements').delete().eq('id', id)
    toast('Entitlement removed')
    loadEnts(selectedGroup)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ ...body, fontSize: '22px', fontWeight: 300 }}>Entitlements</h2>
        <Select value={selectedGroup} onChange={setGroup}
          options={[{ value: '', label: 'Select a group…' },
            ...groups.map(g => ({ value: g.id, label: g.name }))]}
          style={{ minWidth: '220px' }} />
      </div>

      {selectedGroup && (
        <>
          <Btn onClick={() => setShowForm(s => !s)} style={{ marginBottom: '16px' }}>
            {showForm ? 'Cancel' : '+ Add entitlement'}
          </Btn>

          {showForm && (
            <Card style={{ marginBottom: '20px', background: 'rgba(200,146,42,0.02)' }}>
              <Eyebrow>New entitlement</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>Product</label>
                  <Select value={form.product_key} onChange={v => setForm(f => ({ ...f, product_key: v }))}
                    options={[{ value: '', label: 'Choose…' },
                      ...products.map(p => ({ value: p.key, label: p.name }))]} />
                </div>
                <div>
                  <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>Type</label>
                  <Select value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))}
                    options={ENTITLE_TYPES} />
                </div>

                {form.type === 'access' && (
                  <div>
                    <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                      display: 'block', marginBottom: '4px' }}>Tier</label>
                    <Select value={form.tier} onChange={v => setForm(f => ({ ...f, tier: v }))}
                      options={TIER_OPTIONS} />
                  </div>
                )}
                {form.type === 'discount' && (
                  <div>
                    <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                      display: 'block', marginBottom: '4px' }}>Discount %</label>
                    <Input value={form.discount_pct} type="number"
                      onChange={v => setForm(f => ({ ...f, discount_pct: v }))} />
                  </div>
                )}
                {form.type === 'trial' && (
                  <div>
                    <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                      display: 'block', marginBottom: '4px' }}>Trial days</label>
                    <Input value={form.trial_days} type="number"
                      onChange={v => setForm(f => ({ ...f, trial_days: v }))} />
                  </div>
                )}

                <div>
                  <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>
                    Uses allowed (blank = unlimited)
                  </label>
                  <Input value={form.uses_allowed} type="number"
                    placeholder="unlimited"
                    onChange={v => setForm(f => ({ ...f, uses_allowed: v }))} />
                </div>
                <div>
                  <label style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                    display: 'block', marginBottom: '4px' }}>
                    Expires after days (blank = while member, 0 = permanent)
                  </label>
                  <Input value={form.expires_after_days} type="number"
                    placeholder="while member"
                    onChange={v => setForm(f => ({ ...f, expires_after_days: v }))} />
                </div>
              </div>
              <Input value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))}
                placeholder="Optional notes" style={{ marginBottom: '14px' }} />
              <Btn onClick={addEntitlement} disabled={!form.product_key}>Save entitlement</Btn>
            </Card>
          )}

          {entitlements.length === 0
            ? <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>
                No entitlements yet for this group.
              </p>
            : entitlements.map(e => (
              <Card key={e.id}>
                <div style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ ...body, fontSize: '15px', fontWeight: 400, color: '#0F1523' }}>
                        {products.find(p => p.key === e.product_key)?.name ?? e.product_key}
                      </span>
                      <Badge label={e.type} />
                      {e.type === 'access' && <Badge label={e.tier} color="#3B6B4A" />}
                      {e.type === 'discount' && <Badge label={`${e.discount_pct}% off`} />}
                    </div>
                    <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
                      {e.uses_allowed ? `${e.uses_allowed} uses` : 'unlimited uses'}
                      {' · '}
                      {e.expires_after_days === null
                        ? 'while member'
                        : e.expires_after_days === 0
                        ? 'permanent'
                        : `${e.expires_after_days}d from grant`}
                    </div>
                    {e.notes && (
                      <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                        marginTop: '4px' }}>{e.notes}</div>
                    )}
                  </div>
                  <Btn onClick={() => deleteEnt(e.id)} variant="danger" small>Remove</Btn>
                </div>
              </Card>
            ))
          }
        </>
      )}
    </div>
  )
}

// ── USERS TAB ─────────────────────────────────────────────────

function UsersTab({ toast }) {
  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [selected, setSelected]   = useState(null)
  const [userAccess, setAccess]   = useState([])
  const [userGroups, setGroups]   = useState([])
  const [searching, setSearching] = useState(false)
  const [grantForm, setGrant]     = useState({
    product: '', tier: 'full', source: 'admin', expires_at: '', notes: '',
  })
  const [products, setProducts]   = useState([])

  useEffect(() => {
    supabase.from('products').select('key, name').eq('active', true)
      .then(({ data }) => setProducts(data ?? []))
  }, [])

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    const q = query.trim()
    const { data } = await supabase.from('users')
      .select('*')
      .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(20)
    setResults(data ?? [])
    setSearching(false)
  }

  async function selectUser(u) {
    setSelected(u)
    const [{ data: access }, { data: groups }] = await Promise.all([
      supabase.from('access').select('*').eq('user_id', u.id),
      supabase.from('group_members')
        .select('*, groups(name, code)')
        .eq('user_id', u.id),
    ])
    setAccess(access ?? [])
    setGroups(groups ?? [])
  }

  async function addGrant() {
    const { error } = await supabase.from('access').upsert({
      user_id: selected.id,
      product: grantForm.product,
      tier: grantForm.tier,
      source: grantForm.source,
      expires_at: grantForm.expires_at || null,
      notes: grantForm.notes || null,
      granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,product' })
    if (error) { toast(error.message); return }
    toast('Access granted')
    selectUser(selected)
  }

  async function revokeGrant(accessId) {
    await supabase.from('access').delete().eq('id', accessId)
    toast('Access revoked')
    selectUser(selected)
  }

  async function updateUserStatus(userId, status) {
    await supabase.from('users').update({ status }).eq('id', userId)
    toast(`User ${status}`)
    setSelected(s => ({ ...s, status }))
    const updated = results.map(r => r.id === userId ? { ...r, status } : r)
    setResults(updated)
  }

  return (
    <div>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, marginBottom: '20px' }}>Users</h2>

      {/* Search */}
      <Card style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}>
          <Eyebrow>Search by email, first name, or last name</Eyebrow>
          <Input value={query} onChange={setQuery} placeholder="Search…"
            style={{}}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
        </div>
        <Btn onClick={search} disabled={searching}>
          {searching ? 'Searching…' : 'Search'}
        </Btn>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.5fr' : '1fr', gap: '20px' }}>
        {/* Results list */}
        <div>
          {results.map(u => (
            <Card key={u.id} style={{
              cursor: 'pointer',
              borderColor: selected?.id === u.id ? 'rgba(200,146,42,0.78)' : 'rgba(200,146,42,0.20)',
            }} onClick={() => selectUser(u)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ ...body, fontSize: '15px', color: '#0F1523' }}>
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '—'}
                  </div>
                  <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
                    {u.email}
                  </div>
                </div>
                <Badge
                  label={u.status}
                  color={u.status === 'active' ? '#3B6B4A' : '#8A2020'} />
              </div>
            </Card>
          ))}
        </div>

        {/* User detail */}
        {selected && (
          <div>
            <Card style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ ...body, fontSize: '18px', color: '#0F1523', marginBottom: '2px' }}>
                    {[selected.first_name, selected.last_name].filter(Boolean).join(' ') || selected.email}
                  </div>
                  <div style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
                    {selected.email}
                  </div>
                </div>
                <Badge label={selected.status}
                  color={selected.status === 'active' ? '#3B6B4A' : '#8A2020'} />
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selected.status !== 'active' && (
                  <Btn onClick={() => updateUserStatus(selected.id, 'active')} small>
                    Reinstate
                  </Btn>
                )}
                {selected.status === 'active' && (
                  <Btn onClick={() => updateUserStatus(selected.id, 'suspended')}
                    variant="ghost" small>Suspend</Btn>
                )}
                {selected.status !== 'banned' && (
                  <Btn onClick={() => updateUserStatus(selected.id, 'banned')}
                    variant="danger" small>Ban</Btn>
                )}
              </div>
            </Card>

            {/* Group memberships */}
            {userGroups.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Eyebrow>Group memberships</Eyebrow>
                {userGroups.map(gm => (
                  <div key={gm.id} style={{ display: 'flex', alignItems: 'center',
                    gap: '10px', padding: '8px 0',
                    borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <span style={{ ...body, fontSize: '17px', color: '#0F1523', flex: 1 }}>
                      {gm.groups?.name}
                    </span>
                    <Badge label={gm.status}
                      color={gm.status === 'active' ? '#3B6B4A'
                        : gm.status === 'pending' ? gold : '#8A2020'} />
                  </div>
                ))}
              </div>
            )}

            {/* Individual access */}
            <div style={{ marginBottom: '16px' }}>
              <Eyebrow>Individual access</Eyebrow>
              {userAccess.length === 0
                ? <p style={{ ...body, fontSize: '17px', color: 'rgba(15,21,35,0.72)' }}>
                    No individual grants.
                  </p>
                : userAccess.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center',
                    gap: '10px', padding: '8px 0',
                    borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
                    <span style={{ ...body, fontSize: '17px', color: '#0F1523', flex: 1 }}>
                      {products.find(p => p.key === a.product)?.name ?? a.product}
                    </span>
                    <Badge label={a.tier} color="#3B6B4A" />
                    <Badge label={a.source} />
                    {a.expires_at && (
                      <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                        letterSpacing: '0.08em' }}>
                        exp {new Date(a.expires_at).toLocaleDateString()}
                      </span>
                    )}
                    <Btn onClick={() => revokeGrant(a.id)} variant="danger" small>Revoke</Btn>
                  </div>
                ))
              }
            </div>

            {/* Add grant */}
            <Card style={{ background: 'rgba(200,146,42,0.02)' }}>
              <Eyebrow>Grant access</Eyebrow>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <Select value={grantForm.product}
                  onChange={v => setGrant(f => ({ ...f, product: v }))}
                  options={[{ value: '', label: 'Product…' },
                    ...products.map(p => ({ value: p.key, label: p.name }))]} />
                <Select value={grantForm.tier}
                  onChange={v => setGrant(f => ({ ...f, tier: v }))}
                  options={TIER_OPTIONS} />
                <Select value={grantForm.source}
                  onChange={v => setGrant(f => ({ ...f, source: v }))}
                  options={SOURCE_OPTIONS} />
                <Input value={grantForm.expires_at} type="date"
                  onChange={v => setGrant(f => ({ ...f, expires_at: v }))} />
              </div>
              <Input value={grantForm.notes} onChange={v => setGrant(f => ({ ...f, notes: v }))}
                placeholder="Notes (optional)" style={{ marginBottom: '12px' }} />
              <Btn onClick={addGrant} disabled={!grantForm.product}>Grant</Btn>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

// ── GRANTS TAB ────────────────────────────────────────────────

// ── SUBDOMAINS TAB ────────────────────────────────────────────
// Shows all distinct subdomain strings currently in use across
// actors, grouped by domain, with actor counts.
// This is how the canonical subdomain vocabulary will emerge —
// from what experts and community members actually submit.

const PLANET_DOMAIN_LABELS = {
  'human-being':     'Human Being',
  'society':         'Society',
  'nature':          'Nature',
  'technology':      'Technology',
  'finance-economy': 'Finance & Economy',
  'legacy':          'Legacy',
  'vision':          'Vision',
}

const SELF_DOMAIN_LABELS = {
  'path':       'Path',
  'spark':      'Spark',
  'body':       'Body',
  'finances':   'Finances',
  'connection': 'Connection',
  'inner-game': 'Inner Game',
  'signal':     'Signal',
}

const ALL_DOMAIN_LABELS = { ...PLANET_DOMAIN_LABELS, ...SELF_DOMAIN_LABELS }

function SubdomainsTab({ toast }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [ratifying, setRatifying] = useState(null)  // subdomain string being ratified
  const [ratifyName, setRatifyName] = useState('')

  async function load() {
    setLoading(true)
    // Pull all actors that have a subdomain set
    const { data, error } = await supabase
      .from('nextus_actors')
      .select('domain_id, subdomain_id, name')
      .not('subdomain_id', 'is', null)
      .neq('subdomain_id', '')
      .order('domain_id')

    if (error) { toast('Error loading: ' + error.message); setLoading(false); return }

    // Group by domain_id → subdomain_id → list of actor names
    const grouped = {}
    for (const row of data || []) {
      const d = row.domain_id || 'unknown'
      const s = row.subdomain_id
      if (!grouped[d]) grouped[d] = {}
      if (!grouped[d][s]) grouped[d][s] = []
      grouped[d][s].push(row.name)
    }
    setRows(grouped)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function ratify(domainId, subdomainId, displayName) {
    // Insert into nextus_subdomains as a ratified canonical entry
    const { error } = await supabase.from('nextus_subdomains').upsert({
      id:        subdomainId,
      name:      displayName || subdomainId,
      domain_id: domainId,
    }, { onConflict: 'id' })
    if (error) { toast('Error ratifying: ' + error.message); return }
    toast(`Ratified: ${displayName || subdomainId}`)
    setRatifying(null)
    setRatifyName('')
  }

  const domainIds = Object.keys(rows).sort()
  const totalSubdomains = domainIds.reduce((n, d) => n + Object.keys(rows[d]).length, 0)
  const totalActors = domainIds.reduce((n, d) =>
    n + Object.values(rows[d]).reduce((m, actors) => m + actors.length, 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '20px', marginBottom: '28px' }}>
        <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, color: '#0F1523' }}>
          Subdomain vocabulary in use
        </h2>
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', lineHeight: 1.65,
        maxWidth: '600px', marginBottom: '28px' }}>
        Every distinct subdomain string currently attached to an actor on the map.
        Patterns here will surface the canonical vocabulary — contributed by the people
        who actually know each domain. Ratify the ones that are accurate to seed them
        as canonical entries in the database.
      </p>

      {!loading && totalSubdomains === 0 && (
        <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.55)' }}>
          No subdomains in use yet. They'll appear here as actors are placed.
        </p>
      )}

      {!loading && totalSubdomains > 0 && (
        <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.45)',
          marginBottom: '24px' }}>
          {totalSubdomains} distinct subdomain{totalSubdomains !== 1 ? 's' : ''} across {totalActors} actor{totalActors !== 1 ? 's' : ''}
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}

      {domainIds.map(domainId => {
        const subdomains = rows[domainId]
        const domainLabel = ALL_DOMAIN_LABELS[domainId] || domainId
        const track = SELF_DOMAIN_LABELS[domainId] ? 'Self' : 'Planet'
        const trackColor = track === 'Self' ? '#2A6B3A' : '#2A4A8A'
        const trackBg = track === 'Self' ? 'rgba(42,107,58,0.08)' : 'rgba(42,74,138,0.08)'
        const trackBorder = track === 'Self' ? 'rgba(42,107,58,0.25)' : 'rgba(42,74,138,0.25)'

        return (
          <div key={domainId} style={{ marginBottom: '28px' }}>
            {/* Domain header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
              marginBottom: '12px', paddingBottom: '8px',
              borderBottom: '1px solid rgba(200,146,42,0.15)' }}>
              <span style={{ ...body, fontSize: '17px', color: '#0F1523' }}>
                {domainLabel}
              </span>
              <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em',
                padding: '2px 8px', borderRadius: '40px',
                border: `1px solid ${trackBorder}`, color: trackColor, background: trackBg }}>
                {track}
              </span>
              <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.10em',
                color: 'rgba(15,21,35,0.40)' }}>
                {Object.keys(subdomains).length} subdomain{Object.keys(subdomains).length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Subdomain rows */}
            {Object.entries(subdomains)
              .sort((a, b) => b[1].length - a[1].length)  // most-used first
              .map(([subdomainId, actors]) => (
                <div key={subdomainId} style={{
                  display: 'flex', alignItems: 'flex-start',
                  gap: '16px', padding: '10px 14px',
                  background: '#FFFFFF',
                  border: '1px solid rgba(200,146,42,0.18)',
                  borderRadius: '8px', marginBottom: '6px',
                }}>
                  {/* Subdomain ID + actor list */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px',
                      marginBottom: actors.length > 0 ? '5px' : 0 }}>
                      <span style={{ ...sc, fontSize: '14px', letterSpacing: '0.12em',
                        color: '#0F1523' }}>
                        {subdomainId}
                      </span>
                      <span style={{ ...sc, fontSize: '11px', letterSpacing: '0.10em',
                        color: 'rgba(15,21,35,0.40)' }}>
                        {actors.length} actor{actors.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.50)',
                      lineHeight: 1.5 }}>
                      {actors.slice(0, 5).join(', ')}
                      {actors.length > 5 && ` +${actors.length - 5} more`}
                    </div>
                  </div>

                  {/* Ratify action */}
                  {ratifying === `${domainId}:${subdomainId}` ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      <input
                        value={ratifyName}
                        onChange={e => setRatifyName(e.target.value)}
                        placeholder="Display name"
                        style={{ ...body, fontSize: '13px', color: '#0F1523',
                          padding: '5px 10px', borderRadius: '6px',
                          border: '1.5px solid rgba(200,146,42,0.35)',
                          background: '#FFFFFF', outline: 'none', width: '140px' }}
                      />
                      <Btn small onClick={() => ratify(domainId, subdomainId, ratifyName)}>
                        Ratify
                      </Btn>
                      <Btn small variant="ghost" onClick={() => { setRatifying(null); setRatifyName('') }}>
                        ×
                      </Btn>
                    </div>
                  ) : (
                    <Btn small variant="ghost" onClick={() => {
                      setRatifying(`${domainId}:${subdomainId}`)
                      setRatifyName(subdomainId)
                    }}>
                      Ratify
                    </Btn>
                  )}
                </div>
              ))
            }
          </div>
        )
      })}
    </div>
  )
}


function GrantsTab() {
  const [grants, setGrants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('access')
        .select('*, users(email, first_name, last_name)')
        .order('granted_at', { ascending: false })
        .limit(100)
      setGrants(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div>
      <h2 style={{ ...body, fontSize: '22px', fontWeight: 300, marginBottom: '20px' }}>
        Recent Grants
      </h2>
      {loading
        ? <p style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)' }}>Loading...</p>
        : grants.map(g => {
          const u = g.users
          const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.email
          return (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 0', borderBottom: '1px solid rgba(200,146,42,0.08)' }}>
              <div style={{ flex: 1 }}>
                <span style={{ ...body, fontSize: '15px', color: '#0F1523' }}>{name}</span>
                <span style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.72)',
                  marginLeft: '10px' }}>{u?.email}</span>
              </div>
              <Badge label={g.product} />
              <Badge label={g.tier} color="#3B6B4A" />
              <Badge label={g.source} />
              <span style={{ ...sc, fontSize: '15px', color: 'rgba(15,21,35,0.55)',
                letterSpacing: '0.08em', flexShrink: 0 }}>
                {new Date(g.granted_at).toLocaleDateString()}
              </span>
              {g.expires_at && (
                <span style={{ ...sc, fontSize: '15px',
                  color: new Date(g.expires_at) < new Date() ? '#8A2020' : 'rgba(15,21,35,0.55)',
                  letterSpacing: '0.08em' }}>
                  {new Date(g.expires_at) < new Date() ? 'expired' : `exp ${new Date(g.expires_at).toLocaleDateString()}`}
                </span>
              )}
            </div>
          )
        })
      }
    </div>
  )
}

// ── PLATFORM HEALTH TAB ─────────────────────────────────────

const DOMAIN_LIST = [
  { value: 'human-being',     label: 'Human Being' },
  { value: 'society',         label: 'Society' },
  { value: 'nature',          label: 'Nature' },
  { value: 'technology',      label: 'Technology' },
  { value: 'finance-economy', label: 'Finance & Economy' },
  { value: 'legacy',          label: 'Legacy' },
  { value: 'vision',          label: 'Vision' },
]

function PlatformTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { count: totalActors }, { count: claimedActors }, { count: openNeeds },
        { count: pendingClaims }, { count: totalContribs }, { count: waitlistCount },
        { data: domainCounts }, { data: zeroActorDomains },
      ] = await Promise.all([
        supabase.from('nextus_actors').select('*', { count: 'exact', head: true }),
        supabase.from('nextus_actors').select('*', { count: 'exact', head: true }).eq('claimed', true),
        supabase.from('nextus_needs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('nextus_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('nextus_contributions').select('*', { count: 'exact', head: true }),
        supabase.from('nextus_waitlist').select('*', { count: 'exact', head: true }),
        supabase.from('nextus_domains').select('id, name, total_actors, gap_score, gap_signal, data_status').order('gap_score'),
        supabase.from('nextus_domains').select('id, name, total_actors').eq('total_actors', 0),
      ])
      setStats({ totalActors, claimedActors, openNeeds, pendingClaims, totalContribs, waitlistCount, domainCounts, zeroActorDomains })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>

  const statCards = [
    { label: 'Total Actors', value: stats.totalActors },
    { label: 'Claimed', value: stats.claimedActors },
    { label: 'Open Needs', value: stats.openNeeds },
    { label: 'Pending Claims', value: stats.pendingClaims },
    { label: 'Contributions', value: stats.totalContribs },
    { label: 'Waitlist', value: stats.waitlistCount },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '32px' }}>
        {statCards.map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ ...body, fontSize: '32px', fontWeight: 300, color: '#0F1523', lineHeight: 1 }}>{s.value ?? 0}</div>
            <div style={{ ...sc, fontSize: '13px', letterSpacing: '0.14em', color: gold, marginTop: '6px' }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Eyebrow>Domains</Eyebrow>
      <div style={{ marginBottom: '32px' }}>
        {(stats.domainCounts || []).map(d => {
          const hasScore    = d.gap_score != null
          const isVerified  = d.data_status === 'verified'
          const sufficient  = (d.total_actors || 0) >= 10
          const showScore   = hasScore && isVerified && sufficient
          const showIllustrative = hasScore && !isVerified
          return (
            <Card key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', flexWrap: 'wrap' }}>
              <div style={{ ...body, fontSize: '16px', color: '#0F1523', width: '160px', flexShrink: 0 }}>{d.name}</div>

              {/* Progress bar — only shown when score is meaningful */}
              <div style={{ flex: 1, height: '6px', background: 'rgba(200,146,42,0.12)', borderRadius: '3px', overflow: 'hidden', minWidth: '80px' }}>
                {showScore && (
                  <div style={{ height: '100%', width: `${(d.gap_score / 10) * 100}%`,
                    background: d.gap_score < 4 ? '#8A3030' : d.gap_score < 6 ? '#8A7030' : '#2A6B3A',
                    borderRadius: '3px' }} />
                )}
              </div>

              {/* Score or status label */}
              <div style={{ width: '160px', textAlign: 'right', flexShrink: 0 }}>
                {showScore ? (
                  <div>
                    <span style={{ ...sc, fontSize: '14px', color: gold }}>{d.gap_score}/10</span>
                    <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.40)', marginTop: '2px' }}>
                      Verified · {d.total_actors} actors
                    </div>
                  </div>
                ) : showIllustrative ? (
                  <div>
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em',
                      color: 'rgba(15,21,35,0.35)' }}>
                      Illustrative
                    </span>
                    <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.35)', marginTop: '2px' }}>
                      {d.total_actors || 0} actor{(d.total_actors || 0) !== 1 ? 's' : ''} · not yet verified
                    </div>
                  </div>
                ) : (
                  <div>
                    <span style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em',
                      color: 'rgba(15,21,35,0.35)' }}>
                      Insufficient data
                    </span>
                    <div style={{ ...body, fontSize: '11px', color: 'rgba(15,21,35,0.35)', marginTop: '2px' }}>
                      {d.total_actors || 0} actor{(d.total_actors || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                )}
              </div>

              {d.gap_signal && <Badge label="gap" color="#8A3030" />}
              {isVerified && sufficient && <Badge label="verified" color="#2A6B3A" />}
            </Card>
          )
        })}
      </div>
      {stats.pendingClaims > 0 && (
        <Card style={{ borderColor: 'rgba(200,146,42,0.60)', background: 'rgba(200,146,42,0.04)' }}>
          <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>{stats.pendingClaims} claim{stats.pendingClaims !== 1 ? 's' : ''} awaiting review — go to Actors tab</span>
        </Card>
      )}
      {(stats.zeroActorDomains || []).length > 0 && (
        <Card style={{ borderColor: 'rgba(138,48,48,0.40)', background: 'rgba(138,48,48,0.03)' }}>
          <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>Empty domains: {stats.zeroActorDomains.map(d => d.name).join(', ')}</span>
        </Card>
      )}
    </div>
  )
}


// ── ACTORS TAB ───────────────────────────────────────────────

const SUBDOMAIN_MAP = {
  'human-being':     [['hb-body','Body'],['hb-mind','Mind'],['hb-inner-life','Inner Life'],['hb-development','Development'],['hb-dignity','Dignity & Rights'],['hb-expression','Expression & Culture']],
  'society':         [['soc-governance','Governance'],['soc-culture','Culture'],['soc-conflict-peace','Conflict & Peace'],['soc-community','Community'],['soc-communication','Communication & Information'],['soc-global','Global Coordination']],
  'nature':          [['nat-earth','Earth'],['nat-air','Air'],['nat-salt-water','Salt Water'],['nat-fresh-water','Fresh Water'],['nat-flora','Flora'],['nat-fauna','Fauna'],['nat-living-systems','Living Systems']],
  'technology':      [['tech-digital','Digital Systems'],['tech-biological','Biological Technology'],['tech-infrastructure','Physical Infrastructure'],['tech-energy','Energy'],['tech-frontier','Frontier & Emerging Technology']],
  'finance-economy': [['fe-resources','Resources'],['fe-exchange','Exchange'],['fe-capital','Capital'],['fe-labour','Labour'],['fe-ownership','Ownership'],['fe-distribution','Distribution']],
  'legacy':          [['leg-wisdom','Wisdom'],['leg-memory','Memory'],['leg-ceremony','Ceremony & Ritual'],['leg-intergenerational','Intergenerational Relationship'],['leg-long-arc','The Long Arc']],
  'vision':          [['vis-imagination','Imagination'],['vis-philosophy','Philosophy & Worldview'],['vis-leadership','Leadership'],['vis-coordination','Coordination'],['vis-foresight','Foresight']],
}

const DOMAINS_WITH_EMPTY = [{ value: '', label: 'All domains' }, ...DOMAIN_LIST]
const ACTOR_TYPES  = ['organisation', 'project']
const SCALE_OPTIONS = ['local', 'municipal', 'regional', 'national', 'international', 'global']

const EMPTY_ACTOR_FORM = {
  name: '', type: 'organisation', domain_id: '', subdomain_id: '',
  scale: 'national', location_name: '', lat: '', lng: '', website: '',
  description: '', impact_summary: '', reach: '',
  alignment_score: '', winning: false, data_source: '',
}

function ActorsTab({ toast }) {
  const [actors, setActors]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [filterDomain, setFilterDomain] = useState('')
  const [filterType, setFilterType]   = useState('')
  const [filterClaimed, setFilterClaimed] = useState('')
  const [filterWinning, setFilterWinning] = useState('')
  const [search, setSearch]           = useState('')
  const [total, setTotal]             = useState(0)
  const [mode, setMode]               = useState('browse')
  const [form, setForm]               = useState(EMPTY_ACTOR_FORM)
  const [editId, setEditId]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [claims, setClaims]           = useState([])
  const [actorDomains, setActorDomains] = useState([])

  const subdomainOptions = form.domain_id
    ? [['', '— none —'], ...(SUBDOMAIN_MAP[form.domain_id] || [])].map(([v, l]) => ({ value: v, label: l }))
    : [{ value: '', label: 'Select domain first' }]

  async function fetchActors() {
    setLoading(true)
    let q = supabase.from('nextus_actors').select('*', { count: 'exact' })
    if (filterDomain)  q = q.eq('domain_id', filterDomain)
    if (filterType)    q = q.eq('type', filterType)
    if (filterClaimed === 'claimed')   q = q.eq('claimed', true)
    if (filterClaimed === 'unclaimed') q = q.eq('claimed', false)
    if (filterWinning === 'winning')   q = q.eq('winning', true)
    if (filterWinning === 'underloved') q = q.eq('winning', false)
    if (search) q = q.ilike('name', `%${search}%`)
    q = q.order('name').limit(50)
    const { data, count } = await q
    setActors(data || [])
    setTotal(count || 0)
    setLoading(false)
  }

  async function fetchClaims() {
    const { data } = await supabase.from('nextus_claims')
      .select('*, nextus_actors(name, domain_id)').eq('status', 'pending').order('submitted_at', { ascending: false })
    setClaims(data || [])
  }

  useEffect(() => { fetchActors() }, [filterDomain, filterType, filterClaimed, filterWinning])
  useEffect(() => { if (mode === 'claims') fetchClaims() }, [mode])

  function setFormField(field, value) {
    setForm(f => { const next = { ...f, [field]: value }; if (field === 'domain_id') next.subdomain_id = ''; return next })
  }

  async function startEdit(actor) {
    setForm({
      name: actor.name || '', type: actor.type || 'organisation',
      domain_id: actor.domain_id || '', subdomain_id: actor.subdomain_id || '',
      scale: actor.scale || 'national', location_name: actor.location_name || '',
      lat: actor.lat ?? '', lng: actor.lng ?? '',
      website: actor.website || '', description: actor.description || '',
      impact_summary: actor.impact_summary || '', reach: actor.reach || '',
      alignment_score: actor.alignment_score ?? '', winning: actor.winning || false,
      data_source: actor.data_source || '',
    })
    setEditId(actor.id)
    const { data } = await supabase.from('nextus_actor_domains')
      .select('*').eq('actor_id', actor.id).order('is_primary', { ascending: false })
    setActorDomains(data || [])
    setMode('edit')
  }

  async function saveActor() {
    if (!form.name.trim()) { toast('Name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      alignment_score: form.alignment_score !== '' ? parseFloat(form.alignment_score) : null,
      subdomain_id: form.subdomain_id || null,
      domain_id: form.domain_id || null,
      lat: form.lat !== '' ? parseFloat(form.lat) : null,
      lng: form.lng !== '' ? parseFloat(form.lng) : null,
    }
    let savedId = editId
    if (mode === 'edit') {
      const { error } = await supabase.from('nextus_actors').update(payload).eq('id', editId)
      if (error) { setSaving(false); toast('Error: ' + error.message); return }
    } else {
      const { data, error } = await supabase.from('nextus_actors').insert(payload).select('id').single()
      if (error) { setSaving(false); toast('Error: ' + error.message); return }
      savedId = data.id
    }
    if (savedId && actorDomains.length > 0) {
      await supabase.from('nextus_actor_domains').delete().eq('actor_id', savedId)
      const domainRows = actorDomains.map(d => ({
        actor_id: savedId,
        domain_id: d.domain_id,
        subdomain_id: d.subdomain_id || null,
        is_primary: d.is_primary || false,
        alignment_score: d.alignment_score || null,
      }))
      await supabase.from('nextus_actor_domains').insert(domainRows)
    }
    setSaving(false)
    toast(mode === 'edit' ? 'Actor updated' : 'Actor added')
    setForm(EMPTY_ACTOR_FORM); setActorDomains([]); setEditId(null); setMode('browse'); fetchActors()
  }

  async function deleteActor(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    await supabase.from('nextus_actors').delete().eq('id', id)
    toast('Deleted'); fetchActors()
  }

  async function toggleWinning(actor) {
    await supabase.from('nextus_actors').update({ winning: !actor.winning }).eq('id', actor.id)
    fetchActors()
  }

  async function resolveClaim(claimId, actorId, approved) {
    if (approved) {
      await supabase.from('nextus_actors').update({ claimed: true, verified: true }).eq('id', actorId)
      await supabase.from('nextus_claims').update({ status: 'verified', resolved_at: new Date().toISOString() }).eq('id', claimId)
      toast('Claim approved')
    } else {
      await supabase.from('nextus_claims').update({ status: 'rejected', resolved_at: new Date().toISOString() }).eq('id', claimId)
      toast('Claim rejected')
    }
    fetchClaims()
  }

  const domainLabel = id => DOMAIN_LIST.find(d => d.value === id)?.label || id

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
        {['browse', 'add', 'claims'].map(m => (
          <Btn key={m} onClick={() => { setMode(m); if (m === 'add') setForm(EMPTY_ACTOR_FORM) }}
            variant={mode === m || (mode === 'edit' && m === 'add') ? 'primary' : 'ghost'} small>
            {m === 'browse' ? `Browse (${total})` : m === 'add' ? '+ Add Actor' : `Claims (${claims.length})`}
          </Btn>
        ))}
      </div>

      {mode === 'browse' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <Input value={search} onChange={setSearch} placeholder="Search by name..." onKeyDown={e => e.key === 'Enter' && fetchActors()} />
            <Select value={filterDomain} onChange={setFilterDomain} options={DOMAINS_WITH_EMPTY} />
            <Select value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...ACTOR_TYPES.map(t => ({ value: t, label: t }))]} />
            <Select value={filterClaimed} onChange={setFilterClaimed} options={[{ value: '', label: 'Claimed / unclaimed' }, { value: 'claimed', label: 'Claimed' }, { value: 'unclaimed', label: 'Unclaimed' }]} />
            <Select value={filterWinning} onChange={setFilterWinning} options={[{ value: '', label: 'All actors' }, { value: 'winning', label: 'Winning' }, { value: 'underloved', label: 'Underloved' }]} />
            <Btn onClick={fetchActors} small>Search</Btn>
          </div>
          {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
          {!loading && actors.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No actors found.</p>}
          {actors.map(a => (
            <Card key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ ...body, fontSize: '17px', color: '#0F1523' }}>{a.name}</span>
                    <Badge label={a.type} />
                    {a.scale && <Badge label={a.scale} color="rgba(15,21,35,0.55)" />}
                    {a.winning && <Badge label="winning" color="#2A6B3A" />}
                    {a.claimed && <Badge label="claimed" color="#2A4A8A" />}
                    {a.verified && <Badge label="verified" color="#1A6B4A" />}
                  </div>
                  <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '4px' }}>
                    {a.domain_id && <span>{domainLabel(a.domain_id)}</span>}
                    {a.location_name && <span> · {a.location_name}</span>}
                    {(a.lat && a.lng) && <span style={{ color: '#2A6B3A' }}> · \ud83d\udccd mapped</span>}
                  </div>
                  {a.description && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>{a.description.slice(0, 160)}{a.description.length > 160 ? '...' : ''}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Btn small variant="ghost" onClick={() => toggleWinning(a)}>{a.winning ? 'Unmark' : 'Mark winning'}</Btn>
                  <Btn small onClick={() => startEdit(a)}>Edit</Btn>
                  <Btn small variant="danger" onClick={() => deleteActor(a.id, a.name)}>Delete</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <div style={{ maxWidth: '640px' }}>
          <Eyebrow>{mode === 'edit' ? `Editing: ${form.name}` : 'Add Actor'}</Eyebrow>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Name *</label><Input value={form.name} onChange={v => setFormField('name', v)} placeholder="Organisation or individual name" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Type</label><Select value={form.type} onChange={v => setFormField('type', v)} options={ACTOR_TYPES.map(t => ({ value: t, label: t }))} /></div>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Scale</label><Select value={form.scale} onChange={v => setFormField('scale', v)} options={SCALE_OPTIONS.map(s => ({ value: s, label: s }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Primary Domain</label><Select value={form.domain_id} onChange={v => setFormField('domain_id', v)} options={[{ value: '', label: '— none —' }, ...DOMAIN_LIST]} /></div>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Primary Subdomain</label><Select value={form.subdomain_id} onChange={v => setFormField('subdomain_id', v)} options={subdomainOptions} /></div>
            </div>
            <div>
              <label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '8px' }}>All Domains</label>
              {actorDomains.map((d, i) => {
                const sdOpts = d.domain_id
                  ? [['', '— none —'], ...(SUBDOMAIN_MAP[d.domain_id] || [])].map(([v, l]) => ({ value: v, label: l }))
                  : [{ value: '', label: 'Select domain first' }]
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '8px', alignItems: 'center', marginBottom: '8px', background: 'rgba(200,146,42,0.03)', border: '1px solid rgba(200,146,42,0.15)', borderRadius: '8px', padding: '10px 12px' }}>
                    <Select value={d.domain_id} onChange={v => setActorDomains(rows => rows.map((r, ri) => ri === i ? { ...r, domain_id: v, subdomain_id: '' } : r))} options={[{ value: '', label: '— domain —' }, ...DOMAIN_LIST]} />
                    <Select value={d.subdomain_id || ''} onChange={v => setActorDomains(rows => rows.map((r, ri) => ri === i ? { ...r, subdomain_id: v } : r))} options={sdOpts} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" id={`primary-${i}`} checked={d.is_primary || false}
                        onChange={e => setActorDomains(rows => rows.map((r, ri) => ({ ...r, is_primary: ri === i ? e.target.checked : false })))} />
                      <label htmlFor={`primary-${i}`} style={{ ...body, fontSize: '13px', cursor: 'pointer' }}>Primary</label>
                    </div>
                    <button onClick={() => setActorDomains(rows => rows.filter((_, ri) => ri !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(138,48,48,0.7)', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                )
              })}
              <button onClick={() => setActorDomains(rows => [...rows, { domain_id: '', subdomain_id: '', is_primary: rows.length === 0, alignment_score: null }])}
                style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold, background: 'none', border: '1px dashed rgba(200,146,42,0.40)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', width: '100%' }}>
                + Add domain
              </button>
            </div>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Location</label><Input value={form.location_name} onChange={v => setFormField('location_name', v)} placeholder="e.g. Nairobi, Kenya" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Latitude</label><Input value={form.lat} onChange={v => setFormField('lat', v)} placeholder="e.g. -1.286" type="number" /></div>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Longitude</label><Input value={form.lng} onChange={v => setFormField('lng', v)} placeholder="e.g. 36.817" type="number" /></div>
            </div>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Website</label><Input value={form.website} onChange={v => setFormField('website', v)} placeholder="https://..." /></div>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Description</label><textarea value={form.description} onChange={e => setFormField('description', e.target.value)} rows={3} style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical' }} /></div>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Impact Summary</label><textarea value={form.impact_summary} onChange={e => setFormField('impact_summary', e.target.value)} rows={2} style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Reach</label><Input value={form.reach} onChange={v => setFormField('reach', v)} placeholder="e.g. 40 countries" /></div>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Alignment (0-10)</label><Input value={form.alignment_score} onChange={v => setFormField('alignment_score', v)} type="number" /></div>
              <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Data Source</label><Input value={form.data_source} onChange={v => setFormField('data_source', v)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="checkbox" id="winning" checked={form.winning} onChange={e => setFormField('winning', e.target.checked)} />
              <label htmlFor="winning" style={{ ...body, fontSize: '15px', cursor: 'pointer' }}>Mark as winning</label>
            </div>
            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
              <Btn onClick={saveActor} disabled={saving}>{saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Actor'}</Btn>
              <Btn variant="ghost" onClick={() => { setMode('browse'); setForm(EMPTY_ACTOR_FORM); setEditId(null) }}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      {mode === 'claims' && (
        <div>
          {claims.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No pending claims.</p>}
          {claims.map(c => (
            <Card key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ ...body, fontSize: '17px', color: '#0F1523', marginBottom: '4px' }}>{c.nextus_actors?.name || c.actor_id}</div>
                  <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>Claimant: {c.claimant_id} · Method: {c.verification_method || 'not specified'}</div>
                  <div style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginTop: '4px' }}>Submitted: {new Date(c.submitted_at).toLocaleDateString()}</div>
                  {c.notes && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '6px' }}>{c.notes}</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn small onClick={() => resolveClaim(c.id, c.actor_id, true)}>Approve</Btn>
                  <Btn small variant="danger" onClick={() => resolveClaim(c.id, c.actor_id, false)}>Reject</Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


// ── DOMAIN DATA TAB ──────────────────────────────────────────

function DomainDataTab({ toast }) {
  const [selectedDomain, setSelectedDomain] = useState('human-being')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(null)

  async function loadDomain(id) {
    setLoading(true)
    const { data } = await supabase.from('nextus_domains').select('*').eq('id', id).single()
    if (data) setForm({ horizon_goal: data.horizon_goal || '', description: data.description || '', current_state: data.current_state || '', gap_score: data.gap_score ?? '', gap_signal: data.gap_signal || false, gap_reason: data.gap_reason || '', data_status: data.data_status || 'illustrative', indicators: JSON.stringify(data.indicators || [], null, 2), sources: JSON.stringify(data.sources || [], null, 2) })
    setLoading(false)
  }

  useEffect(() => { loadDomain(selectedDomain) }, [selectedDomain])
  function setField(f, v) { setForm(prev => ({ ...prev, [f]: v })) }

  async function save() {
    setSaving(true)
    let indicators, sources
    try { indicators = JSON.parse(form.indicators) } catch { toast('Indicators JSON invalid'); setSaving(false); return }
    try { sources = JSON.parse(form.sources) } catch { toast('Sources JSON invalid'); setSaving(false); return }
    const { error } = await supabase.from('nextus_domains').update({ horizon_goal: form.horizon_goal, description: form.description, current_state: form.current_state, gap_score: form.gap_score !== '' ? parseFloat(form.gap_score) : null, gap_signal: form.gap_signal, gap_reason: form.gap_reason || null, data_status: form.data_status, indicators, sources, last_updated: new Date().toISOString() }).eq('id', selectedDomain)
    setSaving(false)
    if (error) { toast('Error: ' + error.message); return }
    toast('Domain saved')
  }

  const ta = (value, onChange, rows = 3, placeholder = '') => (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} style={{ ...body, fontSize: '15px', color: '#0F1523', padding: '9px 14px', borderRadius: '8px', border: '1.5px solid rgba(200,146,42,0.35)', background: '#FFFFFF', outline: 'none', width: '100%', resize: 'vertical', lineHeight: 1.6 }} />
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '28px' }}>
        <Select value={selectedDomain} onChange={setSelectedDomain} options={DOMAIN_LIST} />
        {form && <Badge label={form.data_status} color={form.data_status === 'verified' ? '#2A6B3A' : gold} />}
        {form?.gap_signal && <Badge label="gap signal" color="#8A3030" />}
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {form && !loading && (
        <div style={{ display: 'grid', gap: '16px', maxWidth: '720px' }}>
          <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Horizon Goal</label>{ta(form.horizon_goal, v => setField('horizon_goal', v), 2)}</div>
          <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Description</label>{ta(form.description, v => setField('description', v), 2)}</div>
          <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Current State Narrative</label>{ta(form.current_state, v => setField('current_state', v), 5)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '12px', alignItems: 'end' }}>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Gap Score (0-10)</label><Input value={form.gap_score} onChange={v => setField('gap_score', v)} type="number" placeholder="e.g. 4.1" /></div>
            <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Data Status</label><Select value={form.data_status} onChange={v => setField('data_status', v)} options={[{ value: 'illustrative', label: 'Illustrative' }, { value: 'verified', label: 'Verified' }]} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}><input type="checkbox" id="gap_signal" checked={form.gap_signal} onChange={e => setField('gap_signal', e.target.checked)} /><label htmlFor="gap_signal" style={{ ...body, fontSize: '15px', cursor: 'pointer' }}>Gap signal active</label></div>
          </div>
          {form.gap_signal && <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Gap Reason</label><Input value={form.gap_reason} onChange={v => setField('gap_reason', v)} /></div>}
          <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Indicators (JSON)</label><p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>Format: [&#123;"label":"...","value":"...","trend":"up|down|flat"&#125;]</p>{ta(form.indicators, v => setField('indicators', v), 5)}</div>
          <div><label style={{ ...sc, fontSize: '13px', color: gold, display: 'block', marginBottom: '4px' }}>Sources (JSON)</label>{ta(form.sources, v => setField('sources', v), 4)}</div>
          <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
            <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Domain'}</Btn>
            <Btn variant="ghost" onClick={() => loadDomain(selectedDomain)}>Reset</Btn>
          </div>
        </div>
      )}
    </div>
  )
}


// ── NEEDS TAB ────────────────────────────────────────────────

function NeedsTab({ toast }) {
  const [needs, setNeeds]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterStatus, setFilterStatus] = useState('open')
  const [filterType, setFilterType]     = useState('')
  const [filterDomain, setFilterDomain] = useState('')

  async function fetchNeeds() {
    setLoading(true)
    let q = supabase.from('nextus_needs').select('*, nextus_actors(name, domain_id)').order('created_at', { ascending: false }).limit(100)
    if (filterStatus) q = q.eq('status', filterStatus)
    if (filterType)   q = q.eq('need_type', filterType)
    const { data } = await q
    let results = data || []
    if (filterDomain) results = results.filter(n => n.nextus_actors?.domain_id === filterDomain)
    setNeeds(results)
    setLoading(false)
  }

  useEffect(() => { fetchNeeds() }, [filterStatus, filterType, filterDomain])

  async function updateStatus(id, status) {
    await supabase.from('nextus_needs').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    toast('Need marked ' + status); fetchNeeds()
  }

  const statusColor = { open: '#2A6B3A', in_progress: '#2A4A8A', fulfilled: gold, closed: 'rgba(15,21,35,0.55)' }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <Select value={filterStatus} onChange={setFilterStatus} options={[{ value: '', label: 'All statuses' }, { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' }, { value: 'fulfilled', label: 'Fulfilled' }, { value: 'closed', label: 'Closed' }]} />
        <Select value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...['skills','creative','capital','time','resources','partnerships','data','other'].map(t => ({ value: t, label: t }))]} />
        <Select value={filterDomain} onChange={setFilterDomain} options={[{ value: '', label: 'All domains' }, ...DOMAIN_LIST]} />
        <Btn onClick={fetchNeeds} small>Refresh</Btn>
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && needs.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No needs found.</p>}
      {needs.map(n => (
        <Card key={n.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ ...body, fontSize: '16px', color: '#0F1523' }}>{n.title}</span>
                <Badge label={n.need_type} /><Badge label={n.size} color="rgba(15,21,35,0.55)" /><Badge label={n.status} color={statusColor[n.status]} />
              </div>
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>{n.nextus_actors?.name || 'Unknown'}{n.time_estimate && ' · ' + n.time_estimate}</div>
              {n.description && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.6 }}>{n.description.slice(0, 200)}{n.description.length > 200 ? '...' : ''}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
              {n.status === 'open'        && <Btn small onClick={() => updateStatus(n.id, 'in_progress')}>In progress</Btn>}
              {n.status === 'in_progress' && <Btn small onClick={() => updateStatus(n.id, 'fulfilled')}>Fulfilled</Btn>}
              {n.status !== 'closed'      && <Btn small variant="ghost" onClick={() => updateStatus(n.id, 'closed')}>Close</Btn>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}


// ── CONTRIBUTIONS TAB ────────────────────────────────────────

function ContributionsTab({ toast }) {
  const [contribs, setContribs]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [filterConfirmed, setFilterConfirmed] = useState('')
  const [filterOutcome, setFilterOutcome]     = useState('')
  const [filterType, setFilterType]           = useState('')

  async function fetchContribs() {
    setLoading(true)
    let q = supabase.from('nextus_contributions').select('*, nextus_actors(name, domain_id)').order('created_at', { ascending: false }).limit(100)
    if (filterConfirmed === 'confirmed')   q = q.eq('confirmed_by_actor', true)
    if (filterConfirmed === 'unconfirmed') q = q.eq('confirmed_by_actor', false)
    if (filterOutcome === 'missing')       q = q.eq('outcome_reported', false).eq('confirmed_by_actor', true)
    if (filterType) q = q.eq('contribution_type', filterType)
    const { data } = await q
    setContribs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchContribs() }, [filterConfirmed, filterOutcome, filterType])

  const typeColor = { hours: '#2A4A8A', capital: '#2A6B3A', skills: gold, resources: '#6B2A6B', community: '#2A6B6B', other: 'rgba(15,21,35,0.55)' }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <Select value={filterConfirmed} onChange={setFilterConfirmed} options={[{ value: '', label: 'All contributions' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'unconfirmed', label: 'Unconfirmed' }]} />
        <Select value={filterOutcome} onChange={setFilterOutcome} options={[{ value: '', label: 'All outcomes' }, { value: 'missing', label: 'Outcome report missing' }]} />
        <Select value={filterType} onChange={setFilterType} options={[{ value: '', label: 'All types' }, ...['hours','capital','skills','resources','community','other'].map(t => ({ value: t, label: t }))]} />
        <Btn onClick={fetchContribs} small>Refresh</Btn>
      </div>
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && contribs.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No contributions found.</p>}
      {contribs.map(c => (
        <Card key={c.id}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={c.contribution_type} color={typeColor[c.contribution_type]} />
                {c.amount && <span style={{ ...sc, fontSize: '13px', color: gold }}>{c.contribution_type === 'capital' ? `${c.currency} ${c.amount}` : `${c.amount} hrs`}</span>}
                {c.confirmed_by_actor ? <Badge label="confirmed" color="#2A6B3A" /> : <Badge label="unconfirmed" color="rgba(15,21,35,0.55)" />}
                {c.confirmed_by_actor && !c.outcome_reported && <Badge label="outcome missing" color="#8A3030" />}
              </div>
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)' }}>To: {c.nextus_actors?.name || c.actor_id}{c.contribution_date && ' · ' + c.contribution_date}</div>
              {c.description && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '4px', lineHeight: 1.6 }}>{c.description.slice(0, 160)}{c.description.length > 160 ? '...' : ''}</p>}
              {c.outcome_report && <p style={{ ...body, fontSize: '14px', color: '#2A6B3A', marginTop: '4px' }}>Outcome: {c.outcome_report.slice(0, 160)}</p>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}


// ── WAITLIST TAB ─────────────────────────────────────────────

function WaitlistTab({ toast }) {
  const [entries, setEntries]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [filterDomain, setFilterDomain] = useState('')
  const [total, setTotal]               = useState(0)

  async function fetchWaitlist() {
    setLoading(true)
    let q = supabase.from('nextus_waitlist').select('*, nextus_actors(name), nextus_domains(name)', { count: 'exact' }).order('created_at', { ascending: false }).limit(200)
    if (filterDomain) q = q.eq('domain_id', filterDomain)
    const { data, count } = await q
    setEntries(data || []); setTotal(count || 0); setLoading(false)
  }

  useEffect(() => { fetchWaitlist() }, [filterDomain])

  function copyEmails() {
    navigator.clipboard.writeText(entries.map(e => e.email).join('\n'))
    toast(entries.length + ' emails copied')
  }

  const byDomain = entries.reduce((acc, e) => {
    const key = e.nextus_domains?.name || e.domain_id || 'General'
    acc[key] = (acc[key] || 0) + 1; return acc
  }, {})

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Select value={filterDomain} onChange={setFilterDomain} options={[{ value: '', label: 'All domains' }, ...DOMAIN_LIST]} />
        <Btn onClick={fetchWaitlist} small>Refresh</Btn>
        <Btn onClick={copyEmails} small variant="ghost">Copy {total} emails</Btn>
      </div>
      {Object.keys(byDomain).length > 0 && (
        <Card style={{ marginBottom: '24px' }}>
          <Eyebrow>By Domain</Eyebrow>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
            {Object.entries(byDomain).sort((a, b) => b[1] - a[1]).map(([domain, count]) => (
              <div key={domain} style={{ ...body, fontSize: '15px', color: 'rgba(15,21,35,0.88)' }}>
                <span style={{ color: gold, fontWeight: 500 }}>{count}</span> {domain}
              </div>
            ))}
          </div>
        </Card>
      )}
      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && entries.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No waitlist entries yet.</p>}
      {entries.map(e => (
        <Card key={e.id} style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ ...body, fontSize: '16px', color: '#0F1523' }}>{e.email}</div>
              <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginTop: '2px' }}>
                {e.nextus_domains?.name || e.nextus_actors?.name || 'General interest'}
                {e.contribution_types?.length > 0 && ' · wants: ' + e.contribution_types.join(', ')}
                {e.source && ' · via ' + e.source}
              </div>
              {e.note && <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', marginTop: '4px' }}>{e.note}</p>}
            </div>
            <div style={{ ...sc, fontSize: '13px', color: 'rgba(15,21,35,0.55)', flexShrink: 0 }}>{new Date(e.created_at).toLocaleDateString()}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}


// ── EXTRACT TAB ───────────────────────────────────────────────
// Founder-only: paste a URL or description, get up to three proposed
// actor records (Planet, Self, Practitioner), tick/untick each,
// edit inline, and place all selected directly onto the map.

const PLANET_DOMAINS_EX = [
  { value: 'human-being',     label: 'Human Being' },
  { value: 'society',         label: 'Society' },
  { value: 'nature',          label: 'Nature' },
  { value: 'technology',      label: 'Technology' },
  { value: 'finance-economy', label: 'Finance & Economy' },
  { value: 'legacy',          label: 'Legacy' },
  { value: 'vision',          label: 'Vision' },
]
const SELF_DOMAINS_EX = [
  { value: 'path',       label: 'Path' },
  { value: 'spark',      label: 'Spark' },
  { value: 'body',       label: 'Body' },
  { value: 'finances',   label: 'Finances' },
  { value: 'connection', label: 'Connection' },
  { value: 'inner-game', label: 'Inner Game' },
  { value: 'signal',     label: 'Signal' },
]
const SCALES_EX = ['local','municipal','regional','national','international','global']
const TYPES_EX  = ['organisation','project','practitioner','programme','resource']
const TIER_FROM_SCORE = s => s <= 4 ? 'pattern_instance' : s <= 6 ? 'contested' : s <= 8 ? 'qualified' : 'exemplar'

const TIER_CFG = {
  pattern_instance: { label: 'Pattern instance', color: '#8A3030', bg: 'rgba(138,48,48,0.08)', border: 'rgba(138,48,48,0.25)' },
  contested:        { label: 'Contested',         color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.30)' },
  qualified:        { label: 'Qualified',          color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.30)' },
  exemplar:         { label: 'Exemplar',            color: '#6A4A10', bg: 'rgba(106,74,16,0.10)', border: 'rgba(106,74,16,0.35)' },
}

const LABEL_COLORS = {
  Planet:       { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)',  border: 'rgba(42,74,138,0.25)' },
  Self:         { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)', border: 'rgba(42,107,58,0.25)' },
  Practitioner: { color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.25)' },
}

function ExTierBadge({ tier }) {
  const c = TIER_CFG[tier]; if (!c) return null
  return (
    <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px', letterSpacing:'0.12em',
      padding:'3px 10px', borderRadius:'40px', border:`1px solid ${c.border}`, color:c.color, background:c.bg }}>
      {c.label}
    </span>
  )
}

function ExLabelBadge({ label }) {
  const c = LABEL_COLORS[label] || LABEL_COLORS.Planet
  return (
    <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'13px', letterSpacing:'0.14em',
      padding:'4px 12px', borderRadius:'40px', border:`1px solid ${c.border}`, color:c.color, background:c.bg }}>
      {label}
    </span>
  )
}

function ExPill({ label, variant = 'green' }) {
  const cols = {
    green: { color:'#2A6B3A', bg:'rgba(42,107,58,0.08)', border:'rgba(42,107,58,0.25)' },
    amber: { color:'#8A6020', bg:'rgba(200,146,42,0.08)', border:'rgba(200,146,42,0.20)' },
  }
  const c = cols[variant]
  return (
    <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px', letterSpacing:'0.10em',
      padding:'2px 9px', borderRadius:'40px', border:`1px solid ${c.border}`,
      color:c.color, background:c.bg, display:'inline-block', margin:'2px' }}>
      {label}
    </span>
  )
}

// Single proposal card — assessment display + editable fields + checkbox
function ProposalCard({ proposal, index, checked, onToggle, onChange }) {
  const [expanded, setExpanded] = useState(false)
  const score = parseFloat(proposal.alignment_score)

  function domainOptions() {
    const blank = [{ value:'', label:'— Select domain —' }]
    if (proposal.track === 'self')   return [...blank, ...SELF_DOMAINS_EX]
    if (proposal.track === 'planet') return [...blank, ...PLANET_DOMAINS_EX]
    return [...blank,
      { value:'', label:'── Planet ──', disabled:true }, ...PLANET_DOMAINS_EX,
      { value:'', label:'── Self ──',   disabled:true }, ...SELF_DOMAINS_EX,
    ]
  }

  function set(k, v) { onChange(index, k, v) }

  function handleScoreChange(v) {
    set('alignment_score', v)
    const n = parseFloat(v)
    if (!isNaN(n)) set('placement_tier', TIER_FROM_SCORE(n))
  }

  return (
    <div style={{
      background: checked ? '#FFFFFF' : 'rgba(15,21,35,0.03)',
      border: checked
        ? '1.5px solid rgba(200,146,42,0.40)'
        : '1.5px solid rgba(15,21,35,0.12)',
      borderRadius: '14px', marginBottom: '16px',
      opacity: checked ? 1 : 0.6,
      transition: 'all 0.15s',
    }}>

      {/* Card header — always visible */}
      <div style={{ padding: '18px 20px', display:'flex', alignItems:'flex-start', gap:'14px' }}>

        {/* Checkbox */}
        <input type="checkbox" checked={checked} onChange={() => onToggle(index)}
          style={{ width:'18px', height:'18px', accentColor:'#C8922A', marginTop:'3px', flexShrink:0, cursor:'pointer' }} />

        {/* Label + name + score */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px', flexWrap:'wrap' }}>
            <ExLabelBadge label={proposal.label} />
            <ExTierBadge tier={proposal.placement_tier} />
            <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'13px',
              letterSpacing:'0.10em', color:'rgba(15,21,35,0.50)' }}>
              {proposal.confidence}% confidence
            </span>
          </div>
          <div style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'19px', fontWeight:300,
            color:'#0F1523', marginBottom:'6px' }}>
            {proposal.name}
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'8px' }}>
            <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'40px',
              fontWeight:700, color:'#0F1523', lineHeight:1 }}>
              {proposal.alignment_score}
            </span>
            <span style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'14px',
              color:'rgba(15,21,35,0.35)' }}>/10</span>
          </div>

          {/* Score reasoning */}
          {proposal.score_reasoning && (
            <div style={{ borderLeft:'2px solid rgba(200,146,42,0.28)', paddingLeft:'12px', marginBottom:'10px' }}>
              <p style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'14px',
                color:'rgba(15,21,35,0.65)', lineHeight:1.7, margin:0 }}>
                {proposal.score_reasoning}
              </p>
            </div>
          )}

          {/* HAL + SFP pills */}
          {proposal.hal_signals?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px',
                letterSpacing:'0.14em', color:'#2A6B3A', marginBottom:'5px' }}>
                HAL conditions
              </p>
              <div>{proposal.hal_signals.map(s => <ExPill key={s} label={s} variant="green" />)}</div>
            </div>
          )}
          {proposal.sfp_patterns?.length > 0 && (
            <div style={{ marginBottom:'8px' }}>
              <p style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'11px',
                letterSpacing:'0.14em', color:'#8A6020', marginBottom:'5px' }}>
                SFP patterns
              </p>
              <div>{proposal.sfp_patterns.map(s => <ExPill key={s} label={s} variant="amber" />)}</div>
            </div>
          )}
        </div>

        {/* Expand/collapse edit */}
        <button onClick={() => setExpanded(e => !e)}
          style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'13px',
            letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
            background:'none', border:'none', cursor:'pointer', flexShrink:0, paddingTop:'4px' }}>
          {expanded ? 'Done ↑' : 'Edit ↓'}
        </button>
      </div>

      {/* Editable fields — collapsed by default */}
      {expanded && (
        <div style={{ borderTop:'1px solid rgba(200,146,42,0.15)', padding:'18px 20px 20px',
          display:'grid', gap:'14px' }}>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Name</label>
            <Input value={proposal.name} onChange={v => set('name', v)} placeholder="Name" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Type</label>
              <Select value={proposal.type} onChange={v => set('type', v)}
                options={TYPES_EX.map(t => ({ value:t, label:t }))} />
            </div>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Track</label>
              <Select value={proposal.track} onChange={v => { set('track', v); set('domain_id','') }}
                options={[{ value:'planet', label:'Planet' }, { value:'self', label:'Self' }]} />
            </div>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Scale</label>
              <Select value={proposal.scale || ''} onChange={v => set('scale', v)}
                options={[{ value:'', label:'— Select —' }, ...SCALES_EX.map(s => ({ value:s, label:s }))]} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Domain *</label>
            <Select value={proposal.domain_id || ''} onChange={v => set('domain_id', v)}
              options={domainOptions()} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Location</label>
              <Input value={proposal.location_name || ''} onChange={v => set('location_name', v)}
                placeholder="e.g. Mexico City, Mexico" />
            </div>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Website</label>
              <Input value={proposal.website || ''} onChange={v => set('website', v)}
                placeholder="https://..." />
            </div>
          </div>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Description</label>
            <textarea value={proposal.description || ''} onChange={e => set('description', e.target.value)}
              rows={3} style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'15px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px', border:'1.5px solid rgba(200,146,42,0.35)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          <div>
            <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
              letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Impact summary</label>
            <textarea value={proposal.impact_summary || ''} onChange={e => set('impact_summary', e.target.value)}
              rows={2} style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'15px', color:'#0F1523',
                padding:'9px 14px', borderRadius:'8px', border:'1.5px solid rgba(200,146,42,0.35)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.6, boxSizing:'border-box' }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'12px', alignItems:'end' }}>
            <div>
              <label style={{ fontFamily:"'Cormorant SC',Georgia,serif", fontSize:'12px',
                letterSpacing:'0.16em', color:gold, display:'block', marginBottom:'5px' }}>Score (0–9)</label>
              <Input value={proposal.alignment_score ?? ''} onChange={handleScoreChange}
                type="number" placeholder="0–9" />
            </div>
            <div style={{ paddingBottom:'2px' }}>
              {!isNaN(score) && <ExTierBadge tier={TIER_FROM_SCORE(score)} />}
              <span style={{ fontFamily:"'Lora',Georgia,serif", fontSize:'13px',
                color:'rgba(15,21,35,0.45)', marginLeft:'10px' }}>
                Adjust if your read differs from the AI draft.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExtractTab({ toast }) {
  const [input,      setInput]      = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractErr, setExtractErr] = useState(null)
  const [proposals,  setProposals]  = useState([])   // array of proposal objects
  const [checked,    setChecked]    = useState([])   // boolean[] parallel to proposals
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState([])   // array of { id, name, label }

  async function extract() {
    if (!input.trim()) return
    setExtracting(true); setExtractErr(null); setProposals([]); setChecked([]); setSaved([])
    try {
      const res  = await fetch('/api/org-extract', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const data = await res.json()
      if (data.error) { setExtractErr(data.message || 'Extraction failed.'); return }
      const results = data.results || []
      setProposals(results)
      setChecked(results.map(() => true))  // all ticked by default
    } catch {
      setExtractErr('Could not reach extraction service.')
    } finally {
      setExtracting(false)
    }
  }

  function toggleChecked(i) {
    setChecked(c => c.map((v, idx) => idx === i ? !v : v))
  }

  function handleChange(i, key, value) {
    setProposals(ps => ps.map((p, idx) => idx === i ? { ...p, [key]: value } : p))
  }

  async function saveSelected() {
    const selected = proposals.filter((_, i) => checked[i])
    if (selected.length === 0) { toast('Nothing selected'); return }
    for (const p of selected) {
      if (!p.name?.trim())  { toast(`Name required on ${p.label} entry`); return }
      if (!p.domain_id)     { toast(`Domain required on ${p.label} entry`); return }
    }

    setSaving(true)
    const savedNow = []
    for (const p of selected) {
      const payload = {
        name:            p.name.trim(),
        type:            p.type || 'organisation',
        track:           p.track || null,
        domain_id:       p.domain_id,
        scale:           p.scale || null,
        scale_notes:     p.scale_notes?.trim() || null,
        location_name:   p.location_name?.trim() || null,
        website:         p.website?.trim() || null,
        description:     p.description?.trim() || null,
        impact_summary:  p.impact_summary?.trim() || null,
        alignment_score: p.alignment_score !== '' && p.alignment_score != null
          ? parseFloat(p.alignment_score) : null,
        alignment_score_computed:   true,
        alignment_score_updated_at: new Date().toISOString(),
        placement_tier:  p.placement_tier || null,
        seeded_by:       'nextus',
        vetting_status:  'approved',
        data_source:     `Admin extract — ${p.label}`,
        alignment_reasoning: {
          hal_signals:     p.hal_signals,
          sfp_patterns:    p.sfp_patterns,
          score_reasoning: p.score_reasoning,
          confidence:      p.confidence,
          confidence_note: p.confidence_note,
          extracted_at:    new Date().toISOString(),
          input_mode:      'admin_extract',
          label:           p.label,
        },
      }
      const { data: inserted, error } = await supabase
        .from('nextus_actors').insert(payload).select('id').single()
      if (error) {
        toast(`Error saving ${p.label}: ${error.message}`)
        setSaving(false)
        return
      }
      savedNow.push({ id: inserted.id, name: p.name, label: p.label })
    }
    setSaving(false)
    setSaved(savedNow)
    toast(`${savedNow.length} record${savedNow.length !== 1 ? 's' : ''} placed on the map`)
  }

  function reset() {
    setInput(''); setProposals([]); setChecked([]); setSaved([]); setExtractErr(null)
  }

  const selectedCount = checked.filter(Boolean).length

  return (
    <div style={{ maxWidth: '720px' }}>

      <h2 style={{ ...body, fontSize:'22px', fontWeight:300, color:'#0F1523', marginBottom:'8px' }}>
        AI Extract
      </h2>
      <p style={{ ...body, fontSize:'14px', color:'rgba(15,21,35,0.55)', lineHeight:1.65, marginBottom:'28px' }}>
        Paste a URL, description, or raw HTML. The engine identifies up to three distinct actor records —
        Planet, Self, and Practitioner — each assessed independently. Tick the ones you want, edit any
        field, then place all selected directly onto the map.
      </p>

      {/* Success state */}
      {saved.length > 0 && (
        <div style={{ background:'rgba(42,107,58,0.06)', border:'1px solid rgba(42,107,58,0.30)',
          borderRadius:'14px', padding:'24px', marginBottom:'28px' }}>
          <div style={{ ...sc, fontSize:'12px', letterSpacing:'0.16em', color:'#2A6B3A', marginBottom:'12px' }}>
            Placed on the map
          </div>
          {saved.map(s => (
            <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
              <ExLabelBadge label={s.label} />
              <span style={{ ...body, fontSize:'17px', color:'#0F1523' }}>{s.name}</span>
              <a href={`/nextus/actors/${s.id}`} target="_blank" rel="noopener noreferrer"
                style={{ ...sc, fontSize:'12px', letterSpacing:'0.12em', color:gold }}>
                View →
              </a>
            </div>
          ))}
          <button onClick={reset}
            style={{ ...sc, fontSize:'13px', letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
              background:'none', border:'none', cursor:'pointer', marginTop:'12px', padding:0 }}>
            Extract another
          </button>
        </div>
      )}

      {/* Input */}
      {!saved.length && (
        <>
          <div style={{ marginBottom:'14px' }}>
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={5}
              placeholder="Paste a URL, a description, or raw HTML source..."
              style={{ ...body, fontSize:'15px', color:'#0F1523', padding:'12px 16px',
                borderRadius:'8px', border:'1.5px solid rgba(200,146,42,0.30)',
                background:'#FFFFFF', outline:'none', width:'100%', resize:'vertical',
                lineHeight:1.65, boxSizing:'border-box' }} />
          </div>

          {extractErr && (
            <div style={{ background:'rgba(138,48,48,0.05)', border:'1px solid rgba(138,48,48,0.28)',
              borderRadius:'8px', padding:'10px 14px', marginBottom:'14px' }}>
              <p style={{ ...body, fontSize:'14px', color:'#8A3030', margin:0 }}>{extractErr}</p>
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'32px' }}>
            <button onClick={extract} disabled={extracting || !input.trim()}
              style={{ ...sc, fontSize:'14px', letterSpacing:'0.16em',
                padding:'12px 30px', borderRadius:'40px', border:'none',
                background: extracting || !input.trim() ? 'rgba(200,146,42,0.30)' : '#C8922A',
                color:'#FFFFFF', cursor: extracting || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {extracting ? 'Reading...' : 'Extract →'}
            </button>
            {proposals.length > 0 && (
              <button onClick={reset}
                style={{ ...sc, fontSize:'13px', letterSpacing:'0.12em', color:'rgba(15,21,35,0.55)',
                  background:'none', border:'none', cursor:'pointer' }}>
                Clear
              </button>
            )}
          </div>

          {/* Proposal cards */}
          {proposals.length > 0 && (
            <>
              <div style={{ ...sc, fontSize:'12px', letterSpacing:'0.16em',
                color:'rgba(15,21,35,0.55)', marginBottom:'16px' }}>
                {proposals.length} record{proposals.length !== 1 ? 's' : ''} identified
                — tick the ones you want to place
              </div>

              {proposals.map((p, i) => (
                <ProposalCard
                  key={i}
                  proposal={p}
                  index={i}
                  checked={checked[i]}
                  onToggle={toggleChecked}
                  onChange={handleChange}
                />
              ))}

              <div style={{ paddingTop:'8px', borderTop:'1px solid rgba(200,146,42,0.15)',
                display:'flex', alignItems:'center', gap:'16px' }}>
                <button onClick={saveSelected} disabled={saving || selectedCount === 0}
                  style={{ ...sc, fontSize:'14px', letterSpacing:'0.16em',
                    padding:'13px 32px', borderRadius:'40px', border:'none',
                    background: saving || selectedCount === 0
                      ? 'rgba(200,146,42,0.30)' : '#C8922A',
                    color:'#FFFFFF', cursor: saving || selectedCount === 0 ? 'not-allowed' : 'pointer' }}>
                  {saving
                    ? 'Saving...'
                    : `Place ${selectedCount} selected →`}
                </button>
                <span style={{ ...body, fontSize:'13px', color:'rgba(15,21,35,0.50)' }}>
                  Saves directly as approved curated actors.
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── NOMINATIONS TAB ─────────────────────────────────────────

// ── PLACE TAB ─────────────────────────────────────────────────

const TIER_CONFIG = {
  pattern_instance: { label: 'Pattern instance', color: '#8A3030', bg: 'rgba(138,48,48,0.08)', border: 'rgba(138,48,48,0.25)' },
  contested:        { label: 'Contested',         color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.30)' },
  qualified:        { label: 'Qualified',          color: '#A8721A', bg: 'rgba(168,114,26,0.08)', border: 'rgba(168,114,26,0.30)' },
  exemplar:         { label: 'Exemplar',            color: '#6A4A10', bg: 'rgba(106,74,16,0.10)', border: 'rgba(106,74,16,0.35)' },
}

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier]
  if (!cfg) return null
  return (
    <span style={{
      fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '12px', letterSpacing: '0.12em',
      padding: '3px 10px', borderRadius: '40px',
      border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
    </span>
  )
}

function SignalPill({ label, variant }) {
  const colors = {
    green: { color: '#2A6B3A', bg: 'rgba(42,107,58,0.08)', border: 'rgba(42,107,58,0.25)' },
    amber: { color: '#8A6020', bg: 'rgba(200,146,42,0.08)', border: 'rgba(200,146,42,0.20)' },
    blue:  { color: '#2A4A8A', bg: 'rgba(42,74,138,0.08)', border: 'rgba(42,74,138,0.25)' },
  }
  const c = colors[variant] || colors.amber
  return (
    <span style={{
      fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '12px', letterSpacing: '0.10em',
      padding: '2px 9px', borderRadius: '40px',
      border: `1px solid ${c.border}`, color: c.color, background: c.bg,
      display: 'inline-block', margin: '2px',
    }}>
      {label}
    </span>
  )
}

function PlaceTab({ toast }) {
  const [actors, setActors]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('pending')
  const [scoreEdits, setScoreEdits] = useState({})

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('nextus_actors')
      .select('*')
      .eq('seeded_by', 'community')
      .not('alignment_reasoning', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)

    let results = data || []
    if (filter === 'pending')   results = results.filter(a => a.vetting_status === 'nominated')
    if (filter === 'qualified') results = results.filter(a => ['qualified', 'exemplar'].includes(a.placement_tier) && a.seeded_by === 'nextus')
    if (filter === 'contested') results = results.filter(a => ['contested', 'pattern_instance'].includes(a.placement_tier))
    setActors(results)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  function tierFromScore(s) {
    if (s <= 4) return 'pattern_instance'
    if (s <= 6) return 'contested'
    if (s <= 8) return 'qualified'
    return 'exemplar'
  }

  async function approve(actor) {
    const rawScore = scoreEdits[actor.id]
    const score    = rawScore !== undefined ? parseFloat(rawScore) : actor.alignment_score
    const tier     = tierFromScore(score ?? 7)

    const { error } = await supabase.from('nextus_actors').update({
      seeded_by:       'nextus',
      vetting_status:  'approved',
      alignment_score: score ?? actor.alignment_score,
      placement_tier:  tier,
    }).eq('id', actor.id)

    if (error) { toast('Error approving'); return }
    toast(`${actor.name} approved — ${tier}`)
    load()
  }

  async function contest(actor) {
    const { error } = await supabase.from('nextus_actors').update({
      placement_tier: 'contested',
    }).eq('id', actor.id)
    if (error) { toast('Error'); return }
    toast(`${actor.name} moved to contested`)
    load()
  }

  async function reject(actor) {
    const reason = window.prompt(`Reason for rejecting "${actor.name}" (optional):`)
    if (reason === null) return
    const { error } = await supabase.from('nextus_actors').update({
      vetting_status: 'rejected',
      data_source: actor.data_source
        ? actor.data_source + (reason ? ` | Rejected: ${reason}` : ' | Rejected')
        : reason ? `Rejected: ${reason}` : 'Rejected',
    }).eq('id', actor.id)
    if (error) { toast('Error rejecting'); return }
    toast(`${actor.name} rejected`)
    load()
  }

  const trackLabel = t => ({ planet: 'Planet', self: 'Self', both: 'Planet + Self' })[t] || t

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[['pending','Pending'], ['qualified','Qualified'], ['contested','Contested'], ['all','All']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'} onClick={() => setFilter(val)}>
            {label}
          </Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'pending' && (
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '14px',
          color: 'rgba(15,21,35,0.55)', marginBottom: '20px', lineHeight: 1.6, maxWidth: '560px' }}>
          Review each placement. The AI score is a draft — adjust before approving.
          Approve to promote to the map. Contest to hold in the contested layer. Reject to remove.
        </div>
      )}

      {loading && <p style={{ fontFamily: "'Lora', Georgia, serif", color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && actors.length === 0 && (
        <p style={{ fontFamily: "'Lora', Georgia, serif", color: 'rgba(15,21,35,0.55)' }}>
          No {filter === 'all' ? '' : filter} placements.
        </p>
      )}

      {actors.map(a => {
        const reasoning = a.alignment_reasoning || {}
        const hal       = reasoning.hal_signals || []
        const sfp       = reasoning.sfp_patterns || []
        const scoreEdit = scoreEdits[a.id]

        return (
          <Card key={a.id} style={{ borderLeft: '3px solid rgba(200,146,42,0.40)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: '16px' }}>

              {/* Left: all content */}
              <div style={{ flex: 1, minWidth: 0 }}>

                {/* Name + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px',
                  marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '18px', color: '#0F1523' }}>
                    {a.name}
                  </span>
                  {a.type    && <Badge label={a.type} />}
                  {a.scale   && <Badge label={a.scale} color="rgba(15,21,35,0.55)" />}
                  {a.track   && <SignalPill label={trackLabel(a.track)} variant="blue" />}
                  {a.placement_tier && <TierBadge tier={a.placement_tier} />}
                </div>

                {/* Score row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '36px',
                      fontWeight: 700, color: '#0F1523', lineHeight: 1 }}>
                      {a.alignment_score ?? '—'}
                    </span>
                    <span style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                      fontSize: '14px', color: 'rgba(15,21,35,0.40)' }}>
                      /10
                    </span>
                  </div>
                  {filter === 'pending' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                        fontSize: '12px', letterSpacing: '0.12em', color: 'rgba(15,21,35,0.55)' }}>
                        Adjust:
                      </span>
                      <Input
                        type="number"
                        value={scoreEdit ?? ''}
                        onChange={v => setScoreEdits(e => ({ ...e, [a.id]: v }))}
                        placeholder={String(a.alignment_score ?? '')}
                        style={{ width: '70px', padding: '5px 10px', fontSize: '14px' }}
                      />
                      <span style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                        fontSize: '12px', letterSpacing: '0.10em', color: 'rgba(15,21,35,0.50)' }}>
                        → {tierFromScore(scoreEdit !== undefined && scoreEdit !== '' ? parseFloat(scoreEdit) : (a.alignment_score ?? 7))}
                      </span>
                    </div>
                  )}
                  {reasoning.confidence !== undefined && (
                    <span style={{ fontFamily: "'Lora', Georgia, serif",
                      fontSize: '13px', color: 'rgba(15,21,35,0.50)' }}>
                      {reasoning.confidence}% confidence
                    </span>
                  )}
                </div>

                {/* Score reasoning */}
                {reasoning.score_reasoning && (
                  <div style={{ borderLeft: '2px solid rgba(200,146,42,0.25)', paddingLeft: '12px', marginBottom: '12px' }}>
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '14px',
                      color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>
                      {reasoning.score_reasoning}
                    </p>
                  </div>
                )}

                {/* HAL signals */}
                {hal.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '11px',
                      letterSpacing: '0.14em', color: '#2A6B3A', marginBottom: '6px' }}>
                      HAL conditions demonstrated
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {hal.map(s => <SignalPill key={s} label={s} variant="green" />)}
                    </div>
                  </div>
                )}

                {/* SFP patterns */}
                {sfp.length > 0 && (
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '11px',
                      letterSpacing: '0.14em', color: '#8A6020', marginBottom: '6px' }}>
                      Structural Failure Patterns active
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {sfp.map(s => <SignalPill key={s} label={s} variant="amber" />)}
                    </div>
                  </div>
                )}

                {/* Confidence note */}
                {reasoning.confidence_note && (
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '13px',
                    color: 'rgba(15,21,35,0.50)', lineHeight: 1.55, marginBottom: '8px' }}>
                    {reasoning.confidence_note}
                  </p>
                )}

                {/* Description */}
                {a.description && (
                  <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.15)',
                    borderRadius: '8px', padding: '10px 13px', marginBottom: '8px' }}>
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '14px',
                      color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>
                      {a.description}
                    </p>
                  </div>
                )}

                {/* Impact summary */}
                {a.impact_summary && (
                  <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '14px',
                    color: 'rgba(15,21,35,0.65)', lineHeight: 1.65, marginBottom: '8px' }}>
                    {a.impact_summary}
                  </p>
                )}

                {/* Curator notes */}
                {reasoning.curator_notes && (
                  <div style={{ background: 'rgba(42,74,138,0.04)', border: '1px solid rgba(42,74,138,0.15)',
                    borderRadius: '8px', padding: '10px 13px', marginBottom: '8px' }}>
                    <p style={{ fontFamily: "'Cormorant SC', Georgia, serif", fontSize: '11px',
                      letterSpacing: '0.14em', color: '#2A4A8A', marginBottom: '4px' }}>
                      Curator notes
                    </p>
                    <p style={{ fontFamily: "'Lora', Georgia, serif", fontSize: '14px',
                      color: 'rgba(15,21,35,0.72)', lineHeight: 1.65, margin: 0 }}>
                      {reasoning.curator_notes}
                    </p>
                  </div>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {a.location_name && (
                    <span style={{ fontFamily: "'Lora', Georgia, serif",
                      fontSize: '13px', color: 'rgba(15,21,35,0.50)' }}>
                      {a.location_name}
                    </span>
                  )}
                  {a.website && (
                    <a href={a.website} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                        fontSize: '12px', letterSpacing: '0.12em', color: '#A8721A' }}>
                      {a.website}
                    </a>
                  )}
                  {a.nominator_email && (
                    <span style={{ fontFamily: "'Lora', Georgia, serif",
                      fontSize: '13px', color: 'rgba(15,21,35,0.50)' }}>
                      {a.nominator_email}
                    </span>
                  )}
                  <span style={{ fontFamily: "'Lora', Georgia, serif",
                    fontSize: '13px', color: 'rgba(15,21,35,0.50)' }}>
                    {a.data_source} · {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Right: actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                {filter === 'pending' && (
                  <>
                    <Btn small onClick={() => approve(a)}>Approve →</Btn>
                    <Btn small variant="ghost" onClick={() => contest(a)}>Contest</Btn>
                    <Btn small variant="danger" onClick={() => reject(a)}>Reject</Btn>
                  </>
                )}
                {(filter === 'qualified' || filter === 'all') && a.seeded_by === 'nextus' && (
                  <a href={'/nextus/actors/' + a.id} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'Cormorant SC', Georgia, serif",
                      fontSize: '12px', letterSpacing: '0.12em', color: '#A8721A' }}>
                    View live →
                  </a>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}


function NominationsTab({ toast }) {
  const [nominations, setNominations] = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('nominated')

  async function load() {
    setLoading(true)
    let q = supabase.from('nextus_actors').select('*').eq('seeded_by', 'community').order('created_at', { ascending: false }).limit(100)
    const { data } = await q
    let results = data || []
    if (filter === 'nominated') results = results.filter(a => !a.claimed && !a.verified && a.vetting_status !== 'rejected')
    if (filter === 'approved')  results = results.filter(a => a.claimed || a.verified)
    if (filter === 'rejected')  results = results.filter(a => a.vetting_status === 'rejected')
    setNominations(results)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  async function approve(actor) {
    // Mark as winning = false, claimed = false (still needs owner to claim)
    // Visible to public — the vetting is done
    const { error } = await supabase.from('nextus_actors').update({
      seeded_by:      'nextus',    // promote to curated
      vetting_status: 'approved',  // flip so public directory picks it up
      data_source:    actor.data_source,
    }).eq('id', actor.id)
    if (error) { toast('Error approving'); return }
    toast(`${actor.name} approved and now live`)
    load()
  }

  async function reject(actor) {
    const reason = window.prompt(`Reason for rejecting "${actor.name}" (optional):`)
    if (reason === null) return
    const { error } = await supabase.from('nextus_actors').update({
      vetting_status: 'rejected',
      data_source: actor.data_source
        ? actor.data_source + (reason ? ` | Rejected: ${reason}` : ' | Rejected')
        : reason ? `Rejected: ${reason}` : 'Rejected',
    }).eq('id', actor.id)
    if (error) { toast('Error rejecting'); return }
    toast(`${actor.name} rejected`)
    load()
  }

  const domainLabel = id => ({ 'human-being':'Human Being','society':'Society','nature':'Nature','technology':'Technology','finance-economy':'Finance & Economy','legacy':'Legacy','vision':'Vision' })[id] || id

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[['nominated','Pending'], ['approved','Approved'], ['rejected','Rejected']].map(([val, label]) => (
          <Btn key={val} small variant={filter === val ? 'primary' : 'ghost'} onClick={() => setFilter(val)}>{label}</Btn>
        ))}
        <Btn small variant="ghost" onClick={load}>Refresh</Btn>
      </div>

      {filter === 'nominated' && (
        <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '20px', lineHeight: 1.6, maxWidth: '560px' }}>
          Review each nomination. Approve if the work is genuinely aimed at the Horizon Goal for their domain and scale, and the nominator's description is honest. Reject if the fit isn't right.
        </div>
      )}

      {loading && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>Loading...</p>}
      {!loading && nominations.length === 0 && <p style={{ ...body, color: 'rgba(15,21,35,0.55)' }}>No {filter} nominations.</p>}

      {nominations.map(a => (
        <Card key={a.id} style={{ borderLeft: '3px solid rgba(200,146,42,0.40)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ ...body, fontSize: '18px', color: '#0F1523' }}>{a.name}</span>
                <Badge label={a.type} />
                {a.scale && <Badge label={a.scale} color="rgba(15,21,35,0.55)" />}
                {a.domain_id && <Badge label={domainLabel(a.domain_id)} color="#2A4A8A" />}
              </div>
              {a.location_name && <div style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.55)', marginBottom: '6px' }}>{a.location_name}</div>}
              {a.website && <div style={{ marginBottom: '8px' }}><a href={a.website} target="_blank" rel="noopener noreferrer" style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold }}>{a.website}</a></div>}
              {a.description && (
                <div style={{ background: 'rgba(200,146,42,0.04)', border: '1px solid rgba(200,146,42,0.18)', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' }}>
                  <p style={{ ...sc, fontSize: '11px', letterSpacing: '0.14em', color: gold, marginBottom: '6px' }}>Why they belong (nominator's words)</p>
                  <p style={{ ...body, fontSize: '14px', color: 'rgba(15,21,35,0.72)', lineHeight: 1.7, margin: 0 }}>{a.description}</p>
                </div>
              )}
              {a.data_source && <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Source: {a.data_source}</p>}
              <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Submitted: {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            {filter === 'nominated' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <Btn small onClick={() => approve(a)}>Approve →</Btn>
                <Btn small variant="danger" onClick={() => reject(a)}>Reject</Btn>
              </div>
            )}
            {filter === 'approved' && (
              <div style={{ flexShrink: 0 }}>
                <a href={'/nextus/actors/' + a.id} target="_blank" rel="noopener noreferrer" style={{ ...sc, fontSize: '12px', letterSpacing: '0.12em', color: gold }}>View live →</a>
              </div>
            )}
            {filter === 'rejected' && (
              <div style={{ flexShrink: 0 }}>
                <Badge label="rejected" color="#8A3030" />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}


// ── MAIN PAGE ─────────────────────────────────────────────────

export function AdminConsolePage() {
  const { user, loading } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('Platform')
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg) => setToast(msg), [])

  useEffect(() => {
    if (!loading && (!user || !isFounder(user))) {
      navigate('/')
    }
  }, [user, loading, navigate])

  if (loading || !user || !isFounder(user)) {
    return <div className="loading" />
  }

  return (
    <div style={{ background: bg, minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '96px 40px 120px' }}>
        <Eyebrow>Admin</Eyebrow>
        <h1 style={{ ...body, fontSize: 'clamp(32px,4vw,48px)', fontWeight: 300,
          color: '#0F1523', marginBottom: '8px', lineHeight: 1.08 }}>
          Console
        </h1>
        <p style={{ ...body, fontSize: '16px', color: 'rgba(15,21,35,0.55)',
          marginBottom: '48px' }}>
          Platform health, actors, domains, needs, contributions, waitlist, access.
        </p>

        <TabBar active={tab} setActive={setTab} />

        {tab === 'Now'           && <NowTab />}
        {tab === 'Platform'     && <PlatformTab />}
        {tab === 'Actors'       && <ActorsTab       toast={showToast} />}
        {tab === 'Extract'      && <ExtractTab      toast={showToast} />}
        {tab === 'Place'        && <PlaceTab         toast={showToast} />}
        {tab === 'Nominations'  && <NominationsTab  toast={showToast} />}
        {tab === 'Domain Data'  && <DomainDataTab   toast={showToast} />}
        {tab === 'Subdomains'   && <SubdomainsTab   toast={showToast} />}
        {tab === 'Needs'        && <NeedsTab        toast={showToast} />}
        {tab === 'Contributions'&& <ContributionsTab toast={showToast} />}
        {tab === 'Waitlist'     && <WaitlistTab     toast={showToast} />}
        {tab === 'Groups'       && <GroupsTab       toast={showToast} />}
        {tab === 'Members'      && <MembersTab      toast={showToast} />}
        {tab === 'Entitlements' && <EntitlementsTab toast={showToast} />}
        {tab === 'Users'        && <UsersTab        toast={showToast} />}
        {tab === 'Grants'       && <GrantsTab />}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
