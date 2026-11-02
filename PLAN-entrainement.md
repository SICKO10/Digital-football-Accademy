# PLAN : « Séance du jour » visible par les joueurs
Date : 2026-11-02 · Brief : BRIEF-entrainement.md
Lancer chaque bloc avec `/bloc N PLAN-entrainement.md`, une session neuve par bloc.

## Bloc 0 : Inventaire (Sonnet, effort medium, lecture seule) — FAIT (2026-11-02)
Lire seulement : où est stockée une fiche de séance et ses procédés (lien `entrainements.fiche_id`), comment le schéma animé est rendu côté joueur (TactipadViewer), comment l'équipe active et les joueurs d'une équipe sont retrouvés, où se place « Préparation » dans le dashboard joueur. Écrire les constats dans ce fichier. Aucune modification.
Validation : Kevin lit les constats.

## Bloc 1 : Base de données (Opus, effort high) — FAIT (2026-11-02)
Table de publication (séance, date, équipe, éducateur) et table des destinataires (joueur ou groupe de poste), avec les procédés cochés. Règle de lecture joueur : publié pour lui, jour J, avant 22h Paris. Règle d'écriture : l'éducateur propriétaire seulement. Fichier `supabase_entrainement_publie.sql`, que Kevin exécute après la sauvegarde.
Validation : Kevin exécute le SQL, on vérifie avec une lecture de test.

## Bloc 2 : Côté éducateur (Sonnet, effort medium)
Cases « Visible par les joueurs » sur les procédés, fenêtre de publication (équipe, postes, joueurs au choix), voir, modifier et retirer ce qui est publié.
Validation : Kevin publie une séance test sur son équipe.

## Bloc 3 : Côté joueur (Sonnet, effort medium)
Rubrique « Entraînement » dans Préparation, carte « Séance du jour », consigne, critères, schéma animé, état vide, disparition à 22h. Le joueur peut voir deux séances à la fois (celle du jour avant 22h et la suivante déjà publiée) : trier par date, la plus proche en premier, avec « Aujourd'hui » / « Demain » / date. Vérifier les deux variantes du dashboard joueur.
Validation : Kevin vérifie avec un compte joueur concerné et un non concerné.

## Bloc 4 : Notification (Sonnet, effort medium)
Notification clochette aux joueurs destinataires à la publication (via `notifierJoueur`). Email seulement après « ok » explicite de Kevin.
Validation : Kevin reçoit la clochette sur le compte de test.

## Bloc 5 : Contrôle final (Sonnet, effort medium)
Parcours complet, cas limites (publication à 21h59 et 22h01, joueur d'une autre équipe, procédé décoché ensuite), build, commit et push.

### Constats du bloc 0 (2026-11-02, Sonnet 5.5, lecture seule)

**1. Où vit une fiche de séance et ses procédés**
- Table `seances_uploadees` (educateur_id, theme, date_seance, origine, ...). Le contenu complet est dans la colonne JSON `fiche_seance` (sauvegardée par `sauvegarderFicheApercuEdit`, DashboardEducateur.jsx ~3010). Aucun fichier SQL de création de cette table dans le dépôt : elle existe déjà en base, on ne connaît que ses ajouts.
- Lien entraînement vers fiche : `entrainements.fiche_id` (UUID vers `seances_uploadees.id`, `ON DELETE SET NULL`, supabase_entrainements_fiche_import.sql). Un entraînement porte date, heure, lieu, description.
- Procédés : tableau `fiche_seance.procedes[]`, chaque procédé a `numero, titre, duree, nb_joueurs, but, organisation, consignes, variables, criteres_realisation, criteres_reussite, schema_png`. Ils n'ont pas d'identifiant propre : le numéro (1, 2, 3...) change si on en retire un. Il faudra donc stocker le numéro à la publication, ou mieux, une copie figée du contenu coché.
- Le schéma animé (`schema_data`) ne vit PAS dans la fiche. Il est dans `bibliotheque_exercices` (schema_png + schema_data), et la fiche ne garde que l'image fixe `schema_png`. Aucune clé de lien (bibliotheque_id) n'existe entre un procédé de la fiche et la bibliothèque. Conséquence : pour montrer un schéma animé au joueur, il faut soit ajouter ce lien/ces données au procédé au moment de l'ajout depuis la bibliothèque, soit afficher l'image fixe pour les procédés sans lien. Point à trancher par Kevin (voir questions).

**2. Rendu du schéma animé côté joueur**
- `src/components/TactipadViewer.jsx` : `<TactipadViewer schema={...} width={...} />` (`schema` = le `schema_data`). Déjà utilisé dans PreparationTactiqueJoueur (plein écran paysage mobile, toucher pour pause) : réutilisable tel quel.

**3. Équipe active et joueurs d'une équipe**
- L'équipe = une catégorie de club : `club_categorie_id` (l'ancien système `educateur_equipes`/`equipe_id` a été supprimé, supabase_cleanup_educateur_equipes.sql). Éducateur : `equipeActiveId` (DashboardEducateur ~2485, mémorisé dans `profiles.equipe_active_id`). Les entraînements se filtrent par `club_categorie_id`.
- Joueurs de l'équipe : table `equipe_joueurs` (educateur_id, club_categorie_id, joueur_id = compte du joueur, poste). Le poste précis est aussi dans `profiles.poste`. Regroupement par famille : `getPosteFamille` (src/lib/postes.js : Gardien, Défenseur, Milieu, Attaquant ; poste vide = Milieu).
- Côté joueur, le lien se fait par `affiliations` (educateur_id, joueur_id, statut 'accepte', `equipe_joueur_id` vers equipe_joueurs). Un joueur sans compte lié (joueur_id vide) ne peut pas être destinataire.

