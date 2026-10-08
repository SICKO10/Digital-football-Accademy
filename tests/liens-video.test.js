// Tests de src/lib/liensVideo.js. Lancer : npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validerLienVideo, estLienVideoAffichable, cleErreurLien } from '../src/lib/liensVideo.js'

test('liens des plateformes prises en charge acceptés', () => {
  const cas = {
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ': 'youtube',
    'https://youtube.com/shorts/abcdefghijk': 'youtube',
    'https://m.youtube.com/watch?v=abcdefghijk': 'youtube',
    'https://youtu.be/abcdefghijk': 'youtube',
    'https://www.tiktok.com/@joueur/video/1234567890': 'tiktok',
    'https://vm.tiktok.com/ZMabcdef/': 'tiktok',
    'https://www.instagram.com/reel/Cabcdef/': 'instagram',
    'https://app.veo.co/matches/abc/': 'veo',
    '  https://YOUTU.BE/abcdefghijk  ': 'youtube',
  }
  for (const [lien, plateforme] of Object.entries(cas)) {
    const r = validerLienVideo(lien)
    assert.equal(r.ok, true, lien)
    assert.equal(r.plateforme, plateforme, lien)
    assert.ok(r.url.startsWith('https://'), lien)
  }
})

test('protocoles dangereux ou non chiffrés refusés', () => {
  for (const lien of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'http://www.youtube.com/watch?v=abc', 'ftp://youtube.com/x', 'file:///etc/passwd', 'vbscript:msgbox(1)']) {
    const r = validerLienVideo(lien)
    assert.equal(r.ok, false, lien)
  }
  assert.equal(validerLienVideo('http://www.youtube.com/watch?v=abc').raison, 'protocole')
})

test('domaines arbitraires, sosies et pièges d’URL refusés', () => {
  for (const lien of [
    'https://exemple.com/video.mp4',
    'https://youtube.com.exemple.com/watch?v=abc',
    'https://exemple-youtube.com/watch',
    'https://fakeyoutube.com/watch',
    'https://youtube.com@exemple.com/watch',
    'https://user:pass@www.youtube.com/watch?v=abc',
    'https://www.youtube.com:8443/watch?v=abc',
    'https://res.cloudinary.com/demo/video/upload/x.mp4',
    'https://bit.ly/abc',
    'https://www.youtube.co/watch',
  ]) {
    const r = validerLienVideo(lien)
    assert.equal(r.ok, false, lien)
  }
})

test('saisies invalides refusées', () => {
  for (const lien of ['', '   ', 'pas un lien', 'www.youtube.com/watch?v=abc', 'https://www.you tube.com', null, undefined, 42, {}, 'https://' + 'a'.repeat(3000) + '.com']) {
    assert.equal(validerLienVideo(lien).ok, false, String(lien).slice(0, 40))
  }
  assert.equal(validerLienVideo('www.youtube.com/watch').raison, 'format')
})

test('affichage : plateformes + hébergement d’upload, rien d’autre', () => {
  assert.equal(estLienVideoAffichable('https://www.instagram.com/reel/abc/'), true)
  assert.equal(estLienVideoAffichable('https://res.cloudinary.com/demo/video/upload/x.mp4'), true)
  assert.equal(estLienVideoAffichable('http://res.cloudinary.com/demo/x.mp4'), false)
  assert.equal(estLienVideoAffichable('https://exemple.com/'), false)
  assert.equal(estLienVideoAffichable('javascript:alert(1)'), false)
  assert.equal(estLienVideoAffichable('https://res.cloudinary.com@exemple.com/x'), false)
})

test('clés de traduction des erreurs', () => {
  assert.equal(cleErreurLien('format'), 'lien_video_format')
  assert.equal(cleErreurLien('protocole'), 'lien_video_https')
  assert.equal(cleErreurLien('plateforme'), 'lien_video_plateforme')
})
