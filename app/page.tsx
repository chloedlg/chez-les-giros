'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ================================================================
// TYPES
// ================================================================
type Member = { id: string; name: string; is_mom: boolean; is_active: boolean }
type DinnerStatus = 'oui' | 'non' | 'assiette'
type DinnerResponse = { id: string; member_id: string; date: string; status: DinnerStatus; arrival_time: string | null }
type Chore = { id: string; name: string; assigned_to_id: string | null; is_done: boolean; created_at: string }
type ShoppingItem = { id: string; name: string; added_by_id: string | null; is_done: boolean; created_at: string; image_url: string | null }
type CorseTask = { id: string; name: string; category: 'ouvrir' | 'fermer'; is_done: boolean; sort_order: number }
type TabId = 'soir' | 'corvees' | 'courses' | 'corse' | 'poubelles'

// ================================================================
// UTILITAIRES
// ================================================================
function getToday() { return new Date().toISOString().split('T')[0] }
function getTrashInfo() { const d = new Date().getDay(); return { yellow: d === 3, brown: d === 2 || d === 5 } }
function isTrashDay() { const t = getTrashInfo(); return t.yellow || t.brown }
function daysUntil(targetDay: number) { const d = new Date().getDay(); const diff = targetDay >= d ? targetDay - d : 7 - d + targetDay; return diff || 7 }
function formatDate(s: string) { return new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) }

// ================================================================
// THÈME BLEU
// ================================================================
const C = {
  primary: '#3563D4', primaryLight: '#E8EFFD',
  bg: '#F5F8FF', card: '#FFFFFF', border: '#D0DCF5',
  text: '#1A2240', muted: '#6B7BA4',
  green: '#4A8C6F', greenLight: '#E0F0E8',
  red: '#C0392B', redLight: '#FDEAEA',
  orange: '#E67E22', orangeLight: '#FEF3E2',
  purple: '#5B6EC7', purpleLight: '#ECEFFE',
}

