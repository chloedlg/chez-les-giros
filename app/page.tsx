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
type FamilyEvent = { id: string; title: string; member_id: string; start_date: string; end_date: string; created_at: string }
type TabId = 'presence' | 'agenda' | 'courses' | 'corvees' | 'poubelles' | 'corse'

// ── Colors ─────────────────────────────────────────────
const C = {
  primary: '#3563D4', primaryLight: '#E8EFFD',
  bg: '#F5F8FF', card: '#FFFFFF', border: '#D0DCF5',
  text: '#1A2240', muted: '#6B7BA4',
  green: '#4A8C6F', greenLight: '#E0F0E8',
  red: '#C0392B', redLight: '#FDEAEA',
  orange: '#E67E22', orangeLight: '#FEF3E2',
  purple: '#5B6EC7', purpleLight: '#ECEFFE',
  yellow: '#C9A200', yellowLight: '#FEF9E7',
  brown: '#8B5E3C', brownLight: '#F5EDE4',
}

const MEMBER_PALETTE = ['#3563D4','#E67E22','#4A8C6F','#9B59B6','#C0392B','#16A085','#D35400']

function getMemberColor(members: Member[], memberId: string) {
  const idx = members.findIndex(m => m.id === memberId)
  return MEMBER_PALETTE[idx % MEMBER_PALETTE.length]
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }
function todayStr() { return toDateStr(new Date()) }
function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return toDateStr(d)
}
function formatDay(dateStr: string, short = false) {
  const d = new Date(dateStr + 'T12:00:00')
  const days = short ? ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'] : ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi']
  const months = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}
function formatMonthYear(year: number, month: number) {
  return ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][month] + ' ' + year
}

