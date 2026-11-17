// Tests de src/lib/identite.js (kit d'identité « Maison de club »).
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculerPalette, contraste } from '../src/lib/paletteClub.js'
import { colors as sombre, colorsClaire } from '../src/tokens.js'
import {
  verifierContrastes, couleursPastille, couleursJauge, texteSur, estClair, couleurCraie,
  styleCarteLiseree, styleChiffreHeros,
} from '../src/lib/identite.js'

// Couleurs d'un dashboard club pour une couleur et un thème. Reprend la règle de
// colorsAvecClub (src/lib/clubTheme.js, non importable ici : il dépend de React et
// d'imports sans extension) pour les seuls champs utilisés par le kit.
function colorsClub(hex, theme) {
  const p = calculerPalette(hex, theme)
  const marque = theme === 'claire' ? p.primaryText : p.primary
  const fondMarque = theme === 'claire' && p.source === 'defaut' ? p.primary : marque
  const accent = {
    ...sombre.accent, green: marque, brand: fondMarque,
    onBrand: contraste(fondMarque, '#FFFFFF') >= 4.5 ? '#FFFFFF' : '#16161A', success: p.success,
  }
  const neutres = theme === 'claire' ? {
    ...colorsClaire,
    background: { ...colorsClaire.background, base: p.screenBg, sunken: '#EDEDF0', surface: p.cardBg },
    border: { subtle: p.cardBorder, default: '#D9D9DF', strong: '#B5B5BE', faint: '#EFEFF2' },
    text: { ...colorsClaire.text, primary: p.text, secondary: '#3F3F48', muted: p.textMuted, dim: '#55555F', faint: p.textMuted },
  } : sombre
  return { ...neutres, accent }
}

const CAS = [['vert par défaut', null], ['rouge', '#C8102E'], ['jaune', '#F2C200'], ['bleu nuit', '#0A1128'], ['jaune très clair', '#FFF59D']]

for (const [nom, hex] of CAS) {
  for (const theme of ['claire', 'sombre']) {
    test(`contrastes du kit : ${nom}, thème ${theme}`, () => {
      const echecs = verifierContrastes(colorsClub(hex, theme)).filter(l => !l.ok)
      assert.deepEqual(echecs.map(l => `${l.nom} ${l.ratio.toFixed(2)}`), [])
    })
  }
}

// Hors dashboard (sans PorteeThemeClub), `accent.green` reste le vert vif #4ade80,
// trop pâle sur blanc pour un liseré : le kit est fait pour les dashboards, où le
// moteur de palette fournit une couleur lisible. On vérifie ici tout le reste.
test('contrastes du kit hors couleur de club (tokens bruts)', () => {
  for (const c of [sombre, colorsClaire]) {
    const echecs = verifierContrastes(c).filter(l => !l.ok && !l.nom.startsWith('Liseré'))
    assert.deepEqual(echecs.map(l => l.nom), [])
  }
})

test('pastilles : libellés, lettre lisible, résultat inconnu', () => {
  const c = colorsClub(null, 'claire')
  assert.equal(couleursPastille(c, 'V').libelle, 'Victoire')
  assert.equal(couleursPastille(c, 'N').libelle, 'Nul')
  assert.equal(couleursPastille(c, 'D').libelle, 'Défaite')
  assert.equal(couleursPastille(c, 'X'), null)
  // La victoire garde le vert de statut, jamais la couleur du club.
  assert.equal(couleursPastille(colorsClub('#C8102E', 'claire'), 'V').fond, c.accent.success)
})

test('texteSur choisit le plus contrasté', () => {
  assert.equal(texteSur('#000000'), '#FFFFFF')
  assert.equal(texteSur('#FFFFFF'), '#16161A')
})

test('thème détecté et ligne de craie adaptée', () => {
  assert.equal(estClair(colorsClaire), true)
  assert.equal(estClair(sombre), false)
  assert.match(couleurCraie(colorsClaire), /^rgba\(22, 22, 26/)
  assert.match(couleurCraie(sombre), /^rgba\(255, 255, 255/)
})

test('jauge : couleurs par défaut', () => {
  const c = colorsClub('#C8102E', 'sombre')
  assert.equal(couleursJauge(c, 2)[0], c.accent.green)
  assert.equal(couleursJauge(c, 2).length, 2)
  assert.deepEqual(couleursJauge(c, 3), ['V', 'N', 'D'].map(r => couleursPastille(c, r).fond))
})

test('formes signature : liseré 3 px couleur du club, chiffres à chasse fixe', () => {
  const c = colorsClub('#C8102E', 'claire')
  assert.equal(styleCarteLiseree(c).boxShadow, `inset 3px 0 0 ${c.accent.green}`)
  assert.equal(styleCarteLiseree(c).borderRadius, '6px')
  assert.equal(styleChiffreHeros(c).fontVariantNumeric, 'tabular-nums')
})
