# PLAN : finition de l'espace joueur (starter et Pro)
Date : 2026-10-29 · Chantier précédent archivé dans `PLAN-archive-refonte-accueil-joueur.md`

Objectif : reprendre une à une les pages internes de l'espace joueur, qui font aujourd'hui brouillon ou enfantin, et les amener au niveau de l'accueil refait le 2026-10-29.
Périmètre : les écrans que voient les comptes `joueur_starter` et `joueur_pro`. Aucune modification de base de données, de paiement ou d'email.

## Un atout à réutiliser systématiquement
Le socle visuel existe déjà dans `src/components/joueur/` : `Carte`, `TitreSection`, `TuileChiffre`, `ListeAlertes`, `BandeSemaine`, `JaugeSaison`, `ApercuPro`. **Chaque page refaite doit s'appuyer dessus**, jamais recopier des styles à la main. Tous lisent les couleurs via `useColors()` et les valeurs via `src/tokens.js`.

Valeurs imposées, identiques au chantier précédent : espacements 4/8/12/16/20/24/32 ; rayons 12, 16, 999 ; carte = fond `background.surface`, bordure 1 px `border.subtle`, rayon 16, padding 16 px mobile et 20 px desktop ; une seule carte accentuée par écran ; largeur de contenu 980 px centrés ; zéro couleur en dur ; zéro emoji.

## Décisions de cadrage (prises le 2026-10-29)
- **Actualités du club** : un seul visuel football par défaut, livré avec l'application. **Pas de personnalisation par club** pour l'instant : cela demanderait une colonne en base et un envoi d'image. À reproposer seulement si Kevin le redemande.
- **Explorer** : un joueur **ne doit pas** pouvoir contacter un éducateur. C'est une règle à faire respecter, pas une fonctionnalité à créer. S'il existe un bouton qui le permet, il faut le retirer.
- **Nutrition** : premier écran adapté au joueur (poste, objectifs) avec des conseils différents selon son profil, plus un tutoriel.
- **Ordre** : le nettoyage transversal des émoticônes d'abord, puis page par page.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Un compte joueur `joueur_starter` ou `joueur_pro` que Kevin ouvre lui-même | C'est lui qui valide à l'œil, les sessions Claude Code n'ont pas de navigateur | Son compte habituel | chaque bloc |
| Une photo de fond football (facultatif) | Pour l'en-tête des Actualités. À défaut, un visuel sera dessiné en SVG, sans image à fournir | Kevin, ou rien | bloc 9 |
| Les conseils nutrition par poste (facultatif) | Pour que le premier écran nutrition dise quelque chose de vrai et d'utile | Kevin, ou un contenu générique assumé | bloc 10 |

## Manipulations à faire moi-même
1. **À chaque fin de bloc** : ouvrir la page concernée sur téléphone ET ordinateur, en thème sombre ET clair, puis valider ou dire ce qui ne va pas.
2. **Ne pas m'envoyer d'identifiants** : je ne peux pas m'en servir, je n'ai pas de navigateur.
3. **Rien n'est poussé sans mon « ok »** : un push déclenche un déploiement en production.

## Répartition suggérée
Douze blocs courts. Deux par séance au maximum, une session neuve par bloc. Les blocs 1 à 4 donnent le plus d'effet visible pour le moins de risque : les faire en premier.

## Règle d'économie, valable pour tous les blocs
`src/pages/DashboardJoueur.jsx` dépasse 5 600 lignes. **Ne jamais le lire en entier.** Repérer la zone avec `grep -n "onglet === '<nom>'"` puis lire seulement la plage utile avec `sed -n 'X,Yp'`. Les numéros de ligne bougent à chaque bloc.

## Blocs

### Bloc 0 : mise en place
- Statut : à faire
- Objectif : sauvegarde datée et build de référence pour ce nouveau chantier.
- Résultat testable : le site tourne comme avant, une copie datée existe.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : purement mécanique.
- Lancement : `/clear`, `/model haiku`, `/effort low`, `/bloc 0`
- Étapes :
  - Copier `src/pages/DashboardJoueur.jsx` dans `~/Sauvegardes-DigitalFootball/` avec la date du jour, sans écraser une sauvegarde existante.
  - `npm run build` : noter la durée, le nombre d'avertissements et le poids du bundle joueur, pour comparaison finale.
  - `npm run dev -- --host` et noter l'adresse réseau pour les tests sur téléphone.
