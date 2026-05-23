'use client'

import { useState, useEffect, useCallback } from 'react'
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
type DinnerResponse = {
  id: string; member_id: string; date: string
  status: DinnerStatus; arrival_time: string | null
}
type Chore = {
  id: string; name: string; assigned_to_id: string | null
  is_done: boolean; created_at: string
}
type ShoppingItem = {
  id: string; name: string; added_by_id: string | null
  is_done: boolean; created_at: string
}
type TabId = 'soir' | 'corvees' | 'courses' | 'poubelles'

// ================================================================
// UTILITAIRES
// ================================================================
function getToday() { return new Date().toISOString().split('T')[0] }

function getTrashInfo() {
  const day = new Date().getDay()
  return { yellow: day === 3, brown: day === 2 || day === 5 }
}
function isTrashDay() { const t = getTrashInfo(); return t.yellow || t.brown }
function isWednesday() { return new Date().getDay() === 3 }
function daysUntil(targetDay: number) {
  const day = new Date().getDay()
  const diff = targetDay >= day ? targetDay - day : 7 - day + targetDay
  return diff || 7
}
function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

// ================================================================
// STYLES
// ================================================================
const S = {
  app: { minHeight: '100vh', backgroundColor: '#FFF8F0', paddingBottom: '80px' } as React.CSSProperties,
  header: { backgroundColor: '#D4603A', color: 'white', padding: '16px 20px 12px', position: 'sticky' as const, top: 0, zIndex: 10 },
  headerTitle: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.3px' },
  headerSub: { fontSize: '13px', opacity: 0.85, marginTop: '2px', textTransform: 'capitalize' as const },
  content: { padding: '16px' },
  tabBar: {
    position: 'fixed' as const, bottom: 0, left: '50%', transform: 'translateX(-50%)',
    width: '100%', maxWidth: '480px', backgroundColor: '#FFFFFF',
    borderTop: '1px solid #E8D5C4', display: 'flex', zIndex: 20,
    paddingBottom: 'env(safe-area-inset-bottom)',
  },
  tabBtn: (active: boolean, accent?: string) => ({
    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', padding: '8px 4px', gap: '3px', cursor: 'pointer',
    border: 'none', background: 'none', color: active ? (accent || '#D4603A') : '#8B7355',
    fontSize: '10px', fontWeight: active ? '600' : '400', transition: 'color 0.15s',
  }),
  tabIcon: { fontSize: '22px', lineHeight: '1' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '14px',
    marginBottom: '10px', border: '1px solid #E8D5C4', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  btn: (color: string, light: string) => ({
    backgroundColor: light, color: color, border: `1.5px solid ${color}`,
    borderRadius: '20px', padding: '6px 14px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  }),
  btnFill: (color: string) => ({
    backgroundColor: color, color: 'white', border: 'none',
    borderRadius: '20px', padding: '6px 14px', fontSize: '13px',
    fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  }),
  btnSmall: (color: string, bg: string) => ({
    backgroundColor: bg, color: color, border: 'none',
    borderRadius: '8px', padding: '4px 10px', fontSize: '12px',
    fontWeight: '500', cursor: 'pointer',
  }),
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '10px',
    border: '1.5px solid #E8D5C4', fontSize: '14px',
    backgroundColor: '#FFF8F0', color: '#2D1F0E', outline: 'none',
  },
  overlay: {
    position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    backgroundColor: '#FFFFFF', borderRadius: '20px 20px 0 0',
    padding: '24px 20px 40px', width: '100%', maxWidth: '480px',
    maxHeight: '80vh', overflowY: 'auto' as const,
  },
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
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async (memberId?: string | null) => {
    const today = getToday()
    const [{ data: membersData }, { data: dinnerData }, { data: choresData }, { data: shoppingData }] =
      await Promise.all([
        supabase.from('members').select('*').order('name'),
        supabase.from('dinner_responses').select('*').eq('date', today),
        supabase.from('chores').select('*').order('created_at'),
        supabase.from('shopping_items').select('*').order('created_at'),
      ])
    if (membersData) {
      setMembers(membersData)
      if (memberId) {
        const found = membersData.find((m: Member) => m.id === memberId)
        if (found) setCurrentMember(found)
        else setShowIdentityModal(true)
      }
    }
    if (dinnerData) setDinnerResponses(dinnerData)
    if (choresData) setChores(choresData)
    if (shoppingData) setShoppingItems(shoppingData)
    setLoading(false)
  }, [])

  useEffect(() => {
    const savedId = typeof window !== 'undefined' ? localStorage.getItem('giros_member_id') : null
    if (!savedId) setShowIdentityModal(true)
    loadAll(savedId)
  }, [loadAll])

  useEffect(() => {
    const today = getToday()
    const dinnerCh = supabase.channel('rt-dinner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dinner_responses' }, async () => {
        const { data } = await supabase.from('dinner_responses').select('*').eq('date', today)
        if (data) setDinnerResponses(data)
      }).subscribe()
    const choresCh = supabase.channel('rt-chores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores' }, async () => {
        const { data } = await supabase.from('chores').select('*').order('created_at')
        if (data) setChores(data)
      }).subscribe()
    const shoppingCh = supabase.channel('rt-shopping')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, async () => {
        const { data } = await supabase.from('shopping_items').select('*').order('created_at')
        if (data) setShoppingItems(data)
      }).subscribe()
    const membersCh = supabase.channel('rt-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, async () => {
        const { data } = await supabase.from('members').select('*').order('name')
        if (data) {
          setMembers(data)
          const savedId = localStorage.getItem('giros_member_id')
          const updated = data.find((m: Member) => m.id === savedId)
          if (updated) setCurrentMember(updated)
        }
      }).subscribe()
    return () => {
      supabase.removeChannel(dinnerCh)
      supabase.removeChannel(choresCh)
      supabase.removeChannel(shoppingCh)
      supabase.removeChannel(membersCh)
    }
  }, [])

  function selectIdentity(member: Member) {
    setCurrentMember(member)
    localStorage.setItem('giros_member_id', member.id)
    setShowIdentityModal(false)
  }

  async function toggleMemberActive(member: Member) {
    await supabase.from('members').update({ is_active: !member.is_active }).eq('id', member.id)
  }

  const activeMembers = members.filter(m => m.is_active)
  const dinnerCount = dinnerResponses.filter(r => r.status === 'oui' && activeMembers.find(m => m.id === r.member_id)).length
  const assiettCount = dinnerResponses.filter(r => r.status === 'assiette' && activeMembers.find(m => m.id === r.member_id)).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#FFF8F0' }}>
        <div style={{ textAlign: 'center', color: '#D4603A' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏠</div>
          <div style={{ fontSize: '15px', fontWeight: '500' }}>Chargement…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={S.app}>
      {showIdentityModal && <IdentityModal members={members} onSelect={selectIdentity} />}

      {/* Modal gestion membres (Elisabeth uniquement) */}
      {showMembersModal && currentMember?.is_mom && (
        <div style={S.overlay} onClick={() => setShowMembersModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>👥 Membres actifs</div>
            <div style={{ fontSize: '13px', color: '#8B7355', marginBottom: '18px' }}>
              Les membres en pause n'apparaissent pas dans le sondage dîner.
            </div>
            {members.filter(m => !m.is_mom).map(member => (
              <div key={member.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: '1px solid #F0E8E0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    backgroundColor: member.is_active ? '#E0F0E8' : '#F0E8E0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '700',
                    color: member.is_active ? '#4A8C6F' : '#B0A090',
                  }}>
                    {member.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '500', color: member.is_active ? '#2D1F0E' : '#B0A090' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '12px', color: member.is_active ? '#4A8C6F' : '#B0A090', fontWeight: '500' }}>
                      {member.is_active ? '✅ Actif·ve' : '⏸️ En pause'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleMemberActive(member)}
                  style={member.is_active
                    ? S.btn('#E67E22', '#FEF3E2')
                    : S.btn('#4A8C6F', '#E0F0E8')
                  }
                >
                  {member.is_active ? 'Mettre en pause' : 'Réactiver'}
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowMembersModal(false)}
              style={{ ...S.btnFill('#D4603A'), width: '100%', padding: '12px', marginTop: '20px', fontSize: '15px' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={S.headerTitle}>🏠 Chez les Giros</div>
            <div style={S.headerSub}>{formatDate(getToday())}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Bouton gestion membres — Elisabeth uniquement */}
            {currentMember?.is_mom && (
              <button
                onClick={() => setShowMembersModal(true)}
                title="Gérer les membres"
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                  color: 'white', fontSize: '16px', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                👥
              </button>
            )}
            {currentMember && (
              <div style={{ textAlign: 'right', marginRight: '2px' }}>
                <div style={{ fontSize: '11px', opacity: 0.75 }}>Connecté·e en tant que</div>
                <div style={{ fontSize: '14px', fontWeight: '600' }}>{currentMember.name}</div>
              </div>
            )}
            <div
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                color: 'white', fontSize: '14px', fontWeight: '600', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
              onClick={() => setShowIdentityModal(true)}
              title="Changer de profil"
            >
              {currentMember ? currentMember.name[0] : '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div style={S.content}>
        {activeTab === 'soir' && (
          <SoirTab
            members={activeMembers}
            allMembers={members}
            dinnerResponses={dinnerResponses}
            currentMember={currentMember}
            dinnerCount={dinnerCount}
            assiettCount={assiettCount}
            chores={chores}
            onUpdateResponse={async (status, arrivalTime) => {
              if (!currentMember) return
              const today = getToday()
              const existing = dinnerResponses.find(r => r.member_id === currentMember.id && r.date === today)
              if (existing) {
                await supabase.from('dinner_responses').update({ status, arrival_time: arrivalTime, updated_at: new Date().toISOString() }).eq('id', existing.id)
              } else {
                await supabase.from('dinner_responses').insert({ member_id: currentMember.id, date: today, status, arrival_time: arrivalTime })
              }
            }}
          />
        )}
        {activeTab === 'corvees' && (
          <CorveesTab
            chores={chores} members={members} currentMember={currentMember}
            onClaimChore={async (id) => { if (!currentMember) return; await supabase.from('chores').update({ assigned_to_id: currentMember.id }).eq('id', id) }}
            onUnclaimChore={async (id) => { await supabase.from('chores').update({ assigned_to_id: null }).eq('id', id) }}
            onToggleDone={async (id, isDone) => { await supabase.from('chores').update({ is_done: !isDone }).eq('id', id) }}
            onAddChore={async (name) => { await supabase.from('chores').insert({ name }) }}
            onDeleteChore={async (id) => { await supabase.from('chores').delete().eq('id', id) }}
          />
        )}
        {activeTab === 'courses' && (
          <CoursesTab
            items={shoppingItems} members={members} currentMember={currentMember}
            onAddItem={async (name) => { if (!currentMember) return; await supabase.from('shopping_items').insert({ name, added_by_id: currentMember.id }) }}
            onToggleItem={async (id, isDone) => { await supabase.from('shopping_items').update({ is_done: !isDone }).eq('id', id) }}
            onDeleteDone={async () => { await supabase.from('shopping_items').delete().eq('is_done', true) }}
          />
        )}
        {activeTab === 'poubelles' && <PoubellsTab />}
      </div>

      {/* Tab bar */}
      <div style={S.tabBar}>
        {([
          { id: 'soir', icon: '🍽️', label: 'Ce soir' },
          { id: 'corvees', icon: '✅', label: 'Tâches' },
          { id: 'courses', icon: '🛒', label: 'Courses' },
          { id: 'poubelles', icon: '🗑️', label: 'Poubelles', accent: isTrashDay() ? '#E67E22' : undefined },
        ] as { id: TabId; icon: string; label: string; accent?: string }[]).map(tab => (
          <button key={tab.id} style={S.tabBtn(activeTab === tab.id, tab.accent)} onClick={() => setActiveTab(tab.id)}>
            <span style={S.tabIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
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
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#2D1F0E' }}>Qui es-tu ?</div>
          <div style={{ fontSize: '14px', color: '#8B7355', marginTop: '4px' }}>Sélectionne ton prénom pour commencer</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map(member => (
            <button key={member.id} onClick={() => onSelect(member)} style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
              borderRadius: '12px', border: '2px solid #E8D5C4', backgroundColor: '#FFF8F0',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: member.is_mom ? '#F5E6DF' : '#E8D5C4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '700', color: '#D4603A', flexShrink: 0,
              }}>
                {member.name[0]}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#2D1F0E' }}>{member.name}</div>
                {member.is_mom && <div style={{ fontSize: '12px', color: '#8B7355' }}>👑 Maîtresse de maison</div>}
                {!member.is_active && <div style={{ fontSize: '12px', color: '#B0A090' }}>⏸️ En pause</div>}
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
  members: Member[]      // membres actifs seulement
  allMembers: Member[]   // tous les membres (pour le résumé)
  dinnerResponses: DinnerResponse[]
  currentMember: Member | null
  dinnerCount: number
  assiettCount: number
  chores: Chore[]
  onUpdateResponse: (status: DinnerStatus, arrivalTime: string | null) => Promise<void>
}) {
  const today = getToday()
  const [selectedStatus, setSelectedStatus] = useState<DinnerStatus | null>(null)
  const [arrivalTime, setArrivalTime] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (currentMember) {
      const existing = dinnerResponses.find(r => r.member_id === currentMember.id && r.date === today)
      if (existing) { setSelectedStatus(existing.status); setArrivalTime(existing.arrival_time || '') }
    }
  }, [currentMember, dinnerResponses, today])

  const getMemberName = (id: string) => allMembers.find(m => m.id === id)?.name || '?'
  const comingHome = dinnerResponses.filter(r => (r.status === 'oui' || r.status === 'assiette') && members.find(m => m.id === r.member_id))
  const notComing = dinnerResponses.filter(r => r.status === 'non' && members.find(m => m.id === r.member_id))
  const assignedChores = chores.filter(c => c.assigned_to_id !== null && !c.is_done)
  const unassignedChores = chores.filter(c => c.assigned_to_id === null && !c.is_done)

  const statusConfig = {
    oui: { label: '✅ Oui, je rentre', color: '#4A8C6F', bg: '#E0F0E8' },
    non: { label: '❌ Non, pas là', color: '#C0392B', bg: '#FDEAEA' },
    assiette: { label: '🍽️ Garde-moi une assiette', color: '#E67E22', bg: '#FEF3E2' },
  }

  async function handleSave() {
    if (!selectedStatus) return
    setSaving(true)
    await onUpdateResponse(selectedStatus, arrivalTime || null)
    setSaving(false)
  }

  return (
    <div>
      {/* Résumé du jour */}
      <div style={{ ...S.card, border: '2px solid #D4603A' }}>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#D4603A', marginBottom: '12px' }}>📋 Résumé du jour</div>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Ce soir à la maison
          </div>
          {comingHome.length === 0 && notComing.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#B0A090' }}>Personne n'a encore répondu…</div>
          ) : (
            <>
              {comingHome.map(r => (
                <div key={r.id} style={{ fontSize: '14px', color: '#2D1F0E', marginBottom: '2px', display: 'flex', gap: '6px' }}>
                  <span>{r.status === 'assiette' ? '🍽️' : '🟢'}</span>
                  <span><strong>{getMemberName(r.member_id)}</strong>{r.arrival_time ? ` · ${r.arrival_time}` : ''}{r.status === 'assiette' ? ' (assiette)' : ''}</span>
                </div>
              ))}
              {notComing.map(r => (
                <div key={r.id} style={{ fontSize: '14px', color: '#8B7355', marginBottom: '2px', display: 'flex', gap: '6px' }}>
                  <span>🔴</span><span>{getMemberName(r.member_id)} · absent·e</span>
                </div>
              ))}
            </>
          )}
        </div>
        <div style={{ borderTop: '1px solid #E8D5C4', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
            Tâches à faire
          </div>
          {chores.filter(c => !c.is_done).length === 0 ? (
            <div style={{ fontSize: '13px', color: '#4A8C6F', fontWeight: '500' }}>✨ Tout est fait !</div>
          ) : (
            <>
              {assignedChores.map(c => (
                <div key={c.id} style={{ fontSize: '13px', color: '#2D1F0E', marginBottom: '2px' }}>
                  ✅ <strong>{getMemberName(c.assigned_to_id!)}</strong> · {c.name}
                </div>
              ))}
              {unassignedChores.map(c => (
                <div key={c.id} style={{ fontSize: '13px', color: '#C0392B', marginBottom: '2px' }}>
                  ⚠️ {c.name} <span style={{ color: '#8B7355' }}>(non assignée)</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Compteur */}
      <div style={{ ...S.card, backgroundColor: '#D4603A', color: 'white', border: 'none' }}>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Ce soir à la maison</div>
        <div style={{ fontSize: '28px', fontWeight: '700' }}>
          {dinnerCount + assiettCount} <span style={{ fontSize: '16px', fontWeight: '400', opacity: 0.85 }}>pour dîner</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
          <span>🟢 {dinnerCount} présent{dinnerCount > 1 ? 's' : ''}</span>
          {assiettCount > 0 && <span>🍽️ {assiettCount} assiette{assiettCount > 1 ? 's' : ''}</span>}
          <span style={{ opacity: 0.7 }}>{dinnerResponses.filter(r => members.find(m => m.id === r.member_id)).length}/{members.length} répondu{members.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Ma réponse */}
      {currentMember && currentMember.is_active && (
        <div style={S.card}>
          <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#2D1F0E' }}>
            Ta réponse, {currentMember.name} 👇
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {(Object.entries(statusConfig) as [DinnerStatus, { label: string; color: string; bg: string }][]).map(([status, cfg]) => (
              <button key={status} onClick={() => setSelectedStatus(status)} style={{
                padding: '12px 14px', borderRadius: '10px',
                border: `2px solid ${selectedStatus === status ? cfg.color : '#E8D5C4'}`,
                backgroundColor: selectedStatus === status ? cfg.bg : '#FFF8F0',
                color: selectedStatus === status ? cfg.color : '#2D1F0E',
                fontWeight: selectedStatus === status ? '600' : '400',
                cursor: 'pointer', fontSize: '14px', textAlign: 'left',
              }}>
                {cfg.label}
              </button>
            ))}
          </div>
          {(selectedStatus === 'oui' || selectedStatus === 'assiette') && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', color: '#8B7355', display: 'block', marginBottom: '6px' }}>
                Heure d&apos;arrivée estimée (optionnel)
              </label>
              <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} style={S.input} />
            </div>
          )}
          <button onClick={handleSave} disabled={!selectedStatus || saving} style={{
            ...S.btnFill('#D4603A'), width: '100%', padding: '12px', fontSize: '15px',
            opacity: !selectedStatus || saving ? 0.5 : 1,
          }}>
            {saving ? 'Enregistrement…' : 'Enregistrer ma réponse'}
          </button>
        </div>
      )}

      {/* Réponses famille — membres actifs uniquement */}
      <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B7355', marginBottom: '8px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        La famille ({members.length} actif{members.length > 1 ? 's' : ''})
      </div>
      {members.map(member => {
        const response = dinnerResponses.find(r => r.member_id === member.id && r.date === today)
        const cfg = response ? statusConfig[response.status] : null
        const isMe = currentMember?.id === member.id
        return (
          <div key={member.id} style={{
            ...S.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
            ...(isMe ? { borderColor: '#D4603A', borderWidth: '2px' } : {}),
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              backgroundColor: cfg ? cfg.bg : '#F0E8E0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '700', color: cfg ? cfg.color : '#8B7355', flexShrink: 0,
            }}>
              {member.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#2D1F0E' }}>
                {member.name} {isMe && <span style={{ fontSize: '11px', color: '#D4603A', fontWeight: '500' }}>(toi)</span>}
              </div>
              {response ? (
                <div style={{ fontSize: '13px', color: cfg?.color }}>
                  {cfg?.label}{response.arrival_time && <span style={{ color: '#8B7355', fontWeight: '400' }}> · {response.arrival_time}</span>}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#B0A090' }}>Pas encore répondu…</div>
              )}
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
  const [adding, setAdding] = useState(false)
  const getMemberName = (id: string | null) => members.find(m => m.id === id)?.name || null
  const pending = chores.filter(c => !c.is_done)
  const done = chores.filter(c => c.is_done)

  async function handleAdd() {
    if (!newChore.trim()) return
    setAdding(true); await onAddChore(newChore.trim()); setNewChore(''); setAdding(false)
  }

  return (
    <div>
      <div style={{ ...S.card, backgroundColor: '#4A8C6F', color: 'white', border: 'none' }}>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Tâches à faire</div>
        <div style={{ fontSize: '26px', fontWeight: '700' }}>
          {pending.filter(c => c.assigned_to_id).length}/{pending.length} <span style={{ fontSize: '14px', fontWeight: '400', opacity: 0.85 }}>prises en charge</span>
        </div>
        <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.75 }}>{done.length} terminée{done.length > 1 ? 's' : ''}</div>
      </div>

      <div style={S.card}>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#2D1F0E' }}>➕ Ajouter une tâche</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newChore} onChange={e => setNewChore(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ex: Passer l'aspirateur…" style={{ ...S.input, flex: 1 }} />
          <button onClick={handleAdd} disabled={adding || !newChore.trim()}
            style={{ ...S.btnFill('#4A8C6F'), opacity: adding || !newChore.trim() ? 0.5 : 1 }}>
            {adding ? '…' : 'Ajouter'}
          </button>
        </div>
      </div>

      {pending.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#8B7355' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>✨</div>
          <div style={{ fontSize: '15px', fontWeight: '500' }}>Aucune tâche en cours</div>
        </div>
      )}

      {pending.map(chore => {
        const assignedName = getMemberName(chore.assigned_to_id)
        const isAssignedToMe = chore.assigned_to_id === currentMember?.id
        return (
          <div key={chore.id} style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '500', color: '#2D1F0E' }}>{chore.name}</div>
                {assignedName
                  ? <div style={{ fontSize: '13px', color: '#4A8C6F', marginTop: '3px', fontWeight: '500' }}>👤 {assignedName}{isAssignedToMe && <span style={{ color: '#D4603A' }}> (toi !)</span>}</div>
                  : <div style={{ fontSize: '13px', color: '#B0A090', marginTop: '3px' }}>Non assignée</div>
                }
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {!chore.assigned_to_id && currentMember && (
                  <button onClick={() => onClaimChore(chore.id)} style={S.btn('#4A8C6F', '#E0F0E8')}>Je le fais</button>
                )}
                {isAssignedToMe && (
                  <button onClick={() => onToggleDone(chore.id, chore.is_done)} style={S.btn('#4A8C6F', '#E0F0E8')}>✓ Fait</button>
                )}
                {chore.assigned_to_id && (
                  <button onClick={() => onUnclaimChore(chore.id)} style={S.btn('#8B7355', '#F0E8E0')}>Libérer</button>
                )}
                <button onClick={() => onDeleteChore(chore.id)} style={S.btnSmall('#C0392B', '#FDEAEA')} title="Supprimer">✕</button>
              </div>
            </div>
          </div>
        )
      })}

      {done.length > 0 && (
        <>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B7355', margin: '16px 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ✓ Terminées ({done.length})
          </div>
          {done.map(chore => (
            <div key={chore.id} style={{ ...S.card, opacity: 0.65 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '15px', textDecoration: 'line-through', color: '#8B7355' }}>{chore.name}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => onToggleDone(chore.id, chore.is_done)} style={S.btn('#8B7355', '#F0E8E0')}>Refaire</button>
                  <button onClick={() => onDeleteChore(chore.id)} style={S.btnSmall('#C0392B', '#FDEAEA')}>✕</button>
                </div>
              </div>
              {chore.assigned_to_id && <div style={{ fontSize: '12px', color: '#4A8C6F', marginTop: '2px' }}>✓ {getMemberName(chore.assigned_to_id)}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ================================================================
// ONGLET COURSES
// ================================================================
function CoursesTab({ items, members, currentMember, onAddItem, onToggleItem, onDeleteDone }: {
  items: ShoppingItem[]; members: Member[]; currentMember: Member | null
  onAddItem: (name: string) => Promise<void>
  onToggleItem: (id: string, isDone: boolean) => Promise<void>
  onDeleteDone: () => Promise<void>
}) {
  const [newItem, setNewItem] = useState('')
  const [adding, setAdding] = useState(false)
  const pending = items.filter(i => !i.is_done)
  const done = items.filter(i => i.is_done)
  const getMemberName = (id: string | null) => members.find(m => m.id === id)?.name || null

  async function handleAdd() {
    if (!newItem.trim()) return
    setAdding(true); await onAddItem(newItem.trim()); setNewItem(''); setAdding(false)
  }

  return (
    <div>
      <div style={{ ...S.card, backgroundColor: '#5B6EC7', color: 'white', border: 'none' }}>
        <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '4px' }}>Liste de courses</div>
        <div style={{ fontSize: '26px', fontWeight: '700' }}>
          {pending.length} <span style={{ fontSize: '14px', fontWeight: '400', opacity: 0.85 }}>article{pending.length > 1 ? 's' : ''} à acheter</span>
        </div>
      </div>
      <div style={S.card}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ajouter un article…" style={{ ...S.input, flex: 1 }} />
          <button onClick={handleAdd} disabled={adding || !newItem.trim()}
            style={{ ...S.btnFill('#5B6EC7'), opacity: adding || !newItem.trim() ? 0.5 : 1 }}>
            {adding ? '…' : '+ Ajouter'}
          </button>
        </div>
      </div>
      {pending.length === 0 && done.length === 0 && (
        <div style={{ textAlign: 'center', padding: '30px', color: '#8B7355' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🛒</div>
          <div style={{ fontSize: '15px', fontWeight: '500' }}>La liste est vide</div>
        </div>
      )}
      {pending.map(item => (
        <div key={item.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
          <button onClick={() => onToggleItem(item.id, item.is_done)} style={{
            width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
            border: '2px solid #5B6EC7', backgroundColor: 'transparent', cursor: 'pointer',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', color: '#2D1F0E' }}>{item.name}</div>
            {item.added_by_id && <div style={{ fontSize: '12px', color: '#B0A090' }}>Ajouté par {getMemberName(item.added_by_id)}</div>}
          </div>
        </div>
      ))}
      {done.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 8px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#8B7355', textTransform: 'uppercase', letterSpacing: '0.5px' }}>✓ Fait ({done.length})</div>
            <button onClick={onDeleteDone} style={S.btn('#C0392B', '#FDEAEA')}>Tout supprimer</button>
          </div>
          {done.map(item => (
            <div key={item.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', opacity: 0.5 }}>
              <button onClick={() => onToggleItem(item.id, item.is_done)} style={{
                width: '24px', height: '24px', borderRadius: '6px', flexShrink: 0,
                border: '2px solid #5B6EC7', backgroundColor: '#5B6EC7', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px',
              }}>✓</button>
              <div style={{ flex: 1, textDecoration: 'line-through', color: '#8B7355', fontSize: '15px' }}>{item.name}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ================================================================
// ONGLET POUBELLES
// ================================================================
function PoubellsTab() {
  const { yellow, brown } = getTrashInfo()
  const daysToWed = daysUntil(3)
  const daysToTue = daysUntil(2)
  const daysToFri = daysUntil(5)
  const nextBrown = daysToTue <= daysToFri
    ? { label: 'Mardi', days: daysToTue }
    : { label: 'Vendredi', days: daysToFri }
  const today = yellow || brown

  return (
    <div>
      {yellow && (
        <div style={{ ...S.card, backgroundColor: '#F39C12', color: 'white', border: 'none', textAlign: 'center', padding: '28px 20px', marginBottom: '10px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🟡</div>
          <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Poubelle jaune ce soir !</div>
          <div style={{ fontSize: '15px', opacity: 0.92 }}>C'est mercredi — sortez la poubelle jaune</div>
        </div>
      )}
      {brown && (
        <div style={{ ...S.card, backgroundColor: '#795548', color: 'white', border: 'none', textAlign: 'center', padding: '28px 20px', marginBottom: '10px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🟤</div>
          <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '6px' }}>Poubelle marron ce soir !</div>
          <div style={{ fontSize: '15px', opacity: 0.92 }}>C'est {new Date().getDay() === 2 ? 'mardi' : 'vendredi'} — sortez la poubelle marron</div>
        </div>
      )}
      {!today && (
        <div style={{ ...S.card, textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: '44px', marginBottom: '10px' }}>🗑️</div>
          <div style={{ fontSize: '17px', fontWeight: '600', color: '#2D1F0E', marginBottom: '4px' }}>Pas de poubelle aujourd'hui</div>
          <div style={{ fontSize: '13px', color: '#8B7355' }}>Profitez-en !</div>
        </div>
      )}
      <div style={{ ...S.card, marginTop: today ? '0' : '8px' }}>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#2D1F0E', marginBottom: '12px' }}>📅 Prochaines sorties</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#FFFDE7', borderRadius: '10px', border: '1px solid #F9A825' }}>
            <span style={{ fontSize: '28px' }}>🟡</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2D1F0E' }}>Poubelle jaune</div>
              <div style={{ fontSize: '13px', color: '#8B7355' }}>Mercredi · {yellow ? "aujourd'hui !" : `dans ${daysToWed} jour${daysToWed > 1 ? 's' : ''}`}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', backgroundColor: '#EFEBE9', borderRadius: '10px', border: '1px solid #A1887F' }}>
            <span style={{ fontSize: '28px' }}>🟤</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2D1F0E' }}>Poubelle marron</div>
              <div style={{ fontSize: '13px', color: '#8B7355' }}>Mardi & vendredi · {brown ? "aujourd'hui !" : `prochain : ${nextBrown.label} dans ${nextBrown.days}j`}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
