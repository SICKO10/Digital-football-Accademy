import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { colors } from '../../tokens'
import StatCard from '../../components/coachAdmin/StatCard'
import Card from '../../components/coachAdmin/Card'

// Regroupement des valeurs canoniques de profiles.plan (cf. src/pages/Register.jsx)
// en 4 familles lisibles pour un admin, sans inventer de sous-catégories.
const FAMILLES = [
  { label: 'Joueurs', plans: ['joueur_starter', 'joueur_pro'], color: colors.accent.green },
  { label: 'Éducateurs', plans: ['educateur'], color: colors.accent.blue },
  { label: 'Clubs', plans: ['club'], color: colors.accent.amber },
  { label: 'Recruteurs', plans: ['scout'], color: colors.accent.purpleLight },
]

export default function Overview({ isAdminClubs, goTo, pending }) {
  const [comptes, setComptes] = useState(null)

  useEffect(() => {
    if (!isAdminClubs) return
    supabase.from('profiles').select('plan').then(({ data, error }) => {
      if (error) { console.error('Erreur comptage profils :', error); return }
      const parPlan = (data || []).reduce((acc, p) => {
        acc[p.plan] = (acc[p.plan] || 0) + 1
        return acc
      }, {})
      setComptes(parPlan)
    })
  }, [isAdminClubs])

  const lignesAttente = [
    { id: 'analyses', label: "Demandes d'analyse joueur", count: pending.analyses, icon: '📋' },
    { id: 'certifications', label: 'Certifications à valider', count: pending.certifications, icon: '⭐' },
    { id: 'seances_club', label: 'Séances club à analyser', count: pending.seancesClub, icon: '🎥' },
    ...(isAdminClubs ? [{ id: 'demandes_club', label: 'Demandes club non traitées', count: pending.demandesClub, icon: '📨' }] : []),
    { id: 'support', label: 'Tickets support ouverts', count: pending.support, icon: '💬' },
  ]

  return (
    <>
      {isAdminClubs && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
          {FAMILLES.map(f => {
            const total = comptes ? f.plans.reduce((sum, p) => sum + (comptes[p] || 0), 0) : '…'
            return <StatCard key={f.label} label={f.label} value={total} color={f.color} onClick={() => goTo('users')} />
          })}
        </div>
      )}

      <Card>
        <p style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: colors.text.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Demandes en attente
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {lignesAttente.map(l => (
            <div key={l.id} onClick={() => goTo(l.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = colors.background.raised}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '16px' }}>{l.icon}</span>
              <span style={{ flex: 1, fontSize: '13px', color: colors.text.secondary }}>{l.label}</span>
              <span style={{
                background: l.count > 0 ? colors.accent.orange + '20' : colors.background.raised,
                color: l.count > 0 ? colors.accent.orange : colors.text.disabled,
                fontSize: '12px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px', minWidth: '24px', textAlign: 'center',
              }}>
                {l.count}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
