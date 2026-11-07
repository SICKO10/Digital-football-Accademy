// Look commun de l'écran joueur (accueil et onglets internes), dans la même
// logique que menuLateral.js : les classes vivent ici, une seule fois, et les
// composants de src/components/joueur/ les appellent par className.
// Usage : <style>{ecranJoueurCss(colors)}</style> à la racine de DashboardJoueur,
// puis className="dj-display" | "dj-chiffre" | "dj-eyebrow" | "dj-cliquable" |
// "dj-grain". Règle : la police display (Barlow Condensed) n'est jamais utilisée
// sous 11 px ni pour un paragraphe ; tout le reste reste en Inter.

export const ecranJoueurCss = (colors) => `
  .dj-display { font-family: 'Barlow Condensed', Inter, sans-serif; font-weight: 800; letter-spacing: -0.5px; }
  .dj-chiffre { font-family: 'Barlow Condensed', Inter, sans-serif; font-weight: 800; font-variant-numeric: tabular-nums; }
  .dj-eyebrow { font-family: 'Barlow Condensed', Inter, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
  .dj-cliquable { transition: transform 0.18s ease, border-color 0.18s ease; }
  .dj-cliquable:hover { transform: translateY(-2px); border-color: ${colors.border.default} !important; }
  .dj-cliquable:focus-visible { outline: 2px solid var(--df-accent, ${colors.accent.green}); outline-offset: 2px; }
  .dj-grain::before { content: ''; position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.02; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>"); }
`

// Numéro de maillot « classique » associé à un poste, pour le grand chiffre
// fantôme de la carte de joueur. Postes inconnus ou vides : null, la carte
// n'affiche alors aucun chiffre plutôt qu'un chiffre inventé.
const NUMEROS_POSTE = {
  'Gardien': 1,
  'Latéral droit': 2,
  'Latéral gauche': 3,
  'Défenseur central': 4,
  'Milieu défensif': 6,
  'Ailier droit': 7,
  'Milieu central': 8,
  'Attaquant': 9,
  'Milieu offensif': 10,
  'Ailier gauche': 11,
}
export const numeroDePoste = (poste) => NUMEROS_POSTE[poste] ?? null

// Choix du bloc « à la une » de l'accueil joueur : un seul gagnant, le premier
// de la liste qui a du contenu. Fonction pure, elle ne lit que ce que l'écran a
// déjà chargé. Rend `{ type, contenu }`, ou null quand rien n'est à mettre en
// avant (le bloc disparaît alors, jamais de carte vide).
//
// Ordre (cf. BRIEF-joueur-v2.md, emplacement 2) :
//   affilié : convocation, composition, prochaine séance, puis prochain match ;
//   ensuite, pour tous : dernière analyse vidéo, visibilité recruteurs (Pro
//   seulement, la visibilité est un avantage Pro), publier une vidéo si le
//   joueur n'en a encore aucune.
export const choisirALaUne = ({
  affilie = false,
  estPro = false,
  convocation = null,
  composition = null,
  prochaineSeance = null,
  prochainMatch = null,
  derniereAnalyse = null,
  visibleRecruteurs = false,
  statutRecrutement = null,
  aUneVideo = false,
}) => {
  const candidats = [
    affilie && convocation && { type: 'convocation', contenu: convocation },
    affilie && composition && { type: 'composition', contenu: composition },
    affilie && prochaineSeance && { type: 'seance', contenu: prochaineSeance },
    affilie && prochainMatch && { type: 'match', contenu: prochainMatch },
    derniereAnalyse && { type: 'analyse', contenu: derniereAnalyse },
    estPro && { type: 'visibilite', contenu: { visible: !!visibleRecruteurs, statut: statutRecrutement } },
    !aUneVideo && { type: 'publier', contenu: { estPro } },
  ]
  return candidats.find(Boolean) || null
}

// Vignette réelle d'une vidéo déjà publiée, sans requête ni colonne en base.
// Rend `{ type, src }` ou null quand aucune image fiable n'est possible :
//   - lien YouTube : la miniature officielle de la plateforme (type "image") ;
//   - fichier vidéo direct (.mp4, .mov, .webm, Cloudinary) : la première image
//     du fichier, que le navigateur affiche via <video preload="metadata"> (type
//     "video") ;
//   - Veo, TikTok, Instagram et autres : null, ces plateformes n'offrent pas
//     d'image sans appel externe. La vignette disparaît alors, jamais d'image inventée.
export const vignetteVideo = (url) => {
  if (typeof url !== 'string' || !url.trim()) return null
  const u = url.trim()
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/)
  if (yt) return { type: 'image', src: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg` }
  if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(u) || /cloudinary\.com\/[^/]+\/video\/upload\//i.test(u)) {
    return { type: 'video', src: u.includes('#') ? u : `${u}#t=0.5` }
  }
  return null
}
