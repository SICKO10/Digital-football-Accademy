import { useEffect, useState } from 'react'
import logoDF from './logo-df.png'

// Le logo fourni est une image sur fond noir. On calcule ici une version à fond
// transparent (la luminosité devient la transparence) : plus de cadre sombre autour,
// à l'écran comme dans l'image exportée. Calculé une seule fois, sur l'appareil.
let promesse = null
function calculer() {
  if (!promesse) {
    promesse = new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth; c.height = img.naturalHeight
          const ctx = c.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const d = ctx.getImageData(0, 0, c.width, c.height)
          const p = d.data
          for (let i = 0; i < p.length; i += 4) {
            const m = Math.max(p[i], p[i + 1], p[i + 2])
            const alpha = Math.min(255, Math.max(0, ((m - 28) / 227) * 255))
            if (alpha > 0) { p[i] = Math.min(255, (p[i] * 255) / m); p[i + 1] = Math.min(255, (p[i + 1] * 255) / m); p[i + 2] = Math.min(255, (p[i + 2] * 255) / m) }
            p[i + 3] = alpha
          }
          ctx.putImageData(d, 0, 0)
          resolve(c.toDataURL('image/png'))
        } catch { resolve(logoDF) }
      }
      img.onerror = () => resolve(logoDF)
      img.src = logoDF
    })
  }
  return promesse
}

// Renvoie le logo d'origine le temps du calcul, puis la version transparente.
export function useLogoTransparent() {
  const [src, setSrc] = useState(logoDF)
  useEffect(() => {
    let annule = false
    calculer().then(url => { if (!annule) setSrc(url) })
    return () => { annule = true }
  }, [])
  return src
}
