import OutilNonActive from './OutilNonActive'

// Fenêtre « cet outil est payant », ouverte par un bouton d'une page déjà
// affichée (ex. demander le ressenti RPE sans l'outil Suivi des joueurs).
export default function OutilPayantModale({ role, outilId, detail, onFermer }) {
  return (
    <div onClick={onFermer} role="dialog" aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560 }}>
        <OutilNonActive role={role} outilId={outilId} detail={detail} libelleBouton="Fermer" enModale onRetour={onFermer} />
      </div>
    </div>
  )
}
