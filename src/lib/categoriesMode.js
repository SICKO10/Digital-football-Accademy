import { regrouperEffectifCommun } from './categoriesEffectif.js'

// Calculs purs du changement de mode d'une catégorie (bloc 8 du chantier catégories).
// Les lignes viennent de la fonction categories_mode_donnees : une par fiche,
// avec le nombre de convocations (par compte) et de présences (par fiche) par équipe.

export const nomEquipe = (e) => `${e?.nom || ''} ${e?.equipe || ''}`.trim()

const nomJoueur = (f) => `${f?.prenom || ''} ${f?.nom || ''}`.trim() || 'Joueur sans nom'
const plusAncienne = (a, b) => (String(b.created_at || '') < String(a.created_at || '') ? b : a)

// Un joueur = un compte (toutes ses fiches) ou une fiche sans compte.
export function regrouperJoueurs(fiches) {
  const groupes = new Map()
  for (const f of fiches || []) {
    const cle = f.joueur_id ? `compte:${f.joueur_id}` : `fiche:${f.fiche_id}`
    groupes.set(cle, [...(groupes.get(cle) || []), f])
  }
  return [...groupes.entries()].map(([cle, liste]) => {
    const principale = liste.reduce(plusAncienne)
    return { cle, fiches: liste, principale, nom: nomJoueur(principale) }
  }).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

// Équipe proposée : celle où il a été le plus convoqué, puis le plus présent
// à l'entraînement, puis son équipe actuelle. raison dit pourquoi.
export function proposerEquipe(joueur, equipes) {
  const conv = {}
  const pres = {}
  for (const f of joueur.fiches) {
    for (const [id, n] of Object.entries(f.convocations || {})) conv[id] = Math.max(conv[id] || 0, Number(n) || 0)
    for (const [id, n] of Object.entries(f.presences || {})) pres[id] = (pres[id] || 0) + (Number(n) || 0)
  }
  const actuelles = new Set(joueur.fiches.map(f => f.equipe_id))
  const classees = [...(equipes || [])].sort((a, b) =>
    (conv[b.id] || 0) - (conv[a.id] || 0)
    || (pres[b.id] || 0) - (pres[a.id] || 0)
    || (b.id === joueur.principale.equipe_id) - (a.id === joueur.principale.equipe_id)
    || actuelles.has(b.id) - actuelles.has(a.id)
    || (a.equipe || '').localeCompare(b.equipe || ''))
  const choix = classees[0]
  if (!choix) return { equipe_id: null, raison: null }
  if (conv[choix.id]) return { equipe_id: choix.id, raison: { type: 'convocations', n: conv[choix.id] } }
  if (pres[choix.id]) return { equipe_id: choix.id, raison: { type: 'presences', n: pres[choix.id] } }
  if (actuelles.has(choix.id)) return { equipe_id: choix.id, raison: { type: 'actuelle' } }
  return { equipe_id: null, raison: null }
}

export function texteRaison(raison, equipe) {
  if (!raison || !equipe) return ''
  const nom = nomEquipe(equipe)
  if (raison.type === 'convocations') return `Proposé : ${raison.n} convocation${raison.n > 1 ? 's' : ''} en ${nom} cette saison`
  if (raison.type === 'presences') return `Proposé : ${raison.n} entraînement${raison.n > 1 ? 's' : ''} en ${nom} cette saison`
  return `Proposé : équipe de sa fiche (${nom})`
}

// Fiche envoyée pour un joueur : celle déjà dans l'équipe choisie, sinon la
// plus ancienne. Les autres fiches du même compte restent dans leur équipe.
export function ficheRetenue(joueur, equipeId) {
  return joueur.fiches.find(f => f.equipe_id === equipeId) || joueur.principale
}

// Une équipe sans éducateur ne peut recevoir que les joueurs qui y sont déjà :
// un joueur qui y arriverait n'apparaîtrait chez aucun éducateur.
export function equipeAutorisee(joueur, equipe) {
  return !!equipe && (!!equipe.educateur_id || joueur.fiches.some(f => f.equipe_id === equipe.id))
}

// Joueurs sans équipe valable (le bouton reste bloqué tant qu'il y en a).
export function joueursSansEquipe(joueurs, choix, equipes) {
  return joueurs.filter(j => !equipeAutorisee(j, (equipes || []).find(e => e.id === choix[j.cle])))
}

// Ce qui est envoyé à categorie_changer_mode.
export function construireRepartition(joueurs, choix) {
  return joueurs.map(j => ({ fiche_id: ficheRetenue(j, choix[j.cle]).fiche_id, equipe_id: choix[j.cle] }))
}

// Résumé affiché avant de confirmer : effectif par équipe et joueurs qui
// changent d'équipe (donc d'éducateur).
export function resumeRepartition(joueurs, choix, equipes) {
  const parEquipe = (equipes || []).map(e => ({ equipe: e, nb: joueurs.filter(j => choix[j.cle] === e.id).length }))
  const changements = joueurs
    .filter(j => ficheRetenue(j, choix[j.cle]).equipe_id !== choix[j.cle])
    .map(j => ({
      nom: j.nom,
      avant: (equipes || []).find(e => e.id === ficheRetenue(j, choix[j.cle]).equipe_id) || null,
      apres: (equipes || []).find(e => e.id === choix[j.cle]) || null,
    }))
  const fichesGardees = joueurs.reduce((n, j) => n + j.fiches.length - 1, 0)
  return { parEquipe, changements, fichesGardees }
}

// Résumé du passage en effectif commun : joueurs par équipe, taille de la
// liste commune (un compte présent dans deux équipes compte une fois) et
// doublons possibles signalés dans la liste (même règle que le bloc 3).
export function resumeFusion(fiches, equipes) {
  const parEquipe = (equipes || []).map(e => ({ equipe: e, nb: (fiches || []).filter(f => f.equipe_id === e.id).length }))
  const { doublons } = regrouperEffectifCommun((fiches || []).map(f => ({ ...f, club_categorie_id: f.equipe_id })), null)
  return { parEquipe, total: regrouperJoueurs(fiches).length, doublons }
}

const RAISONS_LIEN = {
  equipe_sans_coach: (eq) => `${eq} n'a pas d'éducateur : il reste rattaché à son ancien éducateur.`,
  deja_lie: () => 'il a déjà un lien (actif ou archivé) avec l\'éducateur de sa nouvelle équipe : son lien actuel n\'a pas bougé.',
  ancien_coach_garde: () => 'son ancien éducateur le suit aussi dans une autre équipe : il lui reste rattaché.',
}

export function texteLienReste(r) {
  const nom = `${r.prenom || ''} ${r.nom || ''}`.trim() || 'Joueur sans nom'
  const suite = RAISONS_LIEN[r.raison]?.(r.equipe || 'Sa nouvelle équipe') || 'son lien avec son éducateur n\'a pas bougé.'
  return `${nom} : ${suite}`
}
