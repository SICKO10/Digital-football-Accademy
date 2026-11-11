import test from 'node:test'
import assert from 'node:assert/strict'
import {
  OUTILS, SOCLE, outilsVisibles, menuFiltre, totalComposition,
  joursRestantsEssai, outilsPrecoches, outilsSansPrix, trouverOutil, outilsDuRole,
} from '../src/lib/catalogueOutils.js'

const NOW = new Date('2026-11-10T12:00:00Z')
const futur = '2026-11-20T12:00:00Z'
const passe = '2026-11-01T12:00:00Z'

test('catalogue : ids uniques par rôle et menus jamais dans le socle', () => {
  const vus = new Set()
  for (const o of OUTILS) {
    const cle = `${o.role}/${o.id}`
    assert.ok(!vus.has(cle), cle)
    vus.add(cle)
    for (const m of o.menus) assert.ok(!SOCLE[o.role].menus.includes(m), `${cle} : ${m} est dans le socle`)
  }
})

test('compte hors nouveau modèle : aucun filtrage', () => {
  assert.equal(outilsVisibles({ role: 'educateur', modeleOutils: false }, NOW), null)
  const menus = ['accueil', 'stats', 'explorer']
  assert.deepEqual(menuFiltre({ role: 'educateur', modeleOutils: false }, menus, NOW), menus)
})

test('éducateur seul sans outil : socle uniquement, Explorer et CFF4 retirés', () => {
  const c = { role: 'educateur', modeleOutils: true, droits: [] }
  assert.deepEqual(outilsVisibles(c, NOW), [])
  const menus = ['accueil', 'profil', 'equipe', 'matchs', 'stats', 'tactipad', 'explorer', 'projet_club_cff4']
  assert.deepEqual(menuFiltre(c, menus, NOW), ['accueil', 'profil', 'equipe', 'matchs'])
})

test('éducateur avec outil actif ou essai en cours', () => {
  const c = { role: 'educateur', modeleOutils: true, droits: [
    { outil: 'tactique', statut: 'actif' },
    { outil: 'seances', statut: 'essai', essaiFin: futur },
  ] }
  assert.deepEqual(outilsVisibles(c, NOW).sort(), ['seances', 'tactique'])
  assert.deepEqual(menuFiltre(c, ['accueil', 'tactipad', 'entrainements', 'stats'], NOW), ['accueil', 'tactipad', 'entrainements'])
})

test('essai expiré : outil masqué', () => {
  const c = { role: 'educateur', modeleOutils: true, droits: [{ outil: 'seances', statut: 'essai', essaiFin: passe }] }
  assert.deepEqual(outilsVisibles(c, NOW), [])
})

test('outil retiré mais encore payé : visible jusqu\'à la fin de période', () => {
  const droit = (periodeFin) => ({ role: 'club', modeleOutils: true, droits: [{ outil: 'finances', statut: 'retire', periodeFin }] })
  assert.deepEqual(outilsVisibles(droit(futur), NOW), ['finances'])
  assert.deepEqual(outilsVisibles(droit(passe), NOW), [])
})

test('éducateur affilié : reçoit Stages et CFF4 seulement si le club les détient', () => {
  const avec = { role: 'educateur', modeleOutils: true, droits: [], clubOutils: ['stages', 'cff4'] }
  assert.deepEqual(outilsVisibles(avec, NOW).sort(), ['cff4', 'stages'])
  const sans = { role: 'educateur', modeleOutils: true, droits: [], clubOutils: ['finances'] }
  assert.deepEqual(outilsVisibles(sans, NOW), [])
})

test('outil retiré du club : l\'éducateur le perd', () => {
  const avant = { role: 'educateur', modeleOutils: true, droits: [], clubOutils: ['stages'] }
  const apres = { ...avant, clubOutils: [] }
  assert.deepEqual(outilsVisibles(avant, NOW), ['stages'])
  assert.deepEqual(outilsVisibles(apres, NOW), [])
})

test('club : socle complet, outils par menu', () => {
  const c = { role: 'club', modeleOutils: true, droits: [{ outil: 'stages', statut: 'actif' }] }
  const menus = ['accueil', 'planning', 'seances', 'terrains', 'inventaire', 'budget', 'stages', 'projet_club_cff4']
  assert.deepEqual(menuFiltre(c, menus, NOW), ['accueil', 'planning', 'seances', 'terrains', 'inventaire', 'stages'])
})

test('Stages éducateur non achetable seul', () => {
  assert.equal(trouverOutil('educateur', 'stages').achetable, false)
})

test('total : somme des prix, null pour un outil non achetable, 0 pour un outil club inclus', () => {
  assert.equal(totalComposition('educateur', ['seances', 'tactique'], 'mensuel'), 7)
  assert.equal(totalComposition('educateur', ['seances', 'tactique', 'bibliotheque'], 'annuel'), 110)
  assert.equal(totalComposition('educateur', ['stages'], 'mensuel'), null)
  assert.equal(totalComposition('club', ['competition', 'finances'], 'mensuel'), 0)
})

test('grille de prix éducateur : tous les outils achetables ont un prix, ceux du club sont inclus', () => {
  assert.deepEqual(outilsSansPrix(), [])
  const grille = Object.fromEntries(outilsDuRole('educateur').map(o => [o.id, [o.prixMensuel, o.prixAnnuel]]))
  assert.deepEqual(grille.suivi_joueurs, [1, 10])
  assert.deepEqual(grille.seances, [3, 30])
  assert.deepEqual(grille.tactique, [4, 40])
  assert.deepEqual(grille.bibliotheque, [4, 40])
  assert.deepEqual(grille.cff4, [2, 20])
  assert.deepEqual(grille.stages, [null, null])
  assert.ok(outilsDuRole('club').every(o => o.inclus && o.prixMensuel === null))
})

