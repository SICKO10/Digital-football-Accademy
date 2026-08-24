import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import Pill from '../../components/coachAdmin/Pill'
import { IcoMessage } from './NavIcons'

export default function Support({ tickets, ticketsError, savingTicket, marquerTicketResolu, coachId }) {
  const { c, rgba } = useCoachTheme()
  // Pas de synchronisation par effet : si le ticket sélectionné disparaît de
  // la liste, le fallback `|| tickets[0]` au moment du rendu retombe
  // naturellement sur le premier ticket.
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? null)
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)

  const selected = tickets.find(t => t.id === selectedId) || tickets[0] || null

  const chargerMessages = async (ticketId) => {
    const { data, error } = await supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true })
    if (error) { console.error('Erreur chargement messages support :', error); return }
    setMessages(data || [])
  }

  useEffect(() => {
    if (!selected) return
    const chargerInitial = async () => {
      setLoadingMessages(true)
      await chargerMessages(selected.id)
      setLoadingMessages(false)
    }
    chargerInitial()
    supabase.from('support_tickets').update({ lu_par_coach_at: new Date().toISOString() }).eq('id', selected.id).then(() => {})
    const id = setInterval(() => chargerMessages(selected.id), 4000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const envoyerMessage = async () => {
    const contenu = draft.trim()
    if (!contenu || !selected) return
    setSending(true)
    const maintenant = new Date().toISOString()
    const { error } = await supabase.from('support_messages').insert({ ticket_id: selected.id, sender_id: coachId, contenu, is_coach: true })
    if (!error) {
      await supabase.from('support_tickets').update({ dernier_message_at: maintenant, lu_par_coach_at: maintenant }).eq('id', selected.id)
      setDraft('')
      await chargerMessages(selected.id)
    } else {
      alert('Erreur : ' + error.message)
    }
    setSending(false)
  }

  if (ticketsError) {
    return (
      <div style={{ background: rgba(c.warn, 0.08), border: `1px solid ${rgba(c.warn, 0.4)}`, borderRadius: '10px', padding: '1rem 1.25rem', color: c.warn, fontSize: '13px' }}>
        {ticketsError}
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: c.textMuted }}><IcoMessage size={40} /></div>
          <p style={{ color: c.textMuted }}>Aucun ticket pour le moment</p>
        </div>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      {/* Colonne gauche : liste des threads */}
      <div style={{ width: '300px', flexShrink: 0, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflow: 'hidden' }}>
        {tickets.map(t => {
          const nom = t.expediteur ? `${t.expediteur.prenom || ''} ${t.expediteur.nom || ''}`.trim() || t.expediteur.email : 'Utilisateur inconnu'
          const initiales = nom !== 'Utilisateur inconnu' ? nom.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?'
          const active = selected && t.id === selected.id
          const nonLu = t.dernier_message_at && (!t.lu_par_coach_at || new Date(t.dernier_message_at) > new Date(t.lu_par_coach_at))
          return (
            <div key={t.id} onClick={() => setSelectedId(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', cursor: 'pointer', background: active ? c.surface2 : 'transparent', borderBottom: `1px solid ${c.border}` }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: rgba(c.success, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.success, fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                {initiales}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: nonLu ? 700 : 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.sujet}</p>
              </div>
              {nonLu && (
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.accent, flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Colonne droite : fil de conversation */}
      <div style={{ flex: 1, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.25rem 1.25rem 10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: c.text }}>{selected?.sujet}</p>
              {selected && <Pill variant={selected.statut === 'ouvert' ? 'pending' : 'active'}>{selected.statut === 'ouvert' ? 'OUVERT' : 'RÉSOLU'}</Pill>}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.textMuted }}>
              {selected?.expediteur ? `${selected.expediteur.prenom || ''} ${selected.expediteur.nom || ''}`.trim() || selected.expediteur.email : 'Utilisateur inconnu'}
              {selected?.expediteur?.email ? ` · ${selected.expediteur.email}` : ''}
            </p>
          </div>
          {selected?.statut === 'ouvert' && (
            <button onClick={() => marquerTicketResolu(selected.id)} disabled={savingTicket === selected.id}
              style={{ background: rgba(c.success, 0.12), border: `1px solid ${rgba(c.success, 0.4)}`, color: c.success, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {savingTicket === selected.id ? 'Mise à jour...' : 'Marquer comme résolu'}
            </button>
          )}
        </div>

        <div ref={scrollRef} style={{ flex: 1, minHeight: '260px', maxHeight: '420px', overflowY: 'auto', padding: '10px 1.25rem', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: `1px solid ${c.border}` }}>
          {loadingMessages ? (
            <p style={{ color: c.textMuted, fontSize: '13px', textAlign: 'center', margin: 'auto' }}>Chargement...</p>
          ) : messages.length === 0 ? (
            <p style={{ color: c.textMuted, fontSize: '13px', textAlign: 'center', margin: 'auto' }}>Aucun message</p>
          ) : messages.map(m => (
            <div key={m.id} style={{ alignSelf: m.is_coach ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
              <div style={{
                background: m.is_coach ? c.accent : c.surface2,
                color: m.is_coach ? '#fff' : c.text,
                borderRadius: '12px', padding: '8px 12px', fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word',
              }}>
                {m.contenu}
              </div>
              <p style={{ margin: '3px 4px 0', fontSize: '10px', color: c.textMuted, textAlign: m.is_coach ? 'right' : 'left' }}>
                {new Date(m.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '10px 1.25rem 1.25rem', borderTop: `1px solid ${c.border}` }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyerMessage() } }}
            placeholder="Écrire un message..."
            rows={1}
            style={{ flex: 1, background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '9px 12px', color: c.text, fontSize: '13px', fontFamily: 'inherit', resize: 'none' }}
          />
          <button
            onClick={envoyerMessage}
            disabled={sending || !draft.trim() || !selected}
            style={{ background: c.accent, border: 'none', color: '#fff', padding: '0 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: (!draft.trim() || sending) ? 0.5 : 1 }}
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}