- Ce que je teste : le site s'ouvre normalement.

### Bloc 1 : chasse aux émoticônes dans tout l'espace joueur
- Statut : fait (2026-10-29)
- Objectif : plus aucune émoticône dans l'espace joueur. C'est le reproche principal de Kevin : « ça fait enfant ».
- Résultat testable : je parcours toutes les rubriques du menu sans voir un seul emoji.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : ce n'est pas un simple effacement, chaque emoji doit être remplacé par la bonne icône ou par la couleur de statut, sans casser les mises en page.
- Dépend de : bloc 0
- Étapes :
  - Recenser toutes les émoticônes restantes du fichier (41 lignes en contenaient avant ce chantier) et des composants joueur.
  - Remplacer par les composants `Icon*` déjà présents dans le fichier. Si aucune icône ne convient, en dessiner une dans le même style, ou retirer l'emoji quand le texte se suffit.
  - Les emojis de statut (présence, santé) deviennent des pastilles de couleur, comme déjà fait sur l'accueil.
  - Cas particulier : les drapeaux du sélecteur de langue. Proposer à Kevin les codes « FR / EN / PT » plutôt que les drapeaux, et attendre sa réponse.
  - Vérifier par comptage qu'il n'en reste aucun, pas à l'œil.
- Ce que je teste : je passe dans chaque rubrique du menu et je cherche un emoji.


