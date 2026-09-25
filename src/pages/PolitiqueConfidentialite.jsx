import { useNavigate } from 'react-router-dom'
import { colors } from '../tokens'

const Section = ({ titre, children }) => (
  <div style={{ marginBottom: '2.5rem' }}>
    <h2 style={{ fontSize: '17px', fontWeight: '700', color: colors.accent.green, marginBottom: '0.75rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
      {titre}
    </h2>
    <div style={{ fontSize: '14px', color: colors.text.secondary, lineHeight: '1.7' }}>{children}</div>
  </div>
)

const P = ({ children }) => <p style={{ margin: '0 0 0.75rem' }}>{children}</p>

const Li = ({ children }) => (
  <li style={{ marginBottom: '6px', paddingLeft: '4px' }}>{children}</li>
)

function PolitiqueConfidentialite() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222' }}>
        <div style={{ fontSize: '18px', fontWeight: '700', cursor: 'pointer' }} onClick={() => navigate('/')}>
          Digital<span style={{ color: colors.accent.green }}>Football</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'transparent', border: '1px solid #333', color: colors.text.secondary, padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
        >
          ← Retour
        </button>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Politique de Confidentialité
          </h1>
          <p style={{ color: colors.text.faint, fontSize: '14px' }}>Dernière mise à jour : septembre 2026</p>
        </div>

        <Section titre="1. Responsable du traitement">
          <P>
            Digital Football est responsable du traitement des données personnelles collectées via la plateforme.
            Pour toute question relative à vos données ou pour exercer vos droits, contactez-nous à
            l'adresse <strong style={{ color: 'white' }}>contact@digital-football.fr</strong>.
          </P>
        </Section>

        <Section titre="2. Données collectées">
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li><strong>Données de compte</strong> : nom, prénom, email, date de naissance, club, catégorie, photo de profil.</Li>
            <Li><strong>Données sportives</strong> : statistiques de match, vidéos, évaluations, présences, convocations.</Li>
            <Li>
              <strong>Données de santé</strong> (catégorie particulière de données, article 9 du RGPD) : blessures
              déclarées, comptes-rendus de suivi médical, rendez-vous, saisis par le joueur (ou son représentant légal
              s'il est mineur) et/ou par son éducateur dans le cadre du suivi sportif. Le dépôt de pièces jointes
              médicales n'est plus possible sur la plateforme ; des documents déposés avant la désactivation de cette
              fonctionnalité peuvent subsister le temps de leur suppression progressive.
            </Li>
            <Li><strong>Données de paiement</strong> : les coordonnées bancaires ne sont jamais stockées par Digital Football — les paiements sont traités directement par notre prestataire Stripe.</Li>
            <Li><strong>Données techniques</strong> : identifiants de session strictement nécessaires à l'authentification (pas de cookies publicitaires ni de mesure d'audience tierce).</Li>
          </ul>
        </Section>

        <Section titre="3. Finalités et base légale">
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li><strong>Exécution du contrat</strong> : gestion du compte, mise en relation joueurs/éducateurs/recruteurs, fonctionnement des modules (compétition, statistiques, équipement...).</Li>
            <Li><strong>Consentement explicite</strong> : pour toute donnée de santé, dont le traitement repose sur le consentement libre et éclairé de la personne concernée (ou de son représentant légal si mineur), conformément à l'article 9.2.a du RGPD. Ce consentement peut être retiré à tout moment.</Li>
            <Li><strong>Intérêt légitime</strong> : sécurité de la plateforme, prévention de la fraude, amélioration du service.</Li>
            <Li><strong>Obligation légale</strong> : conservation de certaines données à des fins comptables ou en cas de réquisition des autorités.</Li>
          </ul>
        </Section>

        <Section titre="4. Destinataires des données">
          <P>Les données ne sont accessibles qu'aux personnes suivantes, chacune pour ce qui la concerne strictement :</P>
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li>L'utilisateur lui-même, depuis son espace personnel.</Li>
            <Li>L'éducateur ou le club auquel le joueur est affilié, pour les données sportives et de santé nécessaires au suivi de l'équipe.</Li>
            <Li>Les recruteurs, uniquement pour les données de profil qu'un joueur a explicitement choisi de rendre visibles — jamais pour les données de santé.</Li>
            <Li>Nos sous-traitants techniques : hébergement, base de données et stockage de fichiers (Supabase), traitement des paiements (Stripe). Ces prestataires n'accèdent aux données que dans la mesure nécessaire à l'exécution de leur prestation.</Li>
          </ul>
          <P>Digital Football ne vend ni ne loue aucune donnée personnelle à des tiers.</P>
        </Section>

        <Section titre="5. Durée de conservation">
          <P>
            Les données sont conservées pendant toute la durée d'utilisation active du compte. En cas de résiliation
            ou de suppression de compte, les données sont conservées 30 jours puis supprimées définitivement,
            conformément à nos CGU.
          </P>
          <P>
            Un document médical déposé avant la désactivation de cette fonctionnalité peut être supprimé à tout
            moment par l'utilisateur concerné depuis son espace Santé.
          </P>
        </Section>

        <Section titre="6. Sécurité des données">
          <P>
            Digital Football met en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos
            données : accès restreint par rôle (un éducateur ne voit que les joueurs de son équipe, un joueur ne voit
            que ses propres données), liens de téléchargement de documents à durée de vie limitée, hébergement
            sécurisé. Aucun système d'information ne pouvant garantir un risque nul, nous nous engageons en
            contrepartie à respecter nos obligations légales de notification en cas de violation de données vous
            concernant.
          </P>
        </Section>

        <Section titre="7. Mineurs">
          <P>
            Un joueur mineur ne peut créer et utiliser un compte qu'avec l'autorisation de son représentant légal, qui
            reste seul décisionnaire pour toute donnée de santé le concernant.
          </P>
        </Section>

        <Section titre="8. Vos droits">
          <P>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</P>
          <ul style={{ paddingLeft: '1.5rem', margin: '0 0 0.75rem' }}>
            <Li>Droit d'accès et de rectification</Li>
            <Li>Droit à l'effacement</Li>
            <Li>Droit à la limitation du traitement</Li>
            <Li>Droit d'opposition</Li>
            <Li>Droit à la portabilité des données</Li>
            <Li>Droit de retirer votre consentement à tout moment, notamment pour les données de santé</Li>
          </ul>
          <P>
            Pour exercer ces droits, contactez-nous à <strong style={{ color: 'white' }}>contact@digital-football.fr</strong>.
            Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr) si vous
            estimez que le traitement de vos données n'est pas conforme à la réglementation.
          </P>
        </Section>

        <Section titre="9. Modifications de la présente politique">
          <P>
            Digital Football peut mettre à jour cette politique de confidentialité, notamment pour refléter une
            évolution des fonctionnalités de la plateforme ou de la réglementation applicable. La date de dernière
            mise à jour figure en haut de cette page.
          </P>
        </Section>

        <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: colors.text.faint, fontSize: '13px' }}>
          <p style={{ margin: '0 0 4px' }}>Digital Football — contact@digital-football.fr</p>
          <p style={{ margin: 0 }}>Cette politique complète nos <a href="/cgu" style={{ color: colors.accent.green }}>Conditions Générales d'Utilisation</a>.</p>
        </div>
      </div>
    </div>
  )
}

export default PolitiqueConfidentialite
