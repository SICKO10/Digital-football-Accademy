import { useEffect, useRef, useState } from 'react'
import CarteJoueurPremium from '../components/carte-premium/CarteJoueurPremium'
import ExportCarte from '../components/carte-premium/ExportCarte'
import { joueurDemo, joueurDemoReel } from '../components/carte-premium/donneesDemo'

// Page de prévisualisation locale : données fictives uniquement, aucun appel réseau,
// absente du site mis en ligne. Options d'adresse : ?photo=/image.png (test d'une photo),
// ?export=1 (lance l'export en image et l'affiche à droite).
const bloc = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: '#9a9aa5', fontFamily: 'Inter, sans-serif', fontSize: 13 }
const params = new URLSearchParams(window.location.search)
const photoTest = params.get('photo')

export default function PageApercu() {
  const [apercuExport, setApercuExport] = useState(null)
  const bouton = useRef(null)
  useEffect(() => {
    if (params.get('export') === '1') setTimeout(() => bouton.current?.querySelector('button')?.click(), 2500)
  }, [])
  const carteReelle = { ...joueurDemoReel, photo: photoTest || undefined, largeur: 290 }
  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', alignItems: 'flex-start' }}>
      <div ref={bouton} style={{ ...bloc, width: 290 }}>
        <CarteJoueurPremium {...carteReelle} />
        <ExportCarte carte={carteReelle} nomFichier="carte-test.png" surImage={blob => setApercuExport(URL.createObjectURL(blob))} />
        <span>Format utilisé dans Mes statistiques, avec export</span>
      </div>
      {apercuExport && (
        <div style={{ ...bloc, width: 300 }}>
          <img src={apercuExport} alt="" style={{ width: 300, border: '1px solid #333' }} />
          <span>Image exportée</span>
        </div>
      )}
      <div style={{ ...bloc, width: 340 }}>
        <CarteJoueurPremium {...joueurDemo} />
        <span>Silhouette (sans photo), effets actifs au survol</span>
      </div>
      <div style={{ ...bloc, width: 340 }}>
        <CarteJoueurPremium {...joueurDemo} fixe largeur={340} />
        <span>Version fixe</span>
      </div>
      <div style={{ ...bloc, width: 290 }}>
        <CarteJoueurPremium {...joueurDemo} theme="or" largeur={290} />
        <span>Variante or (non utilisée)</span>
      </div>
    </div>
  )
}
