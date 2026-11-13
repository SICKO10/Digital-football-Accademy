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
- Statut : fait
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
  - Avant le bloc 1 : relancer `sauvegarder.sh` (la dernière sauvegarde date du 2026-11-11).
  - Pour le bloc 1 : `outils_actifs` et `a_outil` (dans `supabase_outils_a_la_carte.sql`) exigent aujourd'hui que le club DÉTIENNE l'outil (`outils_comptes`) et ne regardent pas `modele_outils` ni `quota_equipes`. Les 3 outils `viaClub` (projet_sportif, cff4, stages) doivent garder cette règle. Le rang d'affiliation dépend de la colonne de date de `club_educateurs` (requête 1) : requête 1 faite : `club_educateurs.created_at` existe (date de création de la ligne, pas de date d'acceptation). Rang = `created_at` croissant, `id` pour départager ; une demande acceptée tard garde son rang d'origine, à signaler à Kevin au bloc 1.
  - Pour le bloc 2 : une limite existe déjà côté écran seulement, `educateurs_inclus` dans `accepterEducateur` (`src/pages/DashboardClub.jsx` ~l.2894, null = pas de limite). À remplacer par `quota_equipes` pour les clubs `modele_outils`. L'acceptation par invitation (`supabase/functions/accepter-invitation/index.ts` l.162, upsert statut `accepte`) n'a aucune limite : le garde-fou doit être en base. `AcceptInvite.jsx` ne touche pas `club_educateurs` (il gère joueurs et dirigeants).
  - Pour le bloc 6 : les notifications passent par la table `notifications` (user_id, type, titre, contenu, lien) ; requête 6 faite : `type` est libre (aucune contrainte, seulement la clé primaire et user_id vers profiles), le bloc 6 peut créer son propre type.
- Journal :
  - 2026-11-13, Sonnet 5.5 : commit des deux fichiers de plan et du brief (e04d15b, pas de push). Lecture du code faite. Requêtes de lecture écrites. Résultat reçu : requête 6 seulement (notifications.type libre). Requêtes 1 à 6 reçues. Requête 2 : le club d'essai est le SEUL club du nouveau modèle (palier c200, 7 places, 1 éducateur accepté, aucun dépassement) : aucun vrai club n'est concerné, le risque de retirer des outils à un client réel est nul à ce stade. Requête 5 : « Success », donc aucun outil ouvert ni détenu par le club d'essai (lu comme « aucune ligne » ; à reconfirmer au bloc 1, car l'essai du bloc 1 doit d'abord lui faire détenir ou ouvrir un outil).  Club d'essai (0e341547…) : modele_outils = FAUX, palier c200 (7 équipes, cohérent avec le catalogue), abonnement actif ; Kevin l'a passé au nouveau modèle (modele_outils vrai) le 2026-11-13, sur son seul retour « fait ». testfinal (75df7fba…) : modele_outils vrai, affilié accepté au club d'essai depuis le 2026-11-11, aucun palier propre.

