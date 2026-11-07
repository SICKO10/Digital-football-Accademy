// Tests de src/lib/ecranJoueur.js : choix du bloc « à la une » de l'accueil joueur.
// Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { choisirALaUne, vignetteVideo } from '../src/lib/ecranJoueur.js'

const conv = { id: 1 }
const comp = { id: 2 }
const seance = { id: 3 }
const match = { id: 4 }
const analyse = { id: 5 }

test('affilié : la convocation passe avant tout', () => {
  const r = choisirALaUne({ affilie: true, convocation: conv, composition: comp, prochaineSeance: seance, derniereAnalyse: analyse })
  assert.equal(r.type, 'convocation')
  assert.equal(r.contenu, conv)
})

test('affilié : sans convocation, la composition', () => {
  assert.equal(choisirALaUne({ affilie: true, composition: comp, prochaineSeance: seance }).type, 'composition')
})

test('affilié : sans convocation ni composition, la séance puis le match', () => {
  assert.equal(choisirALaUne({ affilie: true, prochaineSeance: seance, prochainMatch: match }).type, 'seance')
  assert.equal(choisirALaUne({ affilie: true, prochainMatch: match }).type, 'match')
})

test('non affilié : convocation, composition et séance sont ignorées', () => {
  const r = choisirALaUne({ affilie: false, convocation: conv, composition: comp, prochaineSeance: seance, aUneVideo: true })
  assert.equal(r, null)
})

test('Pro indépendant : analyse, puis visibilité recruteurs, puis publier', () => {
  assert.equal(choisirALaUne({ estPro: true, derniereAnalyse: analyse }).type, 'analyse')
  const v = choisirALaUne({ estPro: true, visibleRecruteurs: true, statutRecrutement: 'Disponible', aUneVideo: false })
  assert.equal(v.type, 'visibilite')
  assert.deepEqual(v.contenu, { visible: true, statut: 'Disponible' })
})

test('Pro indépendant avec une vidéo : visibilité, jamais « publier »', () => {
  assert.equal(choisirALaUne({ estPro: true, aUneVideo: true }).type, 'visibilite')
})

test('non Pro sans rien : publier un reel ; avec une vidéo : rien', () => {
  const r = choisirALaUne({ estPro: false })
  assert.equal(r.type, 'publier')
  assert.equal(r.contenu.estPro, false)
  assert.equal(choisirALaUne({ estPro: false, aUneVideo: true }), null)
})

test('affilié sans échéance mais avec une analyse : la liste du Pro prend le relais', () => {
  assert.equal(choisirALaUne({ affilie: true, derniereAnalyse: analyse }).type, 'analyse')
})

test('vignette : YouTube donne la miniature officielle', () => {
  assert.deepEqual(vignetteVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), { type: 'image', src: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg' })
  assert.equal(vignetteVideo('https://youtu.be/dQw4w9WgXcQ').type, 'image')
  assert.equal(vignetteVideo('https://www.youtube.com/shorts/dQw4w9WgXcQ').type, 'image')
})

test('vignette : fichier vidéo direct donne la première image', () => {
  assert.deepEqual(vignetteVideo('https://cdn.exemple.fr/a/clip.mp4'), { type: 'video', src: 'https://cdn.exemple.fr/a/clip.mp4#t=0.5' })
  assert.equal(vignetteVideo('https://res.cloudinary.com/abc/video/upload/v1/x').type, 'video')
})

test('vignette : plateformes sans image ou valeur vide donnent null', () => {
  assert.equal(vignetteVideo('https://www.tiktok.com/@a/video/1'), null)
  assert.equal(vignetteVideo('https://veo.co/x'), null)
  assert.equal(vignetteVideo(''), null)
  assert.equal(vignetteVideo(null), null)
})
