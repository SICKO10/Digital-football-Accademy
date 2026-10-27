import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'

// Même esprit que StatsSponsorsStage.jsx (module Stages) : vues de
// tournoi_vues_log (suivi en direct + inscription, même compteur) et clics
// de tournoi_sponsor_clics_log, en lecture directe (RLS is_club_manager,
// cf. supabase_tournois_sponsors.sql) — pas de RPC d'agrégation nécessaire,
// aucune donnée personnelle dans ces deux tables.

const PERIODES = [
  { val: 'jour', label: '24 dernières heures' },
  { val: 'semaine', label: '7 derniers jours' },
  { val: 'mois', label: '30 derniers jours' },
  { val: 'trimestre', label: '3 derniers mois' },
  { val: 'annee', label: '12 derniers mois' },
]

const debutISO = (joursOuMois, unite) => {
  const d = new Date()
  if (unite === 'jours') d.setDate(d.getDate() - joursOuMois)
  else d.setMonth(d.getMonth() - joursOuMois)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
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
const heuresEntre = () => {
  const heures = []
  for (let i = 23; i >= 0; i--) {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    d.setHours(d.getHours() - i)
    heures.push({ key: d.toISOString().slice(0, 13), label: `${d.getHours()}h` })
  }
  return heures
}
const semainesEntre = (depuisSemainesAgo) => {
  const semaines = []
  for (let i = depuisSemainesAgo; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    semaines.push({ key: d.toISOString().split('T')[0], label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) })
  }
  return semaines
}

