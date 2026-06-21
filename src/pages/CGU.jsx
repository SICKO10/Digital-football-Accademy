import { useNavigate } from 'react-router-dom'

const Section = ({ titre, children }) => (
  <div style={{ marginBottom: '2.5rem' }}>
    <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#4ade80', marginBottom: '0.75rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
      {titre}
    </h2>
    <div style={{ fontSize: '14px', color: '#aaa', lineHeight: '1.7' }}>{children}</div>
  </div>
)

const P = ({ children }) => <p style={{ margin: '0 0 0.75rem' }}>{children}</p>

const Li = ({ children }) => (
  <li style={{ marginBottom: '6px', paddingLeft: '4px' }}>{children}</li>
)

function CGU() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', cursor: 'pointer' }} onClick={() => navigate('/')}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1px solid #333', color: '#aaa', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Retour
        </button>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Conditions Générales d'Utilisation & Règlement
          </h1>
          <p style={{ color: '#555', fontSize: '14px' }}>Dernière mise à jour : juin 2025</p>
        </div>

        <Section titre="1. Objet de la plateforme">
          <P>
            Digital Football est une plateforme dédiée à la découverte et au développement des talents de football.
            Elle met en relation des joueurs de football avec des recruteurs (clubs, agents, scouts) et des coachs experts.
          </P>
          <P>
            La plateforme propose des abonnements permettant aux joueurs de publier leurs vidéos, de recevoir des analyses
            personnalisées et de communiquer avec des professionnels du football.
          </P>
          <P>
            Digital Football est exclusivement réservée au football. Toute utilisation dans un autre contexte sportif
            ou non-sportif est interdite.
          </P>
        </Section>

        <Section titre="2. Contenu autorisé">
          <P>Seuls les contenus directement liés au football sont autorisés sur la plateforme :</P>
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li>Vidéos de matchs, d'entraînements ou de highlights de football</Li>
            <Li>Photos et médias liés à l'activité footballistique</Li>
            <Li>Statistiques, performances et informations de carrière d'un joueur</Li>
            <Li>Messages professionnels entre joueurs, recruteurs et coachs</Li>
            <Li>Liens vers des plateformes vidéo légales (YouTube, Veo, TikTok, Instagram) contenant du contenu football</Li>
          </ul>
        </Section>

        <Section titre="3. Contenu interdit">
          <P>Les contenus suivants sont strictement interdits et entraîneront une suspension immédiate du compte :</P>
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li><strong style={{ color: '#ef4444' }}>Contenu pornographique ou sexuellement explicite</strong></Li>
            <Li><strong style={{ color: '#ef4444' }}>Violence gratuite, scènes de violences physiques ou psychologiques</strong></Li>
            <Li><strong style={{ color: '#ef4444' }}>Actes criminels ou illégaux (trafic, armes, drogues, etc.)</strong></Li>
            <Li><strong style={{ color: '#ef4444' }}>Contenu hors-football</strong> : tout média sans lien avec le football</Li>
            <Li>Discours haineux, raciste, discriminatoire ou harcelant</Li>
            <Li>Usurpation d'identité de joueurs professionnels ou de clubs</Li>
            <Li>Spam, liens malveillants ou tentatives de phishing</Li>
            <Li>Contenu protégé par le droit d'auteur sans autorisation</Li>
          </ul>
          <P>
            Digital Football se réserve le droit de supprimer tout contenu jugé inapproprié, sans préavis ni justification,
            à sa seule discrétion.
          </P>
        </Section>

        <Section titre="4. Sanctions">
          <P>
            Le non-respect du règlement et des présentes conditions entraîne les mesures suivantes :
          </P>
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li>
              <strong>Suppression du contenu</strong> : tout contenu violant le règlement sera supprimé immédiatement
              et sans notification.
            </Li>
            <Li>
              <strong>Bannissement immédiat et définitif</strong> : en cas de violation grave (contenu pornographique,
              violence, acte criminel, contenu hors-football), le compte sera banni sans avertissement préalable.
            </Li>
            <Li>
              <strong>Aucun remboursement</strong> : le bannissement du compte ne donne droit à aucun remboursement,
              quelle que soit la durée restante de l'abonnement. En acceptant les présentes CGU, l'utilisateur
              reconnaît et accepte cette condition sans réserve.
            </Li>
            <Li>
              <strong>Signalement aux autorités</strong> : en cas de contenu illégal, Digital Football se réserve
              le droit de signaler les faits aux autorités compétentes.
            </Li>
          </ul>
        </Section>

        <Section titre="5. Conditions de vente & Abonnements">
          <P><strong style={{ color: 'white' }}>Plans disponibles :</strong></P>
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li><strong>Starter — 49,99€/mois</strong> : accès aux fonctionnalités de base, publication de reels Jogabonito, 1 analyse/mois.</Li>
            <Li><strong>Pro — 79,99€/mois</strong> : accès complet, publication de clips dans le Feed, 3 analyses/mois, visibilité maximale auprès des recruteurs.</Li>
            <Li><strong>Recruteur — tarif annuel</strong> : accès illimité aux profils joueurs, messagerie, filtres avancés.</Li>
          </ul>
          <P><strong style={{ color: 'white' }}>Paiement :</strong></P>
          <P>
            Les paiements sont sécurisés et traités par Stripe. L'abonnement est prélevé mensuellement (ou annuellement
            pour les recruteurs) à la date anniversaire de la souscription.
          </P>
          <P><strong style={{ color: 'white' }}>Politique de remboursement :</strong></P>
          <P>
            Les abonnements sont <strong style={{ color: '#ef4444' }}>non remboursables</strong>. Aucun remboursement
            ne sera accordé pour une période entamée, une résiliation en cours de mois ou un bannissement.
            En souscrivant, l'utilisateur accepte expressément cette condition.
          </P>
        </Section>

        <Section titre="6. Résiliation">
          <P>
            L'utilisateur peut résilier son abonnement à tout moment depuis son tableau de bord (section "Mon abonnement").
            La résiliation prend effet à la fin de la période de facturation en cours. L'accès reste actif jusqu'à cette date.
          </P>
          <P>
            Digital Football peut résilier un compte à tout moment en cas de violation des présentes CGU,
            sans remboursement ni indemnité.
          </P>
          <P>
            En cas de résiliation, les données du profil sont conservées pendant 30 jours puis supprimées définitivement,
            conformément à notre politique de confidentialité.
          </P>
        </Section>

        <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: '#555', fontSize: '13px' }}>
          <p style={{ margin: '0 0 4px' }}>Digital Football — contact@digital-football.fr</p>
          <p style={{ margin: 0 }}>En utilisant la plateforme, vous acceptez l'intégralité des présentes conditions.</p>
        </div>
      </div>
    </div>
  )
}

export default CGU
