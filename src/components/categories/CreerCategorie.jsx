import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { CATEGORIES_MASCULIN, CATEGORIES_FEMININ, labelCategorie } from '../../lib/categories'
import { LETTRES_EQUIPES, MODES_CATEGORIE, cleNom, placesRestantes, raisonBlocage } from '../../lib/categoriesClub'
import { styleCarte, styleCarteLiseree, styleEtiquette, styleChamp, styleBoutonPrincipal, styleBoutonSecondaire, couleurCraie, CLASSE_BOUTON, CLASSE_BOUTON_SECONDAIRE, CLASSE_CHAMP, CLASSE_CLIQUABLE } from '../../lib/identite'
import { police, forme } from '../../tokens'
import { TitreEcran, Icone } from '../identite'
import { Plus, X } from 'lucide-react'
import { FilAriane, Message, Pastille } from './UiCategories'

// Création d'une catégorie : nom, mode (aucun présélectionné), équipes.
// La catégorie est créée avec son mode, puis chaque équipe est ajoutée comme
// aujourd'hui dans club_categories : le déclencheur de la base la rattache à
// la catégorie du même nom.
export default function CreerCategorie({ clubId, quotaEquipes, nbEquipesClub, onTermine, onRetour, onRetourEquipes }) {
  const colors = useColors()
  const [nom, setNom] = useState('')
  const [mode, setMode] = useState(null)
  const [lettres, setLettres] = useState(['A'])
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [nomsExistants, setNomsExistants] = useState([])

  useEffect(() => {
    supabase.from('categories').select('nom').eq('club_id', clubId).then(({ data }) => setNomsExistants((data || []).map(c => c.nom)))
  }, [clubId])

  const places = placesRestantes(quotaEquipes, nbEquipesClub)
  const existe = !!nom && nomsExistants.some(n => cleNom(n) === cleNom(nom))
  const blocage = raisonBlocage({ nom, mode, nbEquipes: lettres.length, existe, places })
  const prochaine = LETTRES_EQUIPES.find(l => !lettres.includes(l))
  const limiteAtteinte = places != null && lettres.length >= places

  const creer = async () => {
    if (blocage || enCours) return
    setEnCours(true); setErreur('')
    const { data: cat, error } = await supabase.from('categories').insert({ club_id: clubId, nom, mode }).select('id').single()
    if (error) { setErreur(error.message); setEnCours(false); return }
    const { error: e2 } = await supabase.from('club_categories').insert(lettres.map(l => ({ club_id: clubId, nom, equipe: l })))
    if (e2) {
      // Tout ou rien : on retire la catégorie vide créée juste avant.
      await supabase.from('categories').delete().eq('id', cat.id)
      setErreur(e2.message)
      setEnCours(false)
      return
    }
    setEnCours(false)
    onTermine()
  }

  const etiquette = { ...styleEtiquette(colors), display: 'block', marginBottom: '8px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>
      <FilAriane etapes={[{ label: 'Catégories & Équipes', onClick: onRetourEquipes }, { label: 'Catégories', onClick: onRetour }]} courant="Créer la catégorie" />
      <TitreEcran titre="Créer la catégorie" style={{ marginBottom: 0 }} />

      <div>
        <label style={etiquette} htmlFor="cat-nom">Catégorie</label>
        <select id="cat-nom" className={CLASSE_CHAMP} style={styleChamp(colors)} value={nom} onChange={e => setNom(e.target.value)}>
          <option value="">Choisir une catégorie</option>
          <optgroup label="Masculin">{CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}</optgroup>
          <optgroup label="Féminin">{CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}</optgroup>
        </select>
      </div>

      <div>
        <span id="cat-mode-titre" style={etiquette}>Comment les joueurs sont organisés</span>
        <div role="radiogroup" aria-labelledby="cat-mode-titre" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {Object.entries(MODES_CATEGORIE).map(([cle, m]) => {
            const actif = mode === cle
            return (
              <button key={cle} type="button" role="radio" aria-checked={actif} onClick={() => setMode(cle)} className={CLASSE_CLIQUABLE}
                style={{ ...(actif ? styleCarteLiseree(colors) : styleCarte(colors)), textAlign: 'left', cursor: 'pointer', fontFamily: police.texte, color: colors.text.primary,
                  border: `1px solid ${actif ? colors.text.primary : couleurCraie(colors)}`, display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span aria-hidden="true" style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${actif ? colors.text.primary : colors.border.strong}`, flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {actif && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.text.primary }} />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: police.titre, fontWeight: 700, fontSize: '19px', letterSpacing: '0.01em', textTransform: 'uppercase', lineHeight: 1.15 }}>{m.label}</span>
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '14px', color: colors.text.secondary, lineHeight: 1.45 }}>{m.aide}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span style={etiquette}>Équipes</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {lettres.map(l => (
            <Pastille key={l} style={{ minHeight: '36px', paddingRight: lettres.length > 1 ? '4px' : '10px' }}>
              {nom ? labelCategorie(nom) : 'Catégorie'} {l}
              {lettres.length > 1 && (
                <button type="button" className={CLASSE_CLIQUABLE} aria-label={`Retirer l'équipe ${l}`} onClick={() => setLettres(p => p.filter(x => x !== l))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text.secondary, padding: '6px', display: 'inline-flex', borderRadius: forme.rayonPastille }}>
                  <Icone icone={X} taille={16} />
                </button>
              )}
            </Pastille>
          ))}
          <button type="button" className={CLASSE_BOUTON_SECONDAIRE} disabled={!prochaine || limiteAtteinte} onClick={() => setLettres(p => [...p, prochaine].sort())}
            style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', border: `1px dashed ${colors.border.strong}`, color: colors.text.secondary }}>
            <Icone icone={Plus} taille={16} />Ajouter une équipe
          </button>
        </div>
        {places != null && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: limiteAtteinte ? colors.text.primary : colors.text.secondary, fontWeight: limiteAtteinte ? 600 : 400 }}>
            {places === 0 ? 'Le forfait du club est complet : aucune équipe de plus.' : limiteAtteinte ? `Limite du forfait atteinte (${places} équipe${places > 1 ? 's' : ''} de plus possible${places > 1 ? 's' : ''}).` : `Le forfait permet encore ${places} équipe${places > 1 ? 's' : ''}.`}
          </p>
        )}
        {!prochaine && <p style={{ margin: '8px 0 0', fontSize: '13px', color: colors.text.secondary }}>Cinq équipes au maximum par catégorie.</p>}
      </div>

      {erreur && <Message ton="erreur">{erreur}</Message>}
      <div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className={CLASSE_BOUTON} onClick={creer} disabled={!!blocage || enCours} style={styleBoutonPrincipal(colors)}>
            {enCours ? 'Création en cours' : 'Créer la catégorie'}
          </button>
          <button type="button" className={CLASSE_BOUTON_SECONDAIRE} onClick={onRetour} style={styleBoutonSecondaire(colors)}>
            Annuler
          </button>
        </div>
        {blocage && <p style={{ margin: '8px 0 0', fontSize: '13px', color: colors.text.secondary }}>{blocage}</p>}
      </div>
    </div>
  )
}
