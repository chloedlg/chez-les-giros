'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Types ──────────────────────────────────────────────
type Member = { id: string; name: string; is_mom: boolean; is_active: boolean }
type DinnerStatus = 'oui' | 'non' | 'assiette'
type DinnerResponse = { id: string; member_id: string; date: string; status: DinnerStatus; arrival_time: string | null }
type Chore = { id: string; name: string; assigned_to_id: string | null; is_done: boolean; created_at: string }
type ShoppingItem = { id: string; name: string; added_by_id: string | null; is_done: boolean; created_at: string; image_url: string | null }
type CorseTask = { id: string; name: string; category: 'ouvrir' | 'fermer'; is_done: boolean; sort_order: number }
type TabId = 'soir' | 'corvees' | 'courses' | 'corse' | 'poubelles'

// ── Colors ─────────────────────────────────────────────
const C = {
  primary: '#3563D4',
  primaryLight: '#E8EFFD',
  bg: '#F5F8FF',
  card: '#FFFFFF',
  border: '#D0DCF5',
  text: '#1A2240',
  muted: '#6B7BA4',
  green: '#4A8C6F',
  greenLight: '#E0F0E8',
  red: '#C0392B',
  redLight: '#FDEAEA',
  orange: '#E67E22',
  orangeLight: '#FEF3E2',
  purple: '#5B6EC7',
  purpleLight: '#ECEFFE',
  yellow: '#F5C518',
  yellowLight: '#FEF9E7',
  brown: '#8B5E3C',
  brownLight: '#F5EDE4',
}

function today() {
  return new Date().toISOString().split('T')[0]
}

