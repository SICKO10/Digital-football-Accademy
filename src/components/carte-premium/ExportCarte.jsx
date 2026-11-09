import { useRef, useState } from 'react'
import CarteJoueurPremium from './CarteJoueurPremium'
import { urlVersDataUrl, capturer, telecharger, partager, peutPartager } from '../../lib/exportCarte'

// Boutons « Télécharger ma carte » et « Partager ». La carte est redessinée hors écran
// en version fixe (sans effets), photographiée à 3x, puis téléchargée ou partagée.
// `carte` : paramètres de CarteJoueurPremium ; `cadre` : cadrage du visage déjà calculé.
export default function ExportCarte({ carte, cadre, nomFichier = 'carte.png', couleur = '#3ee8a0', surImage }) {
  const ref = useRef(null)
  const [rendu, setRendu] = useState(null) // { photo } tant que la carte hors écran est montée
  const [message, setMessage] = useState('')
  const [occupe, setOccupe] = useState(false)
  const partageDispo = peutPartager()

  const preparer = async () => {
    setMessage('')
    let photo
    if (carte.photo) {
      try { photo = await urlVersDataUrl(carte.photo) } catch { photo = undefined; setMessage('La photo n\'a pas pu être incluse (accès refusé) : l\'image est faite sans photo.') }
    }
    setRendu({ photo })
    // laisse le temps au navigateur de dessiner la carte hors écran (images, polices)
    await new Promise(r => setTimeout(r, 700))
    try { return await capturer(ref.current) } finally { setRendu(null) }
  }

  const lancer = async (action) => {
    if (occupe) return
    setOccupe(true)
    try {
      const blob = await preparer()
      if (surImage) surImage(blob)
      if (action === 'partager') {
        const ok = await partager(blob, nomFichier, 'Ma carte Digital Football')
        if (!ok) telecharger(blob, nomFichier)
      } else {
        telecharger(blob, nomFichier)
      }
    } catch {
      setMessage('L\'image n\'a pas pu être créée. Réessaie, ou utilise une capture d\'écran.')
    } finally {
      setOccupe(false)
    }
  }

  const bouton = (plein) => ({
    flex: 1, minHeight: 40, padding: '0 14px', borderRadius: 10, cursor: occupe ? 'wait' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'Inter, sans-serif',
    border: `1px solid ${couleur}`, background: plein ? couleur : 'transparent', color: plein ? '#04130c' : couleur, opacity: occupe ? 0.6 : 1,
  })

  return (
    <div style={{ width: carte.largeur || undefined, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => lancer('telecharger')} disabled={occupe} style={bouton(true)}>{occupe ? 'Création...' : 'Télécharger ma carte'}</button>
        {partageDispo && <button onClick={() => lancer('partager')} disabled={occupe} style={bouton(false)}>Partager</button>}
      </div>
      {message && <span style={{ fontSize: 12, lineHeight: 1.4, color: '#f59e0b' }}>{message}</span>}
      {rendu && (
        <div ref={ref} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0, padding: 28, background: '#0b0c0f' }}>
          <CarteJoueurPremium {...carte} photo={rendu.photo} cadre={cadre ?? null} fixe largeur={360} />
        </div>
      )}
    </div>
  )
}
