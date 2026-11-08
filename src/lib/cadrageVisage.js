import { useEffect, useState } from 'react'

// Détection du visage d'une photo pour la centrer dans la carte joueur.
// Tout se passe sur l'appareil : la photo n'est envoyée nulle part. Le moteur
// (MediaPipe, ~15 Mo) n'est chargé qu'à la première carte avec photo, depuis un
// serveur extérieur (jsDelivr et Google), puis gardé en mémoire par le navigateur.
// Sans visage détecté, ou en cas d'échec, la carte garde son cadrage par défaut.

const VERSION = '1.2.2'
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODELE = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let detecteurPrometteur = null
function obtenirDetecteur() {
  if (!detecteurPrometteur) {
    detecteurPrometteur = import('@mediapipe/tasks-vision').then(async ({ FaceDetector, FilesetResolver }) => {
      const vision = await FilesetResolver.forVisionTasks(WASM)
      return FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODELE },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.5,
      })
    }).catch(err => { detecteurPrometteur = null; throw err })
  }
  return detecteurPrometteur
}

function chargerImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image illisible'))
    img.src = url
  })
}

const memoire = new Map() // url -> { visage } ou null (aucun visage)

// Renvoie { largeurImage, hauteurImage, cx, cy, l, h } : taille de l'image et visage
// détecté (centre et dimensions, en pixels de l'image), ou null.
export async function detecterVisage(url) {
  if (memoire.has(url)) return memoire.get(url)
  let resultat = null
  try {
    const [img, detecteur] = await Promise.all([chargerImage(url), obtenirDetecteur()])
    const { detections } = detecteur.detect(img)
    // Le plus grand visage : c'est le joueur, pas un coéquipier au second plan.
    const meilleur = (detections || [])
      .filter(d => d.boundingBox)
      .sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0]
    if (meilleur) {
      const b = meilleur.boundingBox
      resultat = { largeurImage: img.naturalWidth, hauteurImage: img.naturalHeight, cx: b.originX + b.width / 2, cy: b.originY + b.height / 2, l: b.width, h: b.height }
    }
  } catch {
    resultat = null // réseau, CORS ou moteur indisponible : cadrage par défaut
  }
  memoire.set(url, resultat)
  return resultat
}

// Calcule la zone d'affichage de l'image pour que le visage tombe au bon endroit.
// Repère de la carte : 400 x 600. `cible` : centre du visage voulu et largeur voulue
// du visage ; `zone` : rectangle que l'image doit toujours couvrir.
export function cadrerSurVisage(visage, cible = { cx: 214, cy: 206, largeur: 112 }, zone = { x: 30, y: 70, l: 350, h: 330 }) {
  if (!visage) return null
  let echelle = cible.largeur / visage.l
  // L'image doit toujours couvrir la zone (sinon un bord apparaîtrait).
  echelle = Math.max(echelle, zone.l / visage.largeurImage, zone.h / visage.hauteurImage)
  // Pas plus d'un zoom raisonnable (photo très petite ou visage minuscule).
  echelle = Math.min(echelle, (cible.largeur / visage.l) * 1.6)
  const largeur = visage.largeurImage * echelle
  const hauteur = visage.hauteurImage * echelle
  let x = cible.cx - visage.cx * echelle
  let y = cible.cy - visage.cy * echelle
  x = Math.min(zone.x, Math.max(zone.x + zone.l - largeur, x))
  y = Math.min(zone.y, Math.max(zone.y + zone.h - hauteur, y))
  return { x, y, largeur, hauteur }
}

// Hook : null tant que la détection n'est pas terminée (ou sans visage).
export function useCadrageVisage(url, actif = true) {
  const [cadre, setCadre] = useState(null)
  useEffect(() => {
    let annule = false
    if (!url || !actif) return undefined
    detecterVisage(url).then(v => { if (!annule) setCadre(cadrerSurVisage(v)) })
    return () => { annule = true }
  }, [url, actif])
  return url && actif ? cadre : null
}
