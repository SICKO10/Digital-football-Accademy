// Design tokens extraits du code existant (src/App.css — en réalité un composant
// React legacy, jamais importé nulle part, cf. note en bas de fichier — et tous
// les fichiers de src/pages/). Ce ne sont pas des valeurs inventées : chaque
// couleur/taille ci-dessous est une valeur réellement utilisée dans le code,
// retenue parce qu'elle revient des dizaines/centaines de fois (comptage exact
// en commentaire). Les valeurs one-off (un seul usage isolé) ne sont pas
// listées individuellement.
//
// Rien n'importe ce fichier pour l'instant — l'app entière est en styles inline
// (style={{ ... }} avec des littéraux directs), pas en styled-components/CSS
// modules. Introduire ces tokens dans le code existant serait un refactor à
// part, fichier par fichier, pas fait ici.

export const colors = {
  // Fonds — thème sombre, du plus profond (page) au plus clair (survol/actif)
  background: {
    base: '#0a0a0a',      // fond de page (492 occurrences comme fond principal)
    sunken: '#0d0d0d',
    surface: '#111',      // fond de card standard (265)
    surfaceAlt: '#141414',
    raised: '#1a1a1a',    // fond légèrement élevé / hover (361)
    overlay: 'rgba(0,0,0,0.85)', // fond de modale (le plus fréquent : 10 pour 0.8, 7 pour 0.85/0.5)
  },

  // Bordures
  border: {
    subtle: '#1a1a1a',
    default: '#2a2a2a',   // bordure de card standard (157)
    strong: '#333',       // (263)
    faint: '#1f1f1f',
  },

  // Texte — du plus lisible au plus discret
  text: {
    primary: '#fff',
    secondary: '#aaa',    // (131)
    muted: '#888',
    dim: '#666',          // (169)
    faint: '#555',        // légendes/labels (419 — la couleur de texte la plus utilisée après le vert)
    disabled: '#444',
    ghost: '#333',        // texte quasi invisible (placeholders désactivés)
  },

  // Couleurs d'accent — chaque dashboard a la sienne (educateur=bleu, club=vert
  // par défaut mais personnalisable via profiles.couleur_principale, cf.
  // supabase_profiles_theme_club.sql). Les statuts (succès/erreur/alerte) sont
  // fixes partout et NE DOIVENT PAS suivre la couleur de marque d'un club.
  accent: {
    green: '#4ade80',   // couleur historique de la marque + succès/présent/victoire (482, la plus fréquente du projet)
    blue: '#60a5fa',    // accent dashboard éducateur, convoqué, info (200)
    orange: '#f97316',  // blessé, urgence, warning (124)
    red: '#ef4444',     // erreur, absent, défaite, suppression (103)
    amber: '#fbbf24',   // or / avertissement secondaire (62)
    purple: '#a855f7',  // malade, statut secondaire (28 avec #a78bfa)
    purpleLight: '#a78bfa',
    cyan: '#22d3ee',    // couleur secondaire par défaut du thème club
  },

  // Neutres additionnels
  black: '#000',
  white: '#fff',
}

// Convention observée partout dans le code : un hex de `colors.accent.*` suivi
// d'un suffixe alpha à 2 chiffres pour un fond/bordure teinté(e), au lieu de
// rgba(). Ex: colors.accent.green + alpha.subtle → '#4ade8015'.
export const alpha = {
  faint: '08',    // ~3%
  subtle: '15',   // ~8% — fond teinté le plus courant (48 occurrences pour le vert seul)
  soft: '20',     // ~13%
  light: '30',    // ~19% — bordure teintée la plus courante
  medium: '40',   // ~25%
}

// Espacements — valeurs de padding/gap/margin les plus utilisées (comptage sur
// tous les `gap:`/`padding:` en px de src/pages/), du plus petit au plus grand.
export const spacing = {
  xs: '4px',
  sm: '6px',
  md: '8px',    // valeur de gap la plus fréquente (184)
  base: '10px', // valeur de padding/gap la plus fréquente (178+)
  lg: '12px',
  xl: '14px',
  '2xl': '16px',
  '3xl': '20px',
  '4xl': '24px',
  '5xl': '32px',
}

// Tailles de police — extraites de tous les `fontSize:` de src/pages/, triées
// par fréquence d'usage réel (13px et 12px dominent très largement : ce sont
// les tailles de corps de texte "standard" et "petit" de toute l'app).
export const fontSize = {
  xs: '9px',
  sm: '10px',
  base: '11px',   // texte très fréquent : labels, badges (310 occurrences)
  md: '12px',     // texte de corps secondaire (344)
  lg: '13px',     // texte de corps standard — la taille la plus utilisée du projet (460)
  xl: '14px',     // texte de corps mis en avant (253)
  '2xl': '15px',
  '3xl': '16px',
  '4xl': '18px',
  '5xl': '20px',
  '6xl': '22px',
  '7xl': '24px',
  '8xl': '28px',
  '9xl': '32px',
  display: '48px',
}

// Rayons de bordure — même logique, triés par fréquence.
export const radius = {
  sm: '3px',
  md: '6px',
  base: '8px',   // le plus fréquent (220)
  lg: '10px',    // deuxième plus fréquent (215)
  xl: '12px',
  '2xl': '14px',
  '3xl': '16px',
  pill: '20px',  // badges/pills arrondis (158)
  circle: '50%', // avatars (72)
}

export default { colors, alpha, spacing, fontSize, radius }

// ─── Note ────────────────────────────────────────────────────────────────────
// src/App.css contient en réalité un composant React complet (avec sa propre
// balise `import './App.css'` qui se référence elle-même) et non une feuille de
// style — rien dans le projet ne l'importe (ni App.jsx, ni main.jsx, ni
// index.html). C'est du code mort, probablement une ancienne version de
// App.jsx renommée par erreur. Il a été lu pour cette extraction (ses couleurs
// sont cohérentes avec le reste — vert #4ade80, fonds sombres) mais n'est pas
// utilisé par l'application en production.
