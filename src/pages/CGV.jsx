import { useNavigate } from 'react-router-dom'
import { colors } from '../tokens'
import { CONTACT_EMAIL, STRIPE_LINKS_CLUB, PALIERS_QUOTA_EQUIPES } from '../lib/stripeLinks'

const Section = ({ titre, children }) => (
  <div style={{ marginBottom: '2.5rem' }}>
    <h2 style={{ fontSize: '17px', fontWeight: '700', color: colors.accent.green, marginBottom: '0.75rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem' }}>
      {titre}
    </h2>
    <div style={{ fontSize: '14px', color: colors.text.secondary, lineHeight: '1.7' }}>{children}</div>
  </div>
)

const SousTitre = ({ children }) => (
  <p style={{ color: colors.text.secondary, fontSize: '13px', fontWeight: '700', margin: '20px 0 8px' }}>{children}</p>
)

const P = ({ children }) => <p style={{ margin: '0 0 0.75rem' }}>{children}</p>

function CGV() {
  const navigate = useNavigate()

  const thStyle = { background: colors.background.raised, color: colors.accent.green, padding: '8px 12px', fontSize: '12px', fontWeight: '700', textAlign: 'left', border: `1px solid ${colors.border.default}` }
  const tdStyle = { color: colors.text.faint, padding: '8px 12px', fontSize: '12px', border: `1px solid ${colors.border.subtle}` }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'Inter, sans-serif' }}>
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
            Conditions Générales de Vente
          </h1>
          <p style={{ color: colors.text.faint, fontSize: '14px' }}>digitalfootball.academy — version en vigueur au 08/10/2026</p>
        </div>

        <Section titre="Article 1 — Éditeur de la plateforme">
          <P>La plateforme Digital Football, accessible à l'adresse <strong style={{ color: colors.accent.green }}>digitalfootball.academy</strong>, est éditée et exploitée par :</P>
          <P><strong style={{ color: 'white' }}>JANUARIO CAPITAL</strong> — EURL (Entreprise Unipersonnelle à Responsabilité Limitée)</P>
          <P>
            SIRET : 931 292 411 00010<br />
            RCS : 931 292 411 R.C.S. Mâcon<br />
            TVA intracommunautaire : FR19931292411<br />
            Capital social : 375 000,00 €<br />
            Siège social : Tournus (71700), France<br />
            Contact : <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: colors.accent.green }}>{CONTACT_EMAIL}</a>
          </P>
        </Section>

        <Section titre="Article 2 — Objet et champ d'application">
          <P>Les présentes CGV régissent les relations contractuelles entre JANUARIO CAPITAL (« l'Éditeur ») et toute personne souscrivant un abonnement sur Digital Football.</P>
          <P>Digital Football propose : l'analyse vidéo personnalisée avec retour vocal expert, un feed social pour les clips des joueurs, et une mise en relation joueurs / clubs / agents / recruteurs.</P>
          <P>Tout accès à la plateforme implique l'acceptation sans réserve des présentes CGV.</P>
        </Section>

        <Section titre="Article 3 — Offres et tarifs">
          <SousTitre>3.1 Abonnement Joueur — Offre Gratuite (Starter)</SousTitre>
          <P>Accès de base gratuit : profil joueur, feed social, programme nutrition, planning d'entraînement, statistiques. Aucune carte bancaire requise.</P>

          <SousTitre>3.2 Abonnement Joueur — Offre Pro</SousTitre>
          <P><strong style={{ color: 'white' }}>Mensuel : 10,00 € / mois TTC</strong> — 1 analyse vidéo incluse tous les 6 mois. Analyses supplémentaires : 60,00 € l'unité.</P>
          <P><strong style={{ color: 'white' }}>Annuel : 100,00 € / an TTC</strong> — 3 analyses vidéo incluses immédiatement. Analyses supplémentaires : 60,00 € l'unité.</P>

          <SousTitre>3.3 Abonnement Éducateur</SousTitre>
          <P>
            Mensuel : 10,00 € / mois TTC — Annuel : 100,00 € / an TTC<br />
            Inclut : gestion des catégories, suivi joueurs, modules santé / nutrition / planification / statistiques.
          </P>

          <SousTitre>3.4 Abonnement Recruteur</SousTitre>
          <P>
            Mensuel : 10,00 € / mois TTC — Annuel : 100,00 € / an TTC<br />
            Inclut : base profils joueurs, moteur de recherche, messagerie, compilations vidéo.
          </P>

          <SousTitre>3.5 Abonnement Club</SousTitre>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Palier</th>
                <th style={thStyle}>Équipes incluses</th>
                <th style={thStyle}>Mensuel TTC</th>
                <th style={thStyle}>Annuel TTC</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(STRIPE_LINKS_CLUB).map(([palier, infos]) => (
                <tr key={palier}>
                  <td style={tdStyle}>{palier}</td>
                  <td style={tdStyle}>{infos.label || `Jusqu'à ${PALIERS_QUOTA_EQUIPES[palier]} équipes`}</td>
                  <td style={tdStyle}>{infos.mensuelPrix}</td>
                  <td style={tdStyle}>{infos.annuelPrix}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <SousTitre>3.6 Analyse vidéo à l'unité</SousTitre>
          <P>Disponible pour tout joueur : 60,00 € TTC par analyse.</P>

          <SousTitre>3.7 Code promotionnel LANCEMENT70</SousTitre>
          <P>-70 % sur le premier mois de l'abonnement Joueur Pro mensuel. Valable une fois par compte, non cumulable.</P>

          <SousTitre>3.8 Modification des tarifs</SousTitre>
          <P>Toute modification est communiquée 30 jours à l'avance par email. Le Client peut résilier sans frais dans ce délai.</P>
        </Section>

        <Section titre="Article 4 — Modalités de souscription">
          <P>La souscription s'effectue en ligne via digitalfootball.academy. Lors de toute souscription payante, le Client coche obligatoirement :</P>
          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '14px 18px', margin: '12px 0', color: colors.text.secondary, fontSize: '13px', fontStyle: 'italic', lineHeight: '1.7' }}>
            « Je demande expressément que l'accès à la plateforme commence immédiatement. Je reconnais perdre mon droit de rétractation dès ma première connexion ou utilisation d'une fonctionnalité de la plateforme (art. L.221-28 Code de la consommation). »
          </div>
          <P>Le contrat est formé à la validation du paiement. Âge minimum : 16 ans.</P>
        </Section>

        <Section titre="Article 5 — Paiement">
          <P>Paiements sécurisés via Stripe Inc. Aucune donnée bancaire stockée. Prélèvement automatique à la date anniversaire. Accès suspendu en cas d'échec de paiement. Prix en euros TTC.</P>
        </Section>

        <Section titre="Article 6 — Durée et renouvellement">
          <P>Abonnements renouvelables tacitement (mensuel ou annuel). Désactivation possible depuis les paramètres ou via {CONTACT_EMAIL}, 48h avant échéance.</P>
        </Section>

        <Section titre="Article 7 — Droit de rétractation">
          <P>En application de l'article L.221-28 du Code de la consommation, le Client ayant demandé l'exécution immédiate du service perd son droit de rétractation dès sa première connexion ou utilisation de la plateforme.</P>
          <P>En l'absence de toute connexion après souscription, le Client dispose de 14 jours pour se rétracter via {CONTACT_EMAIL}.</P>
        </Section>

        <Section titre="Article 8 — Remboursement">
          <P>Hors rétractation valide, aucun remboursement partiel en cas de résiliation en cours de période. Analyses à l'unité non utilisées dans 12 mois : perdues. En cas d'indisponibilité technique imputable à l'Éditeur dépassant 72h, un avoir peut être accordé sur demande.</P>
        </Section>

        <Section titre="Article 9 — Obligations du Client">
          <P>Le Client s'engage à : fournir des informations exactes, ne pas partager ses identifiants, utiliser la plateforme à des fins sportives, ne pas diffuser de contenus illicites, respecter la propriété intellectuelle. Tout manquement peut entraîner la suspension sans remboursement.</P>
        </Section>

        <Section titre="Article 10 — Contenu utilisateur">
          <P>Le Client conserve la propriété de ses contenus et accorde à l'Éditeur une licence non exclusive d'utilisation pour la prestation de service.</P>
        </Section>

        <Section titre="Article 11 — Protection des données personnelles">
          <P>
            Responsable de traitement : JANUARIO CAPITAL. Données traitées conformément au RGPD (UE 2016/679). Droits d'accès, rectification, suppression : {CONTACT_EMAIL}. Recours CNIL :{' '}
            <a href="https://www.cnil.fr" style={{ color: colors.accent.green }} target="_blank" rel="noreferrer">www.cnil.fr</a>.
          </P>
        </Section>

        <Section titre="Article 12 — Propriété intellectuelle">
          <P>Tous les éléments de la plateforme sont la propriété exclusive de JANUARIO CAPITAL. Toute reproduction sans autorisation écrite est interdite.</P>
        </Section>

        <Section titre="Article 13 — Responsabilité">
          <P>Obligation de moyens. Aucune garantie de résultats sportifs. Responsabilité limitée aux sommes encaissées sur les 3 derniers mois.</P>
        </Section>

        <Section titre="Article 14 — Résiliation par l'Éditeur">
          <P>Résiliation possible sans préavis ni remboursement en cas de violation grave des CGV, fraude ou non-paiement persistant.</P>
        </Section>

        <Section titre="Article 15 — Modifications des CGV">
          <P>Modifications notifiées 30 jours à l'avance par email. L'utilisation continue après ce délai vaut acceptation.</P>
        </Section>

        <Section titre="Article 16 — Loi applicable et juridiction">
          <P>
            Droit français applicable. Tribunal compétent : ressort de Mâcon. Médiation consommateur :{' '}
            <a href="https://ec.europa.eu/consumers/odr" style={{ color: colors.accent.green }} target="_blank" rel="noreferrer">ec.europa.eu/consumers/odr</a>.
          </P>
        </Section>

        <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', textAlign: 'center', color: colors.text.faint, fontSize: '13px' }}>
          <p style={{ margin: '0 0 4px' }}>JANUARIO CAPITAL — EURL — SIRET 931 292 411 00010 — RCS Mâcon — Capital 375 000 € — Tournus (71700)</p>
          <p style={{ margin: 0 }}>Digital Football — {CONTACT_EMAIL}</p>
        </div>
      </div>
    </div>
  )
}

export default CGV
