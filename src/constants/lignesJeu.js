// Les quatre lignes d'une équipe, utilisées pour marquer un principe de jeu
// « pour qui » (principes_jeu.lignes : liste vide = tout le monde) et, plus
// tard, pour trier le plan selon le poste du joueur.
export const LIGNES = [
  { cle: 'gardien', label: 'Gardien' },
  { cle: 'defense', label: 'Défense' },
  { cle: 'milieu', label: 'Milieu' },
  { cle: 'attaque', label: 'Attaque' },
]

export const LIGNES_CLES = LIGNES.map(l => l.cle)

export function libelleLigne(cle) {
  return LIGNES.find(l => l.cle === cle)?.label || cle
}

// Mots-clés par ligne, comparés sans accents ni casse. Relevé des postes réels
// (bloc 0) : profiles.poste = Milieu / Attaquant / gardien ; equipe_joueurs.poste
// = texte libre.
const MOTS_CLES = [
  ['gardien', ['gardien', 'goal', 'portier']],
  ['defense', ['defenseur', 'lateral', 'libero', 'arriere', 'piston', 'stoppeur']],
  ['milieu', ['milieu', 'piston', 'sentinelle', 'regista', 'meneur']],
  ['attaque', ['attaqu', 'avant', 'ailier', 'buteur', 'pointe']],
]

function normaliser(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

// Poste en texte libre -> lignes concernées (plusieurs possibles : « Piston »
// = défense + milieu). Poste vide ou inconnu : liste vide, le joueur voit le
// plan dans l'ordre normal.
export function posteVersLignes(poste) {
  const t = normaliser(poste)
  if (!t.trim()) return []
  return MOTS_CLES.filter(([, mots]) => mots.some(m => t.includes(m))).map(([cle]) => cle)
}

// Un principe concerne-t-il ces lignes ? Aucune ligne sur le principe = tout le monde.
export function principeConcerne(principe, lignesJoueur) {
  const l = principe?.lignes || []
  if (l.length === 0) return true
  return l.some(x => (lignesJoueur || []).includes(x))
}