// ── Main App ───────────────────────────────────────────
export default function Home() {
  const [members, setMembers] = useState<Member[]>([])
  const [dinnerResponses, setDinnerResponses] = useState<DinnerResponse[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [corseTasks, setCorseTasks] = useState<CorseTask[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('soir')
  const [showIdentity, setShowIdentity] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  // Load identity from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('giros_member_id')
    if (saved) {
      supabase.from('members').select('*').eq('id', saved).single().then(({ data }) => {
        if (data) setCurrentMember(data)
        else setShowIdentity(true)
      })
    } else {
      setShowIdentity(true)
    }
  }, [])

  // Load data
  useEffect(() => {
    supabase.from('members').select('*').order('name').then(({ data }) => data && setMembers(data))
    supabase.from('dinner_responses').select('*').eq('date', today()).then(({ data }) => data && setDinnerResponses(data))
    supabase.from('chores').select('*').order('created_at').then(({ data }) => data && setChores(data))
    supabase.from('shopping_items').select('*').order('created_at').then(({ data }) => data && setShoppingItems(data))
    supabase.from('corse_tasks').select('*').order('sort_order').then(({ data }) => data && setCorseTasks(data))
  }, [])

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase.channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => {
        supabase.from('members').select('*').order('name').then(({ data }) => data && setMembers(data))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dinner_responses' }, () => {
        supabase.from('dinner_responses').select('*').eq('date', today()).then(({ data }) => data && setDinnerResponses(data))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, () => {
        supabase.from('chores').select('*').order('created_at').then(({ data }) => data && setChores(data))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
        supabase.from('shopping_items').select('*').order('created_at').then(({ data }) => data && setShoppingItems(data))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'corse_tasks' }, () => {
        supabase.from('corse_tasks').select('*').order('sort_order').then(({ data }) => data && setCorseTasks(data))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // ── Members actions ────────────────────────────────────
  async function toggleMemberActive(member: Member) {
    const newValue = !member.is_active
    // Optimistic update — change UI immediately
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: newValue } : m))
    const { error } = await supabase.from('members').update({ is_active: newValue }).eq('id', member.id)
    if (error) {
      // Revert on error
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: member.is_active } : m))
      alert('Erreur : ' + error.message)
    }
  }

  // ── Dinner actions ─────────────────────────────────────
  async function setDinnerStatus(status: DinnerStatus, arrivalTime?: string) {
    if (!currentMember) return
    const existing = dinnerResponses.find(r => r.member_id === currentMember.id)
    if (existing) {
      await supabase.from('dinner_responses').update({ status, arrival_time: arrivalTime || null }).eq('id', existing.id)
    } else {
      await supabase.from('dinner_responses').insert({ member_id: currentMember.id, date: today(), status, arrival_time: arrivalTime || null })
    }
  }

  // ── Chores actions ─────────────────────────────────────
  async function addChore(name: string) {
    if (!name.trim()) return
    await supabase.from('chores').insert({ name: name.trim() })
  }
  async function claimChore(chore: Chore) {
    if (!currentMember) return
    await supabase.from('chores').update({ assigned_to_id: currentMember.id }).eq('id', chore.id)
  }
  async function unclaimChore(chore: Chore) {
    await supabase.from('chores').update({ assigned_to_id: null }).eq('id', chore.id)
  }
  async function doneChore(chore: Chore) {
    await supabase.from('chores').update({ is_done: true }).eq('id', chore.id)
  }
  async function deleteChore(chore: Chore) {
    await supabase.from('chores').delete().eq('id', chore.id)
  }

  // ── Shopping actions ───────────────────────────────────
  async function addShoppingItem(name: string) {
    if (!name.trim() || !currentMember) return
    await supabase.from('shopping_items').insert({ name: name.trim(), added_by_id: currentMember.id })
  }
  async function toggleShoppingItem(item: ShoppingItem) {
    await supabase.from('shopping_items').update({ is_done: !item.is_done }).eq('id', item.id)
  }
  async function deleteShoppingItem(item: ShoppingItem) {
    await supabase.from('shopping_items').delete().eq('id', item.id)
  }

  // ── Photo upload ───────────────────────────────────────
  async function onAddPhoto(base64: string) {
    if (!currentMember) return
    try {
      const res = await fetch(base64)
      const blob = await res.blob()
      const fileName = `liste-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('shopping-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('shopping-photos').getPublicUrl(fileName)
      await supabase.from('shopping_items').insert({
        name: '📷 Photo de liste',
        image_url: urlData.publicUrl,
        added_by_id: currentMember.id,
      })
    } catch (e) {
      alert('Impossible de sauvegarder la photo. Vérifie ta connexion.')
    }
  }

  // ── Corse actions ──────────────────────────────────────
  async function toggleCorseTask(task: CorseTask) {
    await supabase.from('corse_tasks').update({ is_done: !task.is_done }).eq('id', task.id)
  }
  async function addCorseTask(name: string, category: 'ouvrir' | 'fermer') {
    if (!name.trim()) return
    const maxOrder = Math.max(0, ...corseTasks.filter(t => t.category === category).map(t => t.sort_order))
    await supabase.from('corse_tasks').insert({ name: name.trim(), category, sort_order: maxOrder + 1 })
  }
  async function deleteCorseTask(task: CorseTask) {
    await supabase.from('corse_tasks').delete().eq('id', task.id)
  }
  async function resetCorse(category: 'ouvrir' | 'fermer') {
    const ids = corseTasks.filter(t => t.category === category && t.is_done).map(t => t.id)
    if (ids.length > 0) await supabase.from('corse_tasks').update({ is_done: false }).in('id', ids)
  }

  const activeMembers = members.filter(m => m.is_active)

  if (showIdentity) {
    return (
      <IdentityModal
        members={members}
        onSelect={(m) => {
          setCurrentMember(m)
          localStorage.setItem('giros_member_id', m.id)
          setShowIdentity(false)
        }}
      />
    )
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ background: C.primary, padding: '16px 20px 12px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 480, margin: '0 auto' }}>
          <div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>🏠 Chez les Giros</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
              {currentMember ? `Connecté·e en tant que ${currentMember.name}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowMembers(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 16 }}
            >👥</button>
            <button
              onClick={() => setShowIdentity(true)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 13 }}
            >Changer</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 62, zIndex: 99, overflowX: 'auto' }}>
        <div style={{ display: 'flex', maxWidth: 480, margin: '0 auto', minWidth: 0 }}>
          {([
            { id: 'soir', label: '🍽️ Ce soir' },
            { id: 'corvees', label: '🧹 Tâches' },
            { id: 'courses', label: '🛒 Courses' },
            { id: 'corse', label: '🏝️ Corse' },
            { id: 'poubelles', label: '🗑️ Poubelles' },
          ] as { id: TabId; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 4px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${C.primary}` : '3px solid transparent',
                color: activeTab === tab.id ? C.primary : C.muted,
                fontWeight: activeTab === tab.id ? 700 : 400,
                cursor: 'pointer',
                fontSize: 11,
                whiteSpace: 'nowrap',
              }}
            >{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
        {activeTab === 'soir' && (
          <SoirTab
            members={activeMembers}
            dinnerResponses={dinnerResponses}
            currentMember={currentMember}
            onSetStatus={setDinnerStatus}
          />
        )}
        {activeTab === 'corvees' && (
          <CorveesTab
            members={members}
            chores={chores}
            currentMember={currentMember}
            onAdd={addChore}
            onClaim={claimChore}
            onUnclaim={unclaimChore}
            onDone={doneChore}
            onDelete={deleteChore}
          />
        )}
        {activeTab === 'courses' && (
          <CoursesTab
            members={members}
            items={shoppingItems}
            currentMember={currentMember}
            onAdd={addShoppingItem}
            onToggle={toggleShoppingItem}
            onDelete={deleteShoppingItem}
            onAddPhoto={onAddPhoto}
          />
        )}
        {activeTab === 'corse' && (
          <CorseTab
            tasks={corseTasks}
            onToggle={toggleCorseTask}
            onAdd={addCorseTask}
            onDelete={deleteCorseTask}
            onReset={resetCorse}
          />
        )}
        {activeTab === 'poubelles' && <PoubellsTab />}
      </div>

      {/* Members modal */}
      {showMembers && (
        <MembersModal
          members={members}
          onToggle={toggleMemberActive}
          onClose={() => setShowMembers(false)}
        />
      )}
    </div>
  )
}

// ── Identity Modal ─────────────────────────────────────
function IdentityModal({ members, onSelect }: { members: Member[]; onSelect: (m: Member) => void }) {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: C.text, marginBottom: 8 }}>Chez les Giros</div>
      <div style={{ fontSize: 15, color: C.muted, marginBottom: 32 }}>Qui es-tu ?</div>
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.filter(m => m.is_active).map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m)}
            style={{
              background: C.card,
              border: `2px solid ${C.border}`,
              borderRadius: 14,
              padding: '16px 20px',
              fontSize: 17,
              fontWeight: 600,
              color: C.text,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
          >
            {m.is_mom ? '👑 ' : ''}{m.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Members Modal ──────────────────────────────────────
function MembersModal({ members, onToggle, onClose }: {
  members: Member[]
  onToggle: (m: Member) => void
  onClose: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, margin: '0 auto', padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>👥 Membres de la famille</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: C.muted }}>×</button>
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>
          Mets en pause les membres qui sont absents (ils n'apparaîtront plus dans le dîner du soir).
        </div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: m.is_active ? C.primaryLight : '#F0F0F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, color: m.is_active ? C.primary : C.muted,
              }}>
                {m.is_mom ? '👑' : m.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: m.is_active ? C.text : C.muted }}>{m.name}</div>
                <div style={{ fontSize: 12, color: m.is_active ? C.green : C.muted }}>
                  {m.is_active ? '✓ Actif·ve' : '⏸ En pause'}
                </div>
              </div>
            </div>
            <button
              onClick={() => onToggle(m)}
              style={{
                background: m.is_active ? C.redLight : C.greenLight,
                color: m.is_active ? C.red : C.green,
                border: 'none',
                borderRadius: 10,
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {m.is_active ? 'Mettre en pause' : 'Réactiver'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ce Soir Tab ────────────────────────────────────────
function SoirTab({ members, dinnerResponses, currentMember, onSetStatus }: {
  members: Member[]
  dinnerResponses: DinnerResponse[]
  currentMember: Member | null
  onSetStatus: (status: DinnerStatus, arrivalTime?: string) => void
}) {
  const [arrivalTime, setArrivalTime] = useState('')
  const myResponse = currentMember ? dinnerResponses.find(r => r.member_id === currentMember.id) : null

  const coming = dinnerResponses.filter(r => r.status === 'oui')
  const plate = dinnerResponses.filter(r => r.status === 'assiette')
  const notComing = dinnerResponses.filter(r => r.status === 'non')

  const getName = (id: string) => members.find(m => m.id === id)?.name || '?'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary card */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.primary }}>📋 Résumé du jour</div>
        {coming.length === 0 && plate.length === 0 && notComing.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 14 }}>Personne n'a encore répondu pour ce soir.</div>
        ) : (
          <>
            {coming.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: C.green, fontWeight: 600 }}>✓ Présent·e·s ({coming.length}) : </span>
                <span style={{ fontSize: 14 }}>{coming.map(r => {
                  const t = r.arrival_time ? ` (${r.arrival_time})` : ''
                  return getName(r.member_id) + t
                }).join(', ')}</span>
              </div>
            )}
            {plate.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: C.orange, fontWeight: 600 }}>🍽️ Garde une assiette ({plate.length}) : </span>
                <span style={{ fontSize: 14 }}>{plate.map(r => {
                  const t = r.arrival_time ? ` (${r.arrival_time})` : ''
                  return getName(r.member_id) + t
                }).join(', ')}</span>
              </div>
            )}
            {notComing.length > 0 && (
              <div>
                <span style={{ color: C.red, fontWeight: 600 }}>✗ Absent·e·s ({notComing.length}) : </span>
                <span style={{ fontSize: 14 }}>{notComing.map(r => getName(r.member_id)).join(', ')}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* My RSVP */}
      {currentMember && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Ta réponse pour ce soir</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>
            {myResponse ? `Tu as répondu : ${myResponse.status === 'oui' ? '✓ Présent·e' : myResponse.status === 'non' ? '✗ Absent·e' : '🍽️ Garde une assiette'}${myResponse.arrival_time ? ` · ${myResponse.arrival_time}` : ''}` : 'Tu n\'as pas encore répondu.'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {([
              { status: 'oui' as DinnerStatus, label: '✓ Oui', bg: C.greenLight, color: C.green },
              { status: 'non' as DinnerStatus, label: '✗ Non', bg: C.redLight, color: C.red },
              { status: 'assiette' as DinnerStatus, label: '🍽️ Garde une assiette', bg: C.orangeLight, color: C.orange },
            ]).map(opt => (
              <button
                key={opt.status}
                onClick={() => onSetStatus(opt.status, arrivalTime || undefined)}
                style={{
                  background: myResponse?.status === opt.status ? opt.color : opt.bg,
                  color: myResponse?.status === opt.status ? 'white' : opt.color,
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >{opt.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="time"
              value={arrivalTime}
              onChange={e => setArrivalTime(e.target.value)}
              placeholder="Heure d'arrivée (optionnel)"
              style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, color: C.text }}
            />
            {arrivalTime && myResponse && (
              <button
                onClick={() => onSetStatus(myResponse.status, arrivalTime)}
                style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >Mettre à jour</button>
            )}
          </div>
        </div>
      )}

      {/* Family list */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Toute la famille</div>
        {members.map(member => {
          const resp = dinnerResponses.find(r => r.member_id === member.id)
          return (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 600 }}>{member.name}</div>
              <div style={{ fontSize: 13, color: resp ? (resp.status === 'oui' ? C.green : resp.status === 'non' ? C.red : C.orange) : C.muted }}>
                {resp
                  ? (resp.status === 'oui' ? `✓ Présent·e${resp.arrival_time ? ` · ${resp.arrival_time}` : ''}` : resp.status === 'non' ? '✗ Absent·e' : `🍽️ Assiette${resp.arrival_time ? ` · ${resp.arrival_time}` : ''}`)
                  : '…'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Tâches Tab ─────────────────────────────────────────
function CorveesTab({ members, chores, currentMember, onAdd, onClaim, onUnclaim, onDone, onDelete }: {
  members: Member[]
  chores: Chore[]
  currentMember: Member | null
  onAdd: (name: string) => void
  onClaim: (c: Chore) => void
  onUnclaim: (c: Chore) => void
  onDone: (c: Chore) => void
  onDelete: (c: Chore) => void
}) {
  const [newChore, setNewChore] = useState('')
  const getName = (id: string | null) => id ? (members.find(m => m.id === id)?.name || '?') : null
  const pending = chores.filter(c => !c.is_done)
  const done = chores.filter(c => c.is_done)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add chore */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newChore}
            onChange={e => setNewChore(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onAdd(newChore); setNewChore('') } }}
            placeholder="Ajouter une tâche…"
            style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14 }}
          />
          <button
            onClick={() => { onAdd(newChore); setNewChore('') }}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
          >+</button>
        </div>
      </div>

      {/* Pending chores */}
      {pending.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>À faire ({pending.length})</div>
          {pending.map(chore => {
            const assignee = getName(chore.assigned_to_id)
            const isMine = currentMember && chore.assigned_to_id === currentMember.id
            return (
              <div key={chore.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{chore.name}</div>
                    <div style={{ fontSize: 12, color: assignee ? C.primary : C.muted }}>
                      {assignee ? `👤 ${assignee}` : 'Non assigné'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!chore.assigned_to_id && (
                    <button onClick={() => onClaim(chore)} style={{ background: C.primaryLight, color: C.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Je prends
                    </button>
                  )}
                  {isMine && (
                    <button onClick={() => onUnclaim(chore)} style={{ background: C.redLight, color: C.red, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Abandonner
                    </button>
                  )}
                  {chore.assigned_to_id && (
                    <button onClick={() => onDone(chore)} style={{ background: C.greenLight, color: C.green, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✓ Fait !
                    </button>
                  )}
                  <button onClick={() => onDelete(chore)} style={{ background: '#F5F5F5', color: C.muted, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Done chores */}
      {done.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, opacity: 0.7 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.muted }}>Terminées ({done.length})</div>
          {done.map(chore => (
            <div key={chore.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ textDecoration: 'line-through', color: C.muted }}>{chore.name}</div>
              <div style={{ fontSize: 12, color: C.green }}>✓ {getName(chore.assigned_to_id) || ''}</div>
              <button onClick={() => onDelete(chore)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>Aucune tâche pour l'instant 🎉</div>
      )}
    </div>
  )
}

// ── Courses Tab ────────────────────────────────────────
function CoursesTab({ members, items, currentMember, onAdd, onToggle, onDelete, onAddPhoto }: {
  members: Member[]
  items: ShoppingItem[]
  currentMember: Member | null
  onAdd: (name: string) => void
  onToggle: (i: ShoppingItem) => void
  onDelete: (i: ShoppingItem) => void
  onAddPhoto: (base64: string) => Promise<void>
}) {
  const [newItem, setNewItem] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<string | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const getName = (id: string | null) => id ? (members.find(m => m.id === id)?.name || '?') : null
  const pending = items.filter(i => !i.is_done)
  const done = items.filter(i => i.is_done)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setCapturedImage(base64)
      setOcrLoading(true)
      setOcrResult(null)
      try {
        const formData = new FormData()
        formData.append('base64Image', base64.split(',')[1])
        formData.append('language', 'fre')
        formData.append('isOverlayRequired', 'false')
        formData.append('OCREngine', '2')
        const resp = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { apikey: 'helloworld' },
          body: formData,
        })
        const data = await resp.json()
        const text = data?.ParsedResults?.[0]?.ParsedText || ''
        if (text.trim()) {
          setOcrResult(text.trim())
        } else {
          setOcrResult('')
        }
      } catch {
        setOcrResult('')
      }
      setOcrLoading(false)
    }
    reader.readAsDataURL(file)
  }

  async function addOcrItems() {
    if (!ocrResult || !currentMember) return
    const lines = ocrResult.split('\n').map(l => l.trim()).filter(l => l.length > 1)
    for (const line of lines) {
      await onAdd(line)
    }
    setCapturedImage(null)
    setOcrResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function keepPhoto() {
    if (!capturedImage) return
    await onAddPhoto(capturedImage)
    setCapturedImage(null)
    setOcrResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Add item */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onAdd(newItem); setNewItem('') } }}
            placeholder="Ajouter un article…"
            style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14 }}
          />
          <button
            onClick={() => { onAdd(newItem); setNewItem('') }}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
          >+</button>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          style={{ width: '100%', background: C.primaryLight, color: C.primary, border: `1px dashed ${C.primary}`, borderRadius: 10, padding: '10px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >📷 Photographier une liste manuscrite</button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
      </div>

      {/* OCR preview */}
      {capturedImage && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📷 Photo capturée</div>
          <img src={capturedImage} alt="liste" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 200, objectFit: 'cover' }} />
          {ocrLoading && <div style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>🔍 Analyse de l'écriture en cours…</div>}
          {!ocrLoading && ocrResult !== null && (
            <>
              {ocrResult.length > 0 ? (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Texte reconnu :</div>
                  <div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{ocrResult}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={addOcrItems} style={{ flex: 1, background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer' }}>
                      ✓ Ajouter ces articles
                    </button>
                    <button onClick={keepPhoto} style={{ flex: 1, background: C.primaryLight, color: C.primary, border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                      🖼️ Garder la photo telle quelle
                    </button>
                  </div>
                  <button onClick={() => { setCapturedImage(null); setOcrResult(null) }} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
                    Annuler
                  </button>
                </>
              ) : (
                <>
                  <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>L'écriture n'a pas pu être reconnue. Tu peux garder la photo telle quelle.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={keepPhoto} style={{ flex: 1, background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer' }}>
                      🖼️ Garder la photo telle quelle
                    </button>
                    <button onClick={() => { setCapturedImage(null); setOcrResult(null) }} style={{ background: C.redLight, color: C.red, border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontWeight: 600 }}>
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Pending items */}
      {pending.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>À acheter ({pending.length})</div>
          {pending.map(item => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              {item.image_url ? (
                <div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>📷 Photo de liste — ajoutée par {getName(item.added_by_id) || '?'}</div>
                  <img
                    src={item.image_url}
                    alt="liste"
                    onClick={() => setExpandedPhoto(item.image_url!)}
                    style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover', cursor: 'pointer', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setExpandedPhoto(item.image_url!)} style={{ background: C.primaryLight, color: C.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      🔍 Agrandir
                    </button>
                    <button onClick={() => onToggle(item)} style={{ background: C.greenLight, color: C.green, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      ✓ Vue
                    </button>
                    <button onClick={() => onDelete(item)} style={{ background: C.redLight, color: C.red, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => onToggle(item)}
                    style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.border}`, background: 'none', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {item.added_by_id && <div style={{ fontSize: 11, color: C.muted }}>ajouté par {getName(item.added_by_id)}</div>}
                  </div>
                  <button onClick={() => onDelete(item)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Done items */}
      {done.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, opacity: 0.6 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.muted }}>Achetés ({done.length})</div>
          {done.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, flexShrink: 0 }}>✓</div>
              <div style={{ flex: 1, textDecoration: 'line-through', color: C.muted }}>{item.name}</div>
              <button onClick={() => onDelete(item)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>La liste est vide 🛒</div>
      )}

      {/* Photo fullscreen overlay */}
      {expandedPhoto && (
        <div
          onClick={() => setExpandedPhoto(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <img src={expandedPhoto} alt="liste agrandie" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
          <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 24, borderRadius: '50%', width: 40, height: 40, cursor: 'pointer' }}>×</button>
        </div>
      )}
    </div>
  )
}

