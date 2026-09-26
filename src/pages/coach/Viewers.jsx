import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import { TYPE_LABEL } from './constants'
import StatCard from '../../components/coachAdmin/StatCard'
import Card from '../../components/coachAdmin/Card'
import SimpleTable from '../../components/coachAdmin/SimpleTable'

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

// Statistiques de connexion plateforme (connexions_log, cf.
// supabase_connexions_log.sql) — data à but commercial (montrer l'engagement
// réel de la plateforme à un club ou un sponsor), donc volontairement
// globale (tous comptes, tous clubs), pas scopée à l'effectif d'un éducateur
// (ça, c'était la V1 dans DashboardEducateur.jsx, retirée : un éducateur n'a
// pas à voir ces chiffres, seul l'admin plateforme en a l'usage).
export default function Viewers() {
  const { c, fonts } = useCoachTheme()
  const [periode, setPeriode] = useState('semaine')
  const [connexions, setConnexions] = useState(null)
  const [profilsParId, setProfilsParId] = useState({})
  const [totalComptes, setTotalComptes] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ count }) => setTotalComptes(count ?? null))
  }, [])

  useEffect(() => {
    setConnexions(null)
    supabase.from('connexions_log').select('user_id, role, created_at')
      .gte('created_at', dateDebut(periode))
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) { console.error('Erreur connexions_log :', error); setConnexions([]); return }
        const rows = data || []
        setConnexions(rows)
        const ids = [...new Set(rows.map(r => r.user_id))]
        if (ids.length === 0) return
        const { data: profils } = await supabase.from('profiles').select('id, prenom, nom, plan').in('id', ids)
        setProfilsParId(Object.fromEntries((profils || []).map(p => [p.id, p])))
      })
  }, [periode])

  const totalVisites = connexions?.length ?? 0
  const comptesActifs = useMemo(() => new Set((connexions || []).map(c2 => c2.user_id)).size, [connexions])

  const parCompte = useMemo(() => {
    if (!connexions) return []
    const acc = {}
    connexions.forEach(row => {
      if (!acc[row.user_id]) acc[row.user_id] = { user_id: row.user_id, nb: 0, derniere: row.created_at }
      acc[row.user_id].nb++
    })
    return Object.values(acc).sort((a, b) => b.nb - a.nb)
  }, [connexions])

  // Série du graphique : par jour pour jour/semaine/mois (peu de points), par
  // mois pour "12 mois" (365 barres journalières seraient illisibles).
  const serie = useMemo(() => {
    if (!connexions) return null
    if (periode === 'annee') {
      const mois = derniersMois(12)
      const parMois = Object.fromEntries(mois.map(m => [m.key, 0]))
      connexions.forEach(row => {
        const d = new Date(row.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (key in parMois) parMois[key]++
      })
      return mois.map(m => ({ key: m.key, label: m.label, count: parMois[m.key] }))
    }
    const parJour = {}
    connexions.forEach(row => {
      const jour = row.created_at.split('T')[0]
      parJour[jour] = (parJour[jour] || 0) + 1
    })
    return Object.entries(parJour).sort(([a], [b]) => a.localeCompare(b))
      .map(([jour, count]) => ({ key: jour, label: new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), count }))
  }, [connexions, periode])

  const colonnes = [
    { key: 'nom', label: 'Compte', render: row => {
      const p = profilsParId[row.user_id]
      return p ? `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Sans nom' : row.user_id
    } },
    { key: 'role', label: 'Rôle', render: row => TYPE_LABEL[profilsParId[row.user_id]?.plan] || profilsParId[row.user_id]?.plan || '—' },
    { key: 'derniere', label: 'Dernière visite', render: row => new Date(row.derniere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
    { key: 'nb', label: 'Visites', render: row => row.nb },
  ]

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {PERIODES.map(p => (
          <button key={p.id} onClick={() => setPeriode(p.id)} style={{
            padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            background: periode === p.id ? c.accent : c.surface2,
            color: periode === p.id ? '#fff' : c.textMuted,
            border: `1px solid ${periode === p.id ? c.accent : c.border}`,
          }}>{p.label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatCard label="Visites" value={connexions === null ? '…' : totalVisites} accent={c.accent} />
        <StatCard label="Comptes actifs" value={connexions === null ? '…' : comptesActifs} accent={c.success} />
        <StatCard label="Comptes plateforme" value={totalComptes ?? '…'} accent={c.warn} sub="tous plans confondus" />
      </div>

      <Card style={{ marginBottom: '14px' }}>
        <p style={{ margin: '0 0 14px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>
          Visites — {PERIODES.find(p => p.id === periode)?.label.toLowerCase()}
        </p>
        {!serie ? (
          <p style={{ color: c.textMuted, fontSize: '13px' }}>Chargement...</p>
        ) : serie.length === 0 ? (
          <p style={{ color: c.textMuted, fontSize: '13px' }}>Aucune connexion sur cette période</p>
        ) : (
          <VisitesChart data={serie} color={c.accent} textColor={c.textMuted} fontFamily={fonts.mono} />
        )}
      </Card>

      <Card>
        <p style={{ margin: '0 0 14px', fontFamily: fonts.display, fontSize: '15px', fontWeight: 600, color: c.text, letterSpacing: '0.03em' }}>
          Comptes les plus actifs
        </p>
        {connexions === null ? (
          <p style={{ color: c.textMuted, fontSize: '13px' }}>Chargement...</p>
        ) : (
          <SimpleTable columns={colonnes} rows={parCompte} rowKey="user_id" emptyLabel="Aucune connexion sur cette période" />
        )}
      </Card>
    </>
  )
}

function VisitesChart({ data, color, textColor, fontFamily }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const w = 100 / data.length
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '110px', overflowX: 'auto' }}>
      {data.map(d => (
        <div key={d.key} style={{ flex: 1, minWidth: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <span style={{ fontFamily, fontSize: '9px', color: textColor, marginBottom: '3px' }}>{d.count || ''}</span>
          <div style={{ width: `${Math.max(w - 4, 6)}%`, minWidth: '6px', height: `${Math.max((d.count / max) * 78, 3)}%`, background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.2s ease' }} />
          <span style={{ fontSize: '9px', color: textColor, marginTop: '4px', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}
