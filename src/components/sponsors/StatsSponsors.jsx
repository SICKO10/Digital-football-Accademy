import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { makeUseSt } from '../../lib/theme'

// Clics sur le bandeau sponsor (bannière + bouton "Découvrir", cf.
// SponsorsBar.jsx / supabase_sponsors_clics.sql). Même approche que le
// seul autre écran d'analytics de l'app (Viewers.jsx, dashboard coach) :
// une seule requête sur ~12 mois, agrégation par semaine/mois/année faite
// côté client (pas de RPC de comptage), graphique en barres CSS fait
// main — pas de librairie de charts dans le projet.

const stSombre = {
  card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem' },
  tab: (active, color = '#4ade80') => ({ padding: '8px 16px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? color : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '12px' }),
  th: { textAlign: 'left', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', borderBottom: '1px solid #222' },
  td: { padding: '10px 10px', fontSize: '13px', color: '#fff', borderBottom: '1px solid #1a1a1a' },
  textFaint: '#666', textDim: '#ccc',
}
const stClaire = {
  card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem' },
  tab: (active, color = '#4ade80') => ({ padding: '8px 16px', borderRadius: '8px', border: active ? 'none' : '1px solid #cbd5e1', background: active ? color : 'transparent', color: active ? '#000' : '#334155', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '12px' }),
  th: { textAlign: 'left', padding: '8px 10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 10px', fontSize: '13px', color: '#0f172a', borderBottom: '1px solid #f1f5f9' },
  textFaint: '#64748b', textDim: '#334155',
}
const useSt = makeUseSt(stSombre, stClaire)

const PERIODES = [
  { val: 'semaine', label: '7 derniers jours' },
  { val: 'mois', label: '30 derniers jours' },
  { val: 'annee', label: '12 derniers mois' },
]

const debutISO = (joursOuMois, unite) => {
  const d = new Date()
  if (unite === 'jours') d.setDate(d.getDate() - joursOuMois)
  else d.setMonth(d.getMonth() - joursOuMois)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Buckets mensuels (vue "année") — même logique que moisEntre dans
// Viewers.jsx : 12 barres journalières seraient illisibles sur un an.
const moisEntre = (depuisMoisAgo) => {
  const mois = []
  const base = new Date()
  base.setDate(1)
  for (let i = depuisMoisAgo; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    mois.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('fr-FR', { month: 'short' }) })
  }
  return mois
}

export default function StatsSponsors({ clubId, sponsors, accentColor = '#4ade80' }) {
  const st = useSt()
  const [clics, setClics] = useState(null) // null = pas encore chargé
  const [periodeGraph, setPeriodeGraph] = useState('mois')

  useEffect(() => {
    if (!clubId) return
    supabase.from('sponsor_clics_log').select('sponsor_id, type, created_at')
      .eq('club_id', clubId).gte('created_at', debutISO(12, 'mois'))
      .then(({ data, error }) => {
        // Table pas encore migrée (supabase_sponsors_clics.sql non exécuté)
        // — message dédié plutôt qu'une erreur muette, cf. tableMissing dans
        // GestionSponsors.jsx pour le même genre de garde-fou.
        if (error?.code === '42P01') { setClics('table_manquante'); return }
        setClics(data || [])
      })
  }, [clubId])

  if (clics === null) return <p style={{ color: st.textFaint, fontSize: 13 }}>Chargement…</p>
  if (clics === 'table_manquante') {
    return (
      <div style={{ ...st.card, borderColor: '#f59e0b40' }}>
        <p style={{ margin: 0, color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>⚠️ Suivi des clics pas encore activé</p>
        <p style={{ margin: '6px 0 0', color: st.textFaint, fontSize: 12 }}>Migration supabase_sponsors_clics.sql à exécuter.</p>
      </div>
    )
  }

  const nomSponsor = (id) => sponsors.find(s => s.id === id)?.entreprise || 'Sponsor supprimé'

  const depuisSemaine = debutISO(7, 'jours')
  const depuisMois = debutISO(30, 'jours')
  const depuisAnnee = debutISO(12, 'mois')

  // ── Tableau : par sponsor, 3 fenêtres glissantes simultanées ──
  const idsSponsors = [...new Set([...sponsors.map(s => s.id), ...clics.map(c => c.sponsor_id)])]
  const lignes = idsSponsors.map(id => ({
    id,
    nom: nomSponsor(id),
    semaine: clics.filter(c => c.sponsor_id === id && c.created_at >= depuisSemaine).length,
    mois: clics.filter(c => c.sponsor_id === id && c.created_at >= depuisMois).length,
    annee: clics.filter(c => c.sponsor_id === id && c.created_at >= depuisAnnee).length,
  })).filter(l => l.annee > 0 || sponsors.some(s => s.id === l.id)) // garde les sponsors actifs même à 0 clic, masque les IDs orphelins sans historique
    .sort((a, b) => b.annee - a.annee)

  const totalSemaine = lignes.reduce((s, l) => s + l.semaine, 0)
  const totalMois = lignes.reduce((s, l) => s + l.mois, 0)
  const totalAnnee = lignes.reduce((s, l) => s + l.annee, 0)

  // ── Graphique : série selon la période choisie ──
  let serie
  if (periodeGraph === 'annee') {
    const buckets = moisEntre(11)
    const parBucket = Object.fromEntries(buckets.map(b => [b.key, 0]))
    clics.filter(c => c.created_at >= depuisAnnee).forEach(c => {
      const d = new Date(c.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (key in parBucket) parBucket[key]++
    })
    serie = buckets.map(b => ({ key: b.key, label: b.label, count: parBucket[b.key] }))
  } else {
    const depuis = periodeGraph === 'semaine' ? depuisSemaine : depuisMois
    const nbJours = periodeGraph === 'semaine' ? 7 : 30
    const parJour = {}
    clics.filter(c => c.created_at >= depuis).forEach(c => {
      const jour = c.created_at.split('T')[0]
      parJour[jour] = (parJour[jour] || 0) + 1
    })
    serie = []
    for (let i = nbJours - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      serie.push({ key, label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), count: parJour[key] || 0 })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Cartes résumé ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {[
          { label: '7 derniers jours', val: totalSemaine },
          { label: '30 derniers jours', val: totalMois },
          { label: '12 derniers mois', val: totalAnnee },
        ].map(c => (
          <div key={c.label} style={{ ...st.card, borderTop: `3px solid ${accentColor}` }}>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: accentColor, fontFamily: 'monospace' }}>{c.val}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: st.textFaint, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Graphique ── */}
      <div style={st.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: st.textDim }}>Évolution des clics</p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {PERIODES.map(p => (
              <button key={p.val} onClick={() => setPeriodeGraph(p.val)} style={st.tab(periodeGraph === p.val, accentColor)}>{p.label}</button>
            ))}
          </div>
        </div>
        {totalAnnee === 0 ? (
          <p style={{ color: st.textFaint, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Aucun clic enregistré pour l'instant.</p>
        ) : (
          <ClicsChart data={serie} color={accentColor} textColor={st.textFaint} />
        )}
      </div>

      {/* ── Tableau par sponsor ── */}
      <div style={st.card}>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 13, color: st.textDim }}>Détail par sponsor</p>
        {lignes.length === 0 ? (
          <p style={{ color: st.textFaint, fontSize: 13 }}>Aucun sponsor actif.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={st.th}>Sponsor</th>
                  <th style={{ ...st.th, textAlign: 'right' }}>Semaine</th>
                  <th style={{ ...st.th, textAlign: 'right' }}>Mois</th>
                  <th style={{ ...st.th, textAlign: 'right' }}>Année</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => (
                  <tr key={l.id}>
                    <td style={st.td}>{l.nom}</td>
                    <td style={{ ...st.td, textAlign: 'right', fontFamily: 'monospace' }}>{l.semaine}</td>
                    <td style={{ ...st.td, textAlign: 'right', fontFamily: 'monospace' }}>{l.mois}</td>
                    <td style={{ ...st.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{l.annee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Barres verticales CSS — même construction que VisitesChart (Viewers.jsx,
// dashboard coach), pas de librairie de graphique dans le projet.
function ClicsChart({ data, color, textColor }) {
  const max = Math.max(1, ...data.map(d => d.count))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', overflowX: 'auto' }}>
      {data.map(d => (
        <div key={d.key} style={{ flex: 1, minWidth: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <span style={{ fontSize: 9, color: textColor, marginBottom: 3, fontFamily: 'monospace' }}>{d.count || ''}</span>
          <div style={{ width: '70%', minWidth: '8px', height: `${Math.max((d.count / max) * 78, d.count > 0 ? 4 : 0)}%`, background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.2s ease' }} />
          <span style={{ fontSize: 9, color: textColor, marginTop: 4, whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}
