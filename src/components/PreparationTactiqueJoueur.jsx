import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import TactipadViewer from './TactipadViewer'

// Vue joueur des schémas Tactipad partagés — lit les schémas (table
// tactipads) où visible_joueurs = true, appartenant à l'un des éducateurs
// affiliés au joueur (educateurIds). Partage interne distinct du lien public
// (tactipads.partage/partage_slug) : cf. supabase_tactipads_visible_joueurs.sql
// pour la policy RLS qui vérifie l'affiliation acceptée côté base.
export default function PreparationTactiqueJoueur({ educateurIds = [], accentColor }) {
  const colors = useColors()
  const accent = accentColor || colors.accent.blue
  const [schemas, setSchemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [schemaActif, setSchemaActif] = useState(null)

  const idsKey = educateurIds.join(',')

  useEffect(() => {
    const charger = async () => {
      if (!educateurIds.length) { setSchemas([]); setLoading(false); return }
      setLoading(true)
      const { data } = await supabase.from('tactipads').select('*')
        .in('educateur_id', educateurIds).eq('visible_joueurs', true)
        .order('created_at', { ascending: false })
      setSchemas(data || [])
      setLoading(false)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  if (loading) return <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Chargement...</p>

  if (schemaActif) {
    return (
      <div style={{ maxWidth: '900px' }}>
        <button onClick={() => setSchemaActif(null)}
          style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '13px', fontWeight: 700, marginBottom: '16px', padding: 0 }}>
          ← Retour aux schémas
        </button>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px' }}>
          <h2 style={{ color: colors.text.primary, margin: '0 0 16px', fontSize: '18px' }}>{schemaActif.nom || 'Sans titre'}</h2>
          <TactipadViewer schema={schemaActif.schema} width={800} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px', color: colors.text.primary }}>Préparation tactique</h2>
      <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '20px' }}>Schémas partagés par ton éducateur.</p>

      {schemas.length === 0 ? (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ color: colors.text.disabled, fontWeight: 600, fontSize: '14px', margin: '0 0 4px' }}>Aucun schéma disponible</p>
          <p style={{ color: colors.text.ghost, fontSize: '12px', margin: 0 }}>Ton éducateur n'a pas encore partagé de schéma tactique.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
          {schemas.map(s => (
            <div key={s.id} onClick={() => setSchemaActif(s)}
              style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '16px', cursor: 'pointer' }}>
              <div style={{ background: colors.background.sunken, borderRadius: '8px', height: '100px', marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: colors.text.primary }}>{s.nom || 'Sans titre'}</p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>
                Mis à jour le {new Date(s.updated_at || s.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
