# PLAN : le club offre les outils à ses éducateurs affiliés
Date : 2026-11-12 · Brief : BRIEF-outils-offerts.md · Suite de PLAN-mon-club.md

Un club du nouveau modèle avec un forfait actif peut fournir librement les 9 outils éducateur à ses éducateurs affiliés, qui ne paient rien, dans la limite de places de son forfait (forfait 4 équipes = 4 éducateurs).
L'interrupteur de l'étape « Dashboard de mes éducateurs » veut enfin dire « le club fournit cet outil », et l'éducateur est prévenu dans sa cloche quand il perd ces outils.

## Décisions prises au /plan (2026-11-12)
- **Places** : nombre de places = `profiles.quota_equipes` du club (2, 4, 7, 11, 15, 22). On compte les éducateurs distincts affiliés acceptés, pas les équipes.
- **Club au-dessus de sa limite** (trop d'éducateurs, ou passage à un forfait plus petit) : les premiers affiliés gardent les outils, les suivants n'ont que le socle. Le club voit qui est sans place et peut changer qui a une place ou monter de forfait. Aucune affiliation n'est supprimée.
- **Nouvelle demande au-delà de la limite** : refusée avec un message clair au club (« Votre forfait permet N éducateurs, passez au forfait supérieur »).
- **Fin du forfait du club** : notification dans la cloche de l'éducateur, avec la date et un bouton vers ses propres offres. Aucun email.
- **Prix** : aucun prix Stripe ne change. Une phrase ajoutée sur la présentation des forfaits club.
- **Club d'essai** : `deabreu.amorim+club@gmail.com`, éducateur d'essai `testfinal`.
- **Seuls les clubs du nouveau modèle** (`profiles.modele_outils` vrai) sont concernés. Les clubs de l'ancien modèle ne voient aucun changement.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Accès au club d'essai `deabreu.amorim+club@gmail.com` (mot de passe connu de toi) | Tester côté club | Ton gestionnaire de mots de passe | Bloc 4 |
| Accès à l'éducateur `testfinal` | Tester côté éducateur | Idem | Bloc 3 |
| Résultat des requêtes de lecture du bloc 0 (copier-coller) | Savoir si un vrai club dépasse déjà sa limite, et comment s'appelle la colonne de date d'affiliation | Éditeur SQL Supabase | Bloc 1 |
| Ton « ok » avant chaque SQL en production | Règle de prudence | Dans la session du bloc | Blocs 1, 2, 6, 8 |

## Manipulations à faire moi-même
1. Avant le bloc 1 : lancer la sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` (le bloc 0 te le rappelle).
2. Bloc 0 : coller dans l'éditeur SQL Supabase les requêtes de lecture seule fournies, et me renvoyer les résultats.
3. Blocs 1, 2, 6 et 8 : exécuter le fichier SQL du bloc dans l'éditeur SQL Supabase, puis le fichier de contrôle, et me renvoyer le résultat. Sauvegarde juste avant si un autre SQL a tourné depuis la dernière.
4. Si le club d'essai n'est pas au nouveau modèle, n'a pas de forfait actif, ou si `testfinal` ne lui est pas affilié : le bloc 0 te donne la marche à suivre exacte (rien n'est fait à ta place sur un compte).
5. Après chaque push : tester sur digitalfootball.academy (chaque push déploie en production).

## Répartition suggérée
Je ne vois pas ta barre de statut d'ici : à toi de vérifier la fenêtre « 5h » avant chaque bloc (sous 30 % pour un bloc Opus).
- Jour 1 : bloc 0 (faible) puis bloc 1 (Opus, élevé), si la fenêtre est fraîche.
- Jour 2 : blocs 2 et 3.
- Jour 3 : blocs 4 et 5.
- Jour 4 : blocs 6 et 7.
- Jour 5 : bloc 9 (vérification finale). Le bloc 8 (optionnel, par éducateur) peut venir plus tard, avant ou après le 9.

Rappel : `/clear` et une session neuve par bloc. Les blocs Opus sont courts : ne rien enchaîner derrière.

## Blocs

### Bloc 0 : mise en place et état des lieux
- Statut : à faire
- Objectif : sauvegarder, connaître la situation réelle en base avant de toucher aux règles.
- Résultat testable : un tableau dans le journal du bloc : clubs du nouveau modèle, leur forfait, leur nombre d'éducateurs affiliés, ceux au-dessus de la limite ; état du club d'essai et de `testfinal`.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : lecture du code et requêtes de lecture, rien de délicat.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-outils-offerts.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Commit de `BRIEF-outils-offerts.md` et `PLAN-outils-offerts.md`, rappel à Kevin de lancer `sauvegarder.sh`.
  - Écrire `supabase_outils_offerts_etat.sql` (lecture seule) : colonnes réelles de `club_educateurs` (date d'acceptation ?), clubs `modele_outils` avec `palier`, `quota_equipes`, `abonnement_actif`, nombre d'éducateurs acceptés, dépassements ; état de `deabreu.amorim+club@gmail.com` et `testfinal` ; contraintes éventuelles sur `notifications.type`.
  - Relever dans le code où l'accès « via le club » est calculé côté appli (`src/lib/useOutils.js`, `src/lib/outilsAcces.js`, `api/outils.js`) et où une affiliation passe à « accepte » (`src/pages/DashboardClub.jsx`, `src/pages/AcceptInvite.jsx`, `supabase/functions/accepter-invitation`).
  - Noter dans « Reste à finir » de chaque bloc concerné ce que la lecture change (nom de colonne, cas réels de dépassement).
- Ce que je teste pour valider : je lance la requête, je lis le tableau, il correspond à ce que je connais de mes clubs.
- Reste à finir :
  - Kevin : lancer `sauvegarder.sh`, puis exécuter les 6 requêtes de `supabase_outils_offerts_etat.sql` (une à la fois) et coller les résultats ; je les recopie dans le journal ci-dessous et je clos le bloc.
  - Pour le bloc 1 : `outils_actifs` et `a_outil` (dans `supabase_outils_a_la_carte.sql`) exigent aujourd'hui que le club DÉTIENNE l'outil (`outils_comptes`) et ne regardent pas `modele_outils` ni `quota_equipes`. Les 3 outils `viaClub` (projet_sportif, cff4, stages) doivent garder cette règle. Le rang d'affiliation dépend de la colonne de date de `club_educateurs` (requête 1) : aucune date n'est créée par les fichiers SQL du dépôt, à confirmer.
  - Pour le bloc 2 : une limite existe déjà côté écran seulement, `educateurs_inclus` dans `accepterEducateur` (`src/pages/DashboardClub.jsx` ~l.2894, null = pas de limite). À remplacer par `quota_equipes` pour les clubs `modele_outils`. L'acceptation par invitation (`supabase/functions/accepter-invitation/index.ts` l.162, upsert statut `accepte`) n'a aucune limite : le garde-fou doit être en base. `AcceptInvite.jsx` ne touche pas `club_educateurs` (il gère joueurs et dirigeants).
  - Pour le bloc 6 : les notifications passent par la table `notifications` (user_id, type, titre, contenu, lien) ; la requête 6 dira si `type` est libre.
- Journal :
  - 2026-11-13, Sonnet 5.5 : commit des deux fichiers de plan et du brief (e04d15b, pas de push). Lecture du code faite. Requêtes de lecture écrites, en attente des résultats de Kevin.

### Bloc 1 : la règle en base (outils fournis et places)
- Statut : à faire
- Objectif : un club du nouveau modèle au forfait actif peut ouvrir n'importe lequel des 9 outils éducateur, et seuls ses N premiers éducateurs affiliés les reçoivent.
- Résultat testable : le fichier de contrôle renvoie les valeurs attendues ; en base, `outils_actifs(testfinal)` liste les outils ouverts par le club avec la source `club` ; un éducateur au-delà de la limite ne reçoit rien ; les clubs de l'ancien modèle ne changent pas.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : on réécrit les fonctions qui décident de l'accès payant (`outils_actifs`, `a_outil`) et dont dépend le verrou de toutes les pages : une erreur ouvre des outils gratuitement ou ferme ceux de clients qui paient.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 1 PLAN-outils-offerts.md`
- Dépend de : bloc 0
- Prérequis : sauvegarde faite ; résultats du bloc 0 connus ; « ok » de Kevin avant exécution.
- Étapes :
  - Nouvelle fonction `club_offre_outils(club)` : vrai si `modele_outils`, `abonnement_actif` et forfait (`palier`) présents. Nouvelle fonction `educateur_a_place(club, educateur)` : rang par date d'affiliation acceptée inférieur ou égal à `quota_equipes`.
  - `outils_actifs` et `a_outil` : pour les outils éducateur, accepter l'ouverture du club si `club_offre_outils` et `educateur_a_place`, sans exiger que le club détienne l'outil ; garder la règle actuelle (`viaClub`) pour Stages, Projet sportif, CFF4 et pour les clubs de l'ancien modèle.
  - Règle d'écriture de `outils_club_ouverts` : le club peut ouvrir les outils éducateur seulement si `club_offre_outils`.
  - Fichier `supabase_outils_offerts.sql` + `supabase_outils_offerts_verification.sql` (cas : club nouveau modèle, ancien modèle, sans forfait, éducateur hors place, éducateur qui paie déjà, verrou toujours fermé pour un compte sans outil).
  - Ne pas modifier `outil_ferme` ni le verrou : ils appellent `a_outil`, vérifier qu'ils suivent.
- Ce que je teste pour valider : j'exécute les deux fichiers, je renvoie le résultat du contrôle ; je me connecte à un compte éducateur payant existant et ses outils sont toujours là.
- Reste à finir :
- Journal :

### Bloc 2 : la limite à l'affiliation
- Statut : à faire
- Objectif : un club au nouveau modèle ne peut pas accepter plus d'éducateurs que son forfait ne le permet.
- Résultat testable : avec un forfait 2 équipes et 2 éducateurs acceptés, accepter un 3e affiche « Votre forfait permet 2 éducateurs. Passez au forfait supérieur pour en accueillir plus. » avec un lien vers les forfaits ; rien n'est enregistré en base.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : SQL court (un garde-fou en base) et messages d'écran ; la logique d'accès est déjà posée au bloc 1.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-outils-offerts.md`
- Dépend de : bloc 1
- Prérequis : sauvegarde ; « ok » de Kevin avant exécution.
- Étapes :
  - Garde-fou en base sur `club_educateurs` : refuser le passage à `accepte` au-delà de `quota_equipes` pour un club `modele_outils` (les affiliations existantes ne sont pas touchées). Fichier SQL + contrôle.
  - Traduire l'erreur en message clair partout où l'on accepte : `DashboardClub.jsx`, `AcceptInvite.jsx`, fonction `accepter-invitation`.
  - Afficher « 3 / 4 places utilisées » près des demandes d'affiliation.
- Ce que je teste pour valider : sur le club d'essai, accepter une demande de trop et voir le message ; vérifier qu'une demande dans la limite passe toujours.
- Reste à finir :
- Journal :

### Bloc 3 : l'éducateur reçoit vraiment ses outils
- Statut : à faire
- Objectif : l'appli de l'éducateur affiche et ouvre les outils fournis par son club.
- Résultat testable : `testfinal`, avec Tacticboard et Bibliothèque ouverts par le club, voit ces deux outils dans son menu, peut les utiliser et enregistrer, et voit « Fourni par <nom du club> » dans Mes outils.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : branchement de l'appli sur la nouvelle règle, plusieurs fichiers liés mais logique déjà décidée.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-outils-offerts.md`
- Dépend de : bloc 1
- Prérequis : SQL du bloc 1 exécuté.
- Étapes :
  - Mettre `src/lib/outilsAcces.js`, `src/lib/useOutils.js` et `api/outils.js` en accord avec la base (fin de la condition « le club doit détenir l'outil » pour les outils éducateur).
  - Mes outils côté éducateur : mention « Fourni par ton club » et, s'il paie aussi, le message de doublon existant qui l'invite à résilier le sien.
  - Éducateur sans place : message simple « Votre club a atteint sa limite d'éducateurs : vous avez le socle gratuit » avec lien vers ses offres.
  - Tests automatiques sur les nouveaux cas, build.
- Ce que je teste pour valider : connexion `testfinal` sur digitalfootball.academy, ouvrir Tacticboard, créer et enregistrer un schéma.
- Reste à finir :
- Journal :

### Bloc 4 : l'écran du club dit la vérité
- Statut : à faire
- Objectif : dans Mon club, étape « Dashboard de mes éducateurs », l'interrupteur allumé veut dire « fourni », avec le compteur de places et l'aperçu juste.
- Résultat testable : le club allume Préparation physique, l'éducateur la reçoit ; l'en-tête affiche « 3 / 4 places » ; les éducateurs sans place apparaissent à part avec « Sans place : socle seulement » ; « Voir comme un éducateur » montre exactement le menu reçu.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : écran et textes sur une base existante (`EtapeEducateurs.jsx`, `ApercuMenuEducateur.jsx`).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-outils-offerts.md`
- Dépend de : blocs 1 et 3
- Prérequis : aucun.
- Étapes :
  - Interrupteur = ouvrir ou fermer dans `outils_club_ouverts` (et garder la règle d'affichage du menu pour les outils que l'éducateur paie lui-même).
  - Compteur de places, liste « sans place », bouton « Donner sa place à » pour changer qui a une place (si la règle du bloc 1 le permet ; sinon reporté, noté ici).
  - Corriger l'aperçu et les textes de l'étape ; club sans forfait : interrupteurs grisés avec « Prenez un forfait pour fournir des outils à vos éducateurs ».
  - Journal et bouton Rétablir de Mon club : enregistrer ces changements comme les autres.
- Ce que je teste pour valider : club d'essai et `testfinal` dans deux navigateurs : allumer, éteindre un outil, regarder le menu de l'éducateur.
- Reste à finir :
- Journal :

### Bloc 5 : textes, tutoriels et présentation des forfaits
- Statut : à faire
- Objectif : partout où le club choisit ou découvre son forfait, il comprend qu'il inclut les outils de ses éducateurs.
- Résultat testable : la présentation des forfaits club indique « Inclut tous les outils pour vos N éducateurs » ; le tutoriel de l'étape « Dashboard de mes éducateurs » est à jour ; aucun prix modifié.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : textes destinés aux clients, pas de logique.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 5 PLAN-outils-offerts.md`
- Dépend de : bloc 4
- Prérequis : aucun.
- Étapes :
  - Phrase sur les forfaits (catalogue et page d'abonnement club), sans tiret long ni moyen.
  - Tutoriel dans `src/components/tutoriels/TutorielsClub.jsx` et textes d'aide de l'étape.
  - Côté éducateur : une phrase dans ses offres « Votre club peut vous fournir ces outils ».
- Ce que je teste pour valider : relire les textes sur le site en ligne, côté club et côté éducateur.
- Reste à finir :
- Journal :

### Bloc 6 : prévenir l'éducateur qui perd ses outils
- Statut : à faire
- Objectif : quand le club n'a plus de forfait actif, passe à un forfait plus petit ou ferme un outil, chaque éducateur concerné reçoit une notification dans sa cloche, avec la date.
- Résultat testable : forfait du club d'essai arrêté (ou simulé en base sur le club d'essai uniquement) : `testfinal` reçoit « Votre club ne fournit plus vos outils depuis le JJ/MM. Vos données sont conservées. » avec un bouton vers ses offres ; ses séances et schémas sont toujours là.
- Modèle : opus · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : touche à la fin d'abonnement (paiement) et à des comptes clients réels ; il faut éviter les notifications en double ou envoyées à tort.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 6 PLAN-outils-offerts.md`
- Dépend de : blocs 1 et 3
- Prérequis : sauvegarde si SQL ; « ok » de Kevin avant exécution.
- Étapes :
  - Choisir le déclencheur le plus sûr : de préférence en base (changement de `abonnement_actif` ou `quota_equipes` du club), pour ne pas toucher au webhook Stripe ; sinon dans `stripe-webhook-outils`, avec l'accord de Kevin.
  - Notifier les éducateurs qui perdent leur place ou leurs outils ; une seule notification par éducateur et par changement.
  - Si la date de fin programmée est connue à l'avance, prévenir aussi avant la fin (à vérifier en lisant le webhook, sinon noter pourquoi non).
  - Aucun email (cloche seulement). Tests et fichier de contrôle.
- Ce que je teste pour valider : regarder la cloche de `testfinal` après la simulation, puis remettre le club d'essai dans son état (procédure donnée par le bloc, pas de retour arrière prêt à lancer).
- Reste à finir :
- Journal :

### Bloc 7 : le club voit et gère ses places
- Statut : à faire
- Objectif : un club au-dessus de sa limite comprend la situation et sait quoi faire.
- Résultat testable : un club avec 6 éducateurs au forfait 4 voit un bandeau « 2 éducateurs sans place : choisissez qui garde ses outils ou passez au forfait 7 équipes » avec un bouton vers le forfait supérieur.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : écran et textes sur des règles déjà en place.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7 PLAN-outils-offerts.md`
- Dépend de : blocs 4 et 6
- Prérequis : aucun.
- Étapes :
  - Bandeau dans Mon club et sur l'accueil du dashboard club quand il y a des éducateurs sans place.
  - Forfait suggéré calculé avec `forfaitPourEquipes` (`src/lib/catalogueOutils.js`).
  - Si le bloc 4 a reporté « Donner sa place à », le faire ici.
- Ce que je teste pour valider : sur le club d'essai, avec plus d'éducateurs que de places (ou forfait 2 équipes), voir le bandeau et le bouton.
- Reste à finir :
- Journal :

### Bloc 8 (optionnel) : outils fournis éducateur par éducateur [IDÉE du brief]
- Statut : à faire
- Objectif : le club clique sur le nom d'un éducateur et choisit les outils fournis et son menu, pour lui seul.
- Résultat testable : le club fournit Préparation physique à un seul éducateur ; lui la reçoit, l'autre non.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : prolongement du mode individualisé existant, avec un SQL court (outil ouvert pour un éducateur précis).
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 8 PLAN-outils-offerts.md`
- Dépend de : blocs 1, 4 et 6
- Prérequis : sauvegarde ; « ok » de Kevin avant exécution.
- Étapes :
  - SQL : ouverture d'un outil pour un éducateur précis (colonne éducateur facultative dans `outils_club_ouverts`, ou table voisine), prise en compte dans `outils_actifs` et `a_outil`. Fichier + contrôle.
  - Fiche de l'éducateur au clic sur son nom : outils fournis et menu, avec Journal et Rétablir.
  - Notifications du bloc 6 appliquées aussi à ces changements.
- Ce que je teste pour valider : deux éducateurs d'essai, un outil fourni à un seul.
- Reste à finir :
- Journal :

### Bloc 9 : vérification finale et nettoyage
- Statut : à faire
- Objectif : parcours complet vérifié en production, plans et mémoire à jour.
- Résultat testable : la liste de contrôle du bloc est entièrement cochée avec preuves (tests, captures, résultats SQL).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : relecture et tests, pas de décision délicate.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 9 PLAN-outils-offerts.md`
- Dépend de : blocs 0 à 7 (et 8 s'il est fait)
- Prérequis : aucun.
- Étapes :
  - Parcours : club fournit un outil, éducateur l'utilise, limite atteinte, éducateur sans place, fin de forfait, notification.
  - Non-régression : éducateur qui paie lui-même, club de l'ancien modèle, verrou en base, Stages, Projet sportif et CFF4.
  - Tests automatiques, build, lint ; fichiers SQL rangés ; mise à jour de BRIEF, PLAN et mémoire.
  - Commit et push en français après ton « ok ».
- Ce que je teste pour valider : je refais le parcours principal moi-même sur digitalfootball.academy.
- Reste à finir :
- Journal :
