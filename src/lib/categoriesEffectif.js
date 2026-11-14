// Calculs purs de l'effectif commun côté éducateur (bloc 3 du chantier catégories).

// « Lucas  Moreau », « lucas moreau » et « Lucas Moréau » donnent la même clé.
export const cleNomJoueur = (f) => `${f?.prenom || ''} ${f?.nom || ''}`
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toUpperCase()

// Fiche gardée quand un même compte a plusieurs fiches dans la catégorie :
// celle de l'équipe active, sinon la plus ancienne.
function meilleureFiche(a, b, equipeActiveId) {
  const aActive = a.club_categorie_id === equipeActiveId
  const bActive = b.club_categorie_id === equipeActiveId
  if (aActive !== bActive) return aActive ? a : b
  return String(b.created_at || '') < String(a.created_at || '') ? b : a
}

// Fiches d'une catégorie commune → liste affichée (une ligne par compte, ordre
// d'origine conservé), nombre de fiches masquées (même compte en double) et
// doublons possibles : même prénom et nom, au moins une fiche sans compte.
// Deux comptes différents au même nom sont des homonymes, pas des doublons.
export function regrouperEffectifCommun(fiches, equipeActiveId) {
  const liste = fiches || []
  const parCompte = new Map()
  for (const f of liste) {
    if (!f.joueur_id) continue
    const deja = parCompte.get(f.joueur_id)
    parCompte.set(f.joueur_id, deja ? meilleureFiche(deja, f, equipeActiveId) : f)
  }
  const joueurs = liste.filter(f => !f.joueur_id || parCompte.get(f.joueur_id) === f)

  const parNom = new Map()
  for (const f of joueurs) {
    const cle = cleNomJoueur(f)
    if (!cle) continue
    parNom.set(cle, [...(parNom.get(cle) || []), f])
  }
  const doublons = [...parNom.values()]
    .filter(groupe => groupe.length > 1 && groupe.some(f => !f.joueur_id))
    .map(groupe => ({ nom: `${groupe[0].prenom || ''} ${groupe[0].nom || ''}`.trim(), nb: groupe.length }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

  return { joueurs, fichesMasquees: liste.length - joueurs.length, doublons }
}
