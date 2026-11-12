import { trouverOutil } from './catalogueOutils.js'
import { affichageDepuisLignes } from './outilsAcces.js'

// Journal des changements de Mon club : phrase affichée et plan de « Rétablir ».
// Une ligne de journal : { id, action ('retire' | 'reaffiche'), outil, educateur_ids, tous, retablit_id, cree_le }.

const visiblePour = (mode, lignes, educateurId, outilId) => {
  const a = affichageDepuisLignes(mode, lignes, educateurId)
  if (!a) return true
  return outilId in a.individuel ? a.individuel[outilId] : a.commun[outilId] !== false
}

const liste = (noms) => (noms.length <= 1 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`)

// « Vidéo : retiré du menu de tous les éducateurs. » `noms` : { idÉducateur: nom }.
export function phraseJournal(entree, noms = {}) {
  const outil = trouverOutil('educateur', entree.outil)?.nom || entree.outil
  const verbe = entree.action === 'retire' ? 'retiré du menu' : 'réaffiché dans le menu'
  if (entree.tous) return `${outil} : ${verbe} de tous les éducateurs.`
  const ids = entree.educateur_ids || []
  const connus = ids.map(i => noms[i]).filter(Boolean)
  if (connus.length === ids.length && ids.length > 0) return `${outil} : ${verbe} de ${liste(connus)}.`
  return `${outil} : ${verbe} de ${ids.length} éducateur${ids.length > 1 ? 's' : ''}.`
}

// Ce qu'il faut écrire pour remettre le menu comme avant le changement `entree`,
// d'après les réglages d'aujourd'hui (mode, lignes) et la liste des éducateurs
// affiliés (`[{ id, nom }]`). Rend { erreur } si ce n'est plus possible tel quel,
// { deja: true } si le menu est déjà revenu, sinon { ecritures: [{ cible,
// educateurId, valeur }] } où valeur undefined = aucune ligne (défaut).
export function planRetablir(entree, mode, lignes, educateurs) {
  const voulu = entree.action === 'retire' // retiré avant → on réaffiche
  const concernes = educateurs.filter(e => (entree.educateur_ids || []).includes(e.id))
  if (concernes.length === 0) return { erreur: 'Ces éducateurs ne sont plus affiliés à votre club : il n\'y a plus rien à rétablir.' }
  const aChanger = concernes.filter(e => visiblePour(mode, lignes, e.id, entree.outil) !== voulu)
  if (aChanger.length === 0) return { deja: true }

  if (mode === 'commun') {
    // Le réglage commun touche tous les éducateurs : on ne le change que s'il ne
    // modifie le menu de personne d'autre.
    const autres = educateurs.filter(e => !concernes.some(c => c.id === e.id) && visiblePour(mode, lignes, e.id, entree.outil) !== voulu)
    if (autres.length > 0) {
      return { erreur: 'Ce changement ne concernait pas tous vos éducateurs, et le menu est maintenant le même pour tous. Rétablissez-le à la main dans l\'étape « Dashboard de mes éducateurs ».' }
    }
    return { ecritures: [{ cible: 'educateurs', educateurId: null, valeur: voulu ? undefined : false }] }
  }

  const commun = Object.fromEntries(lignes.filter(l => l.cible === 'educateurs').map(l => [l.outil, l.visible]))
  const defaut = commun[entree.outil] !== false
  return { ecritures: aChanger.map(e => ({ cible: 'educateur', educateurId: e.id, valeur: voulu === defaut ? undefined : voulu })) }
}

// Une ligne déjà rétablie (une autre ligne la désigne) ou qui est elle-même un rétablissement n'a pas de bouton.
export function etatRetablir(entree, entrees) {
  if (entree.retablit_id) return 'retablissement'
  if (entrees.some(e => e.retablit_id === entree.id)) return 'retablie'
  return 'possible'
}
