// Export de la carte joueur en image PNG, entièrement sur l'appareil du joueur :
// rien n'est envoyé ni stocké.

export function urlVersDataUrl(url) {
  return fetch(url, { mode: 'cors' })
    .then(r => { if (!r.ok) throw new Error('photo inaccessible'); return r.blob() })
    .then(blob => new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    }))
}

// Photographie un élément de la page (html2canvas, chargé seulement à la demande).
export async function capturer(element, { echelle = 3, fond = '#0b0c0f' } = {}) {
  const { default: html2canvas } = await import('html2canvas')
  if (document.fonts?.ready) await document.fonts.ready
  const canvas = await html2canvas(element, { scale: echelle, backgroundColor: fond, useCORS: true, logging: false })
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('image vide'))), 'image/png'))
}

export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = nom
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function peutPartager() {
  try {
    return typeof navigator !== 'undefined' && !!navigator.canShare && typeof File !== 'undefined'
      && navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] })
  } catch { return false }
}

// true si la feuille de partage a été ouverte, false si le partage n'est pas disponible.
export async function partager(blob, nom, titre) {
  const file = new File([blob], nom, { type: 'image/png' })
  if (!navigator.canShare?.({ files: [file] })) return false
  try { await navigator.share({ files: [file], title: titre }) } catch (e) { if (e?.name !== 'AbortError') throw e }
  return true
}

export const nomDeFichier = (nom) =>
  `carte-digital-football-${(nom || 'joueur').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`
