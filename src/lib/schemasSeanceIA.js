// Schémas tactiques génériques auto-associés aux exercices générés par l'IA
// (générateur de séance, dashboard éducateur). Pas un vrai éditeur tactique
// (ça existe déjà : Tactipad, cf. schema_png + setTactipadModal dans
// DashboardEducateur.jsx) — juste une illustration indicative par grande
// famille d'exercice, choisie par mots-clés dans le nom/la description, pour
// éviter une fiche 100% texte. L'éducateur peut toujours remplacer ce schéma
// par un vrai tracé Tactipad ensuite (même champ p.schema_png).

const MARQUEUR_FLECHES = `
  <defs>
    <marker id="fl-jaune" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#fbbf24"/></marker>
    <marker id="fl-rouge" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ef4444"/></marker>
    <marker id="fl-blanc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#fff"/></marker>
    <marker id="fl-vert" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#4ade80"/></marker>
  </defs>`

// Terrain vu de dessus (lignes blanches sur fond vert), commun à tous les gabarits.
const TERRAIN_BASE = `
  <rect x="0" y="0" width="300" height="200" fill="#1e5631"/>
  <rect x="10" y="10" width="280" height="180" fill="none" stroke="#ffffffaa" stroke-width="2"/>
  <line x1="150" y1="10" x2="150" y2="190" stroke="#ffffffaa" stroke-width="2"/>
  <circle cx="150" cy="100" r="30" fill="none" stroke="#ffffffaa" stroke-width="2"/>
  <rect x="10" y="60" width="35" height="80" fill="none" stroke="#ffffffaa" stroke-width="2"/>
  <rect x="255" y="60" width="35" height="80" fill="none" stroke="#ffffffaa" stroke-width="2"/>`

const gabarit = (overlay) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">${MARQUEUR_FLECHES}${TERRAIN_BASE}${overlay}</svg>`

// ── 5 familles nommées + 1 générique de repli ──────────────────────────────
const TEMPLATES = {
  conservation: gabarit(`
    <circle cx="150" cy="100" r="55" fill="#fbbf2422" stroke="#fbbf24" stroke-width="1.5" stroke-dasharray="4 3"/>
    <circle cx="150" cy="45" r="5" fill="#60a5fa"/>
    <circle cx="197" cy="72" r="5" fill="#60a5fa"/>
    <circle cx="197" cy="128" r="5" fill="#60a5fa"/>
    <circle cx="150" cy="155" r="5" fill="#60a5fa"/>
    <circle cx="103" cy="128" r="5" fill="#60a5fa"/>
    <circle cx="103" cy="72" r="5" fill="#60a5fa"/>
    <circle cx="150" cy="100" r="4" fill="#fff"/>
    <path d="M150,45 A55,55 0 0,1 197,72" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#fl-jaune)"/>
    <path d="M197,72 A55,55 0 0,1 197,128" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#fl-jaune)"/>
    <path d="M197,128 A55,55 0 0,1 150,155" fill="none" stroke="#fbbf24" stroke-width="2" marker-end="url(#fl-jaune)"/>
  `),
  pressing: gabarit(`
    <rect x="200" y="10" width="90" height="180" fill="#ef444422" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 3"/>
    <path d="M110,60 L188,50" stroke="#ef4444" stroke-width="2" marker-end="url(#fl-rouge)"/>
    <path d="M110,100 L188,100" stroke="#ef4444" stroke-width="2" marker-end="url(#fl-rouge)"/>
    <path d="M110,140 L188,150" stroke="#ef4444" stroke-width="2" marker-end="url(#fl-rouge)"/>
  `),
  transition: gabarit(`
    <rect x="10" y="10" width="140" height="180" fill="#60a5fa1f"/>
    <rect x="150" y="10" width="140" height="180" fill="#f973161f"/>
    <path d="M55,150 L240,50" stroke="#fff" stroke-width="3" marker-end="url(#fl-blanc)"/>
  `),
  finition: gabarit(`
    <rect x="220" y="10" width="70" height="180" fill="#4ade8022" stroke="#4ade80" stroke-width="1.5" stroke-dasharray="4 3"/>
    <rect x="284" y="80" width="8" height="40" fill="none" stroke="#fff" stroke-width="2"/>
    <path d="M120,60 L268,90" stroke="#4ade80" stroke-width="2" marker-end="url(#fl-vert)"/>
    <path d="M120,140 L268,112" stroke="#4ade80" stroke-width="2" marker-end="url(#fl-vert)"/>
  `),
  circuit: gabarit(`
    <path d="M40,170 C80,120 40,80 90,60 S180,40 200,80 S260,140 258,170" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="5 4"/>
    ${[[40, 170, 1], [90, 60, 2], [200, 80, 3], [258, 170, 4]].map(([x, y, n]) =>
      `<circle cx="${x}" cy="${y}" r="8" fill="#a78bfa"/><text x="${x}" y="${y + 3.5}" font-size="10" font-weight="700" text-anchor="middle" fill="#0a0a0a">${n}</text>`
    ).join('')}
  `),
  generique: gabarit(`
    <rect x="100" y="10" width="100" height="180" fill="#ffffff12" stroke="#ffffff88" stroke-width="1" stroke-dasharray="4 3"/>
    <path d="M75,100 L225,100" stroke="#fff" stroke-width="2" marker-end="url(#fl-blanc)"/>
  `),
}

// Association mots-clés → gabarit, testée sur "nom + description" en minuscules
// (accents conservés — les contenus IA sont en français). Ordre = priorité :
// le premier motif qui matche l'emporte.
const REGLES = [
  { motif: /conservation|rondo|possession/i, gabarit: 'conservation' },
  { motif: /pressing|press\b|récupération haute|haute pression|contre-?pressing/i, gabarit: 'pressing' },
  { motif: /transition|contre-?attaque|repli défensif|relance rapide/i, gabarit: 'transition' },
  { motif: /finition|frappe|tir au but|centre-?tir/i, gabarit: 'finition' },
  { motif: /circuit|slalom|technique individuelle|coordination|parcours|jonglage/i, gabarit: 'circuit' },
]

const choisirGabarit = (nom, description) => {
  const texte = `${nom || ''} ${description || ''}`
  const trouve = REGLES.find(r => r.motif.test(texte))
  return trouve ? trouve.gabarit : 'generique'
}

// Retourne une data URI SVG prête pour <img src=...> — même usage que
// p.schema_png (image produite par Tactipad), donc affichable sans changement
// côté UI.
export function schemaExerciceIA(nom, description) {
  const svg = TEMPLATES[choisirGabarit(nom, description)]
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}
