import { useColors } from '../../lib/theme'
import TutorielModal from './TutorielModal'
import { Bouton, Carte, Fleche, Onglets, Statut, Formulaire } from './Maquette'

// Tutoriels des pages du dashboard club : un par rubrique (clé = id de
// l'onglet dans DashboardClub), ouverts par le bouton « Tutoriel » de la barre
// du haut. Maquettes simplifiées avec les libellés réels des boutons.

// Rangée de boutons, ceux listés dans `actifs` mis en évidence.
function Boutons({ items, actifs = [], couleur }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map(it => <Bouton key={it} plein={actifs.includes(it)} actif={actifs.includes(it)} couleur={couleur}>{it}</Bouton>)}
    </div>
  )
}

function Etapes({ items }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map((it, i) => (
        <span key={it.texte} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {i > 0 && <Fleche />}
          <Statut couleur={it.couleur}>{it.texte}</Statut>
        </span>
      ))}
    </div>
  )
}

function Cartes({ items }) {
  return <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>{items.map(c => <Carte key={c.titre} {...c} />)}</div>
}

function Liste({ titre, lignes }) {
  const colors = useColors()
  return (
    <div style={{ width: '100%', maxWidth: '380px', borderRadius: '12px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, padding: '10px 12px' }}>
      <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: colors.text.primary }}>{titre}</p>
      {lignes.map(([gauche, droite]) => (
        <div key={gauche} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '5px 0', borderTop: `1px solid ${colors.border.subtle}`, fontSize: '12px' }}>
          <span style={{ color: colors.text.secondary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gauche}</span>
          <span style={{ flexShrink: 0 }}>{droite}</span>
        </div>
      ))}
    </div>
  )
}

const Pile = ({ children }) => <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>{children}</div>