export default function StatsSponsorsTournoi({ tournoi, sponsors, colors, accentColor = '#4ade80' }) {
  const [clics, setClics] = useState(null)
  const [vues, setVues] = useState(null)
  const [periodeGraph, setPeriodeGraph] = useState('mois')

  useEffect(() => {
    if (!tournoi?.id) return
    const depuisAnnee = debutISO(12, 'mois')
    supabase.from('tournoi_sponsor_clics_log').select('sponsor_id, created_at')
      .eq('tournoi_id', tournoi.id).gte('created_at', depuisAnnee)
      .then(({ data, error }) => { setClics(error?.code === '42P01' ? 'table_manquante' : (data || [])) })
    supabase.from('tournoi_vues_log').select('created_at')
      .eq('tournoi_id', tournoi.id).gte('created_at', depuisAnnee)
      .then(({ data, error }) => { setVues(error?.code === '42P01' ? 'table_manquante' : (data || [])) })
  }, [tournoi?.id])

  if (clics === null || vues === null) return <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement des statistiques…</p>
  if (clics === 'table_manquante' || vues === 'table_manquante') {
    return (
      <div style={{ marginTop: '16px', background: colors.background.raised, border: `1px solid #f59e0b40`, borderRadius: '10px', padding: '14px' }}>
        <p style={{ margin: 0, color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>⚠️ Suivi des vues/clics pas encore activé</p>
        <p style={{ margin: '6px 0 0', color: colors.text.faint, fontSize: 12 }}>Migration supabase_tournois_sponsors.sql à exécuter.</p>
      </div>
    )
  }

  const nomSponsor = (id) => sponsors.find(s => s.id === id)?.nom || 'Sponsor supprimé'

  const depuisJourDate = new Date()
  depuisJourDate.setHours(depuisJourDate.getHours() - 24)
  const depuisJour = depuisJourDate.toISOString()
  const depuisSemaine = debutISO(7, 'jours')
  const depuisMois = debutISO(30, 'jours')
  const depuisTrimestre = debutISO(3, 'mois')
  const depuisAnnee = debutISO(12, 'mois')

  const idsSponsors = [...new Set([...sponsors.map(s => s.id), ...clics.map(c => c.sponsor_id)])]
  const lignes = idsSponsors.map(id => ({
    id,
    nom: nomSponsor(id),
    semaine: clics.filter(c => c.sponsor_id === id && c.created_at >= depuisSemaine).length,
    mois: clics.filter(c => c.sponsor_id === id && c.created_at >= depuisMois).length,
    annee: clics.filter(c => c.sponsor_id === id && c.created_at >= depuisAnnee).length,
  })).filter(l => l.annee > 0 || sponsors.some(s => s.id === l.id))
    .sort((a, b) => b.annee - a.annee)

  const totalSemaine = lignes.reduce((s, l) => s + l.semaine, 0)
  const totalMois = lignes.reduce((s, l) => s + l.mois, 0)
  const totalAnnee = lignes.reduce((s, l) => s + l.annee, 0)

  const vuesDepuis = (depuis) => vues.filter(v => v.created_at >= depuis).length
  const vuesSemaine = vuesDepuis(depuisSemaine)
  const vuesMois = vuesDepuis(depuisMois)
  const vuesAnnee = vuesDepuis(depuisAnnee)
  const ctr = (clics, imp) => (imp && imp > 0) ? `${((clics / imp) * 100).toFixed(1)}%` : '—'

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
  } else if (periodeGraph === 'trimestre') {
    const buckets = semainesEntre(12)
    const parBucket = Object.fromEntries(buckets.map(b => [b.key, 0]))
    clics.filter(c => c.created_at >= depuisTrimestre).forEach(c => {
      const jour = c.created_at.split('T')[0]
      const cle = [...buckets].reverse().find(b => b.key <= jour)?.key
      if (cle) parBucket[cle]++
    })
    serie = buckets.map(b => ({ key: b.key, label: b.label, count: parBucket[b.key] }))
  } else if (periodeGraph === 'jour') {
    const buckets = heuresEntre()
    const parBucket = Object.fromEntries(buckets.map(b => [b.key, 0]))
    clics.filter(c => c.created_at >= depuisJour).forEach(c => {
      const key = c.created_at.slice(0, 13)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: '14px', color: colors.text.primary }}>Statistiques sponsors de ce tournoi</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
        {[
          { label: '7 derniers jours', clics: totalSemaine, imp: vuesSemaine },
          { label: '30 derniers jours', clics: totalMois, imp: vuesMois },
          { label: '12 derniers mois', clics: totalAnnee, imp: vuesAnnee },
        ].map(c => (
          <div key={c.label} style={{ background: colors.background.raised, borderTop: `3px solid ${accentColor}`, borderRadius: '10px', padding: '12px 14px' }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: accentColor, fontFamily: 'monospace' }}>{c.clics}</p>
            <p style={{ margin: '4px 0 0', fontSize: 10, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Clics · {c.label}</p>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: colors.text.dim }}>{c.imp} vue{c.imp === 1 ? '' : 's'} · CTR <strong>{ctr(c.clics, c.imp)}</strong></p>
          </div>
        ))}
      </div>

      <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: colors.text.dim }}>Évolution des clics</p>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {PERIODES.map(p => (
              <button key={p.val} onClick={() => setPeriodeGraph(p.val)}
                style={{ padding: '5px 10px', borderRadius: '6px', border: periodeGraph === p.val ? 'none' : `1px solid ${colors.border.default}`, background: periodeGraph === p.val ? accentColor : 'transparent', color: periodeGraph === p.val ? '#000' : colors.text.dim, fontWeight: periodeGraph === p.val ? 700 : 400, cursor: 'pointer', fontSize: 11 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {totalAnnee === 0 ? (
          <p style={{ color: colors.text.faint, fontSize: 12, textAlign: 'center', padding: '14px 0' }}>Aucun clic enregistré pour l'instant.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '90px', overflowX: 'auto' }}>
            {serie.map(d => {
              const max = Math.max(1, ...serie.map(x => x.count))
              return (
                <div key={d.key} style={{ flex: 1, minWidth: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ fontSize: 8, color: colors.text.faint, marginBottom: 2, fontFamily: 'monospace' }}>{d.count || ''}</span>
                  <div style={{ width: '70%', minWidth: '6px', height: `${Math.max((d.count / max) * 78, d.count > 0 ? 4 : 0)}%`, background: accentColor, borderRadius: '2px 2px 0 0' }} />
                  <span style={{ fontSize: 8, color: colors.text.faint, marginTop: 3, whiteSpace: 'nowrap' }}>{d.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {lignes.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, textTransform: 'uppercase', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}` }}>Sponsor</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, textTransform: 'uppercase', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}` }}>Semaine</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, textTransform: 'uppercase', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}` }}>Mois</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, textTransform: 'uppercase', color: colors.text.faint, borderBottom: `1px solid ${colors.border.subtle}` }}>Année</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(l => (
                <tr key={l.id}>
                  <td style={{ padding: '8px 8px', fontSize: 12, color: colors.text.primary, borderBottom: `1px solid ${colors.border.subtle}` }}>{l.nom}</td>
                  <td style={{ padding: '8px 8px', fontSize: 12, color: colors.text.primary, textAlign: 'right', fontFamily: 'monospace', borderBottom: `1px solid ${colors.border.subtle}` }}>{l.semaine}</td>
                  <td style={{ padding: '8px 8px', fontSize: 12, color: colors.text.primary, textAlign: 'right', fontFamily: 'monospace', borderBottom: `1px solid ${colors.border.subtle}` }}>{l.mois}</td>
                  <td style={{ padding: '8px 8px', fontSize: 12, color: colors.text.primary, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, borderBottom: `1px solid ${colors.border.subtle}` }}>{l.annee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
