import { trouverOutil } from './catalogueOutils.js'
import { affichageDepuisLignes } from './outilsAcces.js'

// Journal des changements de Mon club : phrase affichée et plan de « Rétablir ».
// Une ligne de journal : { id, action, outil, educateur_ids, tous, etat_avant, retablit_id, cree_le }.
// Actions : menu ('retire', 'reaffiche'), outils fournis ('fourni', 'plus_fourni'), places ('place_donnee',
// 'place_retiree', 'place_auto'). `etat_avant` (places) : 'choisi', 'retire' ou 'auto'.

const visiblePour = (mode, lignes, educateurId, outilId) => {
  const a = affichageDepuisLignes(mode, lignes, educateurId)
  if (!a) return true
  return outilId in a.individuel ? a.individuel[outilId] : a.commun[outilId] !== false
}

const liste = (noms) => (noms.length <= 1 ? noms.join('') : `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`)

export const estPlace = (entree) => ['place_donnee', 'place_retiree', 'place_auto'].includes(entree.action)
export const estFourniture = (entree) => entree.action === 'fourni' || entree.action === 'plus_fourni'

// « Vidéo : retiré du menu de tous les éducateurs. » `noms` : { idÉducateur: nom }.
export function phraseJournal(entree, noms = {}) {
  if (estPlace(entree)) {
    const nom = noms[(entree.educateur_ids || [])[0]] || 'un éducateur'
    if (entree.action === 'place_donnee') return `Place donnée à ${nom}.`
    if (entree.action === 'place_retiree') return `Place retirée à ${nom}.`
    return `Place de ${nom} remise en automatique.`
  }
  const outil = trouverOutil('educateur', entree.outil)?.nom || entree.outil
  if (estFourniture(entree)) {
    const verbe = entree.action === 'fourni' ? 'fourni à' : 'n\'est plus fourni à'
    if (entree.tous) return `Outil ${outil} : ${verbe} tous les éducateurs.`
    const ids = entree.educateur_ids || []
    const connus = ids.map(i => noms[i]).filter(Boolean)
    if (connus.length === ids.length && ids.length > 0) return `Outil ${outil} : ${verbe} ${liste(connus)}.`
    return `Outil ${outil} : ${verbe} ${ids.length} éducateur${ids.length > 1 ? 's' : ''}.`
  }
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

// « Rétablir » une ligne d'outil fourni ou de place : ce sont des changements de base, faits par le
// serveur (qui revérifie le forfait et prévient les éducateurs qui perdent quelque chose). Rend
// { erreur } si l'éducateur n'est plus affilié, sinon { appels: [{ action, params }] } (params sans
// `retablit_id`, ajouté par l'appelant). Le forfait fini ou plein est refusé par le serveur, avec sa phrase.
export function planRetablirServeur(entree, educateurs) {
  const affilies = new Set(educateurs.map(e => e.id))
  const ids = (entree.educateur_ids || []).filter(id => affilies.has(id))
  if (ids.length === 0) return { erreur: 'Ces éducateurs ne sont plus affiliés à votre club : il n\'y a plus rien à rétablir.' }
  if (estPlace(entree)) {
    if (!['choisi', 'retire', 'auto'].includes(entree.etat_avant)) return { erreur: 'L\'état d\'avant de cette place n\'est pas connu : rétablissez-la à la main dans l\'étape « Places ».' }
    return { appels: [{ action: 'choisir_place', params: { educateur: ids[0], etat: entree.etat_avant } }] }
  }
  const ouvert = entree.action === 'plus_fourni' // plus fourni avant → on fournit de nouveau
  if (entree.tous) return { appels: [{ action: 'ouvrir_club', params: { outil: entree.outil, ouvert } }] }
  return { appels: ids.map(educateur => ({ action: 'fournir_educateur', params: { outil: entree.outil, educateur, ouvert } })) }
}

// Une ligne déjà rétablie (une autre ligne la désigne) ou qui est elle-même un rétablissement n'a pas de bouton.
export function etatRetablir(entree, entrees) {
  if (entree.retablit_id) return 'retablissement'
  if (entrees.some(e => e.retablit_id === entree.id)) return 'retablie'
  return 'possible'
}
