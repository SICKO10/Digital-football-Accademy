// Kit d'identité « Maison de club » (PLAN-design-identite.md, bloc 1).
//
// Briques de style partagées par les dashboards club et éducateur, à la place des
// objets de style recopiés écran par écran (`carte`, `cardSt`, `kpiCardSt`...).
// Chaque fonction reçoit `colors` (le résultat de useColors()) : le kit suit donc le
// thème clair/sombre et la couleur du club sans rien savoir du moteur de palette.
//
// Règles de couleur, vérifiées par calcul (tests/identite.test.js et la page
// /dev/identite) :
//  - la couleur du club ne sert jamais à écrire du petit texte : en sombre, un rouge
//    de club n'atteint que 3,4:1 sur une carte. Elle sert aux liserés, jauges, fonds
//    de bouton (texte recalculé dessus) et à l'anneau de focus, où 3:1 suffit ;
//  - les étiquettes prennent `text.dim` : `text.muted` (4,2:1 sur blanc) est trop pâle ;
//  - les statuts (victoire, nul, défaite) gardent leurs couleurs fixes, et la lettre
//    posée dessus est choisie (blanc ou encre) pour atteindre 4,5:1.
//
// Fichier pur (aucun React) : importé tel quel par les tests.
import { contraste } from './paletteClub.js'
import { police, forme } from '../tokens.js'

const BLANC = '#FFFFFF'
const ENCRE = '#16161A'

// Classes CSS du kit (règles dans src/index.css) : survol, focus visible, état
// désactivé et mouvement réduit ne s'écrivent pas en style en ligne. À poser sur
// tout élément qui reçoit styleBoutonPrincipal / styleBoutonSecondaire / styleChamp.
export const CLASSE_BOUTON = 'df-bouton'
export const CLASSE_BOUTON_SECONDAIRE = 'df-bouton df-bouton-secondaire'
export const CLASSE_CHAMP = 'df-champ'
export const CLASSE_CLIQUABLE = 'df-cliquable'

// ─── Couleurs dérivées ──────────────────────────────────────────────────────

// Thème clair si la surface des cartes est plus proche du blanc que de l'encre.
export const estClair = colors => contraste(colors.background.surface, BLANC) < contraste(colors.background.surface, ENCRE)

// Couleur du club (dans les dashboards, `accent.green` est remplacé par elle).
// Pour les éléments graphiques seulement, jamais pour du petit texte.
export const couleurClub = colors => colors.accent.green

// Texte le plus lisible (blanc ou encre) sur un fond donné.
export const texteSur = fond => (contraste(fond, BLANC) >= contraste(fond, ENCRE) ? BLANC : ENCRE)

// Trait de la « ligne de craie » : encre en clair, blanc en sombre, très transparent.
export const couleurCraie = colors => (estClair(colors)
  ? `rgba(22, 22, 26, ${forme.opaciteLigneCraie})`
  : `rgba(255, 255, 255, ${forme.opaciteLigneCraie})`)

const RESULTATS = {
  V: { libelle: 'Victoire', fond: c => c.accent.success },
  N: { libelle: 'Nul', fond: c => c.text.dim },
  D: { libelle: 'Défaite', fond: c => c.accent.red },
}

// Pastille V/N/D : fond de statut fixe, lettre blanche ou encre selon le contraste.
// Renvoie null pour un résultat inconnu.
export function couleursPastille(colors, resultat) {
  const r = RESULTATS[resultat]
  if (!r) return null
  const fond = r.fond(colors)
  return { fond, texte: texteSur(fond), libelle: r.libelle }
}

// Couleurs par défaut des segments d'une jauge : deux segments = club contre
// neutre (type possession) ; trois = victoires / nuls / défaites.
export function couleursJauge(colors, nombre) {
  if (nombre === 3) return ['V', 'N', 'D'].map(r => couleursPastille(colors, r).fond)
  return [couleurClub(colors), colors.border.strong, colors.text.dim, colors.accent.info].slice(0, Math.max(nombre, 0))
}

// ─── Styles ─────────────────────────────────────────────────────────────────

// Carte de contenu (listes, tableaux) : coins 6 px, aucune ombre.
export function styleCarte(colors) {
  return {
    background: colors.background.surface,
    border: `1px solid ${estClair(colors) ? colors.border.subtle : colors.border.default}`,
    borderRadius: forme.rayonCarte,
    padding: '16px',
    boxSizing: 'border-box',
    minWidth: 0,
  }
}

// Carte importante : liseré d'écusson de 3 px à la couleur du club sur le bord
// gauche. Ombre intérieure plutôt que border-left : l'angle reste net avec les
// coins arrondis et la mise en page ne bouge pas.
export function styleCarteLiseree(colors) {
  return {
    ...styleCarte(colors),
    boxShadow: `inset ${forme.lisere} 0 0 ${couleurClub(colors)}`,
    paddingLeft: '19px',
  }
}

// Étiquette de rubrique, comme sur une feuille de match : petites capitales espacées.
export function styleEtiquette(colors) {
  return {
    fontFamily: police.texte,
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.text.dim,
  }
}