// ── Corse Section (defined at module level to avoid re-mount on keystroke) ──
function CorseSection({ tasks, category, title, color, onToggle, onAdd, onDelete, onReset }: {
  tasks: CorseTask[]; category: 'ouvrir' | 'fermer'; title: string; color: string
  onToggle: (t: CorseTask) => void; onAdd: (n: string, c: 'ouvrir' | 'fermer') => void
  onDelete: (t: CorseTask) => void; onReset: (c: 'ouvrir' | 'fermer') => void
}) {
  const [newVal, setNewVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const done = tasks.filter(t => t.is_done).length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  function handleAdd() {
    if (!newVal.trim()) return
    onAdd(newVal.trim(), category)
    setNewVal('')
    // Keep focus on input after adding
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color }}>{title}</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, marginBottom: 4 }}>
          <span>{done}/{tasks.length} faits</span><span>{pct}%</span>
        </div>
        <div style={{ background: C.border, borderRadius: 4, height: 6 }}>
          <div style={{ background: pct === 100 ? C.green : C.primary, width: `${pct}%`, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
      </div>
      {tasks.map(task => (
        <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => onToggle(task)} style={{
            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
            border: `2px solid ${task.is_done ? C.green : C.border}`,
            background: task.is_done ? C.green : 'none', color: 'white', cursor: 'pointer', fontSize: 14,
          }}>{task.is_done ? '✓' : ''}</button>
          <div style={{ flex: 1, textDecoration: task.is_done ? 'line-through' : 'none', color: task.is_done ? C.muted : C.text }}>{task.name}</div>
          <button onClick={() => onDelete(task)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <input
          ref={inputRef}
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Ajouter une tâche…"
          style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14 }}
        />
        <button onClick={handleAdd} style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 18 }}>+</button>
      </div>
      {tasks.some(t => t.is_done) && (
        <button onClick={() => onReset(category)} style={{ width: '100%', marginTop: 8, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
          🔄 Réinitialiser
        </button>
      )}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────
export default function Home() {
  const [members, setMembers] = useState<Member[]>([])
  const [dinnerResponses, setDinnerResponses] = useState<DinnerResponse[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [corseTasks, setCorseTasks] = useState<CorseTask[]>([])
  const [familyEvents, setFamilyEvents] = useState<FamilyEvent[]>([])
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('presence')
  const [showIdentity, setShowIdentity] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('giros_member_id')
    if (saved) {
      supabase.from('members').select('*').eq('id', saved).single().then(({ data }) => {
        if (data) setCurrentMember(data); else setShowIdentity(true)
      })
    } else setShowIdentity(true)
  }, [])

  function loadDinnerResponses() {
    const start = todayStr(); const end = addDays(start, 13)
    supabase.from('dinner_responses').select('*').gte('date', start).lte('date', end)
      .then(({ data }) => data && setDinnerResponses(data))
  }

  useEffect(() => {
    supabase.from('members').select('*').order('name').then(({ data }) => data && setMembers(data))
    loadDinnerResponses()
    supabase.from('chores').select('*').order('created_at').then(({ data }) => data && setChores(data))
    supabase.from('shopping_items').select('*').order('created_at').then(({ data }) => data && setShoppingItems(data))
    supabase.from('corse_tasks').select('*').order('sort_order').then(({ data }) => data && setCorseTasks(data))
    supabase.from('family_events').select('*').order('start_date').then(({ data }) => data && setFamilyEvents(data))
  }, [])

  useEffect(() => {
    const ch = supabase.channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () =>
        supabase.from('members').select('*').order('name').then(({ data }) => data && setMembers(data)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dinner_responses' }, loadDinnerResponses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, () =>
        supabase.from('chores').select('*').order('created_at').then(({ data }) => data && setChores(data)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () =>
        supabase.from('shopping_items').select('*').order('created_at').then(({ data }) => data && setShoppingItems(data)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'corse_tasks' }, () =>
        supabase.from('corse_tasks').select('*').order('sort_order').then(({ data }) => data && setCorseTasks(data)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'family_events' }, () =>
        supabase.from('family_events').select('*').order('start_date').then(({ data }) => data && setFamilyEvents(data)))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  // ── Members ────────────────────────────────────────────
  async function toggleMemberActive(member: Member) {
    const newVal = !member.is_active
    setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: newVal } : m))
    const { error } = await supabase.from('members').update({ is_active: newVal }).eq('id', member.id)
    if (error) { setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: member.is_active } : m)); alert('Erreur : ' + error.message) }
  }

  // ── Dinner ─────────────────────────────────────────────
  async function setDinnerStatus(date: string, status: DinnerStatus, arrivalTime?: string) {
    if (!currentMember) return
    const existing = dinnerResponses.find(r => r.member_id === currentMember.id && r.date === date)
    if (existing) {
      setDinnerResponses(prev => prev.map(r => r.id === existing.id ? { ...r, status, arrival_time: arrivalTime ?? null } : r))
      const { error } = await supabase.from('dinner_responses').update({ status, arrival_time: arrivalTime ?? null }).eq('id', existing.id)
      if (error) setDinnerResponses(prev => prev.map(r => r.id === existing.id ? existing : r))
    } else {
      const tempId = 'temp-' + Date.now()
      const newResp: DinnerResponse = { id: tempId, member_id: currentMember.id, date, status, arrival_time: arrivalTime ?? null }
      setDinnerResponses(prev => [...prev, newResp])
      const { data, error } = await supabase.from('dinner_responses').insert({ member_id: currentMember.id, date, status, arrival_time: arrivalTime ?? null }).select().single()
      if (error) setDinnerResponses(prev => prev.filter(r => r.id !== tempId))
      else if (data) setDinnerResponses(prev => prev.map(r => r.id === tempId ? data : r))
    }
  }

  // ── Chores ─────────────────────────────────────────────
  async function addChore(name: string) {
    if (!name.trim()) return
    const tempId = 'temp-' + Date.now()
    const temp: Chore = { id: tempId, name: name.trim(), assigned_to_id: null, is_done: false, created_at: new Date().toISOString() }
    setChores(prev => [...prev, temp])
    const { data, error } = await supabase.from('chores').insert({ name: name.trim() }).select().single()
    if (error) setChores(prev => prev.filter(c => c.id !== tempId))
    else if (data) setChores(prev => prev.map(c => c.id === tempId ? data : c))
  }
  async function claimChore(chore: Chore) {
    if (!currentMember) return
    setChores(prev => prev.map(c => c.id === chore.id ? { ...c, assigned_to_id: currentMember.id } : c))
    const { error } = await supabase.from('chores').update({ assigned_to_id: currentMember.id }).eq('id', chore.id)
    if (error) setChores(prev => prev.map(c => c.id === chore.id ? chore : c))
  }
  async function unclaimChore(chore: Chore) {
    setChores(prev => prev.map(c => c.id === chore.id ? { ...c, assigned_to_id: null } : c))
    const { error } = await supabase.from('chores').update({ assigned_to_id: null }).eq('id', chore.id)
    if (error) setChores(prev => prev.map(c => c.id === chore.id ? chore : c))
  }
  async function doneChore(chore: Chore) {
    setChores(prev => prev.map(c => c.id === chore.id ? { ...c, is_done: true } : c))
    const { error } = await supabase.from('chores').update({ is_done: true }).eq('id', chore.id)
    if (error) setChores(prev => prev.map(c => c.id === chore.id ? chore : c))
  }
  async function deleteChore(chore: Chore) {
    setChores(prev => prev.filter(c => c.id !== chore.id))
    const { error } = await supabase.from('chores').delete().eq('id', chore.id)
    if (error) setChores(prev => [...prev, chore].sort((a, b) => a.created_at.localeCompare(b.created_at)))
  }

  // ── Shopping ───────────────────────────────────────────
  async function addShoppingItem(name: string) {
    if (!name.trim() || !currentMember) return
    const tempId = 'temp-' + Date.now()
    const temp: ShoppingItem = { id: tempId, name: name.trim(), added_by_id: currentMember.id, is_done: false, created_at: new Date().toISOString(), image_url: null }
    setShoppingItems(prev => [...prev, temp])
    const { data, error } = await supabase.from('shopping_items').insert({ name: name.trim(), added_by_id: currentMember.id }).select().single()
    if (error) setShoppingItems(prev => prev.filter(i => i.id !== tempId))
    else if (data) setShoppingItems(prev => prev.map(i => i.id === tempId ? data : i))
  }
  async function toggleShoppingItem(item: ShoppingItem) {
    setShoppingItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: !i.is_done } : i))
    const { error } = await supabase.from('shopping_items').update({ is_done: !item.is_done }).eq('id', item.id)
    if (error) setShoppingItems(prev => prev.map(i => i.id === item.id ? item : i))
  }
  async function deleteShoppingItem(item: ShoppingItem) {
    setShoppingItems(prev => prev.filter(i => i.id !== item.id))
    const { error } = await supabase.from('shopping_items').delete().eq('id', item.id)
    if (error) setShoppingItems(prev => [...prev, item].sort((a, b) => a.created_at.localeCompare(b.created_at)))
  }
  async function onAddPhoto(base64: string) {
    if (!currentMember) return
    try {
      const res = await fetch(base64); const blob = await res.blob()
      const fileName = `liste-${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('shopping-photos').upload(fileName, blob, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('shopping-photos').getPublicUrl(fileName)
      const tempId = 'temp-' + Date.now()
      const temp: ShoppingItem = { id: tempId, name: '📷 Photo de liste', added_by_id: currentMember.id, is_done: false, created_at: new Date().toISOString(), image_url: urlData.publicUrl }
      setShoppingItems(prev => [...prev, temp])
      const { data, error } = await supabase.from('shopping_items').insert({ name: '📷 Photo de liste', image_url: urlData.publicUrl, added_by_id: currentMember.id }).select().single()
      if (error) setShoppingItems(prev => prev.filter(i => i.id !== tempId))
      else if (data) setShoppingItems(prev => prev.map(i => i.id === tempId ? data : i))
    } catch { alert('Impossible de sauvegarder la photo.') }
  }

  // ── Corse ──────────────────────────────────────────────
  async function toggleCorseTask(task: CorseTask) {
    setCorseTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
    const { error } = await supabase.from('corse_tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    if (error) setCorseTasks(prev => prev.map(t => t.id === task.id ? task : t))
  }
  async function addCorseTask(name: string, category: 'ouvrir' | 'fermer') {
    if (!name.trim()) return
    const maxOrder = Math.max(0, ...corseTasks.filter(t => t.category === category).map(t => t.sort_order))
    const tempId = 'temp-' + Date.now()
    const temp: CorseTask = { id: tempId, name: name.trim(), category, is_done: false, sort_order: maxOrder + 1 }
    setCorseTasks(prev => [...prev, temp])
    const { data, error } = await supabase.from('corse_tasks').insert({ name: name.trim(), category, sort_order: maxOrder + 1 }).select().single()
    if (error) setCorseTasks(prev => prev.filter(t => t.id !== tempId))
    else if (data) setCorseTasks(prev => prev.map(t => t.id === tempId ? data : t))
  }
  async function deleteCorseTask(task: CorseTask) {
    setCorseTasks(prev => prev.filter(t => t.id !== task.id))
    const { error } = await supabase.from('corse_tasks').delete().eq('id', task.id)
    if (error) setCorseTasks(prev => [...prev, task].sort((a, b) => a.sort_order - b.sort_order))
  }
  async function resetCorse(category: 'ouvrir' | 'fermer') {
    setCorseTasks(prev => prev.map(t => t.category === category ? { ...t, is_done: false } : t))
    const ids = corseTasks.filter(t => t.category === category && t.is_done).map(t => t.id)
    if (ids.length > 0) {
      const { error } = await supabase.from('corse_tasks').update({ is_done: false }).in('id', ids)
      if (error) supabase.from('corse_tasks').select('*').order('sort_order').then(({ data }) => data && setCorseTasks(data))
    }
  }

  // ── Family Events ──────────────────────────────────────
  async function addFamilyEvent(title: string, memberId: string, startDate: string, endDate: string) {
    if (!title.trim()) return
    const tempId = 'temp-' + Date.now()
    const temp: FamilyEvent = { id: tempId, title: title.trim(), member_id: memberId, start_date: startDate, end_date: endDate, created_at: new Date().toISOString() }
    setFamilyEvents(prev => [...prev, temp].sort((a, b) => a.start_date.localeCompare(b.start_date)))
    const { data, error } = await supabase.from('family_events').insert({ title: title.trim(), member_id: memberId, start_date: startDate, end_date: endDate }).select().single()
    if (error) setFamilyEvents(prev => prev.filter(e => e.id !== tempId))
    else if (data) setFamilyEvents(prev => prev.map(e => e.id === tempId ? data : e))
  }
  async function deleteFamilyEvent(event: FamilyEvent) {
    setFamilyEvents(prev => prev.filter(e => e.id !== event.id))
    const { error } = await supabase.from('family_events').delete().eq('id', event.id)
    if (error) setFamilyEvents(prev => [...prev, event].sort((a, b) => a.start_date.localeCompare(b.start_date)))
  }

  if (showIdentity) {
    return <IdentityModal members={members} onSelect={(m) => { setCurrentMember(m); localStorage.setItem('giros_member_id', m.id); setShowIdentity(false) }} />
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{ background: C.primary, padding: '16px 20px 12px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 480, margin: '0 auto' }}>
          <div>
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>🏠 Chez les Giros</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{currentMember ? `Connecté·e en tant que ${currentMember.name}` : ''}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowMembers(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 16 }}>👥</button>
            <button onClick={() => setShowIdentity(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 10px', color: 'white', cursor: 'pointer', fontSize: 13 }}>Changer</button>
          </div>
        </div>
      </div>

      {/* Tabs — ordre : présence, agenda, courses, tâches, poubelles, corse */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 62, zIndex: 99, overflowX: 'auto' }}>
        <div style={{ display: 'flex', maxWidth: 480, margin: '0 auto' }}>
          {([
            { id: 'presence',  label: '🍽️ Présence' },
            { id: 'agenda',    label: '📅 Agenda' },
            { id: 'courses',   label: '🛒 Courses' },
            { id: 'corvees',   label: '🧹 Tâches' },
            { id: 'poubelles', label: '🗑️ Poubelles' },
            { id: 'corse',     label: '🏝️ Corse' },
          ] as { id: TabId; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: '0 0 auto', padding: '12px 10px', border: 'none', background: 'none',
              borderBottom: activeTab === tab.id ? `3px solid ${C.primary}` : '3px solid transparent',
              color: activeTab === tab.id ? C.primary : C.muted,
              fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap',
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
        {activeTab === 'presence'  && <PresenceTab members={members.filter(m => m.is_active)} allMembers={members} dinnerResponses={dinnerResponses} familyEvents={familyEvents} currentMember={currentMember} onSetStatus={setDinnerStatus} />}
        {activeTab === 'agenda'    && <AgendaTab members={members} events={familyEvents} currentMember={currentMember} onAdd={addFamilyEvent} onDelete={deleteFamilyEvent} />}
        {activeTab === 'courses'   && <CoursesTab members={members} items={shoppingItems} currentMember={currentMember} onAdd={addShoppingItem} onToggle={toggleShoppingItem} onDelete={deleteShoppingItem} onAddPhoto={onAddPhoto} />}
        {activeTab === 'corvees'   && <CorveesTab members={members} chores={chores} currentMember={currentMember} onAdd={addChore} onClaim={claimChore} onUnclaim={unclaimChore} onDone={doneChore} onDelete={deleteChore} />}
        {activeTab === 'poubelles' && <PoubellsTab />}
        {activeTab === 'corse'     && <CorseTab tasks={corseTasks} onToggle={toggleCorseTask} onAdd={addCorseTask} onDelete={deleteCorseTask} onReset={resetCorse} />}
      </div>

      {showMembers && <MembersModal members={members} onToggle={toggleMemberActive} onClose={() => setShowMembers(false)} />}
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
          <button key={m.id} onClick={() => onSelect(m)} style={{ background: C.card, border: `2px solid ${C.border}`, borderRadius: 14, padding: '16px 20px', fontSize: 17, fontWeight: 600, color: C.text, cursor: 'pointer', textAlign: 'left' }}>
            {m.is_mom ? '👑 ' : ''}{m.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Members Modal ──────────────────────────────────────
function MembersModal({ members, onToggle, onClose }: { members: Member[]; onToggle: (m: Member) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: C.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, margin: '0 auto', padding: 24, maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>👥 Membres</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: C.muted }}>×</button>
        </div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Mets en pause les membres absents.</div>
        {members.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: m.is_active ? C.primaryLight : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: m.is_active ? C.primary : C.muted }}>
                {m.is_mom ? '👑' : m.name[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: m.is_active ? C.text : C.muted }}>{m.name}</div>
                <div style={{ fontSize: 12, color: m.is_active ? C.green : C.muted }}>{m.is_active ? '✓ Actif·ve' : '⏸ En pause'}</div>
              </div>
            </div>
            <button onClick={() => onToggle(m)} style={{ background: m.is_active ? C.redLight : C.greenLight, color: m.is_active ? C.red : C.green, border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {m.is_active ? 'Mettre en pause' : 'Réactiver'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Présence Tab ───────────────────────────────────────
function PresenceTab({ members, allMembers, dinnerResponses, familyEvents, currentMember, onSetStatus }: {
  members: Member[]; allMembers: Member[]
  dinnerResponses: DinnerResponse[]; familyEvents: FamilyEvent[]
  currentMember: Member | null
  onSetStatus: (date: string, s: DinnerStatus, t?: string) => void
}) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(todayStr(), i))
  const today = todayStr()
  const awayToday = familyEvents.filter(e => e.start_date <= today && e.end_date >= today)
  const getName = (id: string) => allMembers.find(m => m.id === id)?.name || '?'
  const todayResponses = dinnerResponses.filter(r => r.date === today)
  const comingTonight = todayResponses.filter(r => r.status === 'oui' || r.status === 'assiette').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary card */}
      <div style={{ background: C.primary, borderRadius: 16, padding: 16, color: 'white' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📋 Ce soir</div>
        <div style={{ fontSize: 14, marginBottom: awayToday.length > 0 ? 6 : 0 }}>
          🍽️ <strong>{comingTonight}</strong> personne{comingTonight !== 1 ? 's' : ''} à dîner
          {todayResponses.filter(r => r.status === 'oui').map(r => (
            <span key={r.id} style={{ marginLeft: 6, opacity: 0.85, fontSize: 13 }}>
              {getName(r.member_id)}{r.arrival_time ? ` (${r.arrival_time})` : ''}
            </span>
          ))}
        </div>
        {awayToday.length > 0 && (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            ✈️ En voyage : {awayToday.map(e => `${getName(e.member_id)} — ${e.title}`).join(' · ')}
          </div>
        )}
        {todayResponses.filter(r => r.status === 'assiette').length > 0 && (
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            🍽️ Assiette : {todayResponses.filter(r => r.status === 'assiette').map(r => getName(r.member_id) + (r.arrival_time ? ` (${r.arrival_time})` : '')).join(', ')}
          </div>
        )}
      </div>

      {/* 14 days */}
      {days.map(dateStr => (
        <DayCard
          key={dateStr}
          dateStr={dateStr}
          isToday={dateStr === today}
          members={members}
          allMembers={allMembers}
          dinnerResponses={dinnerResponses}
          currentMember={currentMember}
          onSetStatus={onSetStatus}
        />
      ))}
    </div>
  )
}

// ── Day Card (stable component, not inline) ────────────
function DayCard({ dateStr, isToday, members, allMembers, dinnerResponses, currentMember, onSetStatus }: {
  dateStr: string; isToday: boolean; members: Member[]; allMembers: Member[]
  dinnerResponses: DinnerResponse[]; currentMember: Member | null
  onSetStatus: (date: string, s: DinnerStatus, t?: string) => void
}) {
  const myResp = currentMember ? dinnerResponses.find(r => r.member_id === currentMember.id && r.date === dateStr) : null
  const othersResp = dinnerResponses.filter(r => r.date === dateStr && r.member_id !== currentMember?.id)
  const getName = (id: string) => allMembers.find(m => m.id === id)?.name || '?'

  // Local time state — initialise from existing response, stays in sync
  const [localTime, setLocalTime] = useState(myResp?.arrival_time || '')

  // When myResp changes (other device update), sync
  useEffect(() => { setLocalTime(myResp?.arrival_time || '') }, [myResp?.arrival_time])

  function handleStatusClick(status: DinnerStatus) {
    onSetStatus(dateStr, status, localTime || undefined)
  }

  function handleTimeBlur() {
    if (myResp) onSetStatus(dateStr, myResp.status, localTime || undefined)
  }

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `${isToday ? 2 : 1}px solid ${isToday ? C.primary : C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {isToday && <span style={{ background: C.primary, color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>Aujourd'hui</span>}
        <div style={{ fontWeight: 700, fontSize: 15, color: isToday ? C.primary : C.text }}>{formatDay(dateStr)}</div>
      </div>

      {currentMember && (
        <div style={{ marginBottom: othersResp.length > 0 ? 10 : 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {([
              { s: 'oui' as DinnerStatus, label: '✓ Présent·e', bg: C.greenLight, color: C.green },
              { s: 'non' as DinnerStatus, label: '✗ Absent·e', bg: C.redLight, color: C.red },
              { s: 'assiette' as DinnerStatus, label: '🍽️ Assiette', bg: C.orangeLight, color: C.orange },
            ]).map(opt => (
              <button key={opt.s} onClick={() => handleStatusClick(opt.s)} style={{
                background: myResp?.status === opt.s ? opt.color : opt.bg,
                color: myResp?.status === opt.s ? 'white' : opt.color,
                border: 'none', borderRadius: 8, padding: '7px 11px', fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}>{opt.label}</button>
            ))}
          </div>
          {/* Arrival time — only shown when coming */}
          {myResp && myResp.status !== 'non' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: C.muted }}>🕐 Arrivée vers</span>
              <input
                type="time"
                value={localTime}
                onChange={e => setLocalTime(e.target.value)}
                onBlur={handleTimeBlur}
                style={{ padding: '4px 8px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, color: C.text, width: 100 }}
              />
            </div>
          )}
        </div>
      )}

      {othersResp.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          {othersResp.map(r => {
            const color = r.status === 'oui' ? C.green : r.status === 'non' ? C.red : C.orange
            const icon = r.status === 'oui' ? '✓' : r.status === 'non' ? '✗' : '🍽️'
            return (
              <span key={r.id} style={{ background: color + '22', color, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>
                {icon} {getName(r.member_id)}{r.arrival_time ? ` · ${r.arrival_time}` : ''}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Agenda Tab ─────────────────────────────────────────
function AgendaTab({ members, events, currentMember, onAdd, onDelete }: {
  members: Member[]; events: FamilyEvent[]; currentMember: Member | null
  onAdd: (title: string, memberId: string, start: string, end: string) => void
  onDelete: (e: FamilyEvent) => void
}) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [showForm, setShowForm] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', memberId: currentMember?.id || '', start: todayStr(), end: todayStr() })

  useEffect(() => { if (currentMember) setForm(f => ({ ...f, memberId: currentMember.id })) }, [currentMember])

  function prevMonth() { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  function nextMonth() { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  const firstDay = new Date(viewYear, viewMonth, 1)
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startDow = (firstDay.getDay() + 6) % 7

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function dayStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function eventsOnDay(day: number) {
    const ds = dayStr(day)
    return events.filter(e => e.start_date <= ds && e.end_date >= ds)
  }

  const today = todayStr()

  const selectedEvents = selectedDay ? events.filter(e => e.start_date <= selectedDay && e.end_date >= selectedDay) : []
  const getName = (id: string) => members.find(m => m.id === id)?.name || '?'

  async function handleSubmit() {
    if (!form.title.trim() || !form.memberId || form.end < form.start) return
    onAdd(form.title, form.memberId, form.start, form.end)
    setShowForm(false)
    setForm(f => ({ ...f, title: '', start: todayStr(), end: todayStr() }))
  }

  const upcoming = events.filter(e => e.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Calendar */}
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <button onClick={prevMonth} style={{ background: C.primaryLight, border: 'none', borderRadius: 8, padding: '6px 14px', color: C.primary, fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>‹</button>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{formatMonthYear(viewYear, viewMonth)}</div>
          <button onClick={nextMonth} style={{ background: C.primaryLight, border: 'none', borderRadius: 8, padding: '6px 14px', color: C.primary, fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>›</button>
        </div>

        {/* Days of week header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {['L','M','M','J','V','S','D'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: C.muted, paddingBottom: 6 }}>{d}</div>
          ))}
        </div>

        {/* Grid — compact cells with dots only */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const ds = dayStr(day)
            const isToday = ds === today
            const isSelected = ds === selectedDay
            const dayEvents = eventsOnDay(day)
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(isSelected ? null : ds)}
                style={{
                  minHeight: 38, borderRadius: 8, padding: '4px 2px',
                  background: isSelected ? C.primary : isToday ? C.primaryLight : 'transparent',
                  border: isSelected ? `none` : isToday ? `1px solid ${C.primary}` : '1px solid transparent',
                  cursor: dayEvents.length > 0 ? 'pointer' : 'default',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400, color: isSelected ? 'white' : isToday ? C.primary : C.text }}>
                  {day}
                </span>
                {/* Colored dots for events */}
                {dayEvents.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {dayEvents.slice(0, 3).map((e, ei) => (
                      <div key={ei} style={{ width: 6, height: 6, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.8)' : getMemberColor(members, e.member_id) }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{formatDay(selectedDay)}</div>
            {selectedEvents.length === 0 ? (
              <div style={{ color: C.muted, fontSize: 13 }}>Aucun événement ce jour.</div>
            ) : (
              selectedEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: getMemberColor(members, e.member_id), flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 14 }}>
                    <strong>{e.title}</strong>
                    <span style={{ color: C.muted, fontSize: 12 }}> · {getName(e.member_id)}</span>
                    {e.start_date !== e.end_date && <span style={{ color: C.muted, fontSize: 12 }}> · jusqu'au {formatDay(e.end_date, true)}</span>}
                  </div>
                  <button onClick={() => onDelete(e)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
          {members.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: MEMBER_PALETTE[i % MEMBER_PALETTE.length] }} />
              <span style={{ fontSize: 11, color: C.muted }}>{m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add button */}
      <button onClick={() => setShowForm(s => !s)} style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 12, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        {showForm ? '✕ Annuler' : '+ Ajouter un événement'}
      </button>

      {showForm && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Nouvel événement</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Titre (ex : Voyage à Rome, Chez Alix…)"
              style={{ padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
            <select value={form.memberId} onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
              style={{ padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, background: 'white' }}>
              <option value="">— Qui ?</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Du</div>
                <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                  style={{ width: '100%', padding: '10px 8px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Au</div>
                <input type="date" value={form.end} min={form.start} onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                  style={{ width: '100%', padding: '10px 8px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <button onClick={handleSubmit} disabled={!form.title.trim() || !form.memberId}
              style={{ background: form.title.trim() && form.memberId ? C.green : '#ccc', color: 'white', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: form.title.trim() && form.memberId ? 'pointer' : 'default' }}>
              ✓ Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Upcoming list */}
      {upcoming.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>À venir</div>
          {upcoming.map(e => {
            const color = getMemberColor(members, e.member_id)
            const isOngoing = e.start_date <= today && e.end_date >= today
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 4, borderRadius: 2, alignSelf: 'stretch', minHeight: 32, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>
                    {getName(e.member_id)} · {e.start_date === e.end_date ? formatDay(e.start_date, true) : `${formatDay(e.start_date, true)} → ${formatDay(e.end_date, true)}`}
                    {isOngoing && <span style={{ marginLeft: 6, background: color, color: 'white', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>En cours</span>}
                  </div>
                </div>
                <button onClick={() => onDelete(e)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            )
          })}
        </div>
      )}
      {upcoming.length === 0 && !showForm && <div style={{ textAlign: 'center', color: C.muted, padding: 24 }}>Aucun événement à venir 📅</div>}
    </div>
  )
}

// ── Tâches Tab ─────────────────────────────────────────
function CorveesTab({ members, chores, currentMember, onAdd, onClaim, onUnclaim, onDone, onDelete }: {
  members: Member[]; chores: Chore[]; currentMember: Member | null
  onAdd: (n: string) => void; onClaim: (c: Chore) => void; onUnclaim: (c: Chore) => void
  onDone: (c: Chore) => void; onDelete: (c: Chore) => void
}) {
  const [newChore, setNewChore] = useState('')
  const getName = (id: string | null) => id ? (members.find(m => m.id === id)?.name || '?') : null
  const pending = chores.filter(c => !c.is_done)
  const done = chores.filter(c => c.is_done)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={newChore} onChange={e => setNewChore(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onAdd(newChore); setNewChore('') } }}
            placeholder="Ajouter une tâche…"
            style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
          <button onClick={() => { onAdd(newChore); setNewChore('') }} style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 18 }}>+</button>
        </div>
      </div>
      {pending.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>À faire ({pending.length})</div>
          {pending.map(chore => {
            const assignee = getName(chore.assigned_to_id)
            const isMine = currentMember && chore.assigned_to_id === currentMember.id
            return (
              <div key={chore.id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{chore.name}</div>
                  <div style={{ fontSize: 12, color: assignee ? C.primary : C.muted }}>{assignee ? `👤 ${assignee}` : 'Non assigné'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {!chore.assigned_to_id && <button onClick={() => onClaim(chore)} style={{ background: C.primaryLight, color: C.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Je prends</button>}
                  {isMine && <button onClick={() => onUnclaim(chore)} style={{ background: C.redLight, color: C.red, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Abandonner</button>}
                  {chore.assigned_to_id && <button onClick={() => onDone(chore)} style={{ background: C.greenLight, color: C.green, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Fait !</button>}
                  <button onClick={() => onDelete(chore)} style={{ background: '#F5F5F5', color: C.muted, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {done.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, opacity: 0.7 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: C.muted }}>Terminées ({done.length})</div>
          {done.map(chore => (
            <div key={chore.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ textDecoration: 'line-through', color: C.muted }}>{chore.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 12, color: C.green }}>✓ {getName(chore.assigned_to_id) || ''}</div>
                <button onClick={() => onDelete(chore)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {pending.length === 0 && done.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>Aucune tâche 🎉</div>}
    </div>
  )
}

// ── Courses Tab ────────────────────────────────────────
function CoursesTab({ members, items, currentMember, onAdd, onToggle, onDelete, onAddPhoto }: {
  members: Member[]; items: ShoppingItem[]; currentMember: Member | null
  onAdd: (n: string) => void; onToggle: (i: ShoppingItem) => void
  onDelete: (i: ShoppingItem) => void; onAddPhoto: (b: string) => Promise<void>
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
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setCapturedImage(base64); setOcrLoading(true); setOcrResult(null)
      try {
        const formData = new FormData()
        formData.append('base64Image', base64.split(',')[1])
        formData.append('language', 'fre'); formData.append('isOverlayRequired', 'false'); formData.append('OCREngine', '2')
        const resp = await fetch('https://api.ocr.space/parse/image', { method: 'POST', headers: { apikey: 'helloworld' }, body: formData })
        const data = await resp.json()
        setOcrResult((data?.ParsedResults?.[0]?.ParsedText || '').trim())
      } catch { setOcrResult('') }
      setOcrLoading(false)
    }
    reader.readAsDataURL(file)
  }

  async function addOcrItems() {
    if (!ocrResult || !currentMember) return
    for (const line of ocrResult.split('\n').map(l => l.trim()).filter(l => l.length > 1)) await onAdd(line)
    setCapturedImage(null); setOcrResult(null); if (fileRef.current) fileRef.current.value = ''
  }

  async function keepPhoto() {
    if (!capturedImage) return
    await onAddPhoto(capturedImage)
    setCapturedImage(null); setOcrResult(null); if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { onAdd(newItem); setNewItem('') } }}
            placeholder="Ajouter un article…"
            style={{ flex: 1, padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14 }} />
          <button onClick={() => { onAdd(newItem); setNewItem('') }} style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 18 }}>+</button>
        </div>
        <button onClick={() => fileRef.current?.click()} style={{ width: '100%', background: C.primaryLight, color: C.primary, border: `1px dashed ${C.primary}`, borderRadius: 10, padding: '10px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          📷 Photographier une liste manuscrite
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
      </div>

      {capturedImage && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📷 Photo capturée</div>
          <img src={capturedImage} alt="liste" style={{ width: '100%', borderRadius: 10, marginBottom: 12, maxHeight: 200, objectFit: 'cover' }} />
          {ocrLoading && <div style={{ color: C.muted, fontSize: 14, textAlign: 'center' }}>🔍 Analyse en cours…</div>}
          {!ocrLoading && ocrResult !== null && (
            ocrResult.length > 0 ? (
              <>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>Texte reconnu :</div>
                <div style={{ background: C.bg, borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{ocrResult}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={addOcrItems} style={{ flex: 1, background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer' }}>✓ Ajouter ces articles</button>
                  <button onClick={keepPhoto} style={{ flex: 1, background: C.primaryLight, color: C.primary, border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>🖼️ Garder la photo</button>
                </div>
                <button onClick={() => { setCapturedImage(null); setOcrResult(null) }} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              </>
            ) : (
              <>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Écriture non reconnue — tu peux garder la photo.</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={keepPhoto} style={{ flex: 1, background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, cursor: 'pointer' }}>🖼️ Garder la photo</button>
                  <button onClick={() => { setCapturedImage(null); setOcrResult(null) }} style={{ background: C.redLight, color: C.red, border: 'none', borderRadius: 10, padding: '10px', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                </div>
              </>
            )
          )}
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>À acheter ({pending.length})</div>
          {pending.map(item => (
            <div key={item.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              {item.image_url ? (
                <div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>📷 {getName(item.added_by_id) || '?'}</div>
                  <img src={item.image_url} alt="liste" onClick={() => setExpandedPhoto(item.image_url!)} style={{ width: '100%', borderRadius: 8, maxHeight: 160, objectFit: 'cover', cursor: 'pointer', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setExpandedPhoto(item.image_url!)} style={{ background: C.primaryLight, color: C.primary, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🔍 Agrandir</button>
                    <button onClick={() => onToggle(item)} style={{ background: C.greenLight, color: C.green, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ Vue</button>
                    <button onClick={() => onDelete(item)} style={{ background: C.redLight, color: C.red, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => onToggle(item)} style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.border}`, background: 'none', cursor: 'pointer', flexShrink: 0 }} />
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
      {pending.length === 0 && done.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 32 }}>La liste est vide 🛒</div>}

      {expandedPhoto && (
        <div onClick={() => setExpandedPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <img src={expandedPhoto} alt="agrandie" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12 }} />
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
  onAdd: (n: string, c: 'ouvrir' | 'fermer') => void
  onDelete: (t: CorseTask) => void
  onReset: (c: 'ouvrir' | 'fermer') => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CorseSection
        tasks={tasks.filter(t => t.category === 'ouvrir')}
        category="ouvrir"
        title="🌊 À faire en arrivant"
        color={C.primary}
        onToggle={onToggle}
        onAdd={onAdd}
        onDelete={onDelete}
        onReset={onReset}
      />
      <CorseSection
        tasks={tasks.filter(t => t.category === 'fermer')}
        category="fermer"
        title="🔒 À faire en partant"
        color={C.purple}
        onToggle={onToggle}
        onAdd={onAdd}
        onDelete={onDelete}
        onReset={onReset}
      />
    </div>
  )
}

// ── Poubelles Tab ──────────────────────────────────────
function PoubellsTab() {
  const day = new Date().getDay()
  const isYellowToday = day === 3
  const isBrownToday = day === 2 || day === 5
  const dayNames = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi']

  function BinCard({ emoji, label, days, isToday, activeColor }: { emoji: string; label: string; days: string; isToday: boolean; activeColor: string }) {
    return (
      <div style={{ background: isToday ? activeColor : C.card, borderRadius: 16, padding: 20, border: `2px solid ${isToday ? activeColor : C.border}` }}>
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>{emoji}</div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, color: isToday ? 'white' : C.text }}>{label}</div>
        <div style={{ textAlign: 'center', fontSize: 13, color: isToday ? 'rgba(255,255,255,0.85)' : C.muted, marginTop: 4 }}>{days}</div>
        {isToday && <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '8px', textAlign: 'center', fontWeight: 700, color: 'white', fontSize: 14 }}>🚨 C'est ce soir !</div>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: C.muted }}>Aujourd'hui : <strong style={{ color: C.text }}>{dayNames[day]}</strong></div>
        {!isYellowToday && !isBrownToday && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Pas de poubelles aujourd'hui 🙂</div>}
      </div>
      <BinCard emoji="🟡" label="Poubelle jaune" days="Chaque mercredi soir" isToday={isYellowToday} activeColor="#C9A200" />
      <BinCard emoji="🟤" label="Poubelle marron" days="Mardi et vendredi soirs" isToday={isBrownToday} activeColor={C.brown} />
    </div>
  )
}