### Bloc 1 : la règle en base (outils fournis et places)
- Statut : fait
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
  - Rang d'une place = date de la demande d'affiliation (`created_at`), pas de son acceptation : une demande ancienne acceptée tard passe devant un éducateur accepté avant elle. Choisir qui a une place n'est pas possible avec cette règle (voir bloc 4).
  - Le club peut fournir sans les détenir 7 outils (Suivi des joueurs, Stats collectives, Séances, Tacticboard, Bibliothèque, Préparation physique, Analyse vidéo) ; Stages, Projet sportif et CFF4 gardent l'ancienne règle. Le brief parle de « 9 outils » et de « 6 autres » : le catalogue en compte 7 + 3. À garder en tête pour les textes du bloc 5.
  - Fichier `supabase_outils_offerts_ANNULATION_NE_PAS_EXECUTER.sql` écrit (remet l'ancienne règle), à n'utiliser que sur décision explicite.
- Journal :
  - 2026-11-13, Opus 5.5 : trois fonctions ajoutées (`outil_offert_par_club`, `club_offre_outils`, `educateur_a_place`), troisième source « club » dans `outils_actifs` et `a_outil` (les deux règles existantes recopiées à l'identique), règle d'ouverture de `outils_club_ouverts` resserrée pour les 7 outils. `outil_ferme` non modifié. Forfait sans `quota_equipes` = aucune place (prudence). Testé sur une base Postgres 17 locale (installée via Homebrew, tables minimales imitant Supabase, club d'essai, testfinal, club ancien modèle à 3 éducateurs pour 2 places, éducateur payant) : 21 contrôles sur 21 passent ; le contrôle détecte bien une différence quand on en crée une ; l'annulation remet l'ancienne règle ; le fichier se relance sans erreur. 
  - 2026-11-13, Kevin : `supabase_outils_offerts.sql` exécuté en production, puis `supabase_outils_offerts_verification.sql` : 21 lignes sur 21 à `ok = true` (dont 19 : rien resté en base, 20 : accès des comptes réels identiques avant et après, 21 : places cohérentes). Bloc passé à « fait ». Avant le bloc 2 : relancer `sauvegarder.sh` (un SQL a tourné depuis la dernière sauvegarde).

### Bloc 2 : la limite à l'affiliation
- Statut : fait
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
  - Kevin, dans l'ordre : (1) `~/Sauvegardes-DigitalFootball/sauvegarder.sh` ; (2) `supabase_limite_educateurs.sql` en entier dans l'éditeur SQL, puis `supabase_limite_educateurs_verification.sql` en entier (18 lignes, toutes `ok = true`) ; (3) après mon « ok » : `supabase functions deploy accepter-invitation envoyer-invitation` ; (4) après mon « ok » : push ; (5) test réel (voir compte rendu). Le SQL doit passer AVANT le déploiement des fonctions (sans lui, elles ne bloquent simplement rien).
  - Limites voulues : clubs de l'ancien modèle et forfait sans `quota_equipes` : aucune limite en base (l'ancienne limite `educateurs_inclus` reste côté écran). Une demande en attente (par code, ou invitation d'un compte existant par recherche) n'est pas bloquée, seule l'acceptation l'est ; une invitation par email à un nouveau compte est refusée dès l'envoi si le club est plein, et à l'acceptation si le club s'est rempli entre-temps (le lien reste valable).
  - Pour le bloc 7 : un club au-dessus de sa limite (forfait réduit) voit « 5 / 4 places utilisées » dans l'onglet Éducateurs ; le garde-fou ne touche aucune affiliation déjà acceptée. Le bandeau « Voir les forfaits » renvoie à l'onglet Profil (choix d'offre en libre-service).
  - Aucun texte nouveau dans `translations.js` : les messages du club sont en français dans l'écran, comme le message de quota d'équipes existant.
- Journal :
  - 2026-11-13, Sonnet 5.5 : `supabase_limite_educateurs.sql` (fonction `limite_educateurs_atteinte`, réservée au serveur, et garde-fou sur `club_educateurs`, erreur code DF001, verrou du profil du club contre deux acceptations simultanées) + `supabase_limite_educateurs_verification.sql` (18 contrôles, sous-transaction annulée). Testé sur Postgres 17 local : 18 sur 18 ; sans le garde-fou, 7 contrôles échouent (le contrôle détecte bien une absence) ; fichier relançable ; deux acceptations simultanées : la seconde est refusée. Écart au plan : `envoyer-invitation` (compte existant, directement accepté) n'était pas listé et passait aussi à « accepte » : couvert. `AcceptInvite.jsx` inchangé : il affiche déjà `data.error` renvoyé par `accepter-invitation`. Les fonctions renvoient le refus en statut 200 avec `error`, car le navigateur ne lit pas le corps des réponses en erreur. `DashboardClub.jsx` : message + bouton « Voir les forfaits », « N / M places utilisées » (en-tête et carte des demandes). Build OK, 410 tests sur 410 (1 ignoré, comme avant).
  - 2026-11-13, Kevin : `supabase_limite_educateurs.sql` exécuté en production. Premier contrôle : 5 lignes fausses (2, 3, 5, 7, 8), cause = erreur du contrôle et non du garde-fou : le déclencheur existant `sync_quota_equipes` (UPDATE OF palier) remettait le quota du club d'essai à 7 dès que le contrôle écrivait `palier`. Reproduit en local en ajoutant ce déclencheur, contrôle corrigé (il n'écrit plus `palier`). Second contrôle en production : 18 lignes sur 18 à `ok = true` (dont 12 : chemin du navigateur avec les vraies règles d'accès, et 11 : rien resté en base). Reste : déploiement des 2 fonctions, push, test réel dans l'écran du club.
  - 2026-11-13, Kevin : « fait » après push (b71a276) et déploiement des 2 fonctions (accepter-invitation, envoyer-invitation). Bloc passé à « fait ». Non confirmé à l'écran : l'affichage « N / M places utilisées » de l'onglet Éducateurs et le message de refus (les captures reçues montrent Mon club, pas Éducateurs). À regarder au passage au bloc 4 ou 9.
  - 2026-11-13, Kevin : deux demandes ajoutées hors plan, voir « Demandes ajoutées en cours de chantier » en bas de ce fichier.

### Bloc 2b : le menu du club oublie des outils actifs (Finances, Classements)
- Statut : à faire
- Objectif : un outil dont l'interrupteur est allumé dans « Outils du club » apparaît dans le menu du club.
- Résultat testable : sur le club d'essai, Finances et partenaires allumé donne l'entrée « Finance » dans le menu Administratif, Compétition allumé donne « Classements » dans Sportif.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : lecture d'une règle d'affichage et correction courte, avec test.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 2b PLAN-outils-offerts.md`
- Dépend de : rien
- Prérequis : résultat de la lecture en base ci-dessous (Kevin).
- Constat (2026-11-13) : captures de Kevin, club d'essai : Finances et Compétition allumés, mais ni « Finance » ni « Classements » dans le menu.
- Piste : `menuVisible` applique d'abord les anciennes lignes `mon_club_affichage` (`cible = 'club'`, `visible = false`, « retiré du menu », `menuMasqueParLeClub` dans `src/lib/outilsAcces.js`), alors que l'interrupteur du nouveau modèle lit l'outil actif (`outils_actifs`). Le club d'essai vient de l'ancien modèle : des lignes anciennes peuvent le contredire. En nouveau modèle, plus rien n'écrit ces lignes (étape Outils du club écrit via `choisir_club`).
- Étapes :
  - Kevin colle le résultat de : `select outil, visible, maj_le from public.mon_club_affichage where cible = 'club' and club_id = (select id from auth.users where email = 'deabreu.amorim+club@gmail.com');` (lecture seule).
  - Si la piste est confirmée : en nouveau modèle, ne plus appliquer les lignes `mon_club_affichage` de la cible club (ou les ignorer dans `menuMasqueParLeClub` quand `modeleOutils`) ; test dans `tests/outilsAcces.test.js` ; l'ancien modèle ne change pas.
  - Sinon : chercher la vraie cause avant de coder, sans deviner.
- Ce que je teste pour valider : recharger le dashboard du club d'essai, voir Finance et Classements dans le menu.
- Reste à finir : Classements : aucune ligne de masquage en base pour Compétition, donc la correction ne le garantit pas. Si « Classements » manque encore après le test, vérifier que Compétition est bien un outil actif (source forfait) pour le club d'essai.
- Journal :
  - 2026-11-13, Sonnet 5.5 : lecture en base : une ligne `finances, visible = false` (12/11 17:40), aucune pour `competition`. Piste confirmée pour Finances. `menuMasqueParLeClub` (`src/lib/outilsAcces.js`) ignore désormais les anciennes lignes quand `modeleOutils` ; ancien modèle inchangé. Test ancien « le masquage s'ajoute au verrouillage » réécrit (il décrivait l'ancien comportement) + 1 test ajouté. 411 tests sur 411, build OK. En attente du test de Kevin avant commit.

### Bloc 2c : rubrique Configuration dans le menu du club
- Statut : fait, en attente du test de Kevin
- Objectif : alléger Mon club. La rubrique « Mes outils » du menu devient « Configuration » et réunit tout ce qui règle les outils.
- Résultat testable : dans le menu Administratif, « Configuration » remplace « Mes outils » et contient quatre sous-pages : Mon forfait (l'actuelle page Mes outils : forfait, abonnement, paiement), Outils du club (étape 5 de Mon club), Outils des éducateurs (étape 6, « Dashboard de mes éducateurs »), Journal des changements (étape 7). Mon club ne garde que Identité, Staff, Organigramme et Accès du bureau.
- Décisions de Kevin (2026-11-13) : la page Mes outils actuelle va dans Configuration, en première sous-page ; Configuration est visible pour tous les clubs, y compris l'ancien modèle (qui n'y voit pas Mon forfait, mais garde son interrupteur de menu dans Outils du club et le Journal).
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : déplacement d'écrans existants et de permissions de menu, logique déjà en place, peu de logique nouvelle.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2c PLAN-outils-offerts.md`
- Dépend de : bloc 2b (même zone du menu)
- Prérequis : aucun
- Points de vigilance à relire dans le code : `ETAPES_MON_CLUB` et `etapesMonClubVisibles` (`src/lib/menuClubGroupes.js`, testé par `tests/menuClubGroupes.test.js`), `NAV_ADMINISTRATIF` et l'onglet `mes_outils` (`src/pages/DashboardClub.jsx`), les tutoriels par étape (`src/components/tutoriels/TutorielsClub.jsx`, pages `mon_club_*`), les droits (`mon_club` pour régler ; `mes_outils` pour l'onglet), les liens et retours Stripe vers `mes_outils` (`retourDuPortail`), l'ancien lien `mon_club` + étape, et la clé `outils` du menu éducateur si elle partage le nom. Aucun texte client sans validation de Kevin. Aucune base touchée.
- Ce que je teste pour valider : club nouveau modèle (club d'essai) et un club ancien modèle : chaque sous-page s'ouvre, les interrupteurs marchent comme avant, le retour de paiement Stripe arrive sur Configuration > Mon forfait.
- Reste à finir :
  - Test de Kevin sur le club d'essai (nouveau modèle) et un club de l'ancien modèle, retour de paiement Stripe compris ; ensuite commit et push (avec le correctif 2b, encore non commité).
  - Les tutoriels gardent leurs textes et titres d'origine (« Mes outils », « Dashboard de mes éducateurs »), à reformuler si Kevin le veut.
- Journal :
  - 2026-11-13, Sonnet 5.5 : nouvelle rubrique « Configuration » (`src/components/monclub/Configuration.jsx`) avec Mon forfait, Outils du club, Outils des éducateurs, Journal des changements ; Mon club ne garde que Identité, Staff, Organigramme, Accès du bureau (`menuClubGroupes.js`). Visible pour tous les clubs ; Mon forfait seulement en nouveau modèle. L'ancien identifiant `mes_outils` (bouton « outil non activé », retour de paiement Stripe via `retourDuPortail`) ouvre Configuration sur Mon forfait. Aucune base touchée. 4 tests ajoutés, 2 adaptés : 416 tests, 0 échec (1 ignoré) ; build OK. Pas testé à l'écran (pas de navigateur dans la session).

### Bloc 3 : l'éducateur reçoit vraiment ses outils
- Statut : fait, en attente du test de Kevin
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
  - Test de Kevin après push : voir compte rendu. Les écrans du club ne montrent pas encore les 7 outils à fournir (bloc 4) : tant que le bloc 4 n'est pas fait, un club ne peut en ouvrir un que par l'API. Pour tester avec `testfinal`, il faut une ligne `outils_club_ouverts` (voir compte rendu).
  - Fermer un outil offert prévient tous les éducateurs affiliés, y compris ceux sans place (qui ne l'avaient pas) : réglé au bloc 6.
  - Le message sans place est écrit en « tu » comme le reste de l'appli éducateur (le plan disait « Votre »).
  - Du bloc 1 : `api/outils.js` action `ouvrir_club` (~l.712) refuse tout outil sans équivalent club (`outilEducateurPour`) : à ouvrir aux 7 outils quand `club_offre_outils` est vrai (la base l'autorise déjà). `outils_actifs` renvoie ces outils avec `source = 'club'` et `fin_le` vide.
- Journal :
  - 2026-11-13, Sonnet 5.5 : la base renvoie pour les 7 outils offerts une ligne `club` au nom de l'outil éducateur (ex. `tactique`), et pour Stages, Projet sportif et CFF4 au nom de l'outil club. Nouvelle règle commune dans `catalogueOutils.js` (`outilsOfferts`, `outilOuvrableParClub`, `cleFournitureClub`) utilisée par le menu, l'état des outils, le masquage et les doublons (`outilsAcces.js`). `api/outils.js` : `ouvrir_club` accepte les 7 outils offerts (sans que le club les détienne, mais avec un forfait choisi, même règle que la base) ; la notification de retrait suit. `useOutils` : nouveau `sansPlace` (club avec forfait et outil offert ouvert, éducateur au-delà de la limite). Textes : « Fourni par <nom du club> » (Mes outils), message sans place (Mes outils + encart d'accueil), phrase « Ton club peut aussi te le fournir » sur la carte d'un outil non activé. Aucune base touchée. 424 tests, 0 échec (1 ignoré) ; build OK. Pas testé à l'écran (pas de navigateur dans la session) : rien n'est poussé.

### Bloc 4 : l'écran du club dit la vérité
- Statut : fait, en attente du test de Kevin
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
  - Du bloc 1 : la règle ne permet pas de choisir qui a une place (rang = date de demande). « Donner sa place à » demande un ajout SQL (une priorité par affiliation) : à reporter au bloc 7. Pour savoir qui a une place : `educateur_a_place(club, educateur)`.
  - Journal et Rétablir : les changements d'outils fournis ne sont pas enregistrés dans le journal de Mon club (la table ne connaît que retiré/réaffiché du menu). Demande un ajout SQL : à décider au bloc 7 ou 9.
  - Mode « Individualisé » en nouveau modèle : ses interrupteurs règlent toujours le menu éducateur par éducateur, pas la fourniture (qui reste commune à tous). La fourniture individuelle est le bloc 8 (optionnel).
  - Aperçu : un outil que l'éducateur paie lui-même reste affiché chez lui, l'aperçu ne peut pas le savoir (déjà noté).
  - Pas testé à l'écran (pas de navigateur dans la session) ; rien n'est poussé.
- Journal :
  - 2026-11-13, Sonnet 5.5 : `EtapeEducateurs.jsx` reçoit `fourniture` ({ forfaitActif, places }) et `outils` (useOutils du club) depuis `DashboardClub.jsx` via `Configuration.jsx`. Nouveau modèle, mode « même pour tous » : les 10 outils éducateur du catalogue, interrupteur = `ouvrir_club` de `api/outils.js` (l'API prévient les éducateurs qui perdent l'outil ; ouvrir remet aussi l'entrée au menu si elle était retirée). Compteur « N / places » (quota_equipes), message et étiquette « Sans place » (rpc `educateur_a_place`), outils grisés sans forfait actif (« Prenez un forfait pour fournir des outils à vos éducateurs ») ou si le club ne détient pas Stages, Projet sportif, CFF4. Aperçu : `apercuMenuEducateur` accepte les outils fournis (4e paramètre), étiquette « Non fourni », éducateur sans place = socle seulement. Ancien modèle : aucun changement. Aucune base touchée. 428 tests, 0 échec (1 ignoré) ; build OK.

### Bloc 5 : textes, tutoriels et présentation des forfaits
- Statut : fait, en attente du test de Kevin
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
  - Relire les textes sur le site en ligne après push (pas testé à l'écran, pas de navigateur dans la session). Rien n'est poussé.
  - Le texte du paiement de forfait dit « un éducateur par équipe couverte » : exact tant que places = quota_equipes.
- Journal :
  - 2026-11-13, Sonnet 5.5 : phrases ajoutées sans tiret. Tarifs club (`Tarifs.jsx`) : « Inclut tous les outils pour tes N éducateurs » + note sous la grille, prix inchangés ; côté éducateur : « Ton club peut te fournir ces outils sans frais ». `PaiementForfaitClub.jsx` : le forfait couvre aussi les éducateurs affiliés. `MesOutils.jsx` : phrase sous « Autres outils » côté éducateur. Tutoriel `mon_club_educateurs` réécrit (offrir, places, sans place, forfait actif). Aucune base touchée. Tests OK, build OK.


### Bloc 6 : prévenir l'éducateur qui perd ses outils
- Statut : prêt, SQL à exécuter par Kevin
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
  - Kevin, dans l'ordre : (1) `~/Sauvegardes-DigitalFootball/sauvegarder.sh` ; (2) `supabase_fin_outils_club.sql` en entier, puis `supabase_fin_outils_club_verification.sql` en entier (21 lignes, toutes `ok = true`) ; (3) `supabase_fin_outils_club_simulation.sql` (une ligne : l'avis de testfinal) ; (4) l'avis ne s'affiche à l'écran qu'après le push de l'encart (avec les blocs 2b à 5, toujours non poussés).
  - Prévenir AVANT la fin : non fait. Quand un club résilie, Stripe envoie la date de fin, mais la base ne la garde pas pour un club (`outils_synchroniser_abonnement`, branche club, ne retient rien tant que l'abonnement court) : le déclencheur ne peut pas la voir. Le faire demande de modifier cette fonction de paiement (garder la date de fin programmée) : à décider par Kevin, bloc à part.
  - Perte de l'affiliation (le club retire l'éducateur) : pas d'avis de ce bloc, hors périmètre.
  - Tout changement manuel du forfait d'un club du nouveau modèle dans l'éditeur SQL prévient maintenant ses éducateurs (même règle).
  - Les contrôles des blocs 1 et 2 n'ont pas été relancés en local (ils demandent toute la structure Supabase) ; le déclencheur ne peut pas les faire échouer (erreurs avalées, aucune écriture sur leurs tables). Les relancer en production au bloc 9.
  - Pas testé à l'écran (pas de navigateur dans la session).
- Journal :
  - 2026-11-13, Opus 5.5 : déclencheur en base plutôt que dans le webhook (aucun changement Stripe) : `prevenir_fin_outils_club` sur `profiles` (après changement de plan, modele_outils, abonnement_actif, palier, quota_equipes, club du nouveau modèle seulement). Compare avant et après : fin du forfait ou sortie du nouveau modèle = tous ceux qui recevaient des outils ; forfait plus petit = ceux qui perdent leur place (même rang que `educateur_a_place`) ; Stages, Projet sportif, CFF4 perdus à la fin de l'abonnement. Seulement si le club fournissait au moins un outil ouvert, éducateurs au nouveau modèle. Type `outils_club_fin`, lien `/educateur`, un seul avis non lu par éducateur et par heure. Une erreur dans le déclencheur est avalée : un paiement ne peut jamais échouer à cause de lui. Texte en « tu » comme le reste de l'appli éducateur (le plan disait « Votre »). Testé sur Postgres 17 local (tables minimales, vraie fonction du webhook `outils_synchroniser_abonnement`) : 21 sur 21 ; sans le déclencheur, 12 lignes échouent ; fichier relançable ; simulation : avis reçu, club remis à l'identique, pas de doublon au 2e lancement. `api/outils.js` : fermer un outil offert ne prévient plus que les éducateurs qui ont une place (et personne sans forfait choisi), Stages, Projet sportif, CFF4 inchangés (reste à finir du bloc 3 réglé). `EncartOutilsClub.jsx` : affiche aussi l'avis de fin, bouton « Voir mes offres ». 3 tests ajoutés : 431 tests, 0 échec (1 ignoré) ; build OK. Sauvegarde : ~/Sauvegardes-DigitalFootball/outils-offerts-bloc6-2026-11-13/.

### Bloc 7 : le club voit et gère ses places
- Statut : fait, en attente du test de Kevin
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
  - Test de Kevin après push (pas testé à l'écran, pas de navigateur dans la session). Pour voir le bandeau : le club d'essai doit avoir plus d'éducateurs affiliés acceptés que de places (quota_equipes). Rien n'est poussé.
  - « Donner sa place à » (choisir qui garde ses outils) NON fait : la règle du bloc 1 donne les places dans l'ordre des demandes, le choix demande un ajout SQL (une priorité par affiliation, avec ton « ok » et une sauvegarde). Le bandeau ne promet donc pas ce choix : il propose de passer au forfait supérieur. À décider : bloc à part, ou avec le bloc 8.
  - Journal des changements d'outils fournis (reporté du bloc 4) : toujours non fait, demande aussi un SQL. À décider au bloc 9.
  - Le bouton « Voir mon forfait » ouvre Mon forfait (portail Stripe pour changer de forfait) ; je n'ai pas pu vérifier que le portail autorise le changement de forfait, à regarder lors de ton test.
  - Le bandeau n'est pas affiché dans Configuration (l'étape « Outils des éducateurs » dit déjà qui est sans place).
- Journal :
  - 2026-11-13, Sonnet 5.5 : `etatPlacesClub` (`catalogueOutils.js`) : surplus d'éducateurs sur `quota_equipes` et forfait suggéré par `forfaitPourEquipes` (null au-delà de 22 : « contactez le support »). Nouveau `BandeauPlaces.jsx` affiché sur l'accueil et dans Mon club, club du nouveau modèle avec forfait actif et surplus seulement, pour ceux qui voient Configuration. Boutons : « Voir mon forfait » (président seulement, sinon phrase « Seul le président peut changer le forfait »), « Voir qui est sans place » (ouvre Outils des éducateurs), ou « Contacter le support » si aucun forfait ne suffit. Aucune base touchée. 432 tests, 0 échec (1 ignoré) ; build et lint OK.

### Bloc 8 (optionnel) : outils fournis éducateur par éducateur [IDÉE du brief]
- Statut : prêt, SQL à exécuter par Kevin
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
  - Kevin, dans l'ordre : (1) `~/Sauvegardes-DigitalFootball/sauvegarder.sh` ; (2) `supabase_outils_offerts_educateur.sql` en entier ; (3) `supabase_outils_offerts_educateur_verification.sql` en entier (26 lignes, toutes `ok = true`) ; (4) l'écran n'affiche la fiche qu'après le push (avec les blocs 2b à 7, toujours non poussés). Le fichier du bloc 6 n'a pas besoin d'avoir été lancé avant : celui-ci recrée la fonction et le déclencheur d'avis de fin (si le bloc 6 est déjà lancé, rien ne se perd).
  - Journal et « Rétablir » pour ces changements : non fait (la table du journal ne connaît que retiré/réaffiché du menu, ajout SQL). Reste le bandeau « Annuler » après chaque changement. À décider au bloc 9, avec le journal des outils fournis à tous (déjà reporté).
  - Fournir un outil à un seul éducateur ne concerne que les 7 outils offerts (pas Stages, Projet sportif ni CFF4, qui suivent ce que le club détient). Pas de « retirer à un seul » un outil fourni à tous (le réglage est additif).
  - L'écran prend l'éducateur « sans place » en compte : interrupteur grisé avec « Sans place : forfait supérieur nécessaire ». Si une place se libère, la ligne reprend effet toute seule.
  - Pas testé sur le vrai site (pas de navigateur connecté dans la session) : l'écran a seulement été rendu avec des données factices (capture lue, thème clair). Le thème sombre et le téléphone ne sont pas regardés.
- Journal :
  - 2026-11-13, Sonnet 5.5 : table voisine `outils_educateur_fournis` (club, éducateur, outil) plutôt qu'une colonne ajoutée à `outils_club_ouverts` (clé primaire et requêtes existantes intactes). Lecture : le club et son staff, l'éducateur ses lignes ; écriture par `api/outils.js` seulement. `outils_actifs` et `a_outil` : la source « club » prend aussi ces lignes (mêmes conditions que la fourniture à tous : outil offert, `club_offre_outils`, `educateur_a_place`) ; autres sources recopiées à l'identique ; fourni à tous et à lui seul = une seule ligne. Déclencheur du bloc 6 mis à jour (`prevenir_fin_outils_club`) pour prévenir aussi l'éducateur qui perd un outil fourni à lui seul, et personne à tort. Testé sur Postgres 17 local (tables minimales, vrais fichiers des blocs 1, 6 et 8) : 26 contrôles sur 26 ; un changement volontaire de la règle fait bien échouer 3 contrôles ; fichier relançable ; essai à deux éducateurs affiliés (un seul reçoit l'outil, avis seulement pour celui qui perd). `api/outils.js` : action `fournir_educateur` (refus sans forfait, sans place, éducateur non affilié, outil non offert) ; fermer pour tous ne prévient plus celui à qui l'outil reste fourni à lui seul ; cesser de fournir à un seul prévient cet éducateur sauf si le club le fournit à tous. Écran : dans « Individualisé », chaque carte d'outil offert a une ligne « Fournir à X seulement », pastille « N fournis à lui seul » sur l'onglet, aperçu qui en tient compte ; Analyse vidéo et Stats collectives (sans entrée de menu à régler) apparaissent avec la seule ligne de fourniture. Correction au passage : erreur de lint du bloc 4 (`setSansPlace` dans un effet). 9 tests ajoutés : 440 tests, 0 échec (1 ignoré) ; build OK ; lint des fichiers touchés propre. Sauvegarde : ~/Sauvegardes-DigitalFootball/outils-offerts-bloc8-2026-11-13/.


### Bloc 9 : vérification finale et nettoyage
- Statut : fait côté code, parcours de Kevin en attente (SQL des blocs 6 et 8, puis push, puis test)
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
  - Kevin, dans l'ordre : (1) `~/Sauvegardes-DigitalFootball/sauvegarder.sh` ; (2) `supabase_fin_outils_club.sql` puis `supabase_fin_outils_club_verification.sql` (21 lignes `ok = true`) puis `supabase_fin_outils_club_simulation.sql` (bloc 6) ; (3) `supabase_outils_offerts_educateur.sql` puis `supabase_outils_offerts_educateur_verification.sql` (26 lignes `ok = true`) (bloc 8) ; (4) relancer `supabase_outils_offerts_verification.sql` (21 lignes) et `supabase_limite_educateurs_verification.sql` (18 lignes) : ils n'ont pas été relancés après les blocs 6 et 8 ; (5) me dire « ok » pour le commit et le push (le SQL doit passer AVANT le push : l'écran « Fournir à X seulement » appelle une table qui n'existe pas sans le bloc 8) ; (6) parcours sur digitalfootball.academy (liste ci-dessous).
  - Parcours à refaire par Kevin (club d'essai `deabreu.amorim+club@gmail.com`, éducateur `testfinal`) : le club allume un outil dans « Outils des éducateurs », `testfinal` le voit dans son menu et l'ouvre ; club à N+1 éducateurs sur N places : bandeau « sans place », demande refusée avec message ; `testfinal` sans place : message « sans place » ; fin de forfait simulée (`supabase_fin_outils_club_simulation.sql`) : avis dans la cloche de `testfinal` ; menu du club : Finance et Classements présents, rubrique Configuration ; un outil fourni à `testfinal` seul ; non-régression : un éducateur qui paie lui-même garde ses outils, un club de l'ancien modèle ne voit aucun changement, Stages, Projet sportif et CFF4 inchangés ; thème sombre et téléphone jamais regardés.
  - Encore jamais vu à l'écran (aucun navigateur dans les sessions des blocs 2b à 8) : tout l'affichage de ces blocs.
  - Décisions pour Kevin, rien de commencé (chacune demande un SQL) : (a) « Donner sa place à » (choisir qui garde ses outils, aujourd'hui l'ordre des demandes) ; (b) journal et « Rétablir » des changements d'outils fournis (à tous ou à un seul) ; (c) prévenir l'éducateur AVANT la fin du forfait (demande de garder la date de fin programmée dans la fonction de paiement). À regrouper en un chantier « suite » si tu les veux.
  - Le portail Stripe autorise-t-il le changement de forfait ? À regarder avec le bouton « Voir mon forfait » du bandeau.
  - Anciens clubs : aucun changement voulu, aucune migration prévue.
- Journal :
  - 2026-11-13, Sonnet 5.5 : vérifications automatiques : 440 tests, 0 échec (1 ignoré) ; build OK ; lint des 25 fichiers modifiés : mêmes erreurs qu'avant le chantier (comparaison avec le dernier commit, fichier par fichier : aucune erreur ajoutée, les 40 restantes datent d'avant, surtout les gros tableaux de bord). Relecture : pas de TODO, console.log ni texte à compléter dans les fichiers touchés. Fichiers SQL du chantier tous à la racine, un fichier + un contrôle par bloc, les annulations nommées `_ANNULATION_NE_PAS_EXECUTER`. Aucun SQL lancé, rien commité ni poussé par cette session. Parcours en production non fait : pas de navigateur dans la session, SQL des blocs 6 et 8 non confirmés.
  - 2026-11-13, Kevin : SQL du bloc 6 (`supabase_fin_outils_club.sql`) puis du bloc 8 (`supabase_outils_offerts_educateur.sql`) exécutés en production, « les deux succès » (contrôles de 21 et 26 lignes, détail des lignes non transmis). Restent : les deux contrôles de relance des blocs 1 et 2, la simulation de fin de forfait (après le push), le « ok » pour commit et push, puis le parcours à l'écran.
  - 2026-11-13, Kevin : contrôles de relance en production : limite d'éducateurs 18 sur 18 ; outils fournis 20 sur 21. Ligne 19 à `false` (1 outil ouvert au lieu de 0) : l'outil est `projet_sportif`, que les cas d'essai du contrôle n'ouvrent jamais, donc réglage fait par Kevin dans l'écran, pas un reste d'essai. Le contrôle 19 date du bloc 1, quand le club d'essai n'avait rien : à lire comme « pas d'autre outil que ceux allumés par Kevin ». Pour la simulation de fin de forfait, le club d'essai doit fournir un des 7 outils offerts (Tacticboard par exemple) : `projet_sportif` ne suffit pas.
  - 2026-11-13, Sonnet 5.5 : commit 1d083b6 poussé sur `main` après le « ok » de Kevin (33 fichiers : blocs 2b à 9, SQL et contrôles inclus). Déploiement en production lancé ; parcours à l'écran à faire par Kevin.
  - 2026-11-13, Sonnet 5.5 : correctif demandé par Kevin après ses captures (Mon forfait et Outils du club étaient des doublons, héritage du bloc 2c). Dans Configuration, club du nouveau modèle : « Mon forfait » ne garde que l'abonnement (bloc Mon abonnement, président) et une carte « Forfait N équipes, X éducateurs affiliés sur N places » (`phrasePlacesClub`), sans les interrupteurs, qui restent dans « Outils du club » et « Outils des éducateurs ». Ancien modèle et page éducateur : inchangés (`forfaitClub` nul). 441 tests, 0 échec (1 ignoré) ; build OK ; lint propre sur les fichiers touchés. Pas vu à l'écran. Note : le bloc « Mon abonnement » n'apparaît que si le club a un vrai abonnement Stripe (absent du club d'essai).
  - 2026-11-13, Sonnet 5.5 : « Mon forfait » refait à la demande de Kevin (`MonAbonnement.jsx`, club). Grande carte : forfait N équipes et prix, pastille Actif / Résilié / Paiement en retard, faits (Souscrit le, Prochain renouvellement ou Prend fin le, Paiement mensuel ou annuel, Équipes couvertes), jauge des places, boutons « Passer au forfait supérieur » (forfait juste au-dessus, présélectionné), « Changer de forfait », paiement annuel/mensuel, Factures et carte, Résilier avec confirmation. La date de souscription vient de Stripe (`start_date`, sinon `created`) : `api/outils.js` la renvoie dans l'action `abonnement` (`debut`), rien n'est écrit en base. Club sans abonnement Stripe (cas du club d'essai) : carte forfait et places seulement, avec la phrase « aucun abonnement de paiement n'est rattaché ». Non-président : même carte en lecture seule, sans appel à Stripe. Les boutons de gestion n'existaient déjà que pour un vrai abonnement : ils ne s'afficheront pas sur le club d'essai. 442 tests, 0 échec (1 ignoré) ; build et lint OK. Rendu vérifié par un rendu serveur pour les deux cas sans abonnement ; la grande carte avec abonnement n'a pas pu être rendue hors navigateur (données chargées après l'ouverture).
  - 2026-11-13, Sonnet 5.5 (hors chantier, demande de Kevin : connexion et changement de vue éducateur/club plus rapides) : 1) `Login.jsx` n'appelle plus `getUser()` après la connexion (l'utilisateur est dans la réponse), un aller-retour réseau de moins ; 2) `SmartDashboard` (`App.jsx`) et les deux `init` des dashboards club et éducateur lisent la session de l'appareil (`getSession`) au lieu de `getUser()` (appel réseau) ; 3) `DashboardClub` charge les autres rôles du compte en parallèle des autres chargements au lieu de les attendre avant ; 4) nouveau `src/lib/prechargement.js` : la dernière vue ouverte est mémorisée et son code est téléchargé dès le clic sur « Se connecter » ; dans chaque dashboard, le code de l'autre vue du compte est téléchargé d'avance (changement de vue sans attente de téléchargement). Aucune base touchée. 444 tests, 0 échec ; build et lint inchangés. Gain non mesuré (pas de navigateur dans la session) : à ressentir par Kevin.
