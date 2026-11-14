import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { CATEGORIES_MASCULIN, CATEGORIES_FEMININ, labelCategorie } from '../../lib/categories'
import { LETTRES_EQUIPES, MODES_CATEGORIE, cleNom, placesRestantes, raisonBlocage } from '../../lib/categoriesClub'

// Création d'une catégorie : nom, mode (aucun présélectionné), équipes.
// La catégorie est créée avec son mode, puis chaque équipe est ajoutée comme
// aujourd'hui dans club_categories : le déclencheur de la base la rattache à
// la catégorie du même nom.
export default function CreerCategorie({ clubId, quotaEquipes, nbEquipesClub, accentColor, onTermine, onRetour, onRetourEquipes }) {
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

  const btnLien = { background: 'none', border: 'none', padding: 0, color: accentColor, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }
  const champ = { width: '100%', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: colors.background.base, color: colors.text.primary, fontSize: '14px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }
  const etiquette = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: colors.text.secondary }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '720px' }}>
      <nav style={{ fontSize: '13px', color: colors.text.faint }}>
        <button style={btnLien} onClick={onRetourEquipes}>Catégories & Équipes</button> / <button style={btnLien} onClick={onRetour}>Catégories</button> / Créer la catégorie
      </nav>
      <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Créer la catégorie</h1>

      <div>
        <label style={etiquette} htmlFor="cat-nom">Catégorie</label>
        <select id="cat-nom" style={champ} value={nom} onChange={e => setNom(e.target.value)}>
          <option value="">Choisir une catégorie</option>
          <optgroup label="Masculin">{CATEGORIES_MASCULIN.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}</optgroup>
          <optgroup label="Féminin">{CATEGORIES_FEMININ.map(c => <option key={c} value={c}>{labelCategorie(c)}</option>)}</optgroup>
        </select>
      </div>

      <div>
        <span style={etiquette}>Comment les joueurs sont organisés</span>
        <div role="radiogroup" aria-label="Mode de la catégorie" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {Object.entries(MODES_CATEGORIE).map(([cle, m]) => {
            const actif = mode === cle
            return (
              <button key={cle} type="button" role="radio" aria-checked={actif} onClick={() => setMode(cle)}
                style={{ textAlign: 'left', padding: '14px 16px', borderRadius: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: actif ? accentColor + '14' : colors.background.surface, border: `2px solid ${actif ? accentColor : colors.border.subtle}`, color: colors.text.primary }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: '15px' }}>{m.label}</span>
                <span style={{ display: 'block', marginTop: '4px', fontSize: '13px', color: colors.text.secondary, lineHeight: 1.4 }}>{m.aide}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span style={etiquette}>Équipes</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {lettres.map(l => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '9px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, fontSize: '13px', fontWeight: 700 }}>
              {nom ? labelCategorie(nom) : 'Catégorie'} {l}
              {lettres.length > 1 && (
                <button type="button" aria-label={`Retirer l'équipe ${l}`} onClick={() => setLettres(p => p.filter(x => x !== l))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text.faint, fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>
              )}
            </span>
          ))}
          <button type="button" disabled={!prochaine || limiteAtteinte} onClick={() => setLettres(p => [...p, prochaine].sort())}
            style={{ padding: '8px 12px', borderRadius: '9px', border: `1px dashed ${colors.border.default}`, background: 'transparent', color: colors.text.secondary, fontWeight: 700, fontSize: '13px', cursor: (!prochaine || limiteAtteinte) ? 'not-allowed' : 'pointer', opacity: (!prochaine || limiteAtteinte) ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>
            + Ajouter une équipe
          </button>
        </div>
        {places != null && (
          <p style={{ margin: '8px 0 0', fontSize: '12px', color: limiteAtteinte ? colors.accent.amber : colors.text.faint }}>
            {places === 0 ? 'Le forfait du club est complet : aucune équipe de plus.' : limiteAtteinte ? `Limite du forfait atteinte (${places} équipe${places > 1 ? 's' : ''} de plus possible${places > 1 ? 's' : ''}).` : `Le forfait permet encore ${places} équipe${places > 1 ? 's' : ''}.`}
          </p>
        )}
        {!prochaine && <p style={{ margin: '8px 0 0', fontSize: '12px', color: colors.text.faint }}>Cinq équipes au maximum par catégorie.</p>}
      </div>

      {erreur && <p style={{ margin: 0, color: colors.accent.red, fontSize: '13px' }}>{erreur}</p>}
      <div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={creer} disabled={!!blocage || enCours}
            style={{ padding: '11px 18px', borderRadius: '10px', border: 'none', background: accentColor, color: colors.accent.onBrand, fontWeight: 700, fontSize: '14px', cursor: blocage ? 'not-allowed' : 'pointer', opacity: blocage ? 0.45 : 1, fontFamily: 'Inter, sans-serif' }}>
            {enCours ? 'Création en cours' : 'Créer la catégorie'}
          </button>
          <button type="button" onClick={onRetour}
            style={{ padding: '11px 18px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.secondary, fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Annuler
          </button>
        </div>
        {blocage && <p style={{ margin: '8px 0 0', fontSize: '12px', color: colors.text.faint }}>{blocage}</p>}
      </div>
    </div>
  )
}
