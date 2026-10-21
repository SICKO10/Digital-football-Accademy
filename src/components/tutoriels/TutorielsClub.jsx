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
        texte: 'Le bouton « Personnaliser » en haut de l’écran (compte président) ouvre la personnalisation du dashboard.',
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
        texte: 'Directeur sportif, secrétaire, trésorier… partage la gestion du club. Clique sur « Ajouter au staff ».',
        points: [
          'Choisis le rôle attribué.',
          'S’il a déjà un compte : recherche-le dans « Compte existant ».',
          'Sinon : « Inviter par email », saisis son adresse et clique sur « Inviter ».',
        ],
        visuel: <Pile><Formulaire champs={[['Rôle attribué', 'Trésorier'], ['Inviter par email', 'tresorier@club.fr']]} bouton="Inviter" /></Pile>,
      },
      {
        titre: 'Ce que chacun peut faire',
        texte: 'Pour chaque rôle, choisis rubrique par rubrique ce qu’il peut voir et ce qu’il peut modifier, et à quelles catégories d’équipe il a accès.',
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
