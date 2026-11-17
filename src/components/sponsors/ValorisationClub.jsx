import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useSt } from '../../lib/useStFinance'
import { Message } from '../categories/UiCategories'

const CHAMPS_VALORISATION = [
  { key: 'nb_licencies', label: 'Nombre de licenciés' },
  { key: 'nb_familles', label: 'Nombre de familles' },
  { key: 'nb_equipes', label: 'Nombre d\'équipes' },
  { key: 'nb_matchs_saison', label: 'Matchs joués par saison' },
  { key: 'affluence_moyenne', label: 'Affluence moyenne / match' },
  { key: 'abonnes_reseaux', label: 'Abonnés réseaux sociaux' },
  { key: 'vues_videos_mois', label: 'Vues vidéos / mois' },
  { key: 'frequentation_tournois', label: 'Personnes / tournoi' },
  { key: 'nb_affichages_physiques', label: 'Affichages physiques estimés' },
]


export default function ValorisationClub({ clubId, readOnly = false, accentColor = '#4ade80' }) {
  const st = useSt()
  const [valorisation, setValorisation] = useState({})
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('club_valorisation').select('*').eq('club_id', clubId).maybeSingle()
    if (error?.code === '42P01') { setTableMissing(true); setLoading(false); return }
    setTableMissing(false)
    setValorisation(data || {})
    setLoading(false)
  }

  useEffect(() => { if (clubId) loadData() }, [clubId])

  const champ = (key, value) => setValorisation(v => ({ ...v, [key]: value }))

  const sauvegarder = async () => {
    setSaving(true)
    setSaved(false)
    const payload = { club_id: clubId, repartition_geo: valorisation.repartition_geo || null, updated_at: new Date().toISOString() }
    CHAMPS_VALORISATION.forEach(c => { payload[c.key] = valorisation[c.key] != null && valorisation[c.key] !== '' ? Number(valorisation[c.key]) : null })
    const { error } = await supabase.from('club_valorisation').upsert(payload, { onConflict: 'club_id' })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (tableMissing) {
    return (
      <Message ton="alerte">
        La table <code>club_valorisation</code> n'existe pas encore en base — exécute la migration SQL dans Supabase avant d'utiliser cette rubrique.
      </Message>
    )
  }

  if (loading) return <p style={{ color: st.textGhost, fontSize: '13px' }}>Chargement...</p>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', alignItems: 'start' }}>

      {/* Formulaire */}
      <div style={st.card}>
        <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '14px' }}>Chiffres clés du club</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CHAMPS_VALORISATION.map(c => (
            <div key={c.key} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ color: st.textDim, fontSize: '13px', flex: 1 }}>{c.label}</label>
              <input type="number" min="0" value={valorisation[c.key] ?? ''} onChange={e => champ(c.key, e.target.value)}
                disabled={readOnly} style={{ ...st.input, width: '110px' }} />
            </div>
          ))}
          <div>
            <label style={st.label}>Répartition géographique des familles</label>
            <input value={valorisation.repartition_geo || ''} onChange={e => champ('repartition_geo', e.target.value)}
              disabled={readOnly} placeholder="Ex : 70% Cannes, 20% Antibes, 10% Nice" style={{ ...st.input, width: '100%' }} />
          </div>
          {!readOnly && (
            <button onClick={sauvegarder} disabled={saving} style={{ ...st.btnSolid(accentColor), marginTop: '8px', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Enregistrement...' : saved ? 'Enregistré ✓' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>

      {/* Aperçu dossier commercial */}
      <div style={st.card}>
        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '14px' }}>Aperçu — dossier commercial</p>
        <p style={{ margin: '0 0 16px', color: st.textFaint, fontSize: '12px' }}>
          Ces données alimenteront le dossier commercial présenté aux prospects et sponsors.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {CHAMPS_VALORISATION.map(c => (
            <div key={c.key} style={{ background: st.bgRaised, borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
              <div style={{ color: st.textFaint, fontSize: '11px', marginBottom: '4px' }}>{c.label}</div>
              <div style={{ color: st.text, fontFamily: st.police.titre, fontWeight: 700, fontSize: '24px', fontVariantNumeric: 'tabular-nums' }}>{Number(valorisation[c.key] || 0).toLocaleString('fr-FR')}</div>
            </div>
          ))}
        </div>
        {valorisation.repartition_geo && (
          <p style={{ margin: '14px 0 0', color: st.textDim, fontSize: '12px' }}>Répartition géo : {valorisation.repartition_geo}</p>
        )}
      </div>
    </div>
  )
}
