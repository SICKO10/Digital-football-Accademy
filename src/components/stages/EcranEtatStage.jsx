import BoutonRetourApp from '../BoutonRetourApp'

// Écran d'attente / d'erreur des pages publiques du module Stages.
export default function EcranEtatStage({ etat }) {
  const message = etat === 'chargement' ? 'Chargement…'
    : etat === 'introuvable' ? 'Ce stage n\'existe pas ou n\'est pas encore publié.'
    : 'Le serveur ne répond pas pour le moment. Réessaie dans un instant.'
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <BoutonRetourApp />
      <p style={{ color: '#888', fontSize: 15 }}>{message}</p>
    </div>
  )
}
