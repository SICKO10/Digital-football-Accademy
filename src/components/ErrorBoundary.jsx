import { Component } from 'react'
import { colors } from '../tokens'

// Filet de sécurité affiché à la place de l'écran blanc silencieux qu'on avait
// jusqu'ici : sans error boundary, toute exception de rendu React démonte
// l'appli entière sans rien afficher, donc impossible de savoir quoi que ce
// soit sans les devtools déjà ouverts au bon moment. Ici le message + la
// stack restent visibles à l'écran pour pouvoir les copier directement.

// Un onglet resté ouvert à cheval sur un nouveau déploiement Vercel : les
// imports lazy (React.lazy, ex. "Création entraînement") référencent un
// fichier JS au hash d'avant le déploiement, qui n'existe plus sur le
// serveur — Vercel répond avec son fallback index.html (SPA) au lieu d'un
// 404, et le navigateur essaie d'exécuter ce HTML comme script, d'où
// "'text/html' is not a valid JavaScript MIME type." Un simple rechargement
// récupère le nouveau manifeste et résout tout seul le problème (confirmé :
// signalé avec ce message exact, résolu par un rechargement manuel) — on le
// fait automatiquement plutôt que d'exposer une stack technique inutile.
const RELOAD_GUARD_KEY = 'df_reload_apres_erreur_chunk'
const estErreurChunkObsolete = (error) => {
  const msg = String(error?.message || '')
  return error?.name === 'ChunkLoadError'
    || /valid JavaScript MIME type/i.test(msg)
    || /Failed to fetch dynamically imported module/i.test(msg)
    || /error loading dynamically imported module/i.test(msg)
    || /Importing a module script failed/i.test(msg)
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null, autoReload: false }
  }

  // La décision de recharger (et donc de ne PAS afficher la stack technique
  // dès le tout premier rendu) se prend ici plutôt que dans componentDidCatch
  // — getDerivedStateFromError s'exécute avant ce premier rendu, donc c'est
  // le seul endroit qui évite un flash de l'écran d'erreur avant le reload.
  static getDerivedStateFromError(error) {
    const chunkObsolete = estErreurChunkObsolete(error)
    let dejaTente = false
    if (chunkObsolete) {
      try { dejaTente = sessionStorage.getItem(RELOAD_GUARD_KEY) === '1' } catch { /* navigation privée */ }
    }
    return { error, autoReload: chunkObsolete && !dejaTente }
  }

  // Remis à zéro à chaque vrai chargement de page réussi (ce composant ne se
  // remonte jamais en navigation interne, il enveloppe toute l'app une seule
  // fois dans main.jsx) — sinon un onglet resté ouvert très longtemps ne
  // retenterait plus l'auto-reload au déploiement suivant.
  componentDidMount() {
    try { sessionStorage.removeItem(RELOAD_GUARD_KEY) } catch { /* navigation privée : tant pis */ }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
    // Garde-fou déjà posé dans getDerivedStateFromError (dejaTente) : si
    // recharger une fois n'a pas suffi — vraie erreur, pas juste un
    // déploiement entre-temps — autoReload est false et l'écran normal
    // s'affiche au lieu de boucler indéfiniment sur un rechargement.
    if (this.state.autoReload) {
      try { sessionStorage.setItem(RELOAD_GUARD_KEY, '1') } catch { /* tant pis, on retente quand même une fois */ }
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.state.autoReload) return null
    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', padding: '24px', boxSizing: 'border-box' }}>
        <p style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>⚠️ Une erreur a bloqué l'affichage</p>
        <p style={{ fontSize: '13px', color: colors.text.dim, margin: '0 0 16px' }}>Copie le texte ci-dessous pour le signaler.</p>
        <button onClick={() => window.location.reload()} style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '20px' }}>
          Recharger la page
        </button>
        <pre style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '16px', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto' }}>
          {this.state.error?.message}
          {'\n\n'}
          {this.state.error?.stack}
          {this.state.info?.componentStack ? `\n\n${this.state.info.componentStack}` : ''}
        </pre>
      </div>
    )
  }
}
