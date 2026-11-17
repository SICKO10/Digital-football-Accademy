import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { labelCategorie } from '../../lib/categories'
import { regrouperCategories, MODES_CATEGORIE } from '../../lib/categoriesClub'
import { styleCarte, styleBoutonPrincipal, styleBoutonSecondaire, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE } from '../../lib/identite'
import { police } from '../../tokens'
import { TitreEcran, Icone } from '../identite'
import { Plus, Trash2, TriangleAlert } from 'lucide-react'
import { FilAriane, Message, Pastille } from './UiCategories'

// Liste des catégories du club (U15 : A, B, C) avec leur mode. Création,
// suppression et changement de mode réservés au compte principal du club
// (décision 2 du brief).
export default function ListeCategories({ clubId, equipes, peutCreer, onCreer, onConvocations, onChangerMode, onRetour, onChange }) {
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
  const petit = { ...styleBoutonSecondaire(colors), minHeight: '34px', padding: '0 12px', fontSize: '13px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <FilAriane etapes={[{ label: 'Catégories & Équipes', onClick: onRetour }]} courant="Catégories" />
      <TitreEcran
        titre="Catégories"
        sousTitre={liste ? `${groupes.length} catégorie${groupes.length > 1 ? 's' : ''}` : 'Chargement'}
        style={{ marginBottom: 0 }}
        actions={peutCreer && (
          <button className={CLASSE_BOUTON} onClick={onCreer} style={styleBoutonPrincipal(colors)}>
            <Icone icone={Plus} />Créer une catégorie
          </button>
        )}
      />
      <p style={{ color: colors.text.secondary, fontSize: '14px', margin: 0, maxWidth: '620px', lineHeight: 1.5 }}>
        Ici, vous choisissez comment les joueurs d'une catégorie sont organisés : une liste par équipe, ou une seule liste commune à toutes les équipes. Cliquez sur « Changer de mode » pour modifier.
      </p>
      {erreur && <Message ton="erreur">{erreur}</Message>}
      {liste && groupes.length === 0 && !erreur && (
        <div style={{ ...styleCarte(colors), padding: '2.5rem 1.5rem', textAlign: 'center', color: colors.text.secondary, fontWeight: 600 }}>
          Aucune catégorie pour le moment.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groupes.map(c => (
          <div key={c.id} style={{ ...styleCarte(colors), display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{ margin: 0, flex: 1, fontFamily: police.titre, fontWeight: 700, fontSize: '22px', lineHeight: 1.1, letterSpacing: '0.01em', textTransform: 'uppercase', minWidth: '90px' }}>{labelCategorie(c.nom)}</p>
              <Pastille>{MODES_CATEGORIE[c.mode]?.label || c.mode}</Pastille>
              {onConvocations && c.mode === 'commun' && c.equipes.length > 0 && (
                <button className={CLASSE_BOUTON_SECONDAIRE} onClick={() => onConvocations(c)} style={petit}>Convocations</button>
              )}
              {onChangerMode && peutCreer && c.equipes.length > 0 && (
                <button className={CLASSE_BOUTON_SECONDAIRE} onClick={() => onChangerMode(c)} style={petit}>Changer de mode</button>
              )}
              {peutCreer && c.equipes.length === 0 && (
                <button className={CLASSE_BOUTON_SECONDAIRE} onClick={() => supprimer(c)} style={petit}>
                  <span style={{ color: colors.accent.red, display: 'inline-flex' }}><Icone icone={Trash2} taille={16} /></span>Supprimer
                </button>
              )}
            </div>
            {c.equipes.length > 0 ? (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {c.equipes.map(e => <Pastille key={e.id}>{e.nom} {e.equipe}</Pastille>)}
              </div>
            ) : (
              <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: colors.text.secondary }}>
                <span style={{ color: colors.accent.orange, display: 'inline-flex' }}><Icone icone={TriangleAlert} taille={16} /></span>
                Aucune équipe dans cette catégorie.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
