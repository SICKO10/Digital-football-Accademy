import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { regrouperCategories, MODES_CATEGORIE } from '../../lib/categoriesClub'

// Liste des catégories du club (U15 : A, B, C) avec leur mode. Création,
// suppression et changement de mode réservés au compte principal du club
// (décision 2 du brief).
export default function ListeCategories({ clubId, equipes, peutCreer, accentColor, onCreer, onConvocations, onChangerMode, onRetour, onChange }) {
  const colors = useColors()
  const [liste, setListe] = useState(null)
  const [erreur, setErreur] = useState('')

  const charger = async () => {
    const { data, error } = await supabase.from('categories').select('id, nom, mode, created_at').eq('club_id', clubId)
    if (error) { setErreur(error.message); setListe([]); return }
    setListe(data || [])
  }
  useEffect(() => { charger() }, [clubId, equipes.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const supprimer = async (c) => {
    if (!confirm(`Supprimer la catégorie ${labelCategorie(c.nom)} ? Elle ne contient aucune équipe.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) { setErreur(error.message); return }
    setListe(prev => prev.filter(x => x.id !== c.id))
    onChange?.()
  }

  const groupes = liste ? regrouperCategories(liste, equipes) : []
  const btnLien = { background: 'none', border: 'none', padding: 0, color: accentColor, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <nav style={{ fontSize: '13px', color: colors.text.faint }}>
        <button style={btnLien} onClick={onRetour}>Catégories & Équipes</button> / Catégories
      </nav>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Catégories</h1>
          <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>
            {liste ? `${groupes.length} catégorie${groupes.length > 1 ? 's' : ''}` : 'Chargement'}
          </p>
        </div>
        {peutCreer && (
          <button onClick={onCreer} style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', background: accentColor, color: colors.accent.onBrand, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Créer une catégorie
          </button>
        )}
      </div>
      {erreur && <p style={{ margin: 0, color: colors.accent.red, fontSize: '13px' }}>{erreur}</p>}
      {liste && groupes.length === 0 && !erreur && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '2.5rem 1.5rem', textAlign: 'center', color: colors.text.secondary, fontWeight: 600 }}>
          Aucune catégorie pour le moment.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groupes.map(c => (
          <div key={c.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, fontWeight: 800, fontSize: '16px', minWidth: '90px' }}>{labelCategorie(c.nom)}</p>
              <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px', border: `1px solid ${colors.border.default}`, color: colors.text.secondary }}>
                {MODES_CATEGORIE[c.mode]?.label || c.mode}
              </span>
              {onConvocations && c.mode === 'commun' && c.equipes.length > 0 && (
                <button onClick={() => onConvocations(c)} style={btnLien}>Convocations</button>
              )}
              {onChangerMode && peutCreer && c.equipes.length > 0 && (
                <button onClick={() => onChangerMode(c)} style={btnLien}>Changer de mode</button>
              )}
              {peutCreer && c.equipes.length === 0 && (
                <button onClick={() => supprimer(c)} style={{ ...btnLien, color: colors.accent.red }}>Supprimer</button>
              )}
            </div>
            {c.equipes.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {c.equipes.map(e => (
                  <span key={e.id} style={{ padding: '6px 12px', borderRadius: '9px', background: colors.background.base, border: `1px solid ${colors.border.subtle}`, fontSize: '13px', fontWeight: 700 }}>
                    {e.nom} {e.equipe}
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: colors.accent.amber }}>Aucune équipe dans cette catégorie.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
