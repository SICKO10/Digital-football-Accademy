import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { candidatsRenfort, ajouterRenfort, retirerRenfort, libelleRenfort } from '../../lib/categoriesRenfort'

// Convocation d'un match (bloc 7 du chantier catégories) : « Ajouter un
// renfort » liste les joueurs des autres équipes de la catégorie (prénom, nom,
// poste, numéro, équipe : rien de plus). Le joueur choisi reste dans l'effectif
// de son équipe ; il est convoqué avec le groupe et saisi sur la feuille du
// match. Rien ne s'affiche si la catégorie est en effectif commun, si l'équipe
// est seule dans sa catégorie, ou si la fonction de la base n'est pas en place.
export default function RenfortConvocation({ clubCategorieId, joueursEquipe, renforts, onChange }) {
  const colors = useColors()
  const [charges, setPossibles] = useState([])
  const possibles = clubCategorieId ? charges : []
  const [ouvert, setOuvert] = useState(false)
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    if (!clubCategorieId) return
    let annule = false
    ;(async () => {
      const { data, error } = await supabase.rpc('categories_renforts_possibles', { p_club_categorie_id: clubCategorieId })
      if (!annule) setPossibles(error ? [] : (data || []))
    })()
    return () => { annule = true }
  }, [clubCategorieId])

  if (possibles.length === 0 && renforts.length === 0) return null

  const candidats = candidatsRenfort(possibles, renforts, joueursEquipe, recherche)
  const bord = `1px solid ${colors.border.default}`

  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ margin: '0 0 6px', fontSize: '12px', fontWeight: 700, color: colors.text.secondary }}>Renforts</p>

      {renforts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
          {renforts.map(r => (
            <div key={r.fiche_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: colors.accent.info + alpha.subtle, border: `1px solid ${colors.accent.info}${alpha.light}` }}>
              <span style={{ flex: 1, fontSize: '12px', color: colors.text.primary }}>
                {r.prenom} {r.nom}
                <span style={{ marginLeft: '8px', fontSize: '11px', color: colors.text.faint }}>{libelleRenfort(r)}</span>
              </span>
              <button type="button" onClick={() => onChange(retirerRenfort(renforts, r.fiche_id))}
                style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
                Retirer
              </button>
            </div>
          ))}
        </div>
      )}

      {possibles.length > 0 && !ouvert && (
        <button type="button" onClick={() => setOuvert(true)}
          style={{ background: 'none', border: `1px dashed ${colors.border.strong}`, color: colors.text.faint, padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', width: '100%' }}>
          + Ajouter un renfort
        </button>
      )}

      {ouvert && (
        <div style={{ border: bord, borderRadius: '10px', padding: '10px', background: colors.background.surface }}>
          <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher un joueur (nom, poste, numéro, équipe)"
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '8px', border: bord, background: colors.background.sunken, color: colors.text.primary, fontSize: '13px', marginBottom: '8px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
            {candidats.map(p => {
              const sansCompte = !p.joueur_id
              return (
                <div key={p.fiche_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 4px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '13px', color: colors.text.primary }}>
                      {p.prenom} {p.nom}{p.numero_maillot ? ` · n° ${p.numero_maillot}` : ''}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: colors.text.faint }}>
                      {[p.poste, libelleRenfort(p).replace('renfort ', '')].filter(Boolean).join(' · ')}
                      {sansCompte ? ' · sans compte, ne peut pas être convoqué' : ''}
                    </p>
                  </div>
                  <button type="button" disabled={sansCompte} onClick={() => onChange(ajouterRenfort(renforts, p))}
                    style={{ padding: '5px 12px', borderRadius: '6px', border: bord, background: colors.background.raised, color: sansCompte ? colors.text.disabled : colors.text.primary, cursor: sansCompte ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700 }}>
                    Ajouter
                  </button>
                </div>
              )
            })}
            {candidats.length === 0 && (
              <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>
                {recherche ? 'Aucun joueur ne correspond.' : 'Tous les joueurs des autres équipes sont déjà ajoutés.'}
              </p>
            )}
          </div>
          <button type="button" onClick={() => { setOuvert(false); setRecherche('') }}
            style={{ marginTop: '8px', background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: '12px' }}>
            Fermer
          </button>
        </div>
      )}
    </div>
  )
}
