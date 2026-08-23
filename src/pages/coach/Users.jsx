import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import { TYPE_FAMILIES, TYPE_LABEL } from './constants'
import FilterBar from '../../components/coachAdmin/FilterBar'
import SimpleTable from '../../components/coachAdmin/SimpleTable'
import Pill from '../../components/coachAdmin/Pill'
import Card from '../../components/coachAdmin/Card'
import StatCard from '../../components/coachAdmin/StatCard'

export default function Users({ initialType = 'tous' }) {
  const { c, fonts } = useCoachTheme()
  const [profils, setProfils] = useState(null)
  const [statutFiltre, setStatutFiltre] = useState('tous') // tous | actif | inactif
  const [typeFiltre, setTypeFiltre] = useState(initialType) // 'tous' | clé de TYPE_FAMILIES
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    supabase.from('profiles')
      .select('id, prenom, nom, email, plan, abonnement_actif, abonnement_cycle, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('Erreur chargement utilisateurs :', error); setProfils([]); return }
        setProfils(data || [])
      })
  }, [])

  const filtres = useMemo(() => {
    if (!profils) return []
    const famille = TYPE_FAMILIES.find(f => f.key === typeFiltre)
    const q = recherche.trim().toLowerCase()
    return profils.filter(p => {
      if (statutFiltre === 'actif' && !p.abonnement_actif) return false
      if (statutFiltre === 'inactif' && p.abonnement_actif) return false
      if (famille && !famille.plans.includes(p.plan)) return false
      if (q) {
        const nomComplet = `${p.prenom || ''} ${p.nom || ''} ${p.email || ''}`.toLowerCase()
        if (!nomComplet.includes(q)) return false
      }
      return true
    })
  }, [profils, statutFiltre, typeFiltre, recherche])

  if (!profils) return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  const columns = [
    { key: 'nom', label: 'Nom', render: p => `${p.prenom || ''} ${p.nom || ''}`.trim() || '—' },
    { key: 'plan', label: 'Type', render: p => TYPE_LABEL[p.plan] || p.plan || '—' },
    { key: 'statut', label: 'Statut', render: p => <Pill variant={p.abonnement_actif ? 'active' : 'inactive'}>{p.abonnement_actif ? 'Actif' : 'Inactif'}</Pill> },
    { key: 'created_at', label: 'Inscription', render: p => new Date(p.created_at).toLocaleDateString('fr-FR') },
    { key: 'cycle', label: 'Abonnement', render: p => p.abonnement_cycle ? (p.abonnement_cycle === 'mensuel' ? 'Mensuel' : 'Annuel') : '—' },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {TYPE_FAMILIES.map(f => {
          const membres = profils.filter(p => f.plans.includes(p.plan))
          const actifs = membres.filter(p => p.abonnement_actif).length
          return (
            <div key={f.key} onClick={() => setTypeFiltre(f.key)} style={{ cursor: 'pointer' }}>
              <StatCard label={f.label} value={membres.length} accent={c[f.colorKey]} active={typeFiltre === f.key} />
              <div style={{ marginTop: '6px', textAlign: 'center' }}>
                <Pill variant="active">{actifs} actifs</Pill>
              </div>
            </div>
          )
        })}
      </div>

      <Card style={{ marginBottom: '14px' }}>
        <FilterBar
          toggles={[
            { key: 'tous', label: 'Tous', active: statutFiltre === 'tous', onClick: () => setStatutFiltre('tous') },
            { key: 'actif', label: 'Actifs', active: statutFiltre === 'actif', onClick: () => setStatutFiltre('actif') },
            { key: 'inactif', label: 'Inactifs', active: statutFiltre === 'inactif', onClick: () => setStatutFiltre('inactif') },
          ]}
          search={recherche}
          onSearchChange={setRecherche}
          searchPlaceholder="Rechercher un nom, un email..."
        />
        <select value={typeFiltre} onChange={e => setTypeFiltre(e.target.value)}
          style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text, borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontFamily: fonts.body }}>
          <option value="tous">Tous types</option>
          {TYPE_FAMILIES.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </Card>

      <Card>
        <SimpleTable
          columns={columns}
          rows={filtres}
          rowKey="id"
          emptyLabel="Aucun utilisateur ne correspond à ces filtres"
          renderExpanded={p => (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '12px' }}>
              <div><span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ID</span><br /><span style={{ color: c.text, fontFamily: fonts.mono }}>{p.id}</span></div>
              <div><span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</span><br /><span style={{ color: c.text }}>{p.email}</span></div>
              <div><span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</span><br /><span style={{ color: c.text }}>{TYPE_LABEL[p.plan] || p.plan}</span></div>
              <div><span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Statut</span><br /><span style={{ color: c.text }}>{p.abonnement_actif ? 'Actif' : 'Inactif'}</span></div>
              <div><span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Inscrit le</span><br /><span style={{ color: c.text }}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</span></div>
              <div><span style={{ color: c.textMuted, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Plan</span><br /><span style={{ color: c.text }}>{p.abonnement_cycle || '—'}</span></div>
            </div>
          )}
        />
      </Card>
    </>
  )
}
