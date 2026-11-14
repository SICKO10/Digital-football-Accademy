import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  libelleRenfort, candidatsRenfort, ajouterRenfort, retirerRenfort, comptesRenforts, lignesFeuilleMatch,
} from '../src/lib/categoriesRenfort.js'

const zoe = { fiche_id: 'f1', joueur_id: 'c1', prenom: 'Zoé', nom: 'Bleu', poste: 'ATT', numero_maillot: '9', equipe_nom: 'U15', equipe_lettre: 'B' }
const tom = { fiche_id: 'f2', joueur_id: null, prenom: 'Tom', nom: 'Vert', poste: 'DEF', numero_maillot: '4', equipe_nom: 'U15', equipe_lettre: 'C' }

test('la mention renfort donne l\'équipe d\'origine, sans lettre elle reste sobre', () => {
  assert.equal(libelleRenfort(zoe), 'renfort U15 B')
  assert.equal(libelleRenfort({ equipe_nom: 'U15', equipe_lettre: null }), 'renfort')
  assert.equal(libelleRenfort(undefined), 'renfort')
})

test('la recherche ignore accents et majuscules et couvre prénom, nom, poste, numéro, équipe', () => {
  const tous = [zoe, tom]
  assert.deepEqual(candidatsRenfort(tous, [], [], 'zoe').map(r => r.fiche_id), ['f1'])
  assert.deepEqual(candidatsRenfort(tous, [], [], 'DEF').map(r => r.fiche_id), ['f2'])
  assert.deepEqual(candidatsRenfort(tous, [], [], '9').map(r => r.fiche_id), ['f1'])
  assert.deepEqual(candidatsRenfort(tous, [], [], 'u15 c').map(r => r.fiche_id), ['f2'])
  assert.deepEqual(candidatsRenfort(tous, [], [], '').map(r => r.fiche_id), ['f1', 'f2'])
  assert.deepEqual(candidatsRenfort(tous, [], [], 'inconnu'), [])
})

test('un joueur déjà ajouté ou déjà dans la liste de l\'équipe n\'est plus proposé', () => {
  assert.deepEqual(candidatsRenfort([zoe, tom], [zoe], [], '').map(r => r.fiche_id), ['f2'])
  assert.deepEqual(candidatsRenfort([zoe, tom], [], [{ id: 'f2' }], '').map(r => r.fiche_id), ['f1'])
})

test('ajouter deux fois le même renfort ne le double pas, retirer le supprime', () => {
  const liste = ajouterRenfort(ajouterRenfort([], zoe), zoe)
  assert.equal(liste.length, 1)
  assert.deepEqual(retirerRenfort(liste, 'f1'), [])
  assert.deepEqual(retirerRenfort(undefined, 'f1'), [])
})

test('seuls les renforts avec compte sont convoqués, sans doublon', () => {
  assert.deepEqual(comptesRenforts([zoe, tom, { ...zoe, fiche_id: 'f3' }]), ['c1'])
  assert.deepEqual(comptesRenforts(undefined), [])
})

test('la feuille de match ajoute les renforts à la suite de l\'équipe, sans doublon', () => {
  const equipe = [{ id: 'f9', prenom: 'Lucas', nom: 'Moreau' }]
  const lignes = lignesFeuilleMatch(equipe, [zoe, { ...tom, fiche_id: 'f9' }])
  assert.deepEqual(lignes.map(l => l.id), ['f9', 'f1'])
  assert.equal(lignes[1].mentionRenfort, 'renfort U15 B')
  assert.equal(lignes[0].mentionRenfort, undefined)
})