**Journal du bloc 1** — 2026-10-29, Opus 5 (au lieu de Sonnet : validé par Kevin pour éviter un aller-retour).
- Recensement par comptage, pas à l'œil : 121 émoticônes sur 92 lignes dans `DashboardJoueur.jsx`, puis élargi aux 65 fichiers que l'espace joueur charge réellement (parcours des imports, pas une liste à la main).
- Drapeaux du sélecteur de langue : **gardés**. Kevin a d'abord choisi les codes FR EN PT ES IT DE, puis les a fait remettre après les avoir vus. Seule exception assumée à la règle zéro émoticône dans l'espace joueur. Ne plus reproposer de les retirer.
- Jeu d'icônes sorti dans `src/components/icones.jsx` : les 22 icônes qui vivaient dans `DashboardJoueur.jsx`, plus 32 nouvelles au même format (viewBox 24, `currentColor`, prop `size`). Les onze autres fichiers s'en servent au lieu de recopier des SVG. Une seule source pour tous les dessins.
- Émoticônes de statut devenues des icônes colorées par le parent (présence, validation, attente, cartons d'arbitre), comme sur l'accueil.
- `src/lib/translations.js` : 16 clés nettoyées sur les 6 langues. Vérifié que ces 16 ne servent qu'à l'espace joueur. Les 59 autres lignes à émoticônes du fichier appartiennent aux espaces club et éducateur et ne sont jamais affichées à un joueur.
- Boutons qui n'avaient qu'un symbole (fermer, menu, envoyer, étoiles de notation) ont reçu un `aria-label` ou un `title` au passage : sans texte ni emoji, ils étaient muets pour un lecteur d'écran.

**Écarts assumés, à traiter ailleurs**
- `EducationNutrition.jsx` (54 lignes) et `src/lib/nutrition.js` (16) : laissés tels quels. Le **bloc 10** refait ce premier écran entièrement, les nettoyer maintenant serait du travail à refaire.
- `Tactipad.jsx` (17 lignes affichées) et `TactipadViewer.jsx` (1) : la planche tactique est un outil partagé avec l'espace éducateur et a son propre chantier. Hors périmètre de ce plan.
- `VeoStatsJoueur.jsx` ligne 61 : l'émoticône est **écrite en base** (`joueur_badges.icone`) et n'est affichée que sur les écrans recruteur. La changer ne corrigerait pas les lignes déjà enregistrées en production. À décider avec le bloc 2, qui retire déjà Veo de la carte joueur.
- Couleurs en dur rencontrées en chemin (`#f0c030`, `#fbbf24`, `#4ade80`, `#f59e0b`) : pas touchées, c'est le travail des blocs 3 et 11.

### Bloc 2 : deux règles à faire respecter
- Statut : fait (2026-10-29)
- Objectif : retirer la statistique Veo de la carte joueur, et empêcher un joueur de contacter un éducateur depuis Explorer.
- Résultat testable : la carte joueur n'affiche plus Veo ; depuis Explorer, aucun bouton ne permet d'écrire à un éducateur.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : le point Explorer touche à une règle d'accès, il faut vérifier le parcours réel et pas seulement masquer un bouton.
- Dépend de : bloc 0
- Étapes :
  - `src/components/CarteJoueur.jsx` : retirer la statistique Veo et refermer la mise en page proprement.
  - Onglet `clubs` (Explorer) : repérer tout chemin menant à un contact éducateur, le retirer. **Vérifier qu'aucune route ou fonction ne reste atteignable autrement**, et le dire dans le compte rendu.
  - Ne rien supprimer côté base ni côté droits : c'est un retrait d'interface.
- Ce que je teste : la carte joueur, puis Explorer, en cherchant à joindre un éducateur.


**Journal du bloc 2** — 2026-10-29, Opus 5.
- *Veo retiré de la carte joueur* : le bloc de saisie `<VeoStatsJoueur>` ne s'affiche plus sous la carte, et le badge « Stats Veo » est écarté des distinctions. La carte lisait aussi la colonne `joueur_badges.icone`, qui contient une émoticône écrite par d'anciennes insertions : elle n'affiche plus que le libellé. Rien n'a été touché en base, les lignes existantes restent intactes. Le fichier `VeoStatsJoueur.jsx` n'est plus importé nulle part : code mort, laissé en place, à mettre à la corbeille si Kevin confirme.
- *Contact éducateur depuis Explorer* : le chemin réel était Explorer → fiche `/clubs/:id` (`ClubPublic.jsx`) → bouton « Contacter » → insertion dans `messages`. La règle est posée dans `ClubPublic.jsx` : un visiteur dont le plan est joueur (`fan`, `starter`, `joueur_starter`, `joueur_pro`) ne peut pas contacter un profil qui n'est pas un club. Posée en trois endroits, pas seulement sur le bouton : `contactAutorise` masque le bouton, et `ouvrirChat` comme `envoyerMessageChat` refusent d'agir. La fiche est atteignable par son URL seule, masquer le bouton n'aurait pas suffi.
- *Audit des autres chemins* : il n'en reste aucun pour **initier** un contact vers un éducateur. La messagerie du joueur ne liste que des conversations déjà ouvertes, elle n'a pas de sélecteur de destinataire. Le coach analyseur vient de la RPC `get_coach_contacts` (table `admins_coach`), une liste fermée de coachs de la plateforme, pas des éducateurs de clubs. **Un joueur peut en revanche répondre** à un éducateur qui lui a écrit le premier : à décider, le retirer casserait la messagerie coach.

**Angle mort du bloc 1, trouvé pendant le bloc 2**
Le recensement du bloc 1 suivait les imports. Il a donc manqué les pages que le joueur ouvre **par URL**, qui ne sont pas importées par `DashboardJoueur.jsx` mais chargées par une route de `App.jsx`.
- `ClubPublic.jsx` (fiche d'un club ou d'un éducateur, atteinte depuis Explorer) : 21 émoticônes, **nettoyées dans ce bloc** puisque le fichier était déjà ouvert. États vides, étoiles de notation, cœur des j'aime, pastille de disponibilité.
- Restent à traiter, 105 émoticônes sur des pages qu'un joueur atteint : `Feed.jsx` (35), `Upload.jsx` (15), `Jogabonito.jsx` (14), `Offres.jsx` (8), `UploadClip.jsx` (6), `UploadReel.jsx` (6), `AcceptInvite.jsx` (1). **À faire dans un bloc dédié**, pas en fin de chantier : ce sont des écrans que le joueur voit souvent.

### Bloc 2b : les pages que le joueur ouvre par URL
- Statut : à faire
- Objectif : finir la chasse aux émoticônes sur les pages chargées par route, oubliées par le recensement du bloc 1.
- Résultat testable : j'ouvre le fil d'actualité, l'envoi de vidéo et la page des offres sans voir un seul emoji.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : bloc 1
- Étapes :
  - 105 émoticônes à traiter : `Feed.jsx` (35), `Upload.jsx` (15), `Jogabonito.jsx` (14), `Offres.jsx` (8), `UploadClip.jsx` (6), `UploadReel.jsx` (6), `AcceptInvite.jsx` (1).
  - Importer depuis `src/components/icones.jsx`, ne **jamais** redessiner un SVG : le jeu partagé compte déjà 57 icônes.
  - `Offres.jsx` est une page de vente : relire les textes à voix haute après coup, pas seulement remplacer les icônes.
  - Vérifier par comptage, pas à l'œil.
- Ce que je teste : le fil d'actualité, l'envoi d'une vidéo, la page des offres.

### Bloc 3 : page Compétition
- Statut : fait (2026-10-29)
- Objectif : refaire la page Compétition sur le socle visuel.
- Résultat testable : la page a la même allure que l'accueil, classement et matchs lisibles sur téléphone.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : page dense, tableaux et classements, beaucoup de décisions de hiérarchie.
- Dépend de : blocs 0, 1
- Étapes :
  - Lire la fonction de rendu de la compétition, repérée au `grep`.
  - Reconstruire sur `Carte` et `TitreSection`, chiffres sur `TuileChiffre`.
  - Classement : colonnes figées ou défilement horizontal avec le repère de défilement déjà utilisé sur la semaine.
  - Zéro couleur en dur, vérifié par comptage.
- Ce que je teste : la page sur téléphone, dans les deux thèmes.


**Journal du bloc 3** — 2026-10-29, Opus 5 (session non repartie à neuf, le `/clear` n'avait pas pris effet).

**Écart majeur : il n'y a pas de classement dans cette page.** Le plan prévoyait « colonnes figées ou défilement horizontal » pour un tableau de classement. Ce tableau n'existe pas : la page n'a qu'un lien `lienClassementCompetition` vers le site de la ligue, saisi par l'éducateur dans son profil. Aucune table de classement en base. L'étape est donc sans objet, et je ne l'ai pas inventée.

**Ce que j'ai mis à la place, pour que le bloc serve à quelque chose** : un *Bilan de la saison* en quatre `TuileChiffre` (matchs joués, victoires, nuls, défaites) plus une ligne buts marqués / encaissés. C'est le « chiffres sur TuileChiffre » que le plan demandait, et la page n'avait jusqu'ici aucune vue d'ensemble : juste deux listes mois par mois. Le bilan suit le filtre de compétition, les chiffres correspondent donc toujours à ce qui est listé dessous.

**Reconstruction sur le socle**
- Cadre identique à l'accueil : 980 px centrés, padding 16 px mobile et 24/40 px desktop.
- Trois `Carte`, trois `TitreSection`, `EmptyState compact` pour chaque liste vide. Plus un seul fond, bord ou rayon écrit à la main.
- Une seule carte accentuée, celle des prochains matchs : c'est la seule information sur laquelle le joueur a quelque chose à faire.
- Le lien vers le classement de la ligue n'a plus sa propre carte : c'est un bouton secondaire dans l'en-tête. Il mène à un site extérieur, il n'a pas à peser autant que le contenu de l'équipe.
- Lisibilité au pouce : l'en-tête, la navigation par mois et les lignes de match passent à la ligne au lieu de pousser le score hors de l'écran. Bilan en 2 colonnes sur téléphone, 4 sur ordinateur.
- Corrigé au passage : les dates étaient forcées en `fr-FR`. Elles suivent maintenant `localeOf(lang)` comme le reste de l'application.

**Vérifications** : 0 couleur en dur et 0 émoticône dans la fonction, comptés et non regardés (les six `rgba(...)` et le `#facc15` ont disparu). `npm run build` vert. `npx eslint` sur les sept fichiers du chantier : aucune alerte nouvelle, celles qui restent sont des règles react-hooks d'avant le chantier, dans des zones non touchées (vérifié en comparant au commit `51aa42e`).

**Reste à finir**
- `renduCompetition` est partagé avec la branche `estAffilie`, qui est morte (plan `fan` refusé en base). Le nouveau rendu y est donc aussi, sans effet visible. Rien à faire, juste à savoir.
- [IDÉE] Un vrai classement interne est possible sans site extérieur : les résultats de toutes les équipes d'une même catégorie sont déjà en base (`matchs_equipe`). Ce serait un bloc à part entière, avec une décision de périmètre (quelles équipes, quelle catégorie). À reproposer seulement si Kevin le demande.

### Bloc 4 : Mon profil désencombré
- Statut : **fait et validé par Kevin** (2026-10-30, en production)
- Objectif : la page profil est surchargée. La réorganiser en sections claires sans rien retirer de fonctionnel.
- Résultat testable : je trouve une information précise en moins de cinq secondes.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : beaucoup de champs, risque réel de casser un formulaire qui marche.
- Dépend de : blocs 0, 1
- Étapes :
  - Inventorier tous les champs et actions de la page avant de toucher quoi que ce soit, et noter l'inventaire dans le compte rendu.
  - Regrouper en sections : identité, informations sportives, compte et abonnement, réglages.
  - Replier ce qui est rarement utilisé plutôt que de le supprimer.
  - **Aucun champ ne doit disparaître** : vérifier l'inventaire avant et après.
- Ce que je teste : je modifie une information et je l'enregistre, elle doit être conservée.


**Journal du bloc 4** — 2026-10-29, Opus 5, quatrième bloc de la même session (les `/clear` demandés n'ont pas pris effet).

**Arrêt volontaire après l'étape 1.** L'inventaire est fait et consigné ci-dessous. Je n'ai **pas** touché au formulaire : il écrit en base, la consigne est qu'aucun champ ne disparaisse, et il reste 450 lignes à réorganiser. Commencer sans la place pour aller au bout et revérifier l'inventaire, c'est le laisser en morceaux. L'exploration est payée, la session suivante exécute directement.

### Inventaire de la page profil (`DashboardJoueur.jsx`, lignes 4260 à 4709)
Relevé par script, pas à l'œil. Huit cartes empilées, sans aucune hiérarchie, plus un bouton d'enregistrement égaré.

| # | Ligne | Carte | Contenu |
|---|---|---|---|
| 1 | 4268 | Photo de profil | `input type=file` → `handleAvatarUpload` |
| 2 | 4282 | Informations | `stats.club`, `stats.niveau_equipe`, `stats.categorie`, `stats.region`, `stats.numero_licence`, `stats.pied` · note sur les stats retirées · bouton vers l'onglet `mes_stats` |
| 3 | 4331 | Style de jeu | `styleDeJeu` (1 choix parmi 8) · `pointsForts` (4 max) · `aAmeliorer` (4 max) |
| 4 | 4405 | Parcours | liste des clubs (modifier / supprimer) + formulaire : `nouveauClub.club`, `.saison`, `.categorie`, `.poste`, `.niveau_championnat`, `.matchs_joues`, `.cleansheets`, `.buts`, `.passes_decisives` + Ajouter / Annuler |
| 5 | 4561 | Historique des saisons | composant `<HistoriqueSaisons>` |
| 6 | 4566 | Notifications | 4 bascules (`email_analyse`, `email_like`, `email_commentaire`, `email_message`) → `sauvegarderNotifPrefs` |
| 7 | 4592 | Visibilité recruteurs | **masquée**, affichée seulement pour le compte de test Rayan Attia : `statut_recrutement`, bascule `visible_recruteurs`, bascule `partage_bilan_medical`, demandes de détail médical (Accepter / Refuser) |
| — | 4667 | **Bouton Enregistrer** | `handleSaveStats` — **placé ici**, soit ~390 lignes après les champs qu'il enregistre, et juste après un formulaire de parcours qui a ses propres boutons |
| 8 | 4673 | Accès parents | liste des invitations (retirer) + `emailParentInput` + Inviter |

**Total à préserver** : 16 champs contrôlés, 1 upload, 3 sélections par pastilles, 6 bascules, 11 actions (`handleAvatarUpload`, `handleSaveStats`, `ajouterClub`, `modifierClub`, `supprimerClub`, `inviterParent`, `supprimerInvitationParent`, `sauvegarderNotifPrefs`, `sauvegarderRecrutementProfil`, `repondreDemandeBilanMedical`, `setOnglet`).

**Journal du bloc 4, étape 2 (réorganisation)** — 2026-10-29, Sonnet 5.5, session neuve.

Page profil de `DashboardJoueur.jsx` refaite sur le socle (`Carte`, `TitreSection`), cadre 980 px comme l'accueil et la compétition. Sauvegarde du fichier d'avant : `~/Sauvegardes-DigitalFootball/DashboardJoueur.2026-10-29.bloc4.jsx`.

Nouvel ordre : en-tête (titre + bouton « Voir mes statistiques ») → **Identité** (photo + 6 champs) → **Style de jeu** → **un seul bouton Enregistrer** → **Parcours footballistique** (replié : parcours + historique des saisons) → **Réglages** (replié : notifications, visibilité recruteurs, accès parents) → parrainage.

**Écarts avec la découpe prévue**
- Le bouton Enregistrer n'est pas dans la carte Identité mais juste après Style de jeu : `handleSaveStats` enregistre les deux d'un coup (champs du profil, style de jeu, points forts, à améliorer). Une note sous le bouton le dit.
- La bannière verte « Mes Statistiques » est devenue un bouton secondaire dans l'en-tête, comme le classement de la compétition. La phrase explicative est conservée en infobulle.
- Le widget de parrainage, absent de l'inventaire (ni champ ni action), est conservé et descendu en bas de page.
- Pas de section « compte et abonnement » : rien à y mettre, comme noté à l'étape 1.
- « Modifier » un club du parcours ouvre maintenant la section repliée avant de viser le formulaire.
- Grilles à 2 colonnes passées à 1 colonne sur téléphone (identité et formulaire du parcours).

**Fichiers** : `src/pages/DashboardJoueur.jsx`, `src/components/joueur/SectionRepliable.jsx` (nouveau), `src/lib/translations.js` (5 clés ajoutées, 6 langues).

**Vérifications** : relevé par script avant/après sur 52 repères (actions, champs, bascules, pastilles, upload, condition de masquage du compte test) : 0 écart ; 11 `input`, 6 `select`, 10 `button` avant et après. `npm run build` vert. `eslint` : 10 alertes avant, 10 après, aucune nouvelle. Une erreur attrapée en route : l'état des sections était posé dans le mauvais composant, ce que le build ne détecte pas et qu'eslint a signalé ; corrigé. Rendu replié et déplié du nouveau composant vérifié par un test de rendu.
**Non vérifié** : le parcours réel dans le navigateur (connexion requise). À tester par Kevin.

**Reste à finir**
- Les sections « Visibilité recruteurs » et « Accès parents » sont encore en français écrit en dur, comme avant.
- Les boutons modifier et supprimer de la liste du parcours gardent leurs couleurs d'origine (`#4ade8080`, `#ef444480`) : hors périmètre.

### Le vrai défaut, et la découpe à appliquer
Le reproche « surchargé » ne vient pas du nombre de champs mais de deux choses : **aucune section**, et le **bouton Enregistrer séparé de ses champs par 390 lignes**, après un autre formulaire qui a ses propres boutons. C'est la première chose à corriger, avant tout regroupement.

Découpe retenue, sur le socle (`Carte`, `TitreSection`), cadre 980 px comme l'accueil et la compétition :
1. **Identité** — photo (1) + informations (2), puis **le bouton Enregistrer juste en dessous**, dans la même carte que les champs qu'il enregistre.
2. **Profil sportif** — style de jeu (3), toujours visible.
3. **Mon parcours** — parcours (4) + historique des saisons (5), **replié** : c'est la moitié de la page pour quelque chose qu'on remplit une fois par saison. Le formulaire d'ajout garde ses boutons propres, qui n'enregistrent que lui.
4. **Réglages** — notifications (6) + visibilité recruteurs (7, condition de masquage inchangée) + accès parents (8), **replié**.

**Écart à signaler** : le plan prévoyait une section « compte et abonnement ». Il n'y a **rien** à y mettre : cette page ne contient ni email, ni mot de passe, ni abonnement, ni déconnexion (la déconnexion est dans le menu latéral). Je ne l'ai pas inventée. Si Kevin veut y voir son offre et sa date de renouvellement, c'est un ajout à demander, pas un regroupement.

**Règle de vérification pour la session d'exécution** : relancer le relevé par script après la réorganisation et comparer au tableau ci-dessus. Les 16 champs contrôlés, les 6 bascules et les 11 actions doivent tous être encore là. Puis modifier une information, enregistrer, recharger.

### Bloc 5 : Santé et Préparation tactique
- Statut : **fait et validé par Kevin** (2026-10-30, en production)
- Objectif : ces deux pages paraissent vides ou brouillonnes. Leur donner une structure et un état vide digne.
- Résultat testable : même sans données, les deux pages expliquent à quoi elles servent au lieu d'être blanches.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : blocs 0, 1
- Étapes :
  - Pour chaque page : une carte d'en-tête qui dit en une phrase à quoi elle sert.
  - Un véritable état vide, avec une icône, une phrase et une action possible, au lieu d'un écran blanc.
  - Appliquer le socle aux blocs existants.
- Ce que je teste : les deux pages avec mon compte, qui n'a probablement pas de données partout.

**Journal du bloc 5** — 2026-10-29, Sonnet 5.5 (le modèle prévu), session neuve.

**Fait**
- **Santé** (`SanteJoueur.jsx`) : en-tête avec une phrase d'explication, carte « Ton état actuel » accentuée (seule carte accentuée de l'écran, orange comme le code de statut santé), trois `TuileChiffre` (déclarées, en cours, guéries), silhouette dans une `Carte`, chaque blessure dans une `Carte`. Cadre 980 px comme l'accueil. Toute la logique (déclaration, date de reprise, rendez-vous, compte-rendu, rééducation, ouverture de document) est reprise telle quelle : seul l'affichage change.
- **Préparation tactique** (`PreparationTactiqueJoueur.jsx`) : même cadre et même en-tête, onglets conservés, `TitreSection` pour les sous-phases, galeries sur `Carte`. Sur téléphone, le terrain passe au-dessus de sa légende (avant : deux colonnes qui poussaient la légende hors de l'écran) et le schéma Tactipad s'adapte à la largeur de l'écran.
- **États vides, chacun avec son action** :
  - Santé sans blessure : explication de ce que la page permet + bouton « Déclarer une blessure ». Sans équipe : explication + bouton « Rejoindre mon équipe ».
  - Tactique sans club : « Rejoindre mon équipe ». Club mais **catégorie non renseignée** : « Compléter mon profil » (avant, la page affichait « ton club n'a pas encore personnalisé cette page », ce qui était faux : c'est la catégorie qui manquait). Phase sans zones : explication. Aucun schéma partagé : message différent selon que le joueur a un éducateur ou non.
- Zéro couleur en dur et zéro `fr-FR` dans les deux fichiers (comptés). Les dates suivent la langue de l'application.

**Écarts et décisions**
- **Changement de comportement à connaître** : le bouton « Déclarer une blessure » n'apparaît plus pour un joueur sans équipe (avant il s'affichait puis répondait « Tu n'es affilié à aucun éducateur » par une alerte). La déclaration exige déjà une affiliation en base, rien d'autre n'a changé.
- La branche `estAffilie` (morte) appelle les mêmes composants : j'y ai seulement retiré le titre en double. Rien d'autre.
- `accentColor` n'est plus passé à la préparation tactique : la page n'a plus de couleur propre.
- Le gris vide qui servait d'aperçu aux schémas partagés (un faux aperçu) est remplacé par une icône. Un vrai aperçu miniature serait possible mais coûteux (canevas Konva par carte).

**Vérifications**
- `npm run build` vert. `npx eslint` : Santé 0 alerte ; Tactique les 6 mêmes alertes react-hooks qu'avant (comparées au commit, effets de chargement non touchés).
- Rendu serveur de la Tactique dans trois cas (sans club, club sans catégorie, club + catégorie sans zones) : les trois états vides s'affichent avec le bon texte.
- **Non vérifié par moi** : les états vides de Santé (ils n'apparaissent qu'après le chargement en base) et l'aspect visuel réel, faute de navigateur. À voir sur ton compte.

**Reste à finir**
- Les textes de la page Santé et de la Tactique sont écrits en français dans le code, sans passer par `translations.js` (déjà le cas avant). À traiter si l'app doit être multilingue pour le joueur.
- [IDÉE] Aperçu miniature des schémas partagés, pour reconnaître un schéma avant de l'ouvrir.
- Bloc 4 toujours en attente de ta validation visuelle.

### Bloc 6 : Mon équipement
- Statut : à faire
- Objectif : expliquer à quoi sert l'outil et soigner la page.
- Résultat testable : en arrivant sur la page, je comprends tout de suite pourquoi donner mes tailles.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Dépend de : blocs 0, 1
- Étapes :
  - Ajouter en haut une phrase d'explication, dans l'esprit de ce que Kevin a dicté : informer son club de ses tailles pour recevoir au plus vite son pack de début de saison. À reformuler pour être direct et sans tiret long.
  - Refaire la saisie des tailles sur le socle, champs lisibles au pouce.
- Ce que je teste : je saisis une taille, je l'enregistre, je recharge, elle est là.

### Bloc 7 : Mes analyses et Coach analyseur
- Statut : à faire
- Objectif : des vignettes d'analyse plus belles, et une page Coach analyseur plus claire.
- Résultat testable : la liste des analyses donne envie d'ouvrir une vidéo.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : blocs 0, 1
- Étapes :
  - Vignettes : miniature, titre, date, statut en pastille de couleur, le tout sur `Carte`.
  - État vide soigné quand aucune analyse n'existe, avec un renvoi vers l'offre Pro via `ApercuPro`.
  - Coach analyseur : hiérarchiser l'écran, titre, explication, action principale.
- Ce que je teste : la liste des analyses et la page Coach analyseur.

### Bloc 8 : Saisir un match
- Statut : à faire
- Objectif : rendre la saisie d'un match agréable, sans émoticônes.
- Résultat testable : je saisis un match en entier sans hésiter sur un champ.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Dépend de : blocs 0, 1
- Étapes :
  - Refaire le formulaire sur le socle, champs groupés logiquement.
  - Retirer les émoticônes restantes de cet écran.
  - Vérifier que l'enregistrement fonctionne toujours, c'est un formulaire qui écrit en base.
- Ce que je teste : je saisis un match complet et je vérifie qu'il apparaît dans mes statistiques.

### Bloc 9 : Actualités du club habillées
- Statut : à faire
- Objectif : donner une vraie tête à la page Actualités, avec un visuel football par défaut.
- Résultat testable : la page a un en-tête visuel, et les annonces se lisent bien.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Dépend de : blocs 0, 1
- Étapes :
  - En-tête visuel : si Kevin fournit une photo, l'utiliser ; sinon dessiner un motif de terrain en SVG, léger et net dans les deux thèmes. **Aucune image externe, aucun changement de base.**
  - Les annonces sur `Carte`, avec date, auteur et pastille sur les non lues.
  - État vide soigné : le club de Kevin n'a aucune annonce, c'est donc l'écran qu'il verra en premier.
- Ce que je teste : la page Actualités, qui sera probablement vide chez moi.

### Bloc 10 : Nutrition, premier écran adapté au joueur
- Statut : à faire
- Objectif : un premier écran qui s'adapte au poste et aux objectifs du joueur, plus un tutoriel.
- Résultat testable : j'arrive sur la nutrition et je comprends quoi faire, sans formation.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : c'est le bloc le plus créatif et le plus long, avec du contenu à écrire.
- Dépend de : blocs 0, 1
- Prérequis : les conseils par poste, si Kevin en a ; sinon contenu générique assumé et signalé
- Étapes :
  - Premier écran : ce que la page apporte, l'état actuel du joueur, et une action claire.
  - Adapter les conseils au poste et aux objectifs **uniquement à partir de données déjà en base**. Ne rien inventer : si la donnée n'existe pas, le dire à Kevin plutôt que de simuler.
  - Tutoriel : quelques étapes expliquant la page, réutilisables via le composant d'aide existant si c'est possible.
- Ce que je teste : la page nutrition avec mon profil réel.

### Bloc 11 : vérification finale et mise en ligne
- Statut : à faire
- Objectif : prouver que tout tient, puis publier avec l'accord de Kevin.
- Résultat testable : un parcours complet de l'espace joueur sans défaut, puis la production.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : tous les blocs
- Étapes :
  - Comptages : zéro couleur en dur et zéro emoji sur toutes les pages retouchées.
  - `npm run build` comparé au bloc 0 : aucune erreur ni avertissement nouveau.
  - Parcours complet de chaque rubrique, téléphone et ordinateur, thème clair et sombre.
  - **Ne pousser qu'avec l'accord explicite de Kevin** : un push déclenche un déploiement en production.
  - Vérifier au passage s'il reste des commits locaux non désirés avant de pousser, comme le correctif sponsors mis de côté le 2026-10-29 sur la branche `sponsors-en-attente`.
- Ce que je teste : le parcours complet, puis la production.
