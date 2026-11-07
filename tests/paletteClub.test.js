// Tests de src/lib/paletteClub.js (palette « couleurs du club » et garde-fou de contraste).
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculerPalette, variablesCss, contraste, lireSurchargeCouleur,
  COULEUR_DEFAUT, STATUTS_CLAIR, STATUTS_SOMBRE,
} from '../src/lib/paletteClub.js'

const COULEURS = {
  'rouge Cannes': '#B8141F',
  'jaune très clair': '#FFF59D',
  'bleu nuit presque noir': '#0A1128',
  blanc: '#FFFFFF',
  noir: '#000000',
  orange: '#F97316',
  'vert défaut': COULEUR_DEFAUT,
}

for (const [nom, hex] of Object.entries(COULEURS)) {
  for (const mode of ['claire', 'sombre']) {
    test(`${nom} (${mode}) : contrastes lisibles`, () => {
      const p = calculerPalette(hex, mode)
      assert.ok(contraste(p.onPrimary, p.primary) >= 4.5, 'texte sur accent')
      assert.ok(contraste(p.primaryText, p.cardBg) >= 4.5, 'texte coloré sur carte')
      assert.ok(contraste(p.primaryText, p.screenBg) >= 4.5, 'texte coloré sur écran')
      if (mode === 'claire') {
        assert.ok(contraste(p.menuText, p.menuBg) >= 4.5, 'texte blanc sur menu')
        assert.ok(contraste(p.menuTextMuted, p.menuBg) >= 4.5, 'texte atténué sur menu')
        assert.ok(contraste(p.menuActiveText, p.menuActiveBg) >= 4.5, 'actif du menu')
        assert.ok(contraste(p.primaryDark, p.screenBg) >= 4.5, 'primary-dark sur écran clair')
      } else {
        assert.ok(contraste(p.primary, p.cardBg) >= 3, 'accent détaché de la carte sombre')
        assert.ok(contraste(p.menuText, p.menuBg) >= 4.5, 'texte blanc sur menu sombre')
        assert.ok(contraste(p.menuActiveText, p.menuActiveBg) >= 4.5, 'actif du menu sombre')
      }
    })
  }
}

test('absent, vide ou invalide : vert par défaut', () => {
  for (const v of [undefined, null, '', 'rouge', '#12', 42]) {
    const p = calculerPalette(v)
    assert.equal(p.primary, COULEUR_DEFAUT)
    assert.equal(p.source, 'defaut')
  }
  assert.equal(calculerPalette('rouge').raison, 'invalide')
  assert.equal(calculerPalette(null).raison, null)
})

test('couleur du club correcte : conservée telle quelle', () => {
  const p = calculerPalette('#B8141F', 'claire')
  assert.equal(p.primary, '#B8141F')
  assert.equal(p.source, 'club')
  assert.equal(p.ajustee, false)
  assert.equal(p.menuBg, '#B8141F')
})

test('hex sans # et en 3 chiffres acceptés', () => {
  assert.equal(calculerPalette('b8141f').primary, '#B8141F')
  assert.equal(calculerPalette('#f00').couleurDemandee, '#FF0000')
})

test('blanc et gris très clair : retour au vert, avec la raison', () => {
  for (const v of ['#FFFFFF', '#F2F2F2']) {
    const p = calculerPalette(v)
    assert.equal(p.primary, COULEUR_DEFAUT)
    assert.equal(p.raison, 'trop-pale')
  }
})

test('jaune très clair : teinte conservée, menu assombri, texte coloré lisible', () => {
  const p = calculerPalette('#FFF59D', 'claire')
  assert.equal(p.source, 'club')
  assert.equal(p.onPrimary, '#16161A')
  assert.notEqual(p.menuBg, p.primary)
  assert.ok(p.primaryText !== p.primary)
})

test('noir : accent éclairci en sombre pour rester visible, ajusté signalé', () => {
  const clair = calculerPalette('#000000', 'claire')
  assert.equal(clair.primary, '#000000')
  assert.equal(clair.ajustee, false)
  const sombre = calculerPalette('#000000', 'sombre')
  assert.equal(sombre.ajustee, true)
  assert.ok(contraste(sombre.primary, sombre.cardBg) >= 3)
})

test('les statuts ne dépendent jamais de la couleur du club', () => {
  for (const hex of Object.values(COULEURS)) {
    const c = calculerPalette(hex, 'claire')
    const s = calculerPalette(hex, 'sombre')
    for (const k of ['success', 'warning', 'danger']) {
      assert.equal(c[k], STATUTS_CLAIR[k])
      assert.equal(s[k], STATUTS_SOMBRE[k])
    }
  }
  assert.equal(STATUTS_CLAIR.success, '#16A34A')
})

test('palette claire neutre conforme au brief', () => {
  const p = calculerPalette(null, 'claire')
  assert.deepEqual(
    [p.screenBg, p.cardBg, p.cardBorder, p.text, p.textMuted],
    ['#F5F5F7', '#FFFFFF', '#E7E7EB', '#16161A', '#7A7A85'],
  )
})

test('variablesCss expose toutes les variables du brief', () => {
  const v = variablesCss(calculerPalette('#B8141F'))
  for (const nom of ['--club-primary', '--club-primary-dark', '--club-primary-soft', '--menu-bg', '--menu-text',
    '--screen-bg', '--card-bg', '--card-border', '--text', '--text-muted', '--success', '--warning']) {
    assert.ok(v[nom], nom)
  }
})

test('?couleurClub= : lit %23hex et hex nu, ignore le reste', () => {
  assert.equal(lireSurchargeCouleur('?couleurClub=%23FFF59D'), '#FFF59D')
  assert.equal(lireSurchargeCouleur('?couleurClub=0a1128'), '#0A1128')
  assert.equal(lireSurchargeCouleur('?couleurClub=rouge'), null)
  assert.equal(lireSurchargeCouleur(''), null)
})

test('défaut en clair : menu sombre, entrée active en vert de marque, textes lisibles', () => {
  const p = calculerPalette(null, 'claire')
  assert.equal(p.primary, COULEUR_DEFAUT)
  assert.equal(p.menuBg, '#07160D')
  assert.equal(p.menuActiveBg, COULEUR_DEFAUT)
  assert.ok(contraste(p.menuText, p.menuBg) >= 4.5, 'texte du menu')
  assert.ok(contraste(p.menuTextMuted, p.menuBg) >= 4.5, 'texte atténué du menu')
  assert.ok(contraste(p.menuActiveText, p.menuActiveBg) >= 4.5, 'entrée active')
  assert.ok(contraste(p.primaryText, p.screenBg) >= 4.5, 'texte vert sur fond clair')
})
