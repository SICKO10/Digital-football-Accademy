import { Component } from 'react'
import { colors } from '../tokens'

// Filet de sécurité affiché à la place de l'écran blanc silencieux qu'on avait
// jusqu'ici : sans error boundary, toute exception de rendu React démonte
// l'appli entière sans rien afficher, donc impossible de savoir quoi que ce
// soit sans les devtools déjà ouverts au bon moment. Ici le message + la
// stack restent visibles à l'écran pour pouvoir les copier directement.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
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