// Chaque tutoriel : (colors) => { titre, etapes } — colors pour teinter les
// maquettes selon le thème.
const TUTORIELS = {
  profil: (c) => ({
    titre: 'Profil du club',
    etapes: [
      {
        titre: 'Les informations du club',
        texte: 'Commence par remplir la fiche du club, puis clique sur « Sauvegarder ».',
        points: [
          'Nom du club, région et description (histoire, valeurs…).',
          'Ville (siège du club) : elle sert à calculer automatiquement les horaires de départ et de retour des déplacements à l’extérieur.',
        ],
        visuel: <Formulaire champs={[['Nom du club', 'AS Cannes'], ['Région', "Provence-Alpes-Côte d'Azur"], ['Ville (siège du club)', 'Cannes', true], ['Description', 'Présente ton club…', true]]} bouton="Sauvegarder" />,
      },
      {
        titre: 'Tes stades',
        texte: 'Clique sur « + Ajouter un stade » et renseigne son nom et son adresse. Ajoute-en autant que nécessaire.',
        visuel: <Pile><Formulaire champs={[['Nom du stade', 'Stade Coubertin'], ['Adresse', '1 av. des Sports, Cannes']]} /><Boutons items={['+ Ajouter un stade']} actifs={['+ Ajouter un stade']} /></Pile>,
      },
      {
        titre: 'Logo, couleurs et slogan',
        texte: 'Le bouton « Personnaliser » en haut de l’écran ouvre la page « Mon club », étape « Identité ».',
        points: [
          'Couleur principale et couleur secondaire du club.',
          'Photo de fond (stade, terrain, vestiaire…) et logo du club en grand format.',
          'Slogan du club.',
        ],
        visuel: <Boutons items={['Personnaliser', 'Déconnexion']} actifs={['Personnaliser']} />,
      },
      {
        titre: 'Abonnement et avis',
        texte: 'Plus bas sur la page : l’abonnement du club (le tarif dépend du nombre de licenciés) et les avis laissés par les joueurs et éducateurs affiliés.',
        visuel: <Liste titre="Abonnement club" lignes={[['Statut', <Statut key="s" couleur={c.accent.green}>ACTIF</Statut>], ['Avis reçus', '4,8 / 5']]} />,
      },
    ],
  }),

  categories: () => ({
    titre: 'Catégories & Équipes',
    etapes: [
      {
        titre: 'Crée tes équipes',
        texte: 'Clique sur « + Ajouter une catégorie » : le formulaire « Nouvelle équipe » s’ouvre.',
        points: [
          'Choisis la catégorie (U11, U13…) et la section (masculin / féminin).',
          'Donne la lettre de l’équipe (A, B…).',
          'Choisis l’éducateur responsable, ou « Aucun pour l’instant » s’il n’a pas encore rejoint le club.',
          'Valide avec « Ajouter ».',
        ],
        visuel: <Formulaire champs={[['Catégorie', 'U13'], ['Équipe', 'A'], ['Éducateur responsable', 'Karim B.', true]]} bouton="Ajouter" />,
      },
      {
        titre: 'Lire une catégorie',
        texte: 'Chaque catégorie est une carte, avec une ligne par équipe : son éducateur, son effectif et son bilan victoires / nuls / défaites.',
        visuel: <Liste titre="U13" lignes={[['Équipe A · Karim B.', '18 joueurs'], ['Équipe B · Pas d’éducateur assigné', '12 joueurs']]} />,
      },
      {
        titre: 'Rattacher les joueurs',
        texte: 'Les joueurs arrivent avec l’effectif de leur éducateur. « Auto-assigner les joueurs (équipe A) » rattache d’un coup ceux qui n’ont pas encore d’équipe.',
        astuce: 'Ils vont par défaut dans l’équipe A : ajuste ensuite à la main ceux de l’équipe B.',
        visuel: <Boutons items={['Auto-assigner les joueurs (équipe A)', '+ Ajouter une catégorie']} actifs={['Auto-assigner les joueurs (équipe A)']} />,
      },
    ],
  }),

  educateurs: (c) => ({
    titre: 'Éducateurs',
    etapes: [
      {
        titre: 'Faire venir tes éducateurs',
        texte: 'Deux façons de les inviter depuis cette page :',
        points: [
          'Ton code club : clique sur « Copier » et envoie-le. L’éducateur le saisit depuis son dashboard pour rejoindre le club.',
          'Inviter un éducateur : recherche-le par nom et clique sur « Inviter ». S’il n’a pas de compte, « Ajouter manuellement » (prénom, nom, email) lui envoie une invitation par email.',
        ],
        visuel: <Cartes items={[{ titre: 'Code club', texte: 'Copier et partager', couleur: c.accent.green, icone: '#' }, { titre: 'Inviter', texte: 'Recherche ou email', couleur: c.accent.blue, icone: '@' }]} />,
      },
      {
        titre: 'Valider les demandes',
        texte: 'Les éducateurs qui ont utilisé le code apparaissent dans « En attente de validation ». Clique sur « Accepter » ou « Refuser ».',
        visuel: <Liste titre="En attente de validation" lignes={[['Karim B. · a rejoint via code', <Boutons key="b" items={['Accepter', 'Refuser']} actifs={['Accepter']} />]]} />,
      },
      {
        titre: 'Valider les demandes de fin de saison',
        texte: 'Un éducateur qui veut rester affilié ou prendre la responsabilité d’une catégorie envoie une demande, qui remonte sur cette page. Seuls peuvent la valider le compte principal, le président, le directeur sportif et le responsable de la catégorie concernée.',
      },
      {
        titre: 'Gérer un éducateur',
        texte: 'Dans « Éducateurs affiliés », le menu d’actions de chaque éducateur permet de :',
        points: [
          'Noter l’éducateur ou modifier ses informations.',
          'Régler ses droits sur le Projet Sportif : suivre le réglage du club, autorisé à éditer, ou lecture seule.',
          'Le retirer du club.',
        ],
        visuel: <Boutons items={['Noter', 'Modifier', 'Droits Projet Sportif', 'Retirer']} actifs={['Droits Projet Sportif']} />,
      },
      {
        titre: 'Les séances reçues',
        texte: 'Les fiches de séance envoyées par tes éducateurs arrivent dans « Séances reçues » : tu peux les voir, les analyser ou les transférer au coach Digital Football.',
        visuel: <Boutons items={['Voir', 'Analyser']} actifs={['Voir']} />,
      },
    ],
  }),

  staff: (c) => ({
    titre: 'Staff & permissions',
    etapes: [
      {
        titre: 'Ajoute ton staff',
        texte: 'Dans Mon club, étape « Staff » : directeur sportif, secrétaire, trésorier… partage la gestion du club. Clique sur « Ajouter au staff ».',
        points: [
          'Choisis le rôle attribué.',
          'S’il a déjà un compte : recherche-le dans « Compte existant ».',
          'Sinon : « Inviter par email », saisis son adresse et clique sur « Inviter ».',
        ],
        visuel: <Pile><Formulaire champs={[['Rôle attribué', 'Trésorier'], ['Inviter par email', 'tresorier@club.fr']]} bouton="Inviter" /></Pile>,
      },
      {
        titre: 'Ce que chacun peut faire',
        texte: 'Dans « Mon club », étape « Accès du bureau » (bouton « Accès du bureau » ici), choisis pour chaque rôle, rubrique par rubrique, ce qu’il peut voir et ce qu’il peut modifier, et à quelles catégories d’équipe il a accès.',
        astuce: 'Un membre du staff ne voit dans son menu que les rubriques autorisées.',
        visuel: <Liste titre="Permissions — Trésorier" lignes={[['Budget', <Statut key="b" couleur={c.accent.green}>Voir · Modifier</Statut>], ['Sponsors', <Statut key="s" couleur={c.accent.blue}>Voir</Statut>], ['Sportif', <Statut key="p" couleur={c.text.faint}>Aucun accès</Statut>]]} />,
      },
      {
        titre: 'Retirer un membre',
        texte: 'Le bouton « Retirer » sur la ligne d’un membre lui enlève l’accès au club. Le compte du club garde toujours l’accès complet.',
        visuel: <Boutons items={['Retirer']} actifs={['Retirer']} couleur={c.accent.red} />,
      },
    ],
  }),

  terrains: (c) => ({
    titre: 'Planning des terrains',
    etapes: [
      {
        titre: 'Déclare tes terrains',
        texte: 'Dans « Mes terrains », ajoute chaque terrain avec son nom et son type (foot à 11, foot à 8, 5 contre 5…), puis « Enregistrer ».',
        astuce: 'Le type détermine le découpage : foot à 11 = un demi-terrain par équipe, foot à 8 et 5 contre 5 = jusqu’à 5 groupes.',
        visuel: <Formulaire champs={[['Nom', 'Terrain principal'], ['Type', 'Foot à 11']]} bouton="Enregistrer" />,
      },
      {
        titre: 'Affecte les créneaux',
        texte: 'Clique sur « + Affecter un terrain » : terrain, équipe, éducateur, jour, heure de début et de fin, et zone du terrain.',
        astuce: 'Tu peux aussi tout importer d’un coup avec « Import Excel / CSV ».',
        visuel: <Formulaire champs={[['Terrain', 'Terrain principal'], ['Équipe', 'U15 A'], ['Jour', 'Mercredi'], ['Zone', 'Demi-terrain gauche'], ['Début', '17:00'], ['Fin', '18:30']]} bouton="+ Affecter un terrain" />,
      },
      {
        titre: 'Repère les conflits',
        texte: 'Navigue de semaine en semaine. Le planning signale un terrain ou une zone déjà occupés à un horaire, et affiche les matchs.',
        visuel: <Etapes items={[{ texte: 'Libre', couleur: c.accent.green }, { texte: 'Zone occupée', couleur: c.accent.amber }, { texte: 'Terrain déjà occupé', couleur: c.accent.red }]} />,
      },
    ],
  }),

  deplacements: () => ({
    titre: 'Déplacements',
    etapes: [
      {
        titre: 'Les déplacements se créent tout seuls',
        texte: 'Chaque match à l’extérieur saisi par un éducateur crée automatiquement son déplacement. Tu peux aussi en ajouter un pour un tournoi, un stage…',
        visuel: <Onglets items={['Match', 'Tournoi', 'Stage', 'Autre']} actif="Match" />,
      },
      {
        titre: 'Horaires calculés automatiquement',
        texte: 'Renseigne la ville de destination et l’heure du coup d’envoi : l’heure de départ et l’heure de retour estimée sont calculées pour toi.',
        visuel: <Formulaire champs={[['Ville de destination', 'Nice'], ['Coup d’envoi', '15:00'], ['Heure de départ', '13:05'], ['Retour estimé', '18:10']]} />,
      },
      {
        titre: 'Ton parc de véhicules',
        texte: 'Ajoute tes mini-bus dans « Parc de véhicules » : plaque, capacité, marque / modèle et dates de contrôle technique.',
        visuel: <Formulaire champs={[['Plaque', 'AB-123-CD'], ['Capacité', '9'], ['Dernier CT', '03/2026'], ['Prochain CT', '03/2028']]} />,
      },
      {
        titre: 'Véhicule, conducteur et kilomètres',
        texte: 'Sur chaque déplacement, assigne un véhicule et un conducteur, et note les kilomètres et le gasoil au départ. Au retour, l’éducateur peut saisir lui-même les kilomètres et le gasoil.',
        visuel: <Formulaire champs={[['Véhicule', 'AB-123-CD'], ['Conducteur', 'Karim B.'], ['Km avant départ', '48 210'], ['Gasoil avant départ', '4/4']]} />,
      },
    ],
  }),

  classements: (c) => ({
    titre: 'Stat équipe',
    etapes: [
      {
        titre: 'Choisis une équipe',
        texte: 'Sélectionne l’équipe en haut de la page : son bilan s’affiche (matchs joués, clean sheets, stats détaillées) avec ses derniers résultats.',
        visuel: <Onglets items={['U11 A', 'U13 A', 'U15 A', 'U18 A']} actif="U13 A" couleur={c.accent.green} />,
      },
      {
        titre: 'Le classement officiel',
        texte: 'Le lien « Voir le classement sur le site de la ligue » apparaît quand l’éducateur l’a renseigné dans son dashboard (onglet Compétition).',
        visuel: <Boutons items={['Voir le classement sur le site de la ligue ↗']} actifs={['Voir le classement sur le site de la ligue ↗']} />,
      },
      {
        titre: 'Le classement des joueurs',
        texte: 'Classe les joueurs de l’équipe selon le critère de ton choix. Les joueurs doivent être rattachés à l’équipe par leur éducateur pour apparaître.',
        visuel: <Onglets items={['Buteurs', 'Passeurs', 'Matchs joués', 'Présence', 'Points séance', 'Note éducateur']} actif="Buteurs" couleur={c.accent.green} />,
      },
    ],
  }),

  budget: (c) => ({
    titre: 'Budget',
    etapes: [
      {
        titre: 'Ajouter une recette ou une dépense',
        texte: 'Clique sur « Nouvelle entrée », choisis Recette ou Dépense, puis la catégorie, le montant et une description. Termine par « Enregistrer ».',
        points: [
          'Recettes : cotisations, subvention, sponsor, vente, don…',
          'Dépenses : équipement, transport, arbitrage, licences, matériel…',
        ],
        visuel: <Formulaire champs={[['Type', 'Recette'], ['Catégorie', 'Cotisations'], ['Montant (€)', '1 200'], ['Description', 'Cotisations U13']]} bouton="Enregistrer" />,
      },
      {
        titre: 'Suivre les comptes',
        texte: 'Choisis la période (ce mois, cette saison, tout) : recettes, dépenses et solde se mettent à jour, avec l’historique et la répartition par catégorie.',
        astuce: 'Les frais d’inscription saisis dans un tournoi sont ajoutés automatiquement au budget.',
        visuel: <Pile><Onglets items={['Ce mois', 'Cette saison', 'Tout']} actif="Cette saison" /><Liste titre="Cette saison" lignes={[['Recettes', <b key="r" style={{ color: c.accent.green }}>12 400 €</b>], ['Dépenses', <b key="d" style={{ color: c.accent.red }}>9 850 €</b>], ['Solde', <b key="s">2 550 €</b>]]} /></Pile>,
      },
    ],
  }),

  sponsors: (c) => ({
    titre: 'Sponsors',
    etapes: [
      {
        titre: 'Ajouter un sponsor',
        texte: 'Clique sur « + Ajouter un sponsor » : entreprise, type de partenariat, contact, niveau, montant du contrat, dates de signature et de fin.',
        astuce: 'Le logo ou la bannière du sponsor s’affichent dans le bandeau partenaires de l’app, vu par tes éducateurs et joueurs.',
        visuel: <Formulaire champs={[['Entreprise *', 'Boulangerie Martin'], ['Type de partenariat', 'Maillot'], ['Niveau', 'Or'], ['Montant du contrat (€)', '1 500']]} bouton="+ Ajouter un sponsor" />,
      },
      {
        titre: 'Suivre les paiements',
        texte: 'Sur la fiche d’un sponsor, « + Paiement » enregistre chaque versement : le reçu et le reste à payer se calculent tout seuls. À l’échéance, propose un renouvellement.',
        visuel: <Liste titre="Boulangerie Martin" lignes={[['Contrat', '1 500 €'], ['Reçu', '1 000 €'], ['Reste', <Statut key="r" couleur={c.accent.amber}>500 €</Statut>]]} />,
      },
      {
        titre: 'Prospecter',
        texte: '« + Nouveau prospect » suit une entreprise que tu démarches, étape par étape. Note chaque échange (appel, email, rendez-vous) et fixe une date de relance.',
        astuce: 'Prospect gagné ? « Créer la fiche sponsor signé » le transforme en sponsor sans tout ressaisir.',
        visuel: <Etapes items={[{ texte: 'Contacté', couleur: c.accent.blue }, { texte: 'Négociation', couleur: c.accent.amber }, { texte: 'Gagné', couleur: c.accent.green }]} />,
      },
      {
        titre: 'Les autres onglets',
        texte: 'Niveaux de partenariat, contreparties à livrer, offres, valorisation et statistiques : tout le suivi commercial du club.',
        visuel: <Onglets items={['Tableau de bord', 'Sponsors', 'Contreparties', 'Niveaux', 'Offres', 'Statistiques']} actif="Sponsors" />,
      },
    ],
  }),

  newsletter: (c) => ({
    titre: 'Newsletter',
    etapes: [
      {
        titre: 'Écrire une communication',
        texte: 'Dans « Nouvelle communication », choisis à qui l’envoyer, écris un objet et ton message, puis envoie.',
        points: [
          'Destinataires : tout le monde, les éducateurs ou les joueurs affiliés au club.',
          'Le message est publié dans l’app et envoyé par email en même temps.',
        ],
        visuel: <Pile><Onglets items={['Tout le monde', 'Éducateurs', 'Joueurs']} actif="Tout le monde" /><Formulaire colonnes={1} champs={[['Objet / Titre', 'Reprise des entraînements'], ['Contenu du message', 'Bonjour à tous…']]} /></Pile>,
      },
      {
        titre: 'Mesurer la lecture',
        texte: 'Les statistiques montrent le nombre d’envois, de lectures et le taux de lecture moyen. L’historique garde toutes tes communications.',
        visuel: <Liste titre="Statistiques" lignes={[['Envois', '12'], ['Membres', '184'], ['Taux de lecture moyen', <Statut key="t" couleur={c.accent.green}>72 %</Statut>]]} />,
      },
    ],
  }),

  inventaire: (c) => ({
    titre: 'Inventaire',
    etapes: [
      {
        titre: 'Les packs d’équipement',
        texte: 'Crée un pack avec « + Nouveau pack » (maillot, short, survêtement…) et ses champs de taille. Attribue-le ensuite aux joueurs et au staff.',
        visuel: <Boutons items={['+ Nouveau pack', '+ Champ de taille']} actifs={['+ Nouveau pack']} />,
      },
      {
        titre: 'Suivre la remise',
        texte: 'Pour chaque personne, suis où en est son équipement : tailles en attente, prêt à remettre, puis remis.',
        astuce: 'Un joueur doit avoir un compte lié pour recevoir un pack.',
        visuel: <Etapes items={[{ texte: 'Tailles en attente', couleur: c.accent.amber }, { texte: 'Prêt à remettre', couleur: c.accent.blue }, { texte: 'Remis', couleur: c.accent.green }]} />,
      },
      {
        titre: 'Stock et distribution de matériel',
        texte: '« Gérer le catalogue » tient le stock du club. « Distribuer du matériel » confie des articles à un éducateur pour une équipe et une saison ; au retour, valide ou refuse le rendu.',
        visuel: <Formulaire champs={[['Éducateur', 'Karim B.'], ['Équipe', 'U15 A'], ['Saison', '2026-2027'], ['Article', 'Ballons ×10']]} bouton="+ Ajouter au panier" />,
      },
    ],
  }),

  planning: (c) => ({
    titre: 'Planning',
    etapes: [
      {
        titre: 'Tout le club sur un calendrier',
        texte: 'Le planning réunit les matchs de toutes les équipes, les événements et les projets du club. Change de vue et navigue avec « Précédent », « Suivant » et « Aujourd’hui ».',
        visuel: <Onglets items={['Jour', 'Semaine', 'Mois', 'Année']} actif="Semaine" />,
      },
      {
        titre: 'Ce qui y apparaît',
        texte: 'Les matchs sont repris automatiquement depuis les dashboards éducateurs. Un événement apparaît si l’option « Afficher sur le planning du club » est cochée dans Événements & Projets.',
        visuel: <Cartes items={[{ titre: 'Matchs', texte: 'Toutes les équipes', couleur: c.accent.green, icone: 'M' }, { titre: 'Événements', texte: 'Tournois, réunions…', couleur: c.accent.blue, icone: 'E' }, { titre: 'Projets', texte: 'Suivi des projets', couleur: c.accent.amber, icone: 'P' }]} />,
      },
    ],
  }),

  seances: () => ({
    titre: 'Planifier séance',
    etapes: [
      {
        titre: 'Choisis l’équipe',
        texte: 'Sélectionne une équipe : seules celles qui ont un éducateur affecté (dans Catégories & Équipes) sont proposées.',
        visuel: <Onglets items={['U11 A', 'U13 A', 'U15 A']} actif="U13 A" />,
      },
      {
        titre: 'Toute la saison d’un coup',
        texte: '« Générer une saison » : indique les jours et heures d’entraînement, toutes les séances de la saison sont créées.',
        visuel: <Pile><Onglets items={['Générer une saison', 'Séance ponctuelle']} actif="Générer une saison" /><Formulaire champs={[['Jours', 'Mardi · Jeudi'], ['Heure', '18:00']]} /></Pile>,
      },
      {
        titre: 'Ou une séance ponctuelle',
        texte: '« Séance ponctuelle » : date, heure, lieu et thème. La séance apparaît directement dans le planning de l’éducateur de l’équipe.',
        visuel: <Formulaire champs={[['Date *', '04/11/2026'], ['Heure', '18:00'], ['Lieu', 'Stade municipal'], ['Thème', 'Conservation du ballon']]} />,
      },
      {
        titre: 'Repartir à zéro en début de saison',
        texte: 'Les séances des saisons passées sont masquées par défaut. Rien n’est supprimé : le bouton « Voir les séances des saisons passées » les réaffiche, et la présence à l’entraînement reste dans l’historique.',
      },
    ],
  }),

  projet_sportif: (c) => ({
    titre: 'Projet Sportif',
    etapes: [
      {
        titre: 'Le projet de jeu du club',
        texte: 'Les onglets regroupent tout le projet sportif : catégories et stats, principes de jeu, zones de terrain, planification annuelle et règles du jeu.',
        visuel: <Onglets items={['Catégories & Stats', 'Principes de jeu', 'Zones de terrain', 'Planification annuelle', 'Règles du jeu']} actif="Principes de jeu" />,
      },
      {
        titre: 'Principes de jeu et zones',
        texte: 'Pour chaque phase (organisation offensive et défensive, transitions, coups de pied arrêtés), écris tes principes. Dessine les zones clés du terrain et les schémas de CPA.',
        visuel: <Onglets items={['Organisation offensive', 'Organisation défensive', 'Transition offensive', 'Transition défensive', 'Coups de pied arrêtés']} actif="Organisation offensive" couleur={c.accent.green} />,
      },
      {
        titre: 'Règles du jeu',
        texte: 'Ajoute les documents officiels de chaque catégorie (FFF, Ligue) avec « Ajouter un document » : titre, lien et saison.',
        visuel: <Formulaire champs={[['Titre', 'Règlements FFF U13'], ['Saison', '2026-2027'], ['Lien URL', 'https://fff.fr/…', true]]} bouton="Ajouter un document" />,
      },
      {
        titre: 'Droits des éducateurs',
        texte: 'En haut de la page, choisis si tes éducateurs peuvent éditer le Projet Sportif et la Planification annuelle. Par défaut, ils consultent sans modifier.',
        astuce: 'Un réglage individuel reste possible depuis Éducateurs (menu d’actions).',
        visuel: <Boutons items={['Éditer le Projet Sportif', 'Éditer la Planification annuelle']} actifs={['Éditer le Projet Sportif']} />,
      },
    ],
  }),

  tournoi: () => ({
    titre: 'Tournois',
    etapes: [
      {
        titre: 'Les tournois de tes équipes',
        texte: 'Dans « Nos tournois », clique sur « + Ajouter un tournoi » : nom, équipe, dates, lieu, organisateur et frais d’inscription.',
        astuce: 'Les frais d’inscription sont ajoutés automatiquement au budget du club.',
        visuel: <Pile><Onglets items={['Nos tournois', 'On organise']} actif="Nos tournois" /><Formulaire champs={[['Nom', 'Tournoi de Cannes U18'], ['Équipe', 'U18 A']]} bouton="+ Ajouter un tournoi" /></Pile>,
      },
      {
        titre: 'La fiche du tournoi',
        texte: 'Chaque tournoi a trois volets :',
        points: [
          'Aperçu : les infos et les matchs (« Ajouter un match » : adversaire, phase, score, buteurs).',
          'Logistique : présence des joueurs, transport, heure et lieu de rendez-vous, budget.',
          'Bilan : victoires, nuls, défaites, classement obtenu, trophée et buteurs.',
        ],
        visuel: <Onglets items={['Aperçu', 'Logistique', 'Bilan']} actif="Logistique" />,
      },
      {
        titre: 'Organiser ton tournoi',
        texte: 'L’onglet « On organise » sert aux tournois que le club accueille : création, planning des matchs, résultats et classement.',
        visuel: <Onglets items={['Nos tournois', 'On organise']} actif="On organise" />,
      },
    ],
  }),

  evenements: (c) => ({
    titre: 'Événements & Projets',
    etapes: [
      {
        titre: 'Créer un événement',
        texte: 'Clique sur « + Nouvel événement » : titre, date, heure, lieu et type (tournoi, soirée, réunion…).',
        points: [
          'Ajoute les référents et les participants invités.',
          'Liste les ressources matérielles nécessaires.',
          'Crée des missions avec un responsable, un objectif et la façon de faire.',
        ],
        visuel: <Formulaire champs={[['Titre', 'Tournoi U13'], ['Type', 'Tournoi'], ['Date', '14/12/2026'], ['Lieu', 'Stade municipal']]} bouton="Sauvegarder" />,
      },
      {
        titre: 'Récurrence et visibilité',
        texte: 'Un événement peut se répéter chaque semaine, mois ou année, et s’afficher sur le planning du club. Le bouton « PDF » exporte la fiche.',
        visuel: <Onglets items={['Chaque semaine', 'Chaque mois', 'Chaque année']} actif="Chaque mois" />,
      },
      {
        titre: 'Suivre un projet',
        texte: '« + Nouveau projet » : objectif, dates, responsable et référents. Fais évoluer son statut au fil de l’avancement.',
        visuel: <Etapes items={[{ texte: 'En attente', couleur: c.accent.amber }, { texte: 'En cours', couleur: c.accent.blue }, { texte: 'Terminé', couleur: c.accent.green }]} />,
      },
    ],
  }),

  projet_club_cff4: (c) => ({
    titre: 'Projet Club — CFF4',
    etapes: [
      {
        titre: 'Le guide du projet club',
        texte: 'Cette rubrique suit le guide FFF de la certification CFF4 : remplis les onglets dans l’ordre, chacun s’enregistre au fur et à mesure.',
        visuel: <Onglets items={['Identité', 'Diagnostic', 'Objectifs', 'Suivi']} actif="Identité" />,
      },
      {
        titre: 'Identité et diagnostic',
        texte: 'Identité : valeurs, slogan, état civil du club et bureau. Diagnostic : points forts et opportunités, points faibles et menaces, et la vision globale du club.',
        visuel: <Cartes items={[{ titre: 'Points +', texte: 'Opportunités', couleur: c.accent.green, icone: '+' }, { titre: 'Points -', texte: 'Menaces', couleur: c.accent.red, icone: '-' }]} />,
      },
      {
        titre: 'Les fiches action',
        texte: '« + Nouvelle fiche action » : sous-projet (associatif, sportif, éducatif), intitulé, responsable, public concerné, mois au calendrier et budget.',
        visuel: <Formulaire champs={[['Sous-projet', 'Sportif'], ['Intitulé de l’action *', 'Tournoi de recrutement U8-U11', true], ['Statut', 'Planifiée'], ['Mois', 'Mai']]} bouton="Ajouter" />,
      },
      {
        titre: 'Le bilan',
        texte: 'Une fois l’action réalisée, compare l’avant et l’après : objectifs atteints, budget respecté, action reconductible, points positifs et à améliorer.',
        visuel: <Etapes items={[{ texte: 'Planifiée', couleur: c.accent.amber }, { texte: 'En cours', couleur: c.accent.blue }, { texte: 'Réalisée', couleur: c.accent.green }]} />,
      },
    ],
  }),

  taches: (c) => ({
    titre: 'Tâches & Responsabilités',
    etapes: [
      {
        titre: 'Qui fait quoi',
        texte: '« Responsabilités récurrentes » : pour chaque domaine (communication, terrains…), décris la responsabilité et désigne qui s’en charge.',
        astuce: 'Le responsable peut être un membre du club ou une personne hors plateforme.',
        visuel: <Formulaire champs={[['Domaine', 'Terrains'], ['Responsabilité', 'Gérer les réservations'], ['Responsable', 'Karim B.', true]]} bouton="Ajouter" />,
      },
      {
        titre: 'Les tâches ponctuelles',
        texte: '« Tâches ponctuelles » : un titre, une échéance et un responsable. Fais avancer leur statut jusqu’à « Terminée ».',
        visuel: <Etapes items={[{ texte: 'À faire', couleur: c.accent.amber }, { texte: 'En cours', couleur: c.accent.blue }, { texte: 'Terminée', couleur: c.accent.green }]} />,
      },
    ],
  }),

  // Les étapes de Mon club (clé = mon_club_ + id de l'étape) : Staff et Organigramme
  // gardent leurs tutoriels ci-dessus.
  mon_club_identite: (c) => ({
    titre: 'Identité du club',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'C’est la première chose que voient tes joueurs et tes éducateurs en ouvrant leur espace : tes couleurs, ta photo, ton logo et ton slogan. Un club reconnaissable inspire confiance et donne envie de s’investir.',
        astuce: 'Chaque réglage s’applique tout de suite, sans quitter la page.',
        visuel: <Cartes items={[{ titre: 'Couleurs', texte: 'Principale et secondaire', couleur: c.accent.green, icone: '◐' }, { titre: 'Images', texte: 'Fond et logo', couleur: c.accent.blue, icone: '▣' }, { titre: 'Slogan', texte: 'Une phrase courte', couleur: c.accent.amber, icone: '“' }]} />,
      },
      {
        titre: 'Choisis tes couleurs',
        texte: 'Clique sur le carré de la couleur principale puis de la couleur secondaire : toutes les couleurs sont possibles.',
        points: [
          'Un aperçu montre le rendu tel que tes joueurs et éducateurs le verront.',
          'Clique sur « Appliquer cette couleur » pour l’enregistrer.',
          'Si une couleur est trop claire ou trop sombre pour rester lisible, elle est ajustée automatiquement.',
        ],
        visuel: <Pile><Formulaire champs={[['Couleur principale', '#1E8E3E'], ['Couleur secondaire', '#F5B700']]} /><Boutons items={['Appliquer cette couleur']} actifs={['Appliquer cette couleur']} /></Pile>,
      },
      {
        titre: 'Ajoute ta photo, ton logo et ton slogan',
        texte: 'La photo de fond (stade, terrain, vestiaire…) et le logo s’enregistrent dès que tu choisis le fichier. Le slogan est une phrase courte affichée sur l’accueil de tes joueurs et de tes éducateurs.',
        astuce: 'Choisis une photo nette et lumineuse : elle sert de décor à tout l’accueil.',
        visuel: <Formulaire colonnes={1} champs={[['Slogan du club', 'Ensemble, on va plus loin']]} bouton="Enregistrer" />,
      },
    ],
  }),

  mon_club_outils: (c) => ({
    titre: 'Outils du club',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'Ton forfait inclut plusieurs outils. Un menu trop chargé perd tes équipes : ici, tu gardes à l’écran seulement ce que ton club utilise vraiment.',
        astuce: 'Rien n’est supprimé : un outil retiré garde toutes ses données et revient dès que tu le réaffiches.',
        visuel: <Etapes items={[{ texte: 'Affiché', couleur: c.accent.green }, { texte: 'Retiré du menu', couleur: c.accent.amber }, { texte: 'Données gardées', couleur: c.accent.blue }]} />,
      },
      {
        titre: 'Affiche ou retire un outil',
        texte: 'Chaque outil a son interrupteur. Éteint, il disparaît du menu du club et reste fermé à tes éducateurs.',
        points: [
          'Seul le compte du club active ou désactive les outils de son forfait : les autres membres du bureau voient leur état.',
          'Un bandeau « Annuler » s’affiche quelques secondes après chaque changement.',
        ],
        visuel: <Liste titre="Outils affichés" lignes={[['Budget', <Statut key="b" couleur={c.accent.green}>Affiché</Statut>], ['Inventaire', <Statut key="i" couleur={c.text.faint}>Retiré</Statut>]]} />,
      },
      {
        titre: 'Pars d’un modèle',
        texte: 'En haut de la page, les modèles de départ (Club compétition, École de foot / formation, Minimal, Tout afficher) règlent d’un coup les outils du club et le menu de tes éducateurs.',
        points: [
          'Un clic montre ce qui va changer, « Appliquer » le fait, « Ne pas appliquer » laisse tout tel quel.',
          'Aucun outil payant n’est acheté ni activé.',
          'Tes éducateurs sont prévenus dans leur cloche.',
        ],
        visuel: <Boutons items={['Appliquer', 'Ne pas appliquer']} actifs={['Appliquer']} />,
      },
    ],
  }),

  mon_club_educateurs: (c) => ({
    titre: 'Dashboard de mes éducateurs',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'Un éducateur qui trouve tout de suite ce dont il a besoin l’utilise davantage. Ici, tu choisis les entrées du menu que tes éducateurs voient, pour qu’ils ne voient que l’essentiel.',
        astuce: 'Retirer une entrée enlève seulement son accès dans le menu : rien n’est supprimé.',
        visuel: <Liste titre="Menu de l’éducateur" lignes={[['Mon équipe', <Statut key="e" couleur={c.accent.green}>Affiché</Statut>], ['Rapports & Évaluations', <Statut key="r" couleur={c.accent.amber}>Retiré</Statut>]]} />,
      },
      {
        titre: 'Même menu pour tous, ou éducateur par éducateur',
        texte: 'Choisis le mode de réglage.',
        points: [
          '« Le même pour tous » : tous tes éducateurs voient le même menu. C’est le plus simple.',
          '« Individualisé » : tu règles le menu éducateur par éducateur. Au départ, chacun suit le réglage commun.',
          'Quand tu repasses en « Le même pour tous », tes réglages individuels sont gardés de côté.',
        ],
        visuel: <Onglets items={['Le même pour tous', 'Individualisé']} actif="Le même pour tous" />,
      },
      {
        titre: 'Vérifie avant de valider',
        texte: 'Le bouton « Voir comme un éducateur » ouvre un aperçu de son menu tel qu’il le verra. Chaque changement apparaît dans le journal et peut être annulé.',
        astuce: 'Un outil qu’un éducateur paie lui-même reste toujours affiché pour lui.',
        visuel: <Boutons items={['Voir comme un éducateur']} actifs={['Voir comme un éducateur']} />,
      },
    ],
  }),

  mon_club_bureau: (c) => ({
    titre: 'Accès du bureau',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'Le budget, les sponsors ou les déplacements ne sont pas faits pour tout le monde. Cette page fixe ce que chaque rôle du bureau (directeur sportif, trésorier, secrétaire…) peut voir et modifier. Le président voit et modifie tout.',
        astuce: 'Cette étape est réservée au président.',
        visuel: <Liste titre="Trésorier" lignes={[['Budget', <Statut key="b" couleur={c.accent.green}>Voir · Modifier</Statut>], ['Sponsors', <Statut key="s" couleur={c.accent.blue}>Voir</Statut>]]} />,
      },
      {
        titre: 'Règle ce que chaque rôle peut faire',
        texte: 'Dans « Ce que chaque rôle peut faire », coche pour chaque rubrique si le rôle peut la voir et la modifier.',
        points: [
          'Donne à chacun uniquement ce dont il a besoin.',
          '« Mon club » : le rôle coché voit les étapes Identité, Outils du club et Dashboard de mes éducateurs.',
          'Staff et Organigramme se règlent séparément, avec leur propre case.',
        ],
        visuel: <Liste titre="Ce que chaque rôle peut faire" lignes={[['Mon club', <Statut key="m" couleur={c.text.faint}>Aucun accès</Statut>], ['Staff', <Statut key="s" couleur={c.accent.blue}>Voir</Statut>]]} />,
      },
      {
        titre: 'Limite par catégorie, puis enregistre',
        texte: 'Dans « Accès par catégorie d’équipe », limite les catégories visibles pour les rôles sans accès complet (par exemple U15 à U20 pour un responsable formation).',
        points: [
          'Rien ne change tant que tu n’as pas cliqué sur « Enregistrer ».',
          '« Annuler mes changements » revient à l’état enregistré.',
        ],
        visuel: <Boutons items={['Enregistrer', 'Annuler mes changements']} actifs={['Enregistrer']} />,
      },
    ],
  }),

  mon_club_journal: (c) => ({
    titre: 'Journal des changements',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'Quand tu règles le menu de tes éducateurs, tu dois pouvoir retrouver qui a changé quoi, et revenir en arrière si besoin. Le journal garde l’historique, du plus récent au plus ancien.',
        astuce: 'Les changements apparaissent ici quelques secondes après un réglage de l’étape « Dashboard de mes éducateurs ».',
        visuel: <Liste titre="Journal" lignes={[['Aujourd’hui, 18:02', <Statut key="a" couleur={c.accent.blue}>Menu modifié</Statut>], ['Hier, 09:40', <Statut key="b" couleur={c.accent.blue}>Menu modifié</Statut>]]} />,
      },
      {
        titre: 'Rétablis un changement',
        texte: 'Le bouton « Rétablir » remet le menu comme il était avant ce changement.',
        points: [
          'Rien n’est supprimé : le rétablissement s’ajoute à l’historique.',
          'Tes éducateurs sont prévenus dans leur cloche.',
          'Seul le compte du club peut rétablir un changement, les autres membres du bureau consultent l’historique.',
        ],
        visuel: <Boutons items={['Rétablir']} actifs={['Rétablir']} />,
      },
    ],
  }),

  accueil: (c) => ({
    titre: 'Accueil du club',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'L’accueil te donne la vie du club en un coup d’œil : ce qui demande ton action et ce qui arrive cette semaine. C’est la page à ouvrir en premier.',
        visuel: <Cartes items={[{ titre: 'Équipes', texte: 'Actives et éducateurs affiliés', couleur: c.accent.green, icone: '⚽' }, { titre: 'Matchs', texte: 'À venir et derniers résultats', couleur: c.accent.blue, icone: '▶' }, { titre: 'Planning', texte: 'La semaine du club', couleur: c.accent.amber, icone: '▦' }]} />,
      },
      {
        titre: 'Traite ce qui attend',
        texte: 'Quand un éducateur demande à rejoindre le club, une alerte s’affiche avec un bouton « Traiter » qui ouvre la page Éducateurs.',
        astuce: 'Plus tu réponds vite, plus vite l’éducateur peut travailler avec ses joueurs.',
        visuel: <Boutons items={['Traiter']} actifs={['Traiter']} />,
      },
      {
        titre: 'Suis la semaine et va plus vite',
        texte: 'Le planning de la semaine, les terrains disponibles, les prochains matchs et les derniers résultats sont regroupés ici. « Tout le planning » ouvre le calendrier complet, et les actions rapides t’emmènent directement vers les pages utiles.',
        visuel: <Boutons items={['Tout le planning']} actifs={['Tout le planning']} />,
      },
    ],
  }),

  recrutement: (c) => ({
    titre: 'Recrutement',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'Un joueur de plus au bon poste peut changer ta saison. Le moteur de recrutement te fait gagner du temps : tu cherches parmi les joueurs de la plateforme avec leurs vraies statistiques.',
        visuel: <Cartes items={[{ titre: 'Filtres', texte: 'Poste, région, niveau', couleur: c.accent.green, icone: '⌕' }, { titre: 'Statistiques', texte: 'Buts, passes, duels…', couleur: c.accent.blue, icone: '%' }]} />,
      },
      {
        titre: 'Trouve les bons profils',
        texte: 'Choisis le poste, la région, le niveau et la catégorie, puis fixe des minimums de statistiques si tu veux.',
        points: [
          'Trie les résultats par buts, passes décisives, km parcourus, pourcentage de passes ou de duels, récupérations, arrêts ou matchs joués.',
          'Le statut du joueur (par exemple « Recherche active ») te dit s’il est ouvert à une proposition.',
        ],
        visuel: <Formulaire champs={[['Poste', 'Milieu'], ['Région', 'Occitanie'], ['Niveau', 'Régional 1'], ['Trier', 'Buts/m']]} />,
      },
      {
        titre: 'Ouvre la fiche et contacte',
        texte: 'Clique sur un joueur pour voir ses 5 derniers matchs et son détail. Si une information manque, « Demander le détail au joueur » lui envoie une demande : c’est lui qui décide de partager. « Contacter ce joueur » ouvre un message.',
        astuce: 'Présente-toi et explique ce que tu proposes : un message précis reçoit plus souvent une réponse.',
        visuel: <Boutons items={['Demander le détail au joueur', 'Contacter ce joueur']} actifs={['Contacter ce joueur']} />,
      },
    ],
  }),

  stages: (c) => ({
    titre: 'Stages',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'Un stage bien organisé fait rentrer des familles dans le club et de l’argent dans la caisse. Ici, tu prépares tout au même endroit : planning, inscriptions et page publique pour les familles.',
        visuel: <Etapes items={[{ texte: 'Brouillon', couleur: c.text.faint }, { texte: 'Ouvert', couleur: c.accent.green }, { texte: 'Complet', couleur: c.accent.amber }, { texte: 'Terminé', couleur: c.accent.blue }]} />,
      },
      {
        titre: 'Crée ton stage',
        texte: 'Clique sur « + Nouveau stage » et renseigne le nom, les dates, le lieu et le nombre de places par jour.',
        points: [
          'Ajoute une description, le règlement affiché aux familles et le matériel à apporter.',
          'Le stage démarre en « Brouillon » : seule l’équipe du club le voit.',
        ],
        visuel: <Pile><Formulaire champs={[['Nom du stage', 'Stage de Toussaint U11-U13'], ['Date de début', '21/10'], ['Date de fin', '25/10'], ['Places par jour', '40']]} /><Boutons items={['+ Nouveau stage']} actifs={['+ Nouveau stage']} /></Pile>,
      },
      {
        titre: 'Construis le programme',
        texte: 'Dans la fiche du stage, les onglets couvrent tout : Vue d’ensemble, Inscriptions, Planning, Organisation, Actualités, Sponsors, Offres & tarifs et Paramètres.',
        points: [
          'Planning : « + Ajouter un créneau » (activité, responsable, plan B en cas de pluie). « Dupliquer une journée » évite de tout resaisir.',
          'Organisation : les tâches, les encadrants et le matériel.',
        ],
        visuel: <Onglets items={['Vue d’ensemble', 'Inscriptions', 'Planning', 'Organisation']} actif="Planning" />,
      },
      {
        titre: 'Ouvre aux familles',
        texte: 'Passe le stage en « Ouvert » : la page publique devient accessible, avec un lien à partager aux parents et aux joueurs.',
        astuce: 'Le plan B et les notes restent internes : ils n’apparaissent jamais sur la page publique.',
        visuel: <Boutons items={['Ouvrir la page']} actifs={['Ouvrir la page']} />,
      },
    ],
  }),

  mes_outils: (c) => ({
    titre: 'Mes outils',
    etapes: [
      {
        titre: 'Pourquoi c’est important',
        texte: 'C’est ici que tu gères ton abonnement et que tu décides quels outils apparaissent sur le dashboard du club. Ils sont tous inclus dans ton forfait, sans supplément.',
        astuce: 'Seul le compte du club peut modifier ces choix. Les autres membres du bureau les consultent.',
        visuel: <Liste titre="Abonnement club" lignes={[['Statut', <Statut key="s" couleur={c.accent.green}>ACTIF</Statut>]]} />,
      },
      {
        titre: 'Affiche ou retire un outil',
        texte: 'Chaque outil a une carte avec un interrupteur. Retiré, il disparaît du menu du club, mais ses données restent et reviennent dès que tu le réactives.',
        visuel: <Liste titre="Outils du club" lignes={[['Budget', <Statut key="b" couleur={c.accent.green}>Affiché</Statut>], ['Inventaire', <Statut key="i" couleur={c.text.faint}>Retiré</Statut>]]} />,
      },
      {
        titre: 'Ouvre des outils à tes éducateurs',
        texte: 'Dans « Outils pour mes éducateurs », choisis ceux que tes éducateurs affiliés peuvent utiliser. Active d’abord l’outil sur ton propre dashboard.',
        astuce: 'Pour régler ce que chaque éducateur voit dans son menu, va dans Mon club, étape « Dashboard de mes éducateurs ».',
        visuel: <Etapes items={[{ texte: 'Ouvert à tes éducateurs', couleur: c.accent.green }, { texte: 'Fermé pour tes éducateurs', couleur: c.text.faint }]} />,
      },
    ],
  }),

  organigramme: () => ({
    titre: 'Organigramme',
    etapes: [
      {
        titre: 'Ajouter un membre',
        texte: 'Clique sur « + Ajouter un membre » : prénom, nom, rôle, département et supérieur hiérarchique. La hiérarchie du club se construit automatiquement.',
        visuel: <Formulaire champs={[['Prénom', 'Sophie'], ['Nom', 'Durand'], ['Rôle', 'Secrétaire'], ['Supérieur hiérarchique', 'Président']]} bouton="Ajouter" />,
      },
      {
        titre: 'Importer ou scanner',
        texte: 'Pour aller plus vite : « Import depuis Excel / CSV » (colonnes Nom, Prénom, Rôle, Département, Supérieur, Email, Téléphone) ou « Scanner un organigramme » existant.',
        astuce: 'Attention : l’import remplace l’organigramme actuel.',
        visuel: <Boutons items={['+ Ajouter un membre', 'Import depuis Excel / CSV', 'Scanner un organigramme']} actifs={['Import depuis Excel / CSV']} />,
      },
      {
        titre: 'Éducateurs et parents',
        texte: 'Les onglets Éducateurs et Parents listent automatiquement les éducateurs affiliés et les parents rattachés aux joueurs.',
        visuel: <Onglets items={['Direction', 'Éducateurs', 'Parents']} actif="Direction" />,
      },
    ],
  }),
}

export const PAGES_TUTORIEL_CLUB = Object.keys(TUTORIELS)

export function TutorielClub({ page, accent, onFermer }) {
  const colors = useColors()
  const tuto = TUTORIELS[page]?.(colors)
  if (!tuto) return null
  return <TutorielModal titre={tuto.titre} etapes={tuto.etapes} accent={accent || colors.accent.green} onFermer={onFermer} />
}
