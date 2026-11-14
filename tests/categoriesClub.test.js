import { test } from 'node:test'
import assert from 'node:assert/strict'
import { regrouperCategories, placesRestantes, raisonBlocage, cleNom } from '../src/lib/categoriesClub.js'

test('regroupe les équipes par catégorie et garde les catégories vides', () => {
    const cats = [{ id: '2', nom: 'U17' }, { id: '1', nom: 'U15' }, { id: '3', nom: 'U9' }]
    const eq = [{ id: 'a', categorie_id: '1', equipe: 'B' }, { id: 'b', categorie_id: '1', equipe: 'A' }, { id: 'c', categorie_id: '2', equipe: 'A' }]
    const r = regrouperCategories(cats, eq)
    assert.deepEqual(r.map(c => c.nom), ['U9', 'U15', 'U17'])
    assert.deepEqual(r[1].equipes.map(e => e.equipe), ['A', 'B'])
    assert.deepEqual(r[0].equipes, [])
})
test('compte les places du forfait', () => {
    assert.equal(placesRestantes(null, 5), null)
    assert.equal(placesRestantes(4, 3), 1)
    assert.equal(placesRestantes(4, 6), 0)
})
test('nettoie le nom comme la base', () => {
    assert.equal(cleNom(' u 15 '), 'U15')
})
test('bloque la création avec un message tant que le mode manque', () => {
    assert.match(raisonBlocage({ nom: 'U15', mode: null, nbEquipes: 1, existe: false, places: null }), /comment les joueurs/)
    assert.match(raisonBlocage({ nom: 'U15', mode: 'commun', nbEquipes: 3, existe: false, places: 2 }), /retire-en 1/)
    assert.match(raisonBlocage({ nom: 'U15', mode: 'commun', nbEquipes: 2, existe: true, places: 5 }), /existe déjà/)
    assert.equal(raisonBlocage({ nom: 'U15', mode: 'commun', nbEquipes: 3, existe: false, places: null }), null)
})