// ── Corse Tab ──────────────────────────────────────────
function CorseTab({ tasks, onToggle, onAdd, onDelete, onReset }: {
  tasks: CorseTask[]
  onToggle: (t: CorseTask) => void
  onAdd: (name: string, category: 'ouvrir' | 'fermer') => void
  onDelete: (t: CorseTask) => void
  onReset: (category: 'ouvrir' | 'fermer') => void
}) {
  const [newOuvrir, setNewOuvrir] = useState('')
  const [newFermer, setNewFermer] = useState('')

  const ouvrirTasks = tasks.filter(t => t.category === 'ouvrir')
  const fermerTasks = tasks.filter(t => t.category === 'fermer')

  function ProgressBar({ tasks }: { tasks: CorseTask[] }) {
    const done = tasks.filter(t => t.is_done).length
    const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 4 }}>
          <span>{done}/{tasks.length} faits</span>
          <span>{pct}%</span>
        </div>
        <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
          <div style={{ background: pct === 100 ? C.green : C.primary, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>
    )
  }

  function TaskList({ tasks, category, newVal, setNew }: { tasks: CorseTask[]; category: 'ouvrir' | 'fermer'; newVal: string; setNew: (v: string) => void }) {
    return (
      <>
        <ProgressBar tasks={tasks} />
        {tasks.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <button
              onClick={() => onToggle(task)}
              style={{
                width: 26, height: 26, borderRadius: 6,
                border: `2px solid ${task.is_done ? C.green : C.border}`,
                background: task.is_done ? C.green : 'none',
                color: 'white', cursor: 'pointer', fontSize: 14, flexShrink: 0,
              }}
            >{task.is_done ? '✓' : ''}</button>
            <div style={{ flex: 1, textDecoration: task.is_done ? 'line-through' : 'none', color: task.is_done ? C.muted : C.text }}>
              {task.name}
            </div>
            <button onClick={() => onDelete(task)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={newVal}
            onChange={e => setNew(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onAdd(newVal, category); setNew('') } }}
            placeholder="Ajouter une tâche…"
            style={{ flex: 1, padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 13 }}
          />
          <button
            onClick={() => { onAdd(newVal, category); setNew('') }}
            style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 600, cursor: 'pointer' }}
          >+</button>
        </div>
        {tasks.some(t => t.is_done) && (
          <button
            onClick={() => onReset(category)}
            style={{ width: '100%', marginTop: 8, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px', color: C.muted, fontSize: 13, cursor: 'pointer' }}
          >🔄 Réinitialiser les cases cochées</button>
        )}
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: C.primary }}>🌊 Ouverture de la maison</div>
        <TaskList tasks={ouvrirTasks} category="ouvrir" newVal={newOuvrir} setNew={setNewOuvrir} />
      </div>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: C.purple }}>🔒 Fermeture de la maison</div>
        <TaskList tasks={fermerTasks} category="fermer" newVal={newFermer} setNew={setNewFermer} />
      </div>
    </div>
  )
}

