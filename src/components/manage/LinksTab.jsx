// src/app/components/manage/LinksTab.jsx
//
// Manages an actor's external links (actor_links) and press mentions
// (actor_press). Both are evidence-layer: anyone-editable in principle,
// but in practice only the owner reaches this UI.

import { useState, useEffect } from 'react'
import { supabase } from '../../../hooks/useSupabase'
import {
  body, sc, gold, dark,
  Label, Hint, Btn, TextInput, SelectInput,
} from '../OrgShared'

const LINK_TYPES = [
  { value: 'website',          label: 'Website' },
  { value: 'podcast_rss',      label: 'Podcast RSS feed' },
  { value: 'podcast_apple',    label: 'Apple Podcasts' },
  { value: 'podcast_spotify',  label: 'Spotify show' },
  { value: 'youtube_channel',  label: 'YouTube channel' },
  { value: 'youtube_video',    label: 'YouTube video' },
  { value: 'vimeo',            label: 'Vimeo' },
  { value: 'substack',         label: 'Substack' },
  { value: 'newsletter',       label: 'Newsletter signup' },
  { value: 'instagram',        label: 'Instagram' },
  { value: 'twitter',          label: 'X / Twitter' },
  { value: 'tiktok',           label: 'TikTok' },
  { value: 'facebook',         label: 'Facebook' },
  { value: 'linkedin',         label: 'LinkedIn' },
  { value: 'medium',           label: 'Medium' },
  { value: 'github',           label: 'GitHub' },
  { value: 'book',             label: 'Book' },
  { value: 'other',            label: 'Other' },
]

// ── Links section ────────────────────────────────────────────