// Titre d'écran : condensé, capitales, taille qui suit la largeur (24 à 32 px).
export function styleTitreEcran(colors) {
  return {
    fontFamily: police.titre,
    fontWeight: 700,
    fontSize: 'clamp(24px, 5.5vw, 32px)',
    lineHeight: 1.05,
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
    color: colors.text.primary,
    margin: 0,
  }
}

// Chiffre héros (effectif, bilan, score) : tableau d'affichage, chiffres à chasse fixe.
export function styleChiffreHeros(colors, taille = 40) {
  return {
    fontFamily: police.titre,
    fontWeight: 700,
    fontSize: `${taille}px`,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    color: colors.text.primary,
  }
}

const baseBouton = {
  fontFamily: police.texte,
  fontWeight: 600,
  fontSize: '14px',
  lineHeight: 1.2,
  minHeight: '40px',
  padding: '0 16px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: forme.rayonCarte,
  cursor: 'pointer',
  boxSizing: 'border-box',
  whiteSpace: 'nowrap',
}

// Bouton plein à la couleur du club (texte recalculé par le moteur de palette).
// Avec className={CLASSE_BOUTON}.
export function styleBoutonPrincipal(colors) {
  return { ...baseBouton, background: colors.accent.brand, color: colors.accent.onBrand, border: '1px solid transparent' }
}

// Bouton au trait. Avec className={CLASSE_BOUTON_SECONDAIRE}.
export function styleBoutonSecondaire(colors) {
  return { ...baseBouton, background: 'transparent', color: colors.text.primary, border: `1px solid ${colors.border.strong}` }
}

// Champ de saisie. 16 px : en dessous, l'iPhone zoome sur le champ. Avec className={CLASSE_CHAMP}.
export function styleChamp(colors) {
  return {
    fontFamily: police.texte,
    fontSize: '16px',
    lineHeight: 1.3,
    color: colors.text.primary,
    background: colors.background.sunken,
    border: `1px solid ${colors.border.strong}`,
    borderRadius: forme.rayonCarte,
    padding: '9px 12px',
    minHeight: '40px',
    width: '100%',
    boxSizing: 'border-box',
  }
}

// Tableau type classement : lignes fines à la craie, en-têtes en petites capitales,
// chiffres alignés à droite. Renvoie un style par partie du tableau.
export function styleTableau(colors) {
  const craie = `1px solid ${couleurCraie(colors)}`
  const entete = { ...styleEtiquette(colors), fontSize: '11px', textAlign: 'left', padding: '8px 10px', borderBottom: craie, whiteSpace: 'nowrap' }
  const cellule = { padding: '9px 10px', borderBottom: craie, verticalAlign: 'middle' }
  return {
    tableau: { width: '100%', borderCollapse: 'collapse', fontFamily: police.texte, fontSize: '14px', color: colors.text.primary },
    entete,
    enteteChiffre: { ...entete, textAlign: 'right' },
    cellule,
    celluleChiffre: { ...cellule, textAlign: 'right', fontFamily: police.titre, fontWeight: 600, fontSize: '16px', fontVariantNumeric: 'tabular-nums' },
  }
}

// Séparateur « ligne de craie » (trait de terrain) à la place des bordures de boîtes.
export function styleLigneCraie(colors, { vertical = false } = {}) {
  return vertical
    ? { width: '1px', alignSelf: 'stretch', background: couleurCraie(colors), border: 0, margin: 0, flexShrink: 0 }
    : { height: '1px', width: '100%', background: couleurCraie(colors), border: 0, margin: 0, flexShrink: 0 }
}

// ─── Contrôle des contrastes ────────────────────────────────────────────────

// Tous les couples texte/fond du kit avec leur seuil WCAG : 4,5:1 pour le texte,
// 3:1 pour les grands chiffres et les éléments graphiques.
export function verifierContrastes(colors) {
  const surface = colors.background.surface
  const page = colors.background.base
  const lignes = [
    { nom: 'Texte courant sur carte', avant: colors.text.primary, fond: surface, seuil: 4.5 },
    { nom: 'Texte secondaire sur carte', avant: colors.text.secondary, fond: surface, seuil: 4.5 },
    { nom: 'Étiquette sur carte', avant: colors.text.dim, fond: surface, seuil: 4.5 },
    { nom: 'Étiquette sur fond de page', avant: colors.text.dim, fond: page, seuil: 4.5 },
    { nom: 'Titre sur fond de page', avant: colors.text.primary, fond: page, seuil: 4.5 },
    { nom: 'Chiffre héros sur carte', avant: colors.text.primary, fond: surface, seuil: 3 },
    { nom: 'Texte du bouton principal', avant: colors.accent.onBrand, fond: colors.accent.brand, seuil: 4.5 },
    { nom: 'Liseré et jauge (couleur du club)', avant: couleurClub(colors), fond: surface, seuil: 3 },
    ...['V', 'N', 'D'].map(r => {
      const p = couleursPastille(colors, r)
      return { nom: `Lettre de la pastille ${r}`, avant: p.texte, fond: p.fond, seuil: 4.5 }
    }),
  ]
  return lignes.map(l => {
    const ratio = contraste(l.avant, l.fond)
    return { ...l, ratio, ok: ratio >= l.seuil }
  })
}
