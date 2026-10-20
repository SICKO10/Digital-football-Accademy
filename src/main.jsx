import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { rechargerVersionFraiche } from './lib/rechargement'

registerSW({ immediate: true })

// Fichier JS d'un ancien déploiement introuvable (onglet ou PWA resté ouvert
// pendant une mise en ligne) : Vite émet vite:preloadError avant même que
// React ne voie l'erreur — on recharge une fois en repartant d'une version
// fraîche (même garde-fou que l'ErrorBoundary pour ne jamais boucler).
window.addEventListener('vite:preloadError', (event) => {
  let dejaTente = false
  try { dejaTente = sessionStorage.getItem('df_reload_apres_erreur_chunk') === '1' } catch { /* navigation privée */ }
  if (dejaTente) return
  event.preventDefault()
  try { sessionStorage.setItem('df_reload_apres_erreur_chunk', '1') } catch { /* tant pis */ }
  rechargerVersionFraiche()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
