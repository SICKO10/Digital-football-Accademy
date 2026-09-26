import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

const PERIODES = [
  { id: 'jour', label: "Aujourd'hui" },
  { id: 'semaine', label: '7 jours' },
  { id: 'mois', label: '30 jours' },
  { id: 'annee', label: '12 mois' },
]

function dateDebut(periode) {
  const d = new Date()
  if (periode === 'jour') { d.setHours(0, 0, 0, 0); return d.toISOString() }
  if (periode === 'semaine') d.setDate(d.getDate() - 7)
  else if (periode === 'mois') d.setDate(d.getDate() - 30)
  else if (periode === 'annee') d.setFullYear(d.getFullYear() - 1)
  return d.toISOString()
}

// Statistiques de connexion des joueurs de l'effectif (connexions_log, cf.
// supabase_connexions_log.sql) — joueurs vient déjà avec prenom/nom/poste/
// avatar_url mergé (chargerJoueurs, DashboardEducateur.jsx), pas besoin de
// requêter profiles à nouveau ici.
export default function ViewersStats({ joueurs = [] }) {
  const colors = useColors()
  const [periode, setPeriode] = useState('semaine')
  const [connexions, setConnexions] = useState([])
  const [loading, setLoading] = useState(true)

  const joueursAvecCompte = joueurs.filter(j => j.joueur_id)

  useEffect(() => {
    if (joueursAvecCompte.length === 0) { setConnexions([]); setLoading(false); return }
    setLoading(true)
    supabase.from('connexions_log').select('user_id, created_at')
      .in('user_id', joueursAvecCompte.map(j => j.joueur_id))
      .gte('created_at', dateDebut(periode))
      .order('created_at', { ascending: false })
      .then(({ data }) => { setConnexions(data || []); setLoading(false) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periode, joueursAvecCompte.map(j => j.joueur_id).join(',')])

  const totalVisites = connexions.length
  const joueursActifs = new Set(connexions.map(c => c.user_id)).size

  const parJoueur = joueursAvecCompte.map(j => {
    const visites = connexions.filter(c => c.user_id === j.joueur_id)
    return { ...j, nb_visites: visites.length, derniere_visite: visites[0]?.created_at }
  }).filter(j => j.nb_visites > 0).sort((a, b) => b.nb_visites - a.nb_visites)

  const parJour = {}
  connexions.forEach(c => {
    const jour = c.created_at.split('T')[0]
    parJour[jour] = (parJour[jour] || 0) + 1
  })
  const maxVisitesJour = Math.max(...Object.values(parJour), 1)

  const s = {
    card: { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px 20px' },
    label: { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' },
  }

  if (loading) return <div style={{ color: colors.text.faint, fontSize: '13px', textAlign: 'center', padding: '32px 0' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {PERIODES.map(p => (
          <button key={p.id} onClick={() => setPeriode(p.id)} style={{
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            background: periode === p.id ? colors.accent.green : colors.background.raised,
            color: periode === p.id ? colors.black : colors.text.faint,
            border: `1px solid ${periode === p.id ? colors.accent.green : colors.border.default}`,
          }}>{p.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Visites', val: totalVisites },
          { label: 'Joueurs actifs', val: `${joueursActifs} / ${joueursAvecCompte.length}` },
        ].map(k => (
          <div key={k.label} style={{ ...s.card, textAlign: 'center' }}>
            <div style={{ color: colors.accent.green, fontWeight: 900, fontSize: '28px' }}>{k.val}</div>
            <div style={{ color: colors.text.faint, fontSize: '11px', marginTop: '4px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {Object.keys(parJour).length > 0 && (
        <div style={{ ...s.card, marginBottom: '20px' }}>
          <div style={s.label}>Visites par jour</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
            {Object.entries(parJour).sort(([a], [b]) => a.localeCompare(b)).map(([jour, nb]) => (
              <div key={jour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ fontSize: '9px', color: colors.text.faint }}>{nb}</div>
                <div style={{ width: '100%', height: `${Math.round((nb / maxVisitesJour) * 60)}px`, background: colors.accent.green, borderRadius: '3px 3px 0 0', minHeight: '4px', opacity: 0.85 }} />
                <div style={{ fontSize: '9px', color: colors.text.disabled }}>{new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.label}>Activité par joueur</div>
        {parJoueur.length === 0 ? (
          <div style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Aucune connexion sur cette période</div>
        ) : parJoueur.map((j, i) => (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < parJoueur.length - 1 ? `1px solid ${colors.border.subtle}` : 'none' }}>
            <div style={{ color: colors.text.disabled, fontSize: '12px', fontWeight: 700, width: '18px', textAlign: 'center' }}>{i + 1}</div>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              {j.avatar_url
                ? <img src={j.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: colors.text.faint, fontSize: '13px', fontWeight: 700 }}>{(j.prenom || '?')[0].toUpperCase()}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: colors.text.primary, fontSize: '13px', fontWeight: 600 }}>{j.prenom} {j.nom}</div>
              <div style={{ color: colors.text.faint, fontSize: '11px' }}>
                Dernière visite : {j.derniere_visite ? new Date(j.derniere_visite).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '120px' }}>
              <div style={{ flex: 1, height: '6px', background: colors.background.raised, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round((j.nb_visites / (parJoueur[0]?.nb_visites || 1)) * 100)}%`, height: '100%', background: colors.accent.green, borderRadius: '3px' }} />
              </div>
              <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '14px', minWidth: '20px', textAlign: 'right' }}>{j.nb_visites}</div>
            </div>
          </div>
        ))}
        {joueursAvecCompte.length < joueurs.length && (
          <p style={{ color: colors.text.disabled, fontSize: '11px', margin: '14px 0 0' }}>
            {joueurs.length - joueursAvecCompte.length} joueur{joueurs.length - joueursAvecCompte.length > 1 ? 's' : ''} de l'effectif sans compte lié — non suivi{joueurs.length - joueursAvecCompte.length > 1 ? 's' : ''} ici.
          </p>
        )}
      </div>
    </div>
  )
}