test('jours restants d\'essai', () => {
  assert.equal(joursRestantsEssai('2026-11-24T12:00:00Z', NOW), 14)
  assert.equal(joursRestantsEssai('2026-11-10T13:00:00Z', NOW), 1)
  assert.equal(joursRestantsEssai(passe, NOW), 0)
  assert.equal(joursRestantsEssai(null, NOW), 0)
})

test('pré-cochage : réponses, club et exclusion des outils fournis', () => {
  assert.deepEqual(outilsPrecoches('educateur', { q2: 'u13_u15', q3: 'seances' }).sort(), ['prep_physique', 'seances', 'tactique'])
  assert.deepEqual(outilsPrecoches('club', { q2: 'ecole', q3: 'organiser' }).sort(), ['projet_sportif', 'vie_club'])
  assert.deepEqual(outilsPrecoches('educateur', { q2: 'ecole', q3: 'seances' }, ['projet_sportif']).sort(), ['seances', 'tactique'])
})

// Garde-fou de la bascule live (bloc 16) : lancer avec BASCULE_LIVE=1.
test('bascule : tous les outils achetables ont un prix', { skip: !process.env.BASCULE_LIVE }, () => {
  assert.deepEqual(outilsSansPrix(), [])
})

test('lignesStripe : 3 paliers éducateur et 6 forfaits club, clés uniques, plus de prix à l\'unité', async () => {
  const { lignesStripe, FORFAITS_CLUB } = await import('../src/lib/catalogueOutils.js')
  const l = lignesStripe()
  assert.equal(l.length, (3 + FORFAITS_CLUB.length) * 2)
  assert.equal(new Set(l.map(x => x.cle)).size, l.length)
  assert.ok(l.every(x => x.montant > 0 && Number.isInteger(x.montant)))
  assert.ok(!l.some(x => x.cle.startsWith('outil_')))
  assert.deepEqual(l.filter(x => x.type === 'pack').map(x => [x.cle, x.montant / 100]), [
    ['pack_educateur_3_mensuel', 10], ['pack_educateur_3_annuel', 80],
    ['pack_educateur_6_mensuel', 15], ['pack_educateur_6_annuel', 120],
    ['pack_educateur_mensuel', 18], ['pack_educateur_annuel', 150],
  ])
})

test('paliers éducateur : 10, 15 et 18 euros, frais Stripe sous 4 % dès 10 euros, annuel moins cher que 10 mensualités', async () => {
  const { PALIERS_EDUCATEUR, palierPourNombre, outilsDuPack } = await import('../src/lib/catalogueOutils.js')
  assert.deepEqual(PALIERS_EDUCATEUR.map(p => [p.max, p.prixMensuel, p.prixAnnuel]), [[3, 10, 80], [6, 15, 120], [9, 18, 150]])
  for (const p of PALIERS_EDUCATEUR) assert.ok(p.prixMensuel * 10 > p.prixAnnuel, `palier ${p.max}`)
  assert.equal(outilsDuPack().length, 9)
  assert.ok(!outilsDuPack().includes('stages'))
  assert.deepEqual([0, 1, 3, 4, 6, 7, 9, 10].map(n => palierPourNombre(n)?.max ?? null), [null, 3, 3, 6, 6, 9, 9, null])
})

test('composition de paiement éducateur : le palier suit le nombre d\'outils, le palier 9 donne tous les outils', async () => {
  const { compositionPaiement, outilsDuPack } = await import('../src/lib/catalogueOutils.js')
  const tous = outilsDuPack()
  const c3 = compositionPaiement('educateur', { outils: ['seances'], periodicite: 'mensuel' })
  assert.deepEqual([c3.cles, c3.total, c3.outils], [['pack_educateur_3_mensuel'], 10, ['seances']])
  const c6 = compositionPaiement('educateur', { outils: tous.slice(0, 5), periodicite: 'annuel' })
  assert.deepEqual([c6.cles, c6.total], [['pack_educateur_6_annuel'], 120])
  const c9 = compositionPaiement('educateur', { outils: tous.slice(0, 8), periodicite: 'annuel' })
  assert.deepEqual([c9.cles, c9.total, c9.outils], [['pack_educateur_annuel'], 150, tous])
  assert.deepEqual(compositionPaiement('educateur', { pack: true, periodicite: 'mensuel' }).cles, ['pack_educateur_mensuel'])
  assert.ok(compositionPaiement('educateur', { pack: true, periodicite: 'trimestriel' }).erreur)
  assert.ok(compositionPaiement('educateur', { outils: [], periodicite: 'mensuel' }).erreur)
  assert.ok(compositionPaiement('educateur', { outils: ['stages'], periodicite: 'mensuel' }).erreur)
  assert.ok(compositionPaiement('educateur', { outils: ['seances', 'seances'], periodicite: 'mensuel' }).erreur)
  assert.ok(compositionPaiement('club', { pack: true, periodicite: 'mensuel', palier: 'zz' }).erreur)
})

test('forfaits club : annuel = 10 mensualités, mêmes montants que les liens de paiement', async () => {
  const { FORFAITS_CLUB } = await import('../src/lib/catalogueOutils.js')
  for (const f of FORFAITS_CLUB) assert.equal(f.prixAnnuel, f.prixMensuel * 10)
  assert.deepEqual(FORFAITS_CLUB.map(f => f.prixMensuel), [50, 100, 130, 160, 190, 250])
  assert.deepEqual(FORFAITS_CLUB.map(f => f.equipes), [2, 4, 7, 11, 15, 22])
})
