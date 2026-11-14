import { test } from 'node:test'
import assert from 'node:assert/strict'
import { regrouperEffectifCommun, cleNomJoueur } from '../src/lib/categoriesEffectif.js'

test('nettoie le nom du joueur (accents, espaces, majuscules)', () => {
    assert.equal(cleNomJoueur({ prenom: ' lucas ', nom: 'Moréau  ' }), 'LUCAS MOREAU')
})
test('une seule ligne par compte : la fiche de l\'équipe active, sinon la plus ancienne', () => {
    const fiches = [
        { id: '1', joueur_id: 'c1', prenom: 'Lucas', nom: 'Moreau', club_categorie_id: 'A', created_at: '2026-09-01' },
        { id: '2', joueur_id: 'c1', prenom: 'Lucas', nom: 'Moreau', club_categorie_id: 'B', created_at: '2026-10-01' },
        { id: '3', joueur_id: 'c2', prenom: 'Hugo', nom: 'Petit', club_categorie_id: 'B', created_at: '2026-10-01' },
        { id: '4', joueur_id: 'c2', prenom: 'Hugo', nom: 'Petit', club_categorie_id: 'C', created_at: '2026-08-01' },
    ]
    const r = regrouperEffectifCommun(fiches, 'B')
    assert.deepEqual(r.joueurs.map(f => f.id), ['2', '3'])
    assert.equal(r.fichesMasquees, 2)
    assert.deepEqual(regrouperEffectifCommun(fiches, 'Z').joueurs.map(f => f.id), ['1', '4'])
    assert.deepEqual(r.doublons, [])
})
test('signale les doublons possibles sans compte, pas les homonymes à deux comptes', () => {
    const fiches = [
        { id: '1', joueur_id: null, prenom: 'Lucas', nom: 'Moreau' },
        { id: '2', joueur_id: 'c1', prenom: 'lucas', nom: 'MOREAU' },
        { id: '3', joueur_id: 'c2', prenom: 'Hugo', nom: 'Petit' },
        { id: '4', joueur_id: 'c3', prenom: 'Hugo', nom: 'Petit' },
        { id: '5', joueur_id: null, prenom: 'Nina', nom: 'Roux' },
    ]
    const r = regrouperEffectifCommun(fiches, null)
    assert.equal(r.joueurs.length, 5)
    assert.equal(r.fichesMasquees, 0)
    assert.deepEqual(r.doublons, [{ nom: 'Lucas Moreau', nb: 2 }])
})
test('liste vide ou absente', () => {
    assert.deepEqual(regrouperEffectifCommun(null, 'A'), { joueurs: [], fichesMasquees: 0, doublons: [] })
})
