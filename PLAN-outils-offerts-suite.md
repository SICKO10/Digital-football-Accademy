# PLAN : suite du chantier « le club offre les outils » (places choisies, journal, avis avant la fin)
Date : 2026-11-13 · Brief : BRIEF-outils-offerts-suite.md · Suite de PLAN-outils-offerts.md (blocs 0 à 9 clos)

Objectif : le club choisit quels éducateurs ont une place, chaque changement d'outil fourni ou de place est inscrit au journal de Mon club et peut être rétabli, et l'éducateur est prévenu dans sa cloche dès que le club résilie, avec la date de fin.

## Décisions prises (brief + questions du 2026-11-13)

1. **Places : choix du club, puis ancienneté.** Pour chaque éducateur affilié, le club peut « donner une place » (place garantie) ou « retirer la place » (jamais de place, même s'il en reste). Les éducateurs jamais touchés restent en automatique. Ordre de la base : places garanties d'abord (par ancienneté entre elles), puis les automatiques par ancienneté (règle actuelle), les places retirées jamais. Un club qui ne touche à rien garde exactement la répartition d'aujourd'hui.
2. **Donner une place quand tout est plein** : l'écran demande quel éducateur libère la sienne (sa place est alors retirée). Pas de dépassement du forfait.
3. **L'éducateur qui perd sa place** à cause d'un choix du club reçoit un avis dans la cloche, même texte que « plus de place ». Celui qui en gagne une ne reçoit rien (même règle qu'aujourd'hui quand un outil est fourni).
4. **Journal** : y entrent les outils fournis à tous, les outils fournis à un seul éducateur, et les places données ou retirées. Chaque ligne a « Rétablir ». Aucune limite au nombre de changements.
5. **Avis avant la fin du forfait** : envoyé au moment où le club résilie (cloche seulement, pas d'email), avec la date de fin. Un seul avis par éducateur : si la date change, l'avis est corrigé ; si le club reprend son abonnement, l'avis non lu est retiré (un avis lu est suivi d'un court « votre club continue ») ; à la date de fin, l'avis existant « après la fin » le remplace.
6. **Rappel 7 jours avant** : bloc optionnel, à décider après avoir vu le reste.
7. **Paiement** : le webhook Stripe des outils envoie déjà la date de fin et l'information « résiliation » à la base (`outils_synchroniser_abonnement`, paramètres `p_fin` et `p_resiliation`). Seule la branche club de cette fonction SQL change. Aucun prix, aucun webhook, aucun code Stripe n'est modifié.
8. **Clubs de l'ancien modèle** : rien ne change (ni écran, ni base, ni avis).
9. Seul le compte du club change les places et rétablit (même règle que les outils fournis aujourd'hui).

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Résultat de la photo des places (SQL lecture seule) | Comparer avant et après le changement de règle : chaque club doit garder les mêmes éducateurs avec place | SQL Editor de Supabase, fichier écrit au bloc 0 | Bloc 1 |
| Un club test au nouveau modèle avec au moins 3 éducateurs affiliés et moins de places que d'éducateurs (ou dis-moi lesquels tu as) | Tester donner, retirer, échanger une place | `GUIDE-COMPTES-TEST-MON-CLUB.md` | Bloc 2 |
| Savoir si ce club test a un forfait réellement payé | Si oui, on teste une vraie résiliation puis une reprise ; sinon, simulation en base seulement | Page Mon forfait du club test | Bloc 6 |

## Manipulations à faire moi-même
1. Avant le bloc 1 (conseillé) : finir ton parcours de test de PLAN-outils-offerts.md (bloc 9, liste « reste à vérifier à l'écran »), puisque les mêmes fonctions vont changer.
2. Avant chaque SQL (blocs 1, 3 et 5) : lancer `~/Sauvegardes-DigitalFootball/sauvegarder.sh`.
3. Blocs 0, 1, 3 et 5 : coller dans le SQL Editor de Supabase les fichiers indiqués, dans l'ordre donné, puis me recopier le résultat des fichiers de vérification.
4. Ne jamais lancer un fichier qui finit par `_ANNULATION_NE_PAS_EXECUTER.sql` sans qu'on en ait parlé.
5. Bloc 6 (si forfait payé) : résilier puis reprendre l'abonnement du club test depuis Mon forfait, et regarder la cloche d'un éducateur entre les deux.

## Répartition suggérée
Je ne vois pas ta barre de statut depuis ici : à adapter à ton compteur. Les blocs 1 et 5 (Opus) sont les plus chers, un par fenêtre de 5 h.
- Jour 1 : bloc 0 (faible), puis bloc 1 si la fenêtre 5 h est sous 40 %.
- Jour 2 : bloc 2.
- Jour 3 : blocs 3 et 4.
- Jour 4 : bloc 5.
- Jour 5 : blocs 6 et 8. Bloc 7 seulement si tu le veux.
Rappel : `/clear` et une session neuve par bloc.

## Blocs

### Bloc 0 : sauvegarde et photo des places actuelles
- Statut : fait
- Objectif : savoir précisément, club par club, qui a une place aujourd'hui, et vérifier la liste des types de notification acceptés.
- Résultat testable : un fichier SQL en lecture seule que tu lances, et son résultat recopié dans le journal de ce bloc.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : SQL de lecture simple, sans écriture.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 0 PLAN-outils-offerts-suite.md`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Écrire `supabase_places_choisies_etat.sql` (lecture seule) : pour chaque club au nouveau modèle, éducateurs affiliés, rang actuel, `educateur_a_place`, quota ; nombre total de couples club et éducateur avec place.
  - Y ajouter : contrainte éventuelle sur `notifications.type`, contrainte `action` de `mon_club_journal`, colonnes de `club_educateurs`.
  - Kevin lance la sauvegarde puis le fichier ; recopier le résultat dans le journal ci-dessous (il servira de référence au bloc 1).
  - Repérer dans `tests/` les tests qui touchent places et journal (`outils-api.test.js`, `journalMonClub.test.js`) pour les blocs suivants.
- Ce que je teste pour valider : le fichier tourne sans erreur et les chiffres correspondent à ce que tu sais de tes clubs.
- Reste à finir : rien.
- Journal : 2026-11-13, Sonnet 5.5. Fichier `supabase_places_choisies_etat.sql` écrit (lecture seule, 6 requêtes : photo des places, totaux par club, nombre total de couples avec place, contraintes de `notifications` et de `mon_club_journal`, colonnes de `club_educateurs`). Colonne du nom du club = `profiles.club`. Tests à étendre aux blocs suivants : `tests/outils-api.test.js` (simulateur avec `sansPlace`, `fournis`, `journal`, `notifs`) et `tests/journalMonClub.test.js` (`phraseJournal`, `planRetablir`, `etatRetablir`). Non exécuté par moi : pas d'accès à ta base.
  - 2026-11-14, Opus 5.5. Résultat recopié (requêtes 1 à 5 regroupées dans `supabase_places_choisies_photo.sql`, une seule case à copier ; requête 6 lancée à part). **Photo de référence** :
    - Club `deabreu.amorim+club@gmail.com` (0e341547…, palier c200, 7 places, abonnement actif) : 1 éducateur affilié, « Test test » (75df7fba…, affilié le 2026-11-11), rang 1, a une place.
    - Club `macon.fc@lbfc-foot.fr` (2b1e77de…, palier c500, 22 places, abonnement actif) : 1 éducateur affilié, « tiago bustos » (f5bf91dd…, affilié le 2026-11-13), rang 1, a une place.
    - **Total : 2 couples club et éducateur avec place.** Aucun club n'est plein : la nouvelle règle ne peut rien changer aujourd'hui, la vérification du bloc 1 doit retrouver ces 2 lignes.
    - `notifications` : pas de contrainte sur `type` (texte libre), seulement clé primaire et lien vers `profiles`.
    - `mon_club_journal` : `action` limitée à `retire` et `reaffiche` (à élargir au bloc 3) ; `outil` doit suivre `^[a-z0-9_]{2,40}$` ; `retablit_id` pointe vers une autre ligne du journal.
    - `club_educateurs` : id, club_id, educateur_id, statut, methode, created_at, role, categories_access, peut_editer_projet_sportif, peut_editer_planification. Aucune colonne de place : la table à part `club_places_choisies` est confirmée.
    - Écart pour le bloc 2 : le club test n'a qu'un éducateur affilié pour 7 places ; il faudra au moins 3 éducateurs et moins de places que d'éducateurs (ou une simulation) pour tester l'échange de place.

### Bloc 1 : la base connaît les places choisies (SQL)
- Statut : fait
- Objectif : nouvelle règle des places en base, sans rien changer pour les clubs qui n'ont rien choisi.
- Résultat testable : la vérification montre exactement la même liste de places qu'au bloc 0, et une simulation (transaction annulée d'elle-même) montre qu'une place donnée ou retirée change bien le résultat.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : touche `outils_actifs`, `a_outil` et le verrou des outils en production ; une erreur coupe des outils à de vrais éducateurs.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 1 PLAN-outils-offerts-suite.md`
- Dépend de : bloc 0 (photo de référence)
- Prérequis : sauvegarde lancée par Kevin
- Étapes :
  - `supabase_places_choisies.sql` : table `club_places_choisies` (club, éducateur, état `choisi` ou `retire`, date, auteur), écriture par la clé service seulement, lecture par le club, son staff et l'éducateur concerné.
  - Une seule fonction de rang (`rangs_places_club`) : garanties, puis automatiques, par ancienneté ; places retirées exclues. `educateur_a_place` l'utilise ; `outils_actifs`, `a_outil` et `outil_ferme` suivent sans être réécrits.
  - Recréer `prevenir_fin_outils_club` avec ce même rang (il recopie aujourd'hui le calcul), le reste à l'identique.
  - `supabase_places_choisies_verification.sql` : comparaison avec la photo du bloc 0, plus une simulation qui s'annule seule.
  - `supabase_places_choisies_ANNULATION_NE_PAS_EXECUTER.sql` pour mémoire.
- Ce que je teste pour valider : le résultat de la vérification (« identique » pour chaque club), et un éducateur réel qui ouvre ses outils comme avant.
- Reste à finir : Kevin ouvre les outils d'un éducateur réel (testfinal) pour confirmer à l'écran ; la base le confirme déjà (contrôles 14 à 16).
- Journal : 2026-11-14, Opus 5.5. Écrits : `supabase_places_choisies.sql` (table `club_places_choisies` avec état `choisi`/`retire`, auteur et date ; `rangs_places_club` réservée au serveur ; `educateur_a_place` et `prevenir_fin_outils_club` branchés dessus, le second recopié mot pour mot de `supabase_outils_offerts_educateur.sql` hors calcul du rang ; déclencheur non touché), `supabase_places_choisies_verification.sql` (13 cas d'essai annulés d'eux-mêmes sur le club d'essai, photo du bloc 0, comparaison ancienne et nouvelle règle sur tous les clubs, droits), `supabase_places_choisies_ANNULATION_NE_PAS_EXECUTER.sql` (verrouillé : lancé tel quel, il s'arrête sans rien changer). Ajout hors plan : `supabase_places_choisies_photo.sql` (requêtes 1 à 5 du bloc 0 en une seule case). Testé sur une base Postgres 17 factice locale : 0 différence sur 240 couples entre ancienne et nouvelle règle, ordre garanti/automatique/retiré correct, avis de fin seulement pour qui perd une place réelle, fichier relançable sans erreur, 20 contrôles sur 20 ok, annulation verrouillée puis fonctionnelle une fois le verrou retiré. Écart repéré : la limite d'affiliation (`supabase_limite_educateurs.sql`) compte encore l'éducateur dont la place est retirée ; laissée telle quelle. Réponse de Kevin (2026-11-14) : les places sont des équipes (`quota_equipes`), un éducateur peut en avoir deux ; au-delà, le club passe au forfait supérieur ; il peut retirer un éducateur et en mettre un autre à tout moment. Donc on garde la limite actuelle, rien à changer. `supabase_places_choisies.sql` lancé avec succès par Kevin ; premier contrôle arrêté (aucun autre éducateur au nouveau modèle en base), corrigé : l'essai prend un autre compte et le passe au nouveau modèle le temps des essais. Conséquence pour le bloc 2 : un club ne peut pas affilier plus d'éducateurs que de places, donc « moins de places que d'éducateurs » ne s'obtient qu'en réduisant le forfait du club test (ou en simulation). Contrôle corrigé lancé par Kevin : 20 lignes sur 20 ok (photo du bloc 0 retrouvée, 2 couples avec place, 0 différence sur tous les clubs, rien resté après les essais).

### Bloc 2 : écran « qui a une place » dans Mon club
- Statut : à faire
- Objectif : dans l'étape Éducateurs, le club donne, retire ou échange une place.
- Résultat testable : sur le club test, donner une place à un éducateur qui n'en a pas, avec le choix de celui qui libère la sienne ; ce dernier reçoit l'avis dans sa cloche et perd les outils fournis.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : écran et route serveur sur une logique déjà posée en base.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2 PLAN-outils-offerts-suite.md`
- Dépend de : bloc 1
- Prérequis : club test au nouveau modèle avec plus d'éducateurs que de places
- Étapes :
  - `api/outils.js` : action `choisir_place` (compte du club seulement, forfait actif, nouveau modèle) ; lit qui a une place avant et après, prévient ceux qui la perdent (même texte que « plus de place »).
  - Donner une place quand tout est plein : la demande doit nommer l'éducateur qui libère la sienne, sinon refus clair.
  - `EtapeEducateurs.jsx` : pour chaque éducateur, état « place » ou « sans place » et un bouton ; fenêtre « qui libère sa place ? » quand c'est plein. Compteur `x / N places` inchangé.
  - Texte de `BandeauPlaces.jsx` : « les derniers affiliés n'ont que le socle » devient juste quand le club a choisi (« certains éducateurs n'ont pas de place »).
  - Tests dans `tests/outils-api.test.js` ; `npm test` et `npm run build`.
- Ce que je teste pour valider : parcours sur le club test (donner, retirer, échanger), puis la cloche des deux éducateurs concernés, puis l'écran d'un club de l'ancien modèle (rien de nouveau).
- Reste à finir :
- Journal :

### Bloc 3 : le journal enregistre outils fournis et places (SQL + serveur)
- Statut : à faire
- Objectif : chaque changement d'outil fourni (à tous ou à un éducateur) et de place écrit une ligne au journal, avec ce qu'il faut pour le rétablir.
- Résultat testable : après un changement sur le club test, une nouvelle ligne apparaît dans `mon_club_journal` (vérifiée par un SQL de lecture).
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : élargir une contrainte et écrire des lignes, sans toucher aux droits d'accès aux outils.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 3 PLAN-outils-offerts-suite.md`
- Dépend de : bloc 2
- Prérequis : sauvegarde lancée par Kevin
- Étapes :
  - `supabase_mon_club_journal_suite.sql` : nouvelles actions (`fourni`, `plus_fourni`, `place_donnee`, `place_retiree`) et état précédent de la place (pour rétablir exactement) ; anciennes lignes intactes ; fichier de vérification et fichier d'annulation pour mémoire.
  - `api/outils.js` : `ouvrir_club`, `fournir_educateur` et `choisir_place` écrivent au journal ; une panne du journal ne bloque jamais le changement (même règle qu'aujourd'hui).
  - Vérifier qu'aucune limite de nombre de changements n'existe côté serveur ou écran ; en retirer une si on en trouve.
  - Tests serveur ; `npm test`.
- Ce que je teste pour valider : fournir puis retirer un outil sur le club test, et me recopier le SQL de lecture du journal.
- Reste à finir :
- Journal :

### Bloc 4 : écran du journal et bouton « Rétablir » pour ces changements
- Statut : à faire
- Objectif : l'étape Journal de Mon club affiche ces nouvelles lignes en français clair et les rétablit.
- Résultat testable : « Outil Séances fourni à tous les éducateurs », « Place retirée à Paul Martin », etc., et « Rétablir » remet l'état d'avant (avec les avis habituels si un éducateur perd quelque chose).
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : écran et phrases sur une logique serveur existante.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 4 PLAN-outils-offerts-suite.md`
- Dépend de : bloc 3
- Prérequis : aucun
- Étapes :
  - `src/lib/journalMonClub.js` : phrases et règle « peut-on rétablir ? » pour les nouvelles actions (refus clair si le forfait est fini, si l'éducateur n'est plus affilié, ou si rétablir une place dépasse le forfait).
  - `EtapeJournal.jsx` et `ecritures.js` : « Rétablir » appelle la bonne action serveur et marque la ligne `retablit_id`.
  - Tests dans `tests/journalMonClub.test.js` ; `npm test` et `npm run build`.
- Ce que je teste pour valider : sur le club test, rétablir un outil fourni, un outil retiré et une place retirée, puis relire le journal.
- Reste à finir :
- Journal :

### Bloc 5 : la base garde la date de fin et prévient avant (SQL)
- Statut : à faire
- Objectif : quand un club du nouveau modèle résilie, la date de fin est gardée et chaque éducateur qui reçoit des outils du club est prévenu tout de suite.
- Résultat testable : simulation en base (transaction annulée d'elle-même) : résiliation, un avis par éducateur avec la date ; nouvelle date, avis corrigé sans doublon ; reprise, avis retiré ; fin réelle, avis « après la fin » seul.
- Modèle : opus · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : modifie la fonction appelée à chaque paiement des outils ; une erreur pourrait bloquer la mise à jour d'un abonnement payé.
- Lancement : `/clear`, puis `/model opus`, puis `/effort high`, puis `/bloc 5 PLAN-outils-offerts-suite.md`
- Dépend de : bloc 1 (même règle des places pour savoir qui prévenir)
- Prérequis : sauvegarde lancée par Kevin
- Étapes :
  - `supabase_fin_programmee_club.sql` : table de la fin programmée par club ; branche club de `outils_synchroniser_abonnement` : résiliation, on garde `p_fin` ; reprise, on efface ; fin réelle, on efface. Branche éducateur et signature de la fonction inchangées.
  - Déclencheur sur cette table : avis `outils_club_fin_prochaine` à chaque éducateur qui a une place et reçoit au moins un outil du club ; un seul avis par éducateur (corrigé si la date change) ; à la reprise, avis non lu retiré, avis lu suivi de « votre club continue ».
  - `prevenir_fin_outils_club` : à la fin réelle, l'avis préalable est retiré au profit de l'avis « après la fin ».
  - Toute erreur des avis est avalée (avertissement dans les journaux) : un paiement ne peut jamais échouer à cause d'eux, même règle que le chantier précédent.
  - Fichiers `_verification.sql`, `_simulation.sql` (s'annule seule) et `_ANNULATION_NE_PAS_EXECUTER.sql`.
- Ce que je teste pour valider : les résultats de la vérification et de la simulation, puis le tableau Stripe (onglet Webhooks) : aucune livraison en échec après la mise en place.
- Reste à finir :
- Journal :

### Bloc 6 : l'avis visible côté éducateur et côté club
- Statut : à faire
- Objectif : l'éducateur voit l'avis avec la date et ce qu'il garde ; le club sait, avant de résilier, que ses éducateurs seront prévenus.
- Résultat testable : cloche et encart de l'éducateur avec « Votre club arrête son forfait le 12 décembre 2026 : vos outils fournis restent ouverts jusque-là, vos données sont gardées » ; fenêtre de résiliation du club avec « Vos N éducateurs seront prévenus ».
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : textes et écrans.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 6 PLAN-outils-offerts-suite.md`
- Dépend de : bloc 5
- Prérequis : savoir si le club test a un forfait payé (vraie résiliation puis reprise) ; sinon simulation seulement
- Étapes :
  - `src/components/outils/EncartOutilsClub.jsx` : nouveau type d'avis, avec la date et un bouton vers ses outils (sans proposition d'achat agressive).
  - Page Mon forfait du club : phrase dans la confirmation de résiliation, et rappel « vos éducateurs ont été prévenus » tant que la résiliation est programmée.
  - `npm test` et `npm run build`.
- Ce que je teste pour valider : avec forfait payé, résilier puis reprendre sur le club test et regarder la cloche d'un éducateur à chaque étape ; sinon, l'avis de la simulation affiché à l'écran.
- Reste à finir :
- Journal :

### Bloc 7 (optionnel) : rappel 7 jours avant la fin
- Statut : à faire (seulement si Kevin le demande après le bloc 6)
- Objectif : un second avis automatique 7 jours avant la date de fin programmée.
- Résultat testable : simulation de la tâche quotidienne avec une date de fin à J+7 : un avis par éducateur, jamais deux fois.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : petite tâche planifiée sur une table posée au bloc 5.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 7 PLAN-outils-offerts-suite.md`
- Dépend de : blocs 5 et 6
- Prérequis : vérifier que l'extension `pg_cron` est disponible sur l'offre de Digital Football ; sauvegarde
- Étapes :
  - Fonction SQL du rappel (une fois par fin programmée, marqueur « rappel envoyé »).
  - Tâche quotidienne `pg_cron` ; fichier de vérification ; fichier d'arrêt de la tâche pour mémoire.
- Ce que je teste pour valider : résultat de la simulation, puis la tâche visible dans Supabase.
- Reste à finir :
- Journal :

### Bloc 8 : vérification finale et nettoyage
- Statut : à faire
- Objectif : tout le parcours de bout en bout, documents à jour, commit.
- Résultat testable : liste cochée des parcours, `npm test` et `npm run build` verts, commit poussé sur `main`.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : relecture et vérifications, sans logique nouvelle.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8 PLAN-outils-offerts-suite.md`
- Dépend de : blocs 0 à 6 (et 7 s'il est fait)
- Prérequis : aucun
- Étapes :
  - Parcours complet sur le club test : places, journal, Rétablir, résiliation (réelle ou simulée).
  - Contrôle d'un club de l'ancien modèle : aucun changement visible.
  - Livraisons du webhook outils dans Stripe : aucune en échec depuis le bloc 5.
  - Mettre à jour la mémoire du projet et le brief (statut clos) ; commit et push.
- Ce que je teste pour valider : la liste des parcours, sur ton téléphone et sur ordinateur.
- Reste à finir :
- Journal :