// ── Poubelles Tab ──────────────────────────────────────
function PoubellsTab() {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

  const isYellowToday = day === 3 // Wednesday
  const isBrownToday = day === 2 || day === 5 // Tuesday or Friday

  const dayNames = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
  const todayName = dayNames[day]

  function BinCard({ color, emoji, label, days, isToday }: { color: string; lightColor: string; emoji: string; label: string; days: string; isToday: boolean }) {
    return (
      <div style={{
        background: isToday ? color : '#F5F5F5',
        borderRadius: 16,
        padding: 20,
        border: `2px solid ${isToday ? color : C.border}`,
        transition: 'all 0.3s',
      }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>{emoji}</div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, color: isToday ? 'white' : C.text }}>{label}</div>
        <div style={{ textAlign: 'center', fontSize: 13, color: isToday ? 'rgba(255,255,255,0.85)' : C.muted, marginTop: 4 }}>{days}</div>
        {isToday && (
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'white', fontSize: 14 }}>
            🚨 C'est ce soir !
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted }}>Aujourd'hui : <strong style={{ color: C.text }}>{todayName}</strong></div>
        {!isYellowToday && !isBrownToday && (
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Pas de poubelles aujourd'hui 🙂</div>
        )}
      </div>
      <BinCard color={C.yellow} lightColor={C.yellowLight} emoji="🟡" label="Poubelle jaune" days="Chaque mercredi soir" isToday={isYellowToday} />
      <BinCard color={C.brown} lightColor={C.brownLight} emoji="🟤" label="Poubelle marron" days="Mardi et vendredi soirs" isToday={isBrownToday} />
    </div>
  )
}
