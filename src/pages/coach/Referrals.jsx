import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import StatCard from '../../components/coachAdmin/StatCard'
import Card from '../../components/coachAdmin/Card'
import FilterBar from '../../components/coachAdmin/FilterBar'
import SimpleTable from '../../components/coachAdmin/SimpleTable'
import Pill from '../../components/coachAdmin/Pill'
import { IcoShare, IcoTrophy } from './NavIcons'

const BENEFICE = { 0: '—', 1: '1 an offert', 2: '2 ans offerts', 3: '3 ans offerts + 2 vidéos' }
const PALIER_SEUIL = { 1: 3, 2: 6, 3: 9 }

export default function Referrals({ coachId }) {
  const { c, rgba } = useCoachTheme()
  const [donnees, setDonnees] = useState(null)
  const [filtre, setFiltre] = useState('tous') // tous | p1 | p2 | p3
  const [accordingKey, setAccordingKey] = useState(null)

  const charger = async () => {
    const [{ data: filleuls, error: e1 }, { data: paiementsAnnuels, error: e2 }, { data: recompenses, error: e3 }] = await Promise.all([
      supabase.from('profiles').select('id, prenom, nom, email, created_at, parrain_id').not('parrain_id', 'is', null),
      supabase.from('paiements').select('profile_id').eq('cycle', 'annuel'),
      supabase.from('parrainage_recompenses').select('parrain_id, palier'),
    ])
    if (e1 || e2 || e3) { console.error('Erreur chargement parrainage :', e1 || e2 || e3); setDonnees({ parrains: [] }); return }

    const idsValides = new Set((paiementsAnnuels || []).map(p => p.profile_id))
    const parrainIds = [...new Set((filleuls || []).map(f => f.parrain_id))]
    const { data: parrains } = parrainIds.length > 0
      ? await supabase.from('profiles').select('id, prenom, nom, email').in('id', parrainIds)
      : { data: [] }
    const parrainsParId = Object.fromEntries((parrains || []).map(p => [p.id, p]))

    const parFilleulsParParrain = (filleuls || []).reduce((acc, f) => {
      if (!acc[f.parrain_id]) acc[f.parrain_id] = []
      acc[f.parrain_id].push({ ...f, valide: idsValides.has(f.id) })
      return acc
    }, {})

    const recompensesParParrain = (recompenses || []).reduce((acc, r) => {
      if (!acc[r.parrain_id]) acc[r.parrain_id] = new Set()
      acc[r.parrain_id].add(r.palier)
      return acc
    }, {})

    const liste = Object.entries(parFilleulsParParrain).map(([parrainId, mesFilleuls]) => {
      const valides = mesFilleuls.filter(f => f.valide).length
      const palier = valides >= 9 ? 3 : valides >= 6 ? 2 : valides >= 3 ? 1 : 0
      return {
        parrainId,
        parrain: parrainsParId[parrainId] || null,
        filleuls: mesFilleuls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        valides,
        palier,
        paliersAccordes: recompensesParParrain[parrainId] || new Set(),
      }
    }).sort((a, b) => b.valides - a.valides)

    setDonnees({ parrains: liste })
  }

  useEffect(() => { charger() }, [])

  const accorder = async (parrainId, palier) => {
    setAccordingKey(`${parrainId}-${palier}`)
    const { error } = await supabase.from('parrainage_recompenses').insert({ parrain_id: parrainId, palier, accorde_par: coachId })
    if (error) {
      alert('Erreur : ' + error.message)
      setAccordingKey(null)
      return
    }
    if (palier === 3) {
      const { error: rpcErr } = await supabase.rpc('increment_analyses', { profile_id: parrainId, delta: 2 })
      if (rpcErr) console.error('Erreur crédit analyses palier 3 :', rpcErr)
    }
    await charger()
    setAccordingKey(null)
  }

  const parrainsFiltres = useMemo(() => {
    if (!donnees) return []
    if (filtre === 'tous') return donnees.parrains
    const seuil = filtre === 'p1' ? 1 : filtre === 'p2' ? 2 : 3
    return donnees.parrains.filter(p => p.palier >= seuil)
  }, [donnees, filtre])

  if (!donnees) return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem' }}>Chargement...</p>

  const parrainsActifs = donnees.parrains.filter(p => p.valides >= 1).length
  const palier3Atteints = donnees.parrains.filter(p => p.palier === 3).length
  const recompensesAccordees = donnees.parrains.reduce((s, p) => s + p.paliersAccordes.size, 0)
  const videosOffertes = donnees.parrains.filter(p => p.paliersAccordes.has(3)).length * 2

  const columns = [
    { key: 'parrain', label: 'Parrain', render: p => p.parrain ? `${p.parrain.prenom || ''} ${p.parrain.nom || ''}`.trim() || p.parrain.email : '(profil supprimé)' },
    {
      key: 'progression', label: 'Progression', render: p => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {Array.from({ length: 9 }, (_, i) => {
              const atteint = i < p.valides
              const couleur = i < 3 ? c.accent : i < 6 ? c.warn : c.success
              return <div key={i} style={{ width: '14px', height: '5px', borderRadius: '3px', background: atteint ? couleur : c.border }} />
            })}
          </div>
          <span style={{ fontSize: '11px', color: c.textMuted, fontFamily: 'monospace' }}>{p.valides}/9</span>
        </div>
      ),
    },
    { key: 'palier', label: 'Palier', render: p => p.palier > 0 ? <Pill variant={p.palier === 3 ? 'active' : p.palier === 2 ? 'pending' : 'info'}>Palier {p.palier}</Pill> : <Pill variant="inactive">Aucun</Pill> },
    { key: 'benefice', label: 'Bénéfice', render: p => BENEFICE[p.palier] },
    {
      key: 'actions', label: 'Actions', render: p => {
        if (p.palier === 0 || p.paliersAccordes.has(p.palier)) return p.paliersAccordes.has(p.palier) ? <Pill variant="active">Accordé</Pill> : null
        const key = `${p.parrainId}-${p.palier}`
        return (
          <button onClick={e => { e.stopPropagation(); accorder(p.parrainId, p.palier) }} disabled={accordingKey === key}
            style={{ background: rgba(c.success, 0.12), border: `1px solid ${rgba(c.success, 0.4)}`, color: c.success, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {accordingKey === key ? 'Envoi...' : `Accorder palier ${p.palier}`}
          </button>
        )
      },
    },
  ]

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <Card>
          <p style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: c.text }}>Paliers FreePlay</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: rgba(c.accent, 0.1), border: `1px solid ${rgba(c.accent, 0.3)}` }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '12px', fontWeight: 700, color: c.accent }}><IcoShare size={13} /> Palier 1 — 3 parrainages annuels</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>1 an de gratuité offert</p>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: rgba(c.warn, 0.1), border: `1px solid ${rgba(c.warn, 0.3)}` }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '12px', fontWeight: 700, color: c.warn }}><IcoShare size={13} /> Palier 2 — 6 parrainages annuels</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>2 ans de gratuité offerts</p>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: rgba(c.success, 0.1), border: `1px solid ${rgba(c.success, 0.3)}` }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '12px', fontWeight: 700, color: c.success }}><IcoTrophy size={13} /> Palier 3 — 9 parrainages annuels</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: c.textMuted }}>3 ans de gratuité + 2 vidéos d'analyse offertes</p>
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <StatCard label="Parrains actifs" value={parrainsActifs} accent={c.accent} />
          <StatCard label="Palier 3 atteints" value={palier3Atteints} accent={c.success} />
          <StatCard label="Récompenses accordées" value={recompensesAccordees} accent={c.warn} />
          <StatCard label="Vidéos offertes" value={videosOffertes} accent={c.danger} />
        </div>
      </div>

      <p style={{ color: c.textMuted, fontSize: '12px', margin: '0 0 12px' }}>
        "Accorder" crédite automatiquement les 2 vidéos d'analyse pour le palier 3 (via le système de crédits existant). Les années de gratuité restent à appliquer manuellement sur l'abonnement Stripe du parrain — aucune action automatique n'est faite sur la facturation.
      </p>

      <Card>
        <FilterBar
          toggles={[
            { key: 'tous', label: 'Tous', active: filtre === 'tous', onClick: () => setFiltre('tous') },
            { key: 'p1', label: `Palier 1+ (≥${PALIER_SEUIL[1]})`, active: filtre === 'p1', onClick: () => setFiltre('p1') },
            { key: 'p2', label: `Palier 2+ (≥${PALIER_SEUIL[2]})`, active: filtre === 'p2', onClick: () => setFiltre('p2') },
            { key: 'p3', label: `Palier 3 (≥${PALIER_SEUIL[3]})`, active: filtre === 'p3', onClick: () => setFiltre('p3') },
          ]}
        />
        <SimpleTable
          columns={columns}
          rows={parrainsFiltres}
          rowKey="parrainId"
          emptyLabel="Aucun parrainage pour le moment"
          renderExpanded={p => (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {p.filleuls.map(f => (
                <div key={f.id} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: c.text }}>{`${f.prenom || ''} ${f.nom || ''}`.trim() || f.email}</p>
                  <p style={{ margin: '3px 0 0', fontSize: '11px', color: c.textMuted }}>{new Date(f.created_at).toLocaleDateString('fr-FR')}</p>
                  <div style={{ marginTop: '4px' }}>
                    {f.valide ? <Pill variant="active">Annuel</Pill> : <Pill variant="inactive">Pas encore validé</Pill>}
                  </div>
                </div>
              ))}
            </div>
          )}
        />
      </Card>
    </>
  )
}
