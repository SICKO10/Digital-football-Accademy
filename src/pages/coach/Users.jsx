import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { colors } from '../../tokens'
import FilterBar from '../../components/coachAdmin/FilterBar'
import SimpleTable from '../../components/coachAdmin/SimpleTable'
import Pill from '../../components/coachAdmin/Pill'

const TYPE_LABEL = {
  joueur_starter: 'Joueur Starter',
  joueur_pro: 'Joueur Pro',
  educateur: 'Éducateur',
  club: 'Club',
  scout: 'Recruteur',
  dirigeant: 'Dirigeant',
}

export default function Users() {
  const [profils, setProfils] = useState(null)
  const [statutFiltre, setStatutFiltre] = useState('tous') // tous | actif | inactif
  const [typeFiltre, setTypeFiltre] = useState('tous')
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
    const q = recherche.trim().toLowerCase()
    return profils.filter(p => {
      if (statutFiltre === 'actif' && !p.abonnement_actif) return false
      if (statutFiltre === 'inactif' && p.abonnement_actif) return false
      if (typeFiltre !== 'tous' && p.plan !== typeFiltre) return false
      if (q) {
        const nomComplet = `${p.prenom || ''} ${p.nom || ''} ${p.email || ''}`.toLowerCase()
        if (!nomComplet.includes(q)) return false
      }
      return true
    })
  }, [profils, statutFiltre, typeFiltre, recherche])

  if (!profils) return <p style={{ color: colors.text.dim, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  const columns = [
    { key: 'nom', label: 'Nom', render: p => `${p.prenom || ''} ${p.nom || ''}`.trim() || '—' },
    { key: 'plan', label: 'Type', render: p => TYPE_LABEL[p.plan] || p.plan || '—' },
    { key: 'statut', label: 'Statut', render: p => <Pill variant={p.abonnement_actif ? 'active' : 'inactive'}>{p.abonnement_actif ? 'Actif' : 'Inactif'}</Pill> },
    { key: 'created_at', label: "Date d'inscription", render: p => new Date(p.created_at).toLocaleDateString('fr-FR') },
    { key: 'cycle', label: 'Abonnement', render: p => p.abonnement_cycle ? (p.abonnement_cycle === 'mensuel' ? 'Mensuel' : 'Annuel') : '—' },
  ]

  return (
    <>
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
      <div style={{ marginBottom: '1rem' }}>
        <select value={typeFiltre} onChange={e => setTypeFiltre(e.target.value)}
          style={{ background: colors.background.base, border: '1px solid #333', color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
          <option value="tous">Tous les types</option>
          {Object.entries(TYPE_LABEL).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
      </div>

      <SimpleTable
        columns={columns}
        rows={filtres}
        rowKey="id"
        emptyLabel="Aucun utilisateur ne correspond à ces filtres"
        renderExpanded={p => (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', fontSize: '12px' }}>
            <div><span style={{ color: colors.text.faint }}>ID</span><br /><span style={{ color: colors.text.secondary, fontFamily: 'monospace' }}>{p.id}</span></div>
            <div><span style={{ color: colors.text.faint }}>Email</span><br /><span style={{ color: colors.text.secondary }}>{p.email}</span></div>
            <div><span style={{ color: colors.text.faint }}>Type</span><br /><span style={{ color: colors.text.secondary }}>{TYPE_LABEL[p.plan] || p.plan}</span></div>
            <div><span style={{ color: colors.text.faint }}>Statut</span><br /><span style={{ color: colors.text.secondary }}>{p.abonnement_actif ? 'Actif' : 'Inactif'}</span></div>
            <div><span style={{ color: colors.text.faint }}>Inscrit le</span><br /><span style={{ color: colors.text.secondary }}>{new Date(p.created_at).toLocaleDateString('fr-FR')}</span></div>
            <div><span style={{ color: colors.text.faint }}>Plan</span><br /><span style={{ color: colors.text.secondary }}>{p.abonnement_cycle || '—'}</span></div>
          </div>
        )}
      />
    </>
  )
}