const S = {
  app: { minHeight: '100vh', backgroundColor: C.bg, paddingBottom: '80px' } as React.CSSProperties,
  header: { backgroundColor: C.primary, color: 'white', padding: '16px 20px 12px', position: 'sticky' as const, top: 0, zIndex: 10 },
  content: { padding: '16px' },
  tabBar: { position: 'fixed' as const, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', backgroundColor: '#FFFFFF', borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 20, paddingBottom: 'env(safe-area-inset-bottom)' },
  tabBtn: (active: boolean, accent?: string) => ({ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '8px 2px', gap: '2px', cursor: 'pointer', border: 'none', background: 'none', color: active ? (accent || C.primary) : C.muted, fontSize: '9px', fontWeight: active ? '600' : '400' }),
  tabIcon: { fontSize: '20px', lineHeight: '1' },
  card: { backgroundColor: C.card, borderRadius: '14px', padding: '14px', marginBottom: '10px', border: `1px solid ${C.border}`, boxShadow: '0 1px 3px rgba(53,99,212,0.06)' },
  btn: (color: string, bg: string) => ({ backgroundColor: bg, color, border: `1.5px solid ${color}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' as const }),
  btnFill: (color: string) => ({ backgroundColor: color, color: 'white', border: 'none', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' as const }),
  btnIcon: (color: string, bg: string) => ({ backgroundColor: bg, color, border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }),
  input: { width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1.5px solid ${C.border}`, fontSize: '14px', backgroundColor: C.bg, color: C.text, outline: 'none' },
  overlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflowY: 'auto' as const },
}

// ================================================================
// COMPOSANT PRINCIPAL
// ================================================================
export default function Home() {
  const [currentMember, setCurrentMember] = useState<Member | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('soir')
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [dinnerResponses, setDinnerResponses] = useState<DinnerResponse[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [corseTasks, setCorseTasks] = useState<CorseTask[]>([])
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async (memberId?: string | null) => {
    const today = getToday()
    const [{ data: mData }, { data: dData }, { data: cData }, { data: sData }, { data: corseData }] = await Promise.all([
      supabase.from('members').select('*').order('name'),
      supabase.from('dinner_responses').select('*').eq('date', today),
      supabase.from('chores').select('*').order('created_at'),
      supabase.from('shopping_items').select('*').order('created_at'),
      supabase.from('corse_tasks').select('*').order('sort_order'),
    ])
    if (mData) {
      setMembers(mData)
      if (memberId) {
        const found = mData.find((m: Member) => m.id === memberId)
        if (found) setCurrentMember(found)
        else setShowIdentityModal(true)
      }
    }
    if (dData) setDinnerResponses(dData)
    if (cData) setChores(cData)
    if (sData) setShoppingItems(sData)
    if (corseData) setCorseTasks(corseData)
    setLoading(false)
  }, [])

  useEffect(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('giros_member_id') : null
    if (!savedId) setShowIdentityModal(true)
    loadAll(savedId)
  }, [loadAll])

  useEffect(() => {
    const today = getToday()
    const subs = [
      supabase.channel('rt-dinner').on('postgres_changes', { event: '*', schema: 'public', table: 'dinner_responses' }, async () => { const { data } = await supabase.from('dinner_responses').select('*').eq('date', today); if (data) setDinnerResponses(data) }).subscribe(),
      supabase.channel('rt-chores').on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, async () => { const { data } = await supabase.from('chores').select('*').order('created_at'); if (data) setChores(data) }).subscribe(),
      supabase.channel('rt-shopping').on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, async () => { const { data } = await supabase.from('shopping_items').select('*').order('created_at'); if (data) setShoppingItems(data) }).subscribe(),
      supabase.channel('rt-corse').on('postgres_changes', { event: '*', schema: 'public', table: 'corse_tasks' }, async () => { const { data } = await supabase.from('corse_tasks').select('*').order('sort_order'); if (data) setCorseTasks(data) }).subscribe(),
      supabase.channel('rt-members').on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, async () => {
        const { data } = await supabase.from('members').select('*').order('name')
        if (data) { setMembers(data); const id = localStorage.getItem('giros_member_id'); const u = data.find((m: Member) => m.id === id); if (u) setCurrentMember(u) }
      }).subscribe(),
    ]
    return () => { subs.forEach(s => supabase.removeChannel(s)) }
  }, [])

  function selectIdentity(member: Member) { setCurrentMember(member); localStorage.setItem('giros_member_id', member.id); setShowIdentityModal(false) }

  // Toggle actif/en pause — accessible à tout le monde
  async function toggleMemberActive(member: Member) {
    const { error } = await supabase.from('members').update({ is_active: !member.is_active }).eq('id', member.id)
    if (error) alert('Erreur : ' + error.message)
  }

  const activeMembers = members.filter(m => m.is_active)
  const dinnerCount = dinnerResponses.filter(r => r.status === 'oui' && activeMembers.find(m => m.id === r.member_id)).length
  const assiettCount = dinnerResponses.filter(r => r.status === 'assiette' && activeMembers.find(m => m.id === r.member_id)).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: C.bg }}>
      <div style={{ textAlign: 'center', color: C.primary }}><div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div><div style={{ fontSize: '15px' }}>Chargement…</div></div>
    </div>
  )

  return (
    <div style={S.app}>
      {showIdentityModal && <IdentityModal members={members} onSelect={selectIdentity} />}

      {/* Modal membres — visible pour tout le monde */}
      {showMembersModal && (
        <div style={S.overlay} onClick={() => setShowMembersModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: C.text, marginBottom: '6px' }}>👥 Membres présents</div>
            <div style={{ fontSize: '13px', color: C.muted, marginBottom: '18px' }}>
              Les membres en pause n'apparaissent pas dans le sondage dîner.
            </div>
            {members.filter(m => !m.is_mom).map(member => (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: member.is_active ? C.primaryLight : '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: member.is_active ? C.primary : '#B0B0B0' }}>
                    {member.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: member.is_active ? C.text : '#B0B0B0' }}>{member.name}</div>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: member.is_active ? C.green : '#B0B0B0' }}>
                      {member.is_active ? '✅ Actif·ve' : '⏸️ En pause'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleMemberActive(member)}
                  style={member.is_active ? S.btn(C.orange, C.orangeLight) : S.btn(C.green, C.greenLight)}
                >
                  {member.is_active ? '⏸ Pause' : '▶ Réactiver'}
                </button>
              </div>
            ))}
            <button onClick={() => setShowMembersModal(false)} style={{ ...S.btnFill(C.primary), width: '100%', padding: '13px', marginTop: '20px', fontSize: '15px' }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '21px', fontWeight: '700' }}>🏠 Chez les Giros</div>
            <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '2px', textTransform: 'capitalize' }}>{formatDate(getToday())}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setShowMembersModal(true)} style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', color: 'white', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👥</button>
            {currentMember && <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', opacity: 0.75 }}>Connecté·e en tant que</div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{currentMember.name}</div>
            </div>}
            <div onClick={() => setShowIdentityModal(true)} style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', color: 'white', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {currentMember ? currentMember.name[0] : '?'}
            </div>
          </div>
        </div>
      </div>

      <div style={S.content}>
        {activeTab === 'soir' && <SoirTab members={activeMembers} allMembers={members} dinnerResponses={dinnerResponses} currentMember={currentMember} dinnerCount={dinnerCount} assiettCount={assiettCount} chores={chores}
          onUpdateResponse={async (status, arrivalTime) => {
            if (!currentMember) return
            const today = getToday()
            const existing = dinnerResponses.find(r => r.member_id === currentMember.id && r.date === today)
            if (existing) await supabase.from('dinner_responses').update({ status, arrival_time: arrivalTime, updated_at: new Date().toISOString() }).eq('id', existing.id)
            else await supabase.from('dinner_responses').insert({ member_id: currentMember.id, date: today, status, arrival_time: arrivalTime })
          }} />}
        {activeTab === 'corvees' && <CorveesTab chores={chores} members={members} currentMember={currentMember}
          onClaimChore={async id => { if (!currentMember) return; await supabase.from('chores').update({ assigned_to_id: currentMember.id }).eq('id', id) }}
          onUnclaimChore={async id => { await supabase.from('chores').update({ assigned_to_id: null }).eq('id', id) }}
          onToggleDone={async (id, isDone) => { await supabase.from('chores').update({ is_done: !isDone }).eq('id', id) }}
          onAddChore={async name => { await supabase.from('chores').insert({ name }) }}
          onDeleteChore={async id => { await supabase.from('chores').delete().eq('id', id) }} />}
        {activeTab === 'courses' && <CoursesTab items={shoppingItems} members={members} currentMember={currentMember}
          onAddItem={async name => { if (!currentMember) return; await supabase.from('shopping_items').insert({ name, added_by_id: currentMember.id, image_url: null }) }}
          onAddItems={async names => { if (!currentMember) return; await supabase.from('shopping_items').insert(names.map(n => ({ name: n, added_by_id: currentMember.id, image_url: null }))) }}
          onAddPhoto={async (base64) => {
            if (!currentMember) return
            try {
              const res = await fetch(base64)
              const blob = await res.blob()
              const fileName = `liste-${Date.now()}.jpg`
              const { error: uploadError } = await supabase.storage.from('shopping-photos').upload(fileName, blob, { contentType: 'image/jpeg' })
              if (uploadError) throw uploadError
              const { data: urlData } = supabase.storage.from('shopping-photos').getPublicUrl(fileName)
              await supabase.from('shopping_items').insert({ name: '📷 Photo de liste', image_url: urlData.publicUrl, added_by_id: currentMember.id })
            } catch (e) {
              alert('Impossible de sauvegarder la photo. Vérifie ta connexion.')
            }
          }}
          onToggleItem={async (id, isDone) => { await supabase.from('shopping_items').update({ is_done: !isDone }).eq('id', id) }}
          onDeleteDone={async () => { await supabase.from('shopping_items').delete().eq('is_done', true) }} />}
        {activeTab === 'corse' && <CorseTab tasks={corseTasks}
          onToggle={async (id, isDone) => { await supabase.from('corse_tasks').update({ is_done: !isDone }).eq('id', id) }}
          onAdd={async (name, category) => { const maxOrder = Math.max(0, ...corseTasks.filter(t => t.category === category).map(t => t.sort_order)); await supabase.from('corse_tasks').insert({ name, category, sort_order: maxOrder + 1 }) }}
          onDelete={async id => { await supabase.from('corse_tasks').delete().eq('id', id) }}
          onReset={async category => { await supabase.from('corse_tasks').update({ is_done: false }).eq('category', category) }} />}
        {activeTab === 'poubelles' && <PoubellsTab />}
      </div>

      <div style={S.tabBar}>
        {([
          { id: 'soir', icon: '🍽️', label: 'Ce soir' },
          { id: 'corvees', icon: '✅', label: 'Tâches' },
          { id: 'courses', icon: '🛒', label: 'Courses' },
          { id: 'corse', icon: '🏝️', label: 'Corse' },
          { id: 'poubelles', icon: '🗑️', label: 'Poubelles', accent: isTrashDay() ? C.orange : undefined },
        ] as { id: TabId; icon: string; label: string; accent?: string }[]).map(tab => (
          <button key={tab.id} style={S.tabBtn(activeTab === tab.id, tab.accent)} onClick={() => setActiveTab(tab.id)}>
            <span style={S.tabIcon}>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ================================================================
// MODAL IDENTITÉ
// ================================================================
function IdentityModal({ members, onSelect }: { members: Member[]; onSelect: (m: Member) => void }) {
  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>👋</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: C.text }}>Qui es-tu ?</div>
          <div style={{ fontSize: '14px', color: C.muted, marginTop: '4px' }}>Sélectionne ton prénom</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map(member => (
            <button key={member.id} onClick={() => onSelect(member)} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', border: `2px solid ${C.border}`, backgroundColor: C.bg, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: C.primary, flexShrink: 0 }}>{member.name[0]}</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: C.text }}>{member.name}</div>
                {member.is_mom && <div style={{ fontSize: '12px', color: C.muted }}>👑 Maîtresse de maison</div>}
                {!member.is_active && <div style={{ fontSize: '12px', color: '#B0B0B0' }}>⏸️ En pause</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ================================================================
// ONGLET CE SOIR
// ================================================================
function SoirTab({ members, allMembers, dinnerResponses, currentMember, dinnerCount, assiettCount, chores, onUpdateResponse }: {
  members: Member[]; allMembers: Member[]; dinnerResponses: DinnerResponse[]; currentMember: Member | null
  dinnerCount: number; assiettCount: number; chores: Chore[]
  onUpdateResponse: (status: DinnerStatus, arrivalTime: string | null) => Promise<void>
}) {
  const today = getToday()
  const [selectedStatus, setSelectedStatus] = useState<DinnerStatus | null>(null)
  const [arrivalTime, setArrivalTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentMember) {
      const ex = dinnerResponses.find(r => r.member_id === currentMember.id && r.date === today)
      if (ex) { setSelectedStatus(ex.status); setArrivalTime(ex.arrival_time || '') }
    }
  }, [currentMember, dinnerResponses, today])

  const getName = (id: string) => allMembers.find(m => m.id === id)?.name || '?'
  const comingHome = dinnerResponses.filter(r => (r.status === 'oui' || r.status === 'assiette') && members.find(m => m.id === r.member_id))
  const notComing = dinnerResponses.filter(r => r.status === 'non' && members.find(m => m.id === r.member_id))
  const assignedChores = chores.filter(c => c.assigned_to_id && !c.is_done)
  const unassignedChores = chores.filter(c => !c.assigned_to_id && !c.is_done)

  const statusConfig = {
    oui: { label: '✅ Oui, je rentre', color: C.green, bg: C.greenLight },
    non: { label: '❌ Non, pas là', color: C.red, bg: C.redLight },
    assiette: { label: '🍽️ Garde-moi une assiette', color: C.orange, bg: C.orangeLight },
  }

  return (
    <div>
      <div style={{ ...S.card, border: `2px solid ${C.primary}` }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: C.primary, marginBottom: '12px' }}>📋 Résumé du jour</div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>CE SOIR À LA MAISON</div>
          {comingHome.length === 0 && notComing.length === 0
            ? <div style={{ fontSize: '13px', color: '#B0B0C0' }}>Personne n'a encore répondu…</div>
            : <>{comingHome.map(r => <div key={r.id} style={{ fontSize: '14px', color: C.text, marginBottom: '2px', display: 'flex', gap: '6px' }}><span>{r.status === 'assiette' ? '🍽️' : '🟢'}</span><span><strong>{getName(r.member_id)}</strong>{r.arrival_time ? ` · ${r.arrival_time}` : ''}{r.status === 'assiette' ? ' (assiette)' : ''}</span></div>)}
              {notComing.map(r => <div key={r.id} style={{ fontSize: '14px', color: C.muted, marginBottom: '2px', display: 'flex', gap: '6px' }}><span>🔴</span><span>{getName(r.member_id)} · absent·e</span></div>)}</>}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '10px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px' }}>TÂCHES À FAIRE</div>
          {chores.filter(c => !c.is_done).length === 0
            ? <div style={{ fontSize: '13px', color: C.green, fontWeight: '500' }}>✨ Tout est fait !</div>
            : <>{assignedChores.map(c => <div key={c.id} style={{ fontSize: '13px', color: C.text, marginBottom: '2px' }}>✅ <strong>{getName(c.assigned_to_id!)}</strong> · {c.name}</div>)}
              {unassignedChores.map(c => <div key={c.id} style={{ fontSize: '13px', color: C.red, marginBottom: '2px' }}>⚠️ {c.name} <span style={{ color: C.muted }}>(non assignée)</span></div>)}</>}
        </div>
      </div>

      <div style={{ ...S.card, backgroundColor: C.primary, color: 'white', border: 'none' }}>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Ce soir à la maison</div>
        <div style={{ fontSize: '28px', fontWeight: '700' }}>{dinnerCount + assiettCount} <span style={{ fontSize: '16px', fontWeight: '400', opacity: 0.85 }}>pour dîner</span></div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
          <span>🟢 {dinnerCount} présent{dinnerCount > 1 ? 's' : ''}</span>
          {assiettCount > 0 && <span>🍽️ {assiettCount} assiette{assiettCount > 1 ? 's' : ''}</span>}
          <span style={{ opacity: 0.7 }}>{dinnerResponses.filter(r => members.find(m => m.id === r.member_id)).length}/{members.length} répondu{members.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {currentMember?.is_active && (
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: C.text }}>Ta réponse, {currentMember.name} 👇</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {(Object.entries(statusConfig) as [DinnerStatus, typeof statusConfig.oui][]).map(([status, cfg]) => (
              <button key={status} onClick={() => setSelectedStatus(status)} style={{ padding: '12px 14px', borderRadius: '10px', textAlign: 'left', border: `2px solid ${selectedStatus === status ? cfg.color : C.border}`, backgroundColor: selectedStatus === status ? cfg.bg : C.bg, color: selectedStatus === status ? cfg.color : C.text, fontWeight: selectedStatus === status ? '600' : '400', cursor: 'pointer', fontSize: '14px' }}>{cfg.label}</button>
            ))}
          </div>
          {(selectedStatus === 'oui' || selectedStatus === 'assiette') && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: C.muted, display: 'block', marginBottom: '6px' }}>Heure d&apos;arrivée (optionnel)</label>
              <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} style={S.input} />
            </div>
          )}
          <button onClick={async () => { if (!selectedStatus) return; setSaving(true); await onUpdateResponse(selectedStatus, arrivalTime || null); setSaving(false) }}
            disabled={!selectedStatus || saving} style={{ ...S.btnFill(C.primary), width: '100%', padding: '12px', fontSize: '15px', opacity: !selectedStatus || saving ? 0.5 : 1 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer ma réponse'}
          </button>
        </div>
      )}

      <div style={{ fontSize: '12px', fontWeight: '700', color: C.muted, marginBottom: '8px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        La famille ({members.length} actif{members.length > 1 ? 's' : ''})
      </div>
      {members.map(member => {
        const response = dinnerResponses.find(r => r.member_id === member.id && r.date === today)
        const cfg = response ? statusConfig[response.status] : null
        const isMe = currentMember?.id === member.id
        return (
          <div key={member.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', ...(isMe ? { borderColor: C.primary, borderWidth: '2px' } : {}) }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: cfg ? cfg.bg : '#F0F2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: cfg ? cfg.color : C.muted, flexShrink: 0 }}>{member.name[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: C.text }}>{member.name} {isMe && <span style={{ fontSize: '11px', color: C.primary, fontWeight: '500' }}>(toi)</span>}</div>
              {response ? <div style={{ fontSize: '13px', color: cfg?.color }}>{cfg?.label}{response.arrival_time && <span style={{ color: C.muted }}> · {response.arrival_time}</span>}</div>
                : <div style={{ fontSize: '13px', color: '#B0B0C0' }}>Pas encore répondu…</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ================================================================
// ONGLET TÂCHES
// ================================================================
function CorveesTab({ chores, members, currentMember, onClaimChore, onUnclaimChore, onToggleDone, onAddChore, onDeleteChore }: {
  chores: Chore[]; members: Member[]; currentMember: Member | null
  onClaimChore: (id: string) => Promise<void>; onUnclaimChore: (id: string) => Promise<void>
  onToggleDone: (id: string, isDone: boolean) => Promise<void>
  onAddChore: (name: string) => Promise<void>; onDeleteChore: (id: string) => Promise<void>
}) {
  const [newChore, setNewChore] = useState('')
  const getName = (id: string | null) => members.find(m => m.id === id)?.name || null
  const pending = chores.filter(c => !c.is_done)
  const done = chores.filter(c => c.is_done)

  const addChore = async () => { if (!newChore.trim()) return; await onAddChore(newChore.trim()); setNewChore('') }

  return (
    <div>
      <div style={{ ...S.card, backgroundColor: C.green, color: 'white', border: 'none' }}>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Tâches à faire</div>
        <div style={{ fontSize: '26px', fontWeight: '700' }}>{pending.filter(c => c.assigned_to_id).length}/{pending.length} <span style={{ fontSize: '14px', opacity: 0.85 }}>prises en charge</span></div>
        <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.75 }}>{done.length} terminée{done.length > 1 ? 's' : ''}</div>
      </div>
      <div style={S.card}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: C.text }}>➕ Ajouter une tâche</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newChore} onChange={e => setNewChore(e.target.value)} onKeyDown={e => e.key === 'Enter' && addChore()} placeholder="Ex: Passer l'aspirateur…" style={{ ...S.input, flex: 1 }} />
          <button onClick={addChore} disabled={!newChore.trim()} style={{ ...S.btnFill(C.green), opacity: !newChore.trim() ? 0.5 : 1 }}>Ajouter</button>
        </div>
      </div>
      {pending.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: C.muted }}><div style={{ fontSize: '36px', marginBottom: '8px' }}>✨</div><div style={{ fontSize: '15px' }}>Aucune tâche en cours</div></div>}
      {pending.map(chore => {
        const assignedName = getName(chore.assigned_to_id)
        const isMe = chore.assigned_to_id === currentMember?.id
        return (
          <div key={chore.id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '500', color: C.text }}>{chore.name}</div>
                {assignedName ? <div style={{ fontSize: '13px', color: C.green, marginTop: '3px', fontWeight: '500' }}>👤 {assignedName}{isMe && <span style={{ color: C.primary }}> (toi !)</span>}</div>
                  : <div style={{ fontSize: '13px', color: '#B0B0C0', marginTop: '3px' }}>Non assignée</div>}
              </div>
              <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
                {!chore.assigned_to_id && currentMember && <button onClick={() => onClaimChore(chore.id)} style={S.btn(C.green, C.greenLight)}>Je le fais</button>}
                {isMe && <button onClick={() => onToggleDone(chore.id, chore.is_done)} style={S.btn(C.green, C.greenLight)}>✓ Fait</button>}
                {chore.assigned_to_id && <button onClick={() => onUnclaimChore(chore.id)} style={S.btn(C.muted, '#F0F2F8')}>Libérer</button>}
                <button onClick={() => onDeleteChore(chore.id)} style={S.btnIcon(C.red, C.redLight)}>✕</button>
              </div>
            </div>
          </div>
        )
      })}
      {done.length > 0 && <>
        <div style={{ fontSize: '12px', fontWeight: '700', color: C.muted, margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✓ Terminées ({done.length})</div>
        {done.map(chore => (
          <div key={chore.id} style={{ ...S.card, opacity: 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', textDecoration: 'line-through', color: C.muted }}>{chore.name}</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={() => onToggleDone(chore.id, chore.is_done)} style={S.btn(C.muted, '#F0F2F8')}>Refaire</button>
                <button onClick={() => onDeleteChore(chore.id)} style={S.btnIcon(C.red, C.redLight)}>✕</button>
              </div>
            </div>
            {chore.assigned_to_id && <div style={{ fontSize: '12px', color: C.green, marginTop: '2px' }}>✓ {getName(chore.assigned_to_id)}</div>}
          </div>
        ))}
      </>}
    </div>
  )
}

// ================================================================
// ONGLET COURSES (avec photo OCR + sauvegarde photo)
// ================================================================
function CoursesTab({ items, members, currentMember, onAddItem, onAddItems, onAddPhoto, onToggleItem, onDeleteDone }: {
  items: ShoppingItem[]; members: Member[]; currentMember: Member | null
  onAddItem: (name: string) => Promise<void>
  onAddItems: (names: string[]) => Promise<void>
  onAddPhoto: (base64: string) => Promise<void>
  onToggleItem: (id: string, isDone: boolean) => Promise<void>
  onDeleteDone: () => Promise<void>
}) {
  const [newItem, setNewItem] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [savingPhoto, setSavingPhoto] = useState(false)
  const [ocrPreview, setOcrPreview] = useState<string[]>([])
  const [currentBase64, setCurrentBase64] = useState<string | null>(null)
  const [selectedOcrItems, setSelectedOcrItems] = useState<Set<number>>(new Set())
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pending = items.filter(i => !i.is_done)
  const done = items.filter(i => i.is_done)
  const getName = (id: string | null) => members.find(m => m.id === id)?.name || null

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    setOcrPreview([])
    setCurrentBase64(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      setCurrentBase64(base64)
      try {
        const formData = new FormData()
        formData.append('base64Image', base64)
        formData.append('language', 'fre')
        formData.append('OCREngine', '2')
        formData.append('scale', 'true')
        formData.append('isOverlayRequired', 'false')
        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { apikey: process.env.NEXT_PUBLIC_OCR_SPACE_KEY || 'helloworld' },
          body: formData,
        })
        const result = await response.json()
        const text = result?.ParsedResults?.[0]?.ParsedText || ''
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 1)
        if (lines.length > 0) {
          setOcrPreview(lines)
          setSelectedOcrItems(new Set(lines.map((_: string, i: number) => i)))
        }
      } catch { /* OCR failed, currentBase64 still set */ }
      finally { setOcrLoading(false) }
    }
    reader.readAsDataURL(file)
    // reset input so same photo can be re-selected
    e.target.value = ''
  }

  async function confirmOcrItems() {
    const toAdd = ocrPreview.filter((_, i) => selectedOcrItems.has(i))
    if (toAdd.length > 0) await onAddItems(toAdd)
    setOcrPreview([])
    setCurrentBase64(null)
  }

  async function savePhotoAsItem() {
    if (!currentBase64) return
    setSavingPhoto(true)
    await onAddPhoto(currentBase64)
    setOcrPreview([])
    setCurrentBase64(null)
    setSavingPhoto(false)
  }

  return (
    <div>
      {/* Photo agrandie */}
      {expandedPhoto && (
        <div style={S.overlay} onClick={() => setExpandedPhoto(null)}>
          <div style={{ padding: '20px', width: '100%', maxWidth: '480px' }}>
            <img src={expandedPhoto} alt="liste" style={{ width: '100%', borderRadius: '12px', maxHeight: '70vh', objectFit: 'contain' }} />
            <button onClick={() => setExpandedPhoto(null)} style={{ ...S.btnFill(C.primary), width: '100%', padding: '12px', marginTop: '12px', fontSize: '15px' }}>Fermer</button>
          </div>
        </div>
      )}

      <div style={{ ...S.card, backgroundColor: C.purple, color: 'white', border: 'none' }}>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Liste de courses</div>
        <div style={{ fontSize: '26px', fontWeight: '700' }}>{pending.filter(i => !i.image_url).length} <span style={{ fontSize: '14px', opacity: 0.85 }}>article{pending.filter(i => !i.image_url).length > 1 ? 's' : ''} à acheter</span></div>
      </div>

      {/* Saisie */}
      <div style={S.card}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) { onAddItem(newItem.trim()); setNewItem('') } }}
            placeholder="Ajouter un article…" style={{ ...S.input, flex: 1 }} />
          <button onClick={() => { if (!newItem.trim()) return; onAddItem(newItem.trim()); setNewItem('') }}
            disabled={!newItem.trim()} style={{ ...S.btnFill(C.purple), opacity: !newItem.trim() ? 0.5 : 1 }}>Ajouter</button>
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}
          style={{ ...S.btn(C.purple, C.purpleLight), width: '100%', padding: '10px', textAlign: 'center', opacity: ocrLoading ? 0.6 : 1 }}>
          {ocrLoading ? '⏳ Lecture en cours…' : '📷 Photographier une liste manuscrite'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
      </div>

      {/* Résultat OCR ou photo brute */}
      {(ocrPreview.length > 0 || currentBase64) && !ocrLoading && (
        <div style={{ ...S.card, border: `2px solid ${C.purple}` }}>
          {ocrPreview.length > 0 ? (
            <>
              <div style={{ fontSize: '14px', fontWeight: '700', color: C.purple, marginBottom: '4px' }}>📋 Articles détectés</div>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '12px' }}>Décoche ce que tu ne veux pas ajouter</div>
              {ocrPreview.map((line, i) => (
                <div key={i} onClick={() => { const s = new Set(selectedOcrItems); s.has(i) ? s.delete(i) : s.add(i); setSelectedOcrItems(s) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, border: `2px solid ${C.purple}`, backgroundColor: selectedOcrItems.has(i) ? C.purple : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>{selectedOcrItems.has(i) ? '✓' : ''}</div>
                  <span style={{ flex: 1, fontSize: '14px', color: selectedOcrItems.has(i) ? C.text : '#B0B0C0', textDecoration: selectedOcrItems.has(i) ? 'none' : 'line-through' }}>{line}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button onClick={confirmOcrItems} disabled={selectedOcrItems.size === 0} style={{ ...S.btnFill(C.purple), flex: 2, padding: '10px', opacity: selectedOcrItems.size === 0 ? 0.5 : 1 }}>
                  ✓ Ajouter {selectedOcrItems.size} article{selectedOcrItems.size > 1 ? 's' : ''}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', fontWeight: '600', color: C.muted, marginBottom: '8px' }}>Texte non reconnu automatiquement</div>
            </>
          )}

          {/* Bouton "garder la photo" — toujours présent si on a une photo */}
          {currentBase64 && (
            <div style={{ marginTop: ocrPreview.length > 0 ? '8px' : '0' }}>
              {currentBase64 && <img src={currentBase64} alt="aperçu" style={{ width: '100%', borderRadius: '8px', maxHeight: '180px', objectFit: 'contain', marginBottom: '10px' }} />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setOcrPreview([]); setCurrentBase64(null) }} style={{ ...S.btn(C.muted, '#F0F2F8'), flex: 1, padding: '10px', textAlign: 'center' }}>Annuler</button>
                <button onClick={savePhotoAsItem} disabled={savingPhoto} style={{ ...S.btn(C.purple, C.purpleLight), flex: 2, padding: '10px', textAlign: 'center', opacity: savingPhoto ? 0.6 : 1 }}>
                  {savingPhoto ? 'Sauvegarde…' : '🖼️ Garder la photo telle quelle'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: C.muted }}><div style={{ fontSize: '36px', marginBottom: '8px' }}>🛒</div><div style={{ fontSize: '15px' }}>La liste est vide</div></div>
      )}

      {pending.map(item => (
        <div key={item.id} style={{ ...S.card, padding: '12px 14px' }}>
          {item.image_url ? (
            // Article photo
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: C.purple }}>📷 Photo de liste</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setExpandedPhoto(item.image_url!)} style={S.btn(C.purple, C.purpleLight)}>Agrandir</button>
                  <button onClick={() => onToggleItem(item.id, item.is_done)} style={S.btn(C.green, C.greenLight)}>✓ Vue</button>
                  <button onClick={() => onToggleItem(item.id, true)} style={S.btnIcon(C.red, C.redLight)}>✕</button>
                </div>
              </div>
              <img src={item.image_url} alt="liste" onClick={() => setExpandedPhoto(item.image_url!)} style={{ width: '100%', borderRadius: '8px', maxHeight: '160px', objectFit: 'cover', cursor: 'pointer' }} />
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px', textAlign: 'center' }}>Appuie pour agrandir</div>
            </div>
          ) : (
            // Article texte normal
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => onToggleItem(item.id, item.is_done)} style={{ width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0, border: `2px solid ${C.purple}`, backgroundColor: 'transparent', cursor: 'pointer' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', color: C.text }}>{item.name}</div>
                {item.added_by_id && <div style={{ fontSize: '12px', color: '#B0B0C0' }}>Ajouté par {getName(item.added_by_id)}</div>}
              </div>
            </div>
          )}
        </div>
      ))}

      {done.length > 0 && <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>✓ Fait ({done.length})</div>
          <button onClick={onDeleteDone} style={S.btn(C.red, C.redLight)}>Tout supprimer</button>
        </div>
        {done.map(item => (
          <div key={item.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', opacity: 0.5 }}>
            <button onClick={() => onToggleItem(item.id, item.is_done)} style={{ width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0, border: `2px solid ${C.purple}`, backgroundColor: C.purple, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>✓</button>
            <div style={{ flex: 1, textDecoration: 'line-through', color: C.muted, fontSize: '15px' }}>{item.image_url ? '📷 Photo de liste' : item.name}</div>
          </div>
        ))}
      </>}
    </div>
  )
}

// ================================================================
// ONGLET CORSE
// ================================================================
function CorseTab({ tasks, onToggle, onAdd, onDelete, onReset }: {
  tasks: CorseTask[]
  onToggle: (id: string, isDone: boolean) => Promise<void>
  onAdd: (name: string, category: 'ouvrir' | 'fermer') => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReset: (category: 'ouvrir' | 'fermer') => Promise<void>
}) {
  const [newOuvrir, setNewOuvrir] = useState('')
  const [newFermer, setNewFermer] = useState('')
  const ouvrirTasks = tasks.filter(t => t.category === 'ouvrir')
  const fermerTasks = tasks.filter(t => t.category === 'fermer')

  function Section({ category, label, icon, color, newVal, setNew }: { category: 'ouvrir' | 'fermer'; label: string; icon: string; color: string; newVal: string; setNew: (v: string) => void }) {
    const list = category === 'ouvrir' ? ouvrirTasks : fermerTasks
    const doneCount = list.filter(t => t.is_done).length
    const add = () => { if (!newVal.trim()) return; onAdd(newVal.trim(), category).then(() => setNew('')) }
    return (
      <div style={{ ...S.card, marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: C.text }}>{icon} {label}</div>
            <div style={{ fontSize: '12px', color: C.muted }}>{doneCount}/{list.length} fait{doneCount > 1 ? 's' : ''}</div>
          </div>
          {doneCount > 0 && <button onClick={() => onReset(category)} style={S.btn(C.muted, '#F0F2F8')}>↺ Réinitialiser</button>}
        </div>
        <div style={{ height: '6px', backgroundColor: '#F0F2F8', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: color, borderRadius: '3px', width: list.length > 0 ? `${(doneCount / list.length) * 100}%` : '0%', transition: 'width 0.3s' }} />
        </div>
        {list.map(task => (
          <div key={task.id} onClick={() => onToggle(task.id, task.is_done)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, border: `2px solid ${task.is_done ? color : C.border}`, backgroundColor: task.is_done ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '12px' }}>{task.is_done ? '✓' : ''}</div>
            <span style={{ flex: 1, fontSize: '14px', color: task.is_done ? C.muted : C.text, textDecoration: task.is_done ? 'line-through' : 'none' }}>{task.name}</span>
            <button onClick={e => { e.stopPropagation(); onDelete(task.id) }} style={{ ...S.btnIcon(C.red, 'transparent'), opacity: 0.4, padding: '2px 6px' }}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input value={newVal} onChange={e => setNew(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Ajouter une étape…" style={{ ...S.input, flex: 1, fontSize: '13px', padding: '8px 10px' }} />
          <button onClick={add} disabled={!newVal.trim()} style={{ ...S.btnFill(color), opacity: !newVal.trim() ? 0.5 : 1, padding: '8px 12px' }}>+</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ ...S.card, backgroundImage: 'linear-gradient(135deg, #1E90C8, #2BC4A0)', color: 'white', border: 'none', textAlign: 'center', padding: '20px', marginBottom: '12px' }}>
        <div style={{ fontSize: '32px', marginBottom: '6px' }}>🏝️</div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>Maison de Corse</div>
        <div style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>Checklist ouverture & fermeture</div>
      </div>
      <Section category="ouvrir" label="Ouvrir la maison" icon="🔑" color="#1E90C8" newVal={newOuvrir} setNew={setNewOuvrir} />
      <Section category="fermer" label="Fermer la maison" icon="🔒" color="#2BC4A0" newVal={newFermer} setNew={setNewFermer} />
    </div>
  )
}

// ================================================================
// ONGLET POUBELLES
// ================================================================
function PoubellsTab() {
  const { yellow, brown } = getTrashInfo()
  const daysToWed = daysUntil(3), daysToTue = daysUntil(2), daysToFri = daysUntil(5)
  const nextBrown = daysToTue <= daysToFri ? { label: 'Mardi', days: daysToTue } : { label: 'Vendredi', days: daysToFri }
  const today = yellow || brown
  return (
    <div>
      {yellow && <div style={{ ...S.card, backgroundColor: '#F39C12', color: 'white', border: 'none', textAlign: 'center', padding: '28px 20px', marginBottom: '10px' }}><div style={{ fontSize: '48px', marginBottom: '8px' }}>🟡</div><div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Poubelle jaune ce soir !</div><div style={{ fontSize: '15px', opacity: 0.92 }}>C'est mercredi — sortez la poubelle jaune</div></div>}
      {brown && <div style={{ ...S.card, backgroundColor: '#795548', color: 'white', border: 'none', textAlign: 'center', padding: '28px 20px', marginBottom: '10px' }}><div style={{ fontSize: '48px', marginBottom: '8px' }}>🟤</div><div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Poubelle marron ce soir !</div><div style={{ fontSize: '15px', opacity: 0.92 }}>C'est {new Date().getDay() === 2 ? 'mardi' : 'vendredi'} — sortez la poubelle marron</div></div>}
      {!today && <div style={{ ...S.card, textAlign: 'center', padding: '28px 20px' }}><div style={{ fontSize: '44px', marginBottom: '10px' }}>🗑️</div><div style={{ fontSize: '17px', fontWeight: '600', color: C.text, marginBottom: '4px' }}>Pas de poubelle aujourd'hui</div><div style={{ fontSize: '13px', color: C.muted }}>Profitez-en !</div></div>}
      <div style={{ ...S.card, marginTop: today ? '0' : '8px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: C.text, marginBottom: '12px' }}>📅 Prochaines sorties</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#FFFDE7', borderRadius: '10px', border: '1px solid #F9A825' }}>
            <span style={{ fontSize: '28px' }}>🟡</span>
            <div><div style={{ fontSize: '14px', fontWeight: '600', color: C.text }}>Poubelle jaune</div><div style={{ fontSize: '13px', color: C.muted }}>Mercredi · {yellow ? "aujourd'hui !" : `dans ${daysToWed}j`}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#EFEBE9', borderRadius: '10px', border: '1px solid #A1887F' }}>
            <span style={{ fontSize: '28px' }}>🟤</span>
            <div><div style={{ fontSize: '14px', fontWeight: '600', color: C.text }}>Poubelle marron</div><div style={{ fontSize: '13px', color: C.muted }}>Mardi & vendredi · {brown ? "aujourd'hui !" : `prochain : ${nextBrown.label} dans ${nextBrown.days}j`}</div></div>
          </div>
        </div>
      </div>
    </div>
  )
}
