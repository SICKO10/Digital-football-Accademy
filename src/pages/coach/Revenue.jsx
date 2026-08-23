import ComingSoon from '../../components/coachAdmin/ComingSoon'

export default function Revenue() {
  return (
    <ComingSoon
      icon="💶"
      title="Bientôt disponible"
      description="Aucun historique de paiement n'est journalisé aujourd'hui — le webhook Stripe met seulement à jour le profil de l'utilisateur, sans garder de trace des montants/dates. Cette page pourra afficher un vrai graphique de chiffre d'affaires une fois qu'une table de paiements sera mise en place."
    />
  )
}
