import { createRoot } from 'react-dom/client'
import CarteJoueurPremium from '../components/carte-premium/CarteJoueurPremium'
import { joueurDemo, joueurDemoReel } from '../components/carte-premium/donneesDemo'

// Page de prévisualisation locale : données fictives uniquement, aucun appel réseau,
// absente du site mis en ligne (elle n'est pas dans la liste des pages à construire).
// Test local d'une vraie photo : http://localhost:5200/apercu-carte.html?photo=/chemin.png
const photoTest = new URLSearchParams(window.location.search).get('photo')
const bloc = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: '#9a9aa5', fontFamily: 'Inter, sans-serif', fontSize: 13 }

createRoot(document.getElementById('racine')).render(
<div style={{ minHeight: '100vh', padding: '40px 20px', display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', alignItems: 'flex-start' }}>
      {photoTest && (
        <div style={{ ...bloc, width: 290 }}>
          <CarteJoueurPremium {...joueurDemoReel} photo={photoTest} largeur={290} />
          <span>Avec la photo de test</span>
        </div>
      )}
      <div style={{ ...bloc, width: 340 }}>
        <CarteJoueurPremium {...joueurDemo} />
        <span>Silhouette (sans photo), effets actifs au survol</span>
      </div>
      <div style={{ ...bloc, width: 340 }}>
        <CarteJoueurPremium {...joueurDemo} fixe largeur={340} />
        <span>Version fixe, pour une future exportation en image</span>
      </div>
      <div style={{ ...bloc, width: 260 }}>
        <CarteJoueurPremium {...joueurDemo} />
        <span>Petite largeur (mobile)</span>
      </div>
      <div style={{ ...bloc, width: 290 }}>
        <CarteJoueurPremium {...joueurDemoReel} largeur={290} />
        <span>Format utilisé dans Mes statistiques</span>
      </div>
      <div style={{ ...bloc, width: 290 }}>
        <CarteJoueurPremium {...joueurDemo} theme="or" largeur={290} />
        <span>Variante or (non utilisée)</span>
      </div>
    </div>
)
