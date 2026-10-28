import { useNavigate } from 'react-router-dom'

// Bouton retour flottant pour les pages publiques (stage, tournoi, partenaire…).
// Ces pages n'ont pas de barre d'application : ouvertes depuis l'app mobile
// (ex. lien partagé, notification), rien ne permettait de revenir en arrière
// sans fermer complètement l'app. Ne s'affiche que s'il y a bien un historique
// de navigation à dépiler (sinon la page a été ouverte directement, ex. lien
// partagé par SMS, et il n'y a nulle part où « revenir »).
export default function BoutonRetourApp() {
  const navigate = useNavigate()
  const peutRevenir = typeof window !== 'undefined' && window.history.state && window.history.state.idx > 0
  if (!peutRevenir) return null

  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Retour"
      style={{
        position: 'fixed', top: 'max(14px, env(safe-area-inset-top))', left: '14px', zIndex: 40,
        width: '38px', height: '38px', borderRadius: '50%', border: 'none',
        background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '20px', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      ←
    </button>
  )
}
