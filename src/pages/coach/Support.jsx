import { useState } from 'react'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import Pill from '../../components/coachAdmin/Pill'

export default function Support({ tickets, ticketsError, savingTicket, marquerTicketResolu, reponseDrafts, setReponseDrafts, envoyerReponseTicket }) {
  const { c, rgba } = useCoachTheme()
  // Pas de synchronisation par effet : si le ticket sélectionné disparaît de
  // la liste (ex. résolu puis filtré ailleurs), le fallback `|| tickets[0]`
  // au moment du rendu retombe naturellement sur le premier ticket.
  const [selectedId, setSelectedId] = useState(tickets[0]?.id ?? null)

  if (ticketsError) {
    return (
      <div style={{ background: rgba(c.warn, 0.08), border: `1px solid ${rgba(c.warn, 0.4)}`, borderRadius: '10px', padding: '1rem 1.25rem', color: c.warn, fontSize: '13px' }}>
        ⚠️ {ticketsError}
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '48px', marginBottom: '1rem' }}>💬</p>
          <p style={{ color: c.textMuted }}>Aucun ticket pour le moment</p>
        </div>
      </Card>
    )
  }

  const selected = tickets.find(t => t.id === selectedId) || tickets[0]

  return (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
      {/* Colonne gauche : liste des threads */}
      <div style={{ width: '300px', flexShrink: 0, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', overflow: 'hidden' }}>
        {tickets.map(t => {
          const nom = t.expediteur ? `${t.expediteur.prenom || ''} ${t.expediteur.nom || ''}`.trim() || t.expediteur.email : 'Utilisateur inconnu'
          const initiales = nom !== 'Utilisateur inconnu' ? nom.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() : '?'
          const active = t.id === selected.id
          return (
            <div key={t.id} onClick={() => setSelectedId(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', cursor: 'pointer', background: active ? c.surface2 : 'transparent', borderBottom: `1px solid ${c.border}` }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: rgba(c.success, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.success, fontWeight: 800, fontSize: '12px', flexShrink: 0 }}>
                {initiales}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.sujet}</p>
              </div>
              {t.statut === 'ouvert' && (
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: c.accent, flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Colonne droite : détail du ticket */}
      <div style={{ flex: 1, background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '1.25rem', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: c.text }}>{selected.sujet}</p>
              <Pill variant={selected.statut === 'ouvert' ? 'pending' : 'active'}>{selected.statut === 'ouvert' ? 'OUVERT' : '✓ RÉSOLU'}</Pill>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: c.textMuted }}>
              {selected.expediteur ? `${selected.expediteur.prenom || ''} ${selected.expediteur.nom || ''}`.trim() || selected.expediteur.email : 'Utilisateur inconnu'}
              {selected.expediteur?.email ? ` · ${selected.expediteur.email}` : ''}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '11px', color: c.textMuted }}>{new Date(selected.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          {selected.statut === 'ouvert' && (
            <button onClick={() => marquerTicketResolu(selected.id)} disabled={savingTicket === selected.id}
              style={{ background: rgba(c.success, 0.12), border: `1px solid ${rgba(c.success, 0.4)}`, color: c.success, padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {savingTicket === selected.id ? 'Mise à jour...' : '✓ Marquer comme résolu'}
            </button>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: c.text, lineHeight: 1.6, borderTop: `1px solid ${c.border}`, paddingTop: '10px' }}>{selected.message}</p>

        {selected.reponse && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${c.border}` }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ta réponse</p>
            <p style={{ margin: 0, fontSize: '13px', color: c.text, lineHeight: 1.6 }}>{selected.reponse}</p>
          </div>
        )}

        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <textarea
            value={reponseDrafts[selected.id] ?? ''}
            onChange={e => setReponseDrafts(prev => ({ ...prev, [selected.id]: e.target.value }))}
            placeholder={selected.reponse ? 'Modifier la réponse...' : 'Écrire une réponse...'}
            rows={3}
            style={{ flex: '1 1 200px', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '8px 10px', color: c.text, fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <button
            onClick={() => envoyerReponseTicket(selected.id)}
            disabled={savingTicket === selected.id || !(reponseDrafts[selected.id] ?? '').trim()}
            style={{ background: rgba(c.accent, 0.12), border: `1px solid ${rgba(c.accent, 0.4)}`, color: c.accent, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: !(reponseDrafts[selected.id] ?? '').trim() ? 0.5 : 1, alignSelf: 'flex-start' }}
          >
            ✉️ Envoyer la réponse
          </button>
        </div>
      </div>
    </div>
  )
}