function LinksSection({ actorId, toast }) {
  const [links, setLinks]     = useState([])
  const [loading, setLoading] = useState(true)
  const [newLink, setNewLink] = useState({ link_type: 'website', url: '', label: '' })
  const [saving, setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('actor_links')
      .select('*').eq('actor_id', actorId).order('sort_order')
    setLinks(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [actorId])

  async function addLink() {
    if (!newLink.url.trim()) return
    setSaving(true)
    const { error } = await supabase.from('actor_links').insert({
      actor_id:   actorId,
      link_type:  newLink.link_type,
      url:        newLink.url.trim(),
      label:      newLink.label.trim() || null,
      sort_order: links.length,
    })
    setSaving(false)
    if (error) { toast('Add failed: ' + error.message); return }
    setNewLink({ link_type: 'website', url: '', label: '' })
    toast('Link added')
    load()
  }

  async function deleteLink(id) {
    if (!confirm('Remove this link?')) return
    setSaving(true)
    await supabase.from('actor_links').delete().eq('id', id)
    setSaving(false)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em',
          color: gold, textTransform: 'uppercase' }}>
          Links
        </span>
      </div>

      {/* Add new link form */}
      <div style={{ background: '#FFFFFF',
        border: '1px solid rgba(88,160,138,0.20)',
        borderRadius: '10px', padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '10px' }}>
          <div>
            <Label>Type</Label>
            <SelectInput value={newLink.link_type}
              onChange={v => setNewLink(n => ({ ...n, link_type: v }))}
              options={LINK_TYPES} />
          </div>
          <div>
            <Label>URL</Label>
            <TextInput value={newLink.url}
              onChange={v => setNewLink(n => ({ ...n, url: v }))}
              placeholder="https://..." />
          </div>
        </div>
        <div>
          <Label>Label (optional)</Label>
          <Hint>Override the default label for this link type.</Hint>
          <TextInput value={newLink.label}
            onChange={v => setNewLink(n => ({ ...n, label: v }))}
            placeholder="Leave blank for default" />
        </div>
        <div>
          <Btn onClick={addLink} disabled={saving || !newLink.url.trim()}>
            {saving ? 'Adding...' : 'Add link'}
          </Btn>
        </div>
      </div>

      {/* Existing links */}
      {loading ? (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
      ) : links.length === 0 ? (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
          fontStyle: 'italic', margin: 0 }}>
          No links yet.
        </p>
      ) : (
        links.map(link => {
          const typeLabel = LINK_TYPES.find(t => t.value === link.link_type)?.label || link.link_type
          return (
            <div key={link.id}
              style={{ background: '#FFFFFF',
                border: '1px solid rgba(88,160,138,0.20)',
                borderRadius: '8px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                    color: gold, background: 'rgba(88,160,138,0.06)',
                    padding: '2px 10px', borderRadius: '40px' }}>
                    {typeLabel}
                  </span>
                  {link.label && (
                    <span style={{ ...body, fontSize: '13px', color: dark }}>
                      {link.label}
                    </span>
                  )}
                </div>
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
                    textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', display: 'block' }}>
                  {link.url}
                </a>
              </div>
              <button onClick={() => deleteLink(link.id)} disabled={saving}
                style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                  color: '#8A3030', background: 'none', border: 'none',
                  cursor: 'pointer', flexShrink: 0 }}>
                Remove
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}

// ── Press section ────────────────────────────────────────────

function PressSection({ actorId, toast }) {
  const [press, setPress]     = useState([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState({ publication: '', url: '', title: '' })
  const [saving, setSaving]   = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('actor_press')
      .select('*').eq('actor_id', actorId).order('sort_order')
    setPress(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [actorId])

  async function addItem() {
    if (!newItem.publication.trim()) return
    setSaving(true)
    const { error } = await supabase.from('actor_press').insert({
      actor_id:    actorId,
      publication: newItem.publication.trim(),
      url:         newItem.url.trim() || null,
      title:       newItem.title.trim() || null,
      sort_order:  press.length,
    })
    setSaving(false)
    if (error) { toast('Add failed: ' + error.message); return }
    setNewItem({ publication: '', url: '', title: '' })
    toast('Press mention added')
    load()
  }

  async function deleteItem(id) {
    if (!confirm('Remove this press mention?')) return
    setSaving(true)
    await supabase.from('actor_press').delete().eq('id', id)
    setSaving(false)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <span style={{ ...sc, fontSize: '13px', letterSpacing: '0.18em',
        color: gold, textTransform: 'uppercase' }}>
        Press mentions
      </span>

      {/* Add form */}
      <div style={{ background: '#FFFFFF',
        border: '1px solid rgba(88,160,138,0.20)',
        borderRadius: '10px', padding: '14px 18px',
        display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <Label>Publication</Label>
          <Hint>The name of the publication. Example: BBC, Forbes, Huffington Post.</Hint>
          <TextInput value={newItem.publication}
            onChange={v => setNewItem(n => ({ ...n, publication: v }))}
            placeholder="Publication name" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <Label>URL (optional)</Label>
            <TextInput value={newItem.url}
              onChange={v => setNewItem(n => ({ ...n, url: v }))}
              placeholder="Link to the piece" />
          </div>
          <div>
            <Label>Title (optional)</Label>
            <TextInput value={newItem.title}
              onChange={v => setNewItem(n => ({ ...n, title: v }))}
              placeholder="Article title" />
          </div>
        </div>
        <div>
          <Btn onClick={addItem} disabled={saving || !newItem.publication.trim()}>
            {saving ? 'Adding...' : 'Add press mention'}
          </Btn>
        </div>
      </div>

      {/* Existing */}
      {loading ? (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)' }}>Loading…</p>
      ) : press.length === 0 ? (
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.55)',
          fontStyle: 'italic', margin: 0 }}>
          No press mentions yet.
        </p>
      ) : (
        press.map(item => (
          <div key={item.id}
            style={{ background: '#FFFFFF',
              border: '1px solid rgba(88,160,138,0.20)',
              borderRadius: '8px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...body, fontSize: '14px', color: dark, marginBottom: item.title ? '4px' : 0 }}>
                {item.publication}
              </div>
              {item.title && (
                <div style={{ ...body, fontSize: '13px',
                  color: 'rgba(15,21,35,0.55)', fontStyle: 'italic' }}>
                  {item.title}
                </div>
              )}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  style={{ ...body, fontSize: '13px',
                    color: 'rgba(15,21,35,0.55)', textDecoration: 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', display: 'block', marginTop: '2px' }}>
                  {item.url}
                </a>
              )}
            </div>
            <button onClick={() => deleteItem(item.id)} disabled={saving}
              style={{ ...sc, fontSize: '13px', letterSpacing: '0.12em',
                color: '#8A3030', background: 'none', border: 'none',
                cursor: 'pointer', flexShrink: 0 }}>
              Remove
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ── Main tab component ──────────────────────────────────────

export function LinksTab({ actorId, toast }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <div style={{ background: 'rgba(88,160,138,0.04)',
        border: '1px solid rgba(88,160,138,0.18)',
        borderRadius: '10px', padding: '14px 18px' }}>
        <p style={{ ...body, fontSize: '13px', color: 'rgba(15,21,35,0.65)',
          lineHeight: 1.6, margin: 0 }}>
          Add the platforms where your work lives — your podcast, your Substack,
          your social profiles. These appear on your profile as the Links row
          and as the Press strip.
        </p>
      </div>

      <LinksSection actorId={actorId} toast={toast} />
      <PressSection actorId={actorId} toast={toast} />
    </div>
  )
}
