import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import StatCard from '../../components/coachAdmin/StatCard'
import Card from '../../components/coachAdmin/Card'
import Pill from '../../components/coachAdmin/Pill'

// Regroupement des valeurs canoniques de profiles.plan (cf. src/pages/Register.jsx)
// en 4 familles lisibles pour un admin, sans inventer de sous-catégories.
const FAMILLES = [
  { label: 'Joueurs', plans: ['joueur_starter', 'joueur_pro'] },
  { label: 'Éducateurs', plans: ['educateur'] },
  { label: 'Clubs', plans: ['club'] },
  { label: 'Recruteurs', plans: ['scout'] },
]

// 6 derniers mois, format court ("janv.", "févr.") pour l'axe du graphique.
function derniersMois(n) {
  const mois = []
  const d = new Date()
  d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    mois.push({ key: `${m.getFullYear()}-${m.getMonth()}`, label: m.toLocaleDateString('fr-FR', { month: 'short' }) })
  }
  return mois
}

export default function Overview({ isAdminClubs, goTo, pending }) {
  const { c, fonts } = useCoachTheme()
  const [profils, setProfils] = useState(null)

  useEffect(() => {
    if (!isAdminClubs) return
    supabase.from('profiles').select('plan, created_at').then(({ data, error }) => {
      if (error) { console.error('Erreur comptage profils :', error); return }
      setProfils(data || [])
    })
  }, [isAdminClubs])

  const comptesParPlan = useMemo(() => {
    if (!profils) return null
    return profils.reduce((acc, p) => { acc[p.plan] = (acc[p.plan] || 0) + 1; return acc }, {})
  }, [profils])

  // Inscriptions par mois — donnée réelle (profiles.created_at), contrairement
  // au CA qui n'a pas d'historique persisté (cf. page Revenus).
  const serieInscriptions = useMemo(() => {
    if (!profils) return null
    const mois = derniersMois(6)
    const parMois = Object.fromEntries(mois.map(m => [m.key, 0]))
    for (const p of profils) {
      if (!p.created_at) continue
      const d = new Date(p.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (key in parMois) parMois[key]++
    }
    return mois.map(m => ({ ...m, count: parMois[m.key] }))
  }, [profils])

  const lignesAttente = [
    { id: 'analyses', label: "Demandes d'analyse joueur", count: pending.analyses, icon: '🎬' },
    { id: 'certifications', label: 'Certifications à valider', count: pending.certifications, icon: '🏅' },
    { id: 'seances_club', label: 'Séances club à analyser', count: pending.seancesClub, icon: '📋' },
    ...(isAdminClubs ? [{ id: 'demandes_club', label: 'Demandes club non traitées', count: pending.demandesClub, icon: '🏟️' }] : []),
    { id: 'support', label: 'Tickets support ouverts', count: pending.support, icon: '💬' },
  ]

  return (
    <>
      {isAdminClubs && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {FAMILLES.map(f => {
            const total = comptesParPlan ? f.plans.reduce((sum, p) => sum + (comptesParPlan[p] || 0), 0) : '…'
            return <StatCard key={f.label} label={f.label} value={total} accent={c.accent} onClick={() => goTo('users')} />
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isAdminClubs ? '1fr 1fr' : '1fr', gap: '14px' }}>
        {isAdminClubs && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>Inscriptions — 6 derniers mois</p>
            </div>
            {!serieInscriptions ? (
              <p style={{ color: c.textMuted, fontSize: '13px' }}>Chargement...</p>
            ) : (
              <SignupsChart data={serieInscriptions} color={c.accent} textColor={c.textMuted} fontFamily={fonts.mono} />
            )}
          </Card>
        )}

        <Card>
          <p style={{ margin: '0 0 14px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>
            Demandes en attente
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lignesAttente.map(l => (
              <div key={l.id} onClick={() => goTo(l.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: c.surface2, borderRadius: '7px', cursor: 'pointer' }}>
                <span style={{ fontSize: '13px', color: c.text }}>{l.icon} {l.label}</span>
                {l.count > 0 ? (
                  <Pill variant="pending">{l.count} en attente</Pill>
                ) : (
                  <Pill variant="inactive">à jour</Pill>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function SignupsChart({ data, color, textColor, fontFamily }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const w = 100 / data.length
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '90px' }}>
        {data.map(d => (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <span style={{ fontFamily, fontSize: '10px', color: textColor, marginBottom: '3px' }}>{d.count || ''}</span>
            <div style={{ width: `${Math.max(w - 6, 10)}%`, minWidth: '10px', height: `${Math.max((d.count / max) * 100, 3)}%`, background: color, borderRadius: '3px 3px 0 0' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
        {data.map(d => (
          <span key={d.key} style={{ flex: 1, textAlign: 'center', fontSize: '11px', color: textColor, textTransform: 'capitalize' }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}