**4. Place de « Préparation » dans le dashboard joueur**
- Onglet `preparation_tactique` (section « Préparation »), composant `PreparationTactiqueJoueur.jsx` (props educateurIds, clubId, categorie). Il a un système d'onglets internes (`ONGLETS`, état `onglet`, défaut `schemas`) : on y ajoute « Entraînement » en premier.
- Deux endroits dans DashboardJoueur.jsx : branche `estAffilie` (menu ~2263, rendu ~2665) et branche `navItems`/isPro (menu ~3425, rendu ~5080). Les deux appellent le même composant, donc un seul ajout suffit. Mémoire : la branche `estAffilie` est morte (plan fan rejeté), la vérification se fera surtout sur la branche `navItems`.

**5. Points d'attention pour les blocs suivants**
- `notifierJoueur` (src/lib/notifications.js) crée la clochette ET appelle `/api/send-player-email` (email selon préférences). Pour le bloc 4, tout test sur un vrai compte peut envoyer un vrai email : il faudra un compte de test ou un mode sans email, avec ton ok.
- Mémoire : les comptes de test ont été supprimés, aucun club test ni éducateur test n'existe aujourd'hui. Le bloc 3 (compte joueur concerné / non concerné) demande de les recréer.
- L'heure limite 22h Paris doit être calculée en base (fuseau Europe/Paris), pas sur le navigateur.
- `seances_uploadees` a ses propres règles de sécurité : un joueur ne peut pas lire une fiche. C'est une bonne raison de copier le contenu coché dans la table de publication plutôt que de donner accès à la fiche.

### Journal du bloc 1 (2026-11-02, Opus 5.5)

**Fichiers** : `supabase_entrainement_publie.sql` (à exécuter), `supabase_entrainement_publie_verification.sql` (contrôle en lecture seule, à lancer après).

**Ce qui est créé en base**
- `seances_publiees` : educateur_id, club_categorie_id (équipe active), entrainement_id (si l'entraînement est supprimé, la publication disparaît), fiche_id, date_seance, heure, lieu, theme, `procedes` (copie figée JSON des procédés cochés, au moins un obligatoire), `groupes` (choix faits dans la fenêtre : equipe, Gardien, Défenseur, Milieu, Attaquant, joueurs), created_at, updated_at (mis à jour automatiquement).
- `seances_publiees_destinataires` : une ligne par joueur (publication_id, joueur_id).
- Fonction `seance_publiee_ouverte(date, maintenant)` : jour J à Paris et avant 22h00, heure d'été et d'hiver gérées.
- Règles : l'éducateur propriétaire fait tout sur ses publications ; il ne peut ajouter comme destinataire qu'un joueur affilié (statut accepté) à cette équipe ; le joueur lit seulement une publication où il est destinataire, le jour J avant 22h, et seulement s'il est toujours affilié à l'équipe. Les séances passées restent visibles par l'éducateur (archive).

**Écarts par rapport au plan, et pourquoi**
- Les groupes de poste sont transformés en liste de joueurs au moment de publier (côté éducateur, avec `getPosteFamille` sur le poste de la fiche équipe), au lieu d'être stockés comme « groupe » et recalculés en base. Raisons : même calcul de poste que le reste de l'app, l'éducateur voit exactement qui reçoit, la notification du bloc 4 a besoin de cette liste, règle de lecture plus simple et plus sûre. Limite : un joueur ajouté à l'équipe après la publication ne la reçoit pas, sauf si l'éducateur republie (bloc 2 : « Modifier » recalcule la liste).
- Une seule « Séance du jour » par équipe et par date (republier = modifier). Si un jour deux séances sont nécessaires, il faudra lever cette contrainte.
- Date, heure et lieu sont copiés dans la publication (le joueur n'a pas à lire `entrainements`). Bloc 2 : si l'éducateur change l'heure de l'entraînement, recopier.

**Tests faits** : PostgreSQL local (PGlite, base jetable imitant Supabase), 32 contrôles sur 32 réussis : 21h59 / 22h00 / 22h01 hiver et été, minuit, veille, lendemain ; joueur destinataire voit, joueur de la même équipe non destinataire ne voit rien, joueur d'une autre équipe ne voit rien, joueur désaffilié ne voit plus rien ; joueur ne peut ni modifier ni supprimer ni ajouter ; autre éducateur ne voit ni ne modifie ; refus d'un destinataire hors équipe ; refus d'une publication sans procédé. Fichier relancé deux fois sans erreur.

**Clôture** : Kevin a exécuté le SQL en production, fichier de vérification 9/9 `ok = true` (2026-11-02).

**Correction du 2026-11-02 (décision Kevin)** : visible dès la publication (la veille ou avant), jusqu'à 22h Paris le jour de la séance, pour pouvoir mettre la suivante en ligne dès que celle du jour est passée. Fichier `supabase_entrainement_publie_visible_avant.sql` (remplace seulement la fonction `seance_publiee_ouverte`). Tests locaux 36/36 (dont séance de demain visible, séance dans une semaine visible, passage à l'heure d'été). Vérification mise à jour : 10 lignes.

**Questions pour Kevin avant le bloc 1**
1. Schéma animé : OK pour afficher l'animation seulement quand le procédé vient de la bibliothèque (lien ajouté), et l'image fixe sinon ? (Recommandé : simple et sans perte.)
2. Comptes de test : tu recrées un club test + un éducateur test + 2 joueurs (un concerné, un non) avant le bloc 3 ?
