import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { colors } from '../../tokens'
import StatCard from '../../components/coachAdmin/StatCard'
import Tabs from '../../components/coachAdmin/Tabs'
import SimpleTable from '../../components/coachAdmin/SimpleTable'

const TYPE_LABEL = {
  joueur_starter: 'Joueur Starter', joueur_pro: 'Joueur Pro', educateur: 'Éducateur',
  club: 'Club', scout: 'Recruteur', dirigeant: 'Dirigeant',
}

export default function Subscriptions() {
  const [profils, setProfils] = useState(null)
  const [cycle, setCycle] = useState('mensuel')

  useEffect(() => {
    supabase.from('profiles')
      .select('id, prenom, nom, plan, abonnement_cycle, created_at')
      .eq('abonnement_actif', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('Erreur chargement abonnements :', error); setProfils([]); return }
        setProfils(data || [])
      })
  }, [])

  const { mensuels, annuels } = useMemo(() => {
    const list = profils || []
    return {
      mensuels: list.filter(p => p.abonnement_cycle === 'mensuel'),
      annuels: list.filter(p => p.abonnement_cycle === 'annuel'),
    }
  }, [profils])

  if (!profils) return <p style={{ color: colors.text.dim, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  const rows = cycle === 'mensuel' ? mensuels : annuels

  const columns = [
    { key: 'nom', label: 'Utilisateur', render: p => `${p.prenom || ''} ${p.nom || ''}`.trim() || '—' },
    { key: 'plan', label: 'Type', render: p => TYPE_LABEL[p.plan] || p.plan || '—' },
    { key: 'cycle', label: 'Cycle', render: p => p.abonnement_cycle === 'mensuel' ? 'Mensuel' : 'Annuel' },
    { key: 'created_at', label: "Date d'inscription", render: p => new Date(p.created_at).toLocaleDateString('fr-FR') },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
        <StatCard label="Abonnements mensuels" value={mensuels.length} color={colors.accent.blue} onClick={() => setCycle('mensuel')} active={cycle === 'mensuel'} />
        <StatCard label="Abonnements annuels" value={annuels.length} color={colors.accent.green} onClick={() => setCycle('annuel')} active={cycle === 'annuel'} />
      </div>
      <p style={{ color: colors.text.faint, fontSize: '12px', margin: '0 0 1rem' }}>
        Le chiffre d'affaires par abonnement n'est pas encore affiché ici — aucun historique de paiement fiable par utilisateur n'est journalisé aujourd'hui (voir la page Revenus).
      </p>
      <Tabs
        tabs={[{ id: 'mensuel', label: 'Mensuel' }, { id: 'annuel', label: 'Annuel' }]}
        active={cycle}
        onChange={setCycle}
      />
      <SimpleTable columns={columns} rows={rows} rowKey="id" emptyLabel="Aucun abonnement dans ce cycle" />
    </>
  )
}
