# BRIEF : fermeture des failles d'accès de novembre
Date : 2026-11-14 · Statut : terminé côté base le 2026-11-17 (4 tables fermées, contrôle des ouvertures relancé ; reste la relance des tests SQL par Kevin et le commit)

## Vision en 3 lignes
Quatre tables de la base sont ouvertes à n'importe quel compte connecté, tous clubs confondus.
On les referme une par une, sans casser un seul écran, avec le même protocole que la sécurité sponsors : diagnostic en lecture seule, scripts montrés avant exécution, garde-fous qui arrêtent tout si la base ne ressemble pas à ce qu'on attend, tests avec plusieurs comptes et deux clubs.
Démarrage seulement quand la sécurité sponsors (phases 2 à 4b) est terminée et vérifiée.

## Pour qui, et ce qui change pour eux
- **Clubs** : aujourd'hui, un inscrit de n'importe quel club peut lire leur staff (emails, téléphones), lire et supprimer leurs séances, modifier leurs convocations et les droits par catégorie de leur staff. Demain : chaque club ne voit et ne modifie que ce qui est à lui.
- **Éducateurs, joueurs, parents, dirigeants** : rien ne doit changer à l'écran. C'est le critère de réussite principal.
- **Kevin** : une plateforme qu'il peut présenter à un club ou à un sponsor sans risque de fuite de données personnelles (obligation RGPD sur les emails et téléphones du staff).

## Les quatre failles (constatées le 2026-11-14 dans `pg_policies`, source : PLAN-categories.md, Inventaire)
| Table | Ouverture actuelle | Gravité |
|---|---|---|
| `entrainements` | lire, créer, modifier, **supprimer** : tout compte connecté, tous clubs | Haute (perte de données possible) |
| `convocation_joueurs` | lecture `USING true` ; écriture par tout compte ayant un profil éducateur, quel que soit son club | Haute (données de mineurs, convocations faussées) |
| `role_categories_access` | `rca_all` : lecture et écriture pour tout compte connecté | Haute (un tiers peut modifier les droits du staff d'un club) |
| `staff_club` | `staff_read_all` : lecture de tout le staff de tous les clubs, emails et téléphones compris | Haute (données personnelles) |

Rappel : les fichiers SQL du dépôt ne reflètent pas toujours la base réelle. Seules les règles lues dans `pg_policies` font foi.

## Qui lit ces tables aujourd'hui (recensement de départ, à compléter au bloc 0)
- `entrainements` (12 fichiers) : `DashboardEducateur`, `DashboardClub`, `DashboardJoueur`, `Planning`, `PlanificationAnnuelle`, `PlanificationSeances`, `SondageSemaine`, `CarteJoueur`, `NutritionDashboard`, `GestionCloturesSaison`, `HistoriqueCollectif`, `lib/parcoursCoach.js`.
- `convocation_joueurs` : `DashboardEducateur`, `DashboardJoueur`.
- `role_categories_access` : `DashboardClub`.
- `staff_club` : `App.jsx`, `lib/multiRole.js`, `AcceptInvite.jsx`, `DashboardClub`, `api/_droits.js`, fonctions serveur `send-newsletter`, `inviter-staff`, `envoyer-invitation`.
- À vérifier en plus : les fonctions SQL, vues et triggers qui lisent ces tables (une fonction SECURITY DEFINER n'est pas touchée par les règles, une fonction normale l'est), les écrans parent et dirigeant, et toute page publique.

## Parcours et éléments à produire
1. **Diagnostic en lecture seule** (`supabase_securite_novembre_diagnostic.sql`) : règles réelles, colonnes, triggers, fonctions et vues qui touchent les 4 tables, droits `anon` et `authenticated`, nombre de lignes par club. Kevin le lance, recolle le résultat.
2. **Matrice des droits cible** écrite en français, table par table et acteur par acteur (club, staff selon rôle, éducateur du club, éducateur d'un autre club, joueur affilié, parent, dirigeant délégué, compte sans lien, visiteur sans compte). Validée par Kevin avant toute ligne de SQL.
3. **Fonctions de droits** additives (SECURITY DEFINER, `search_path` vide, exécution réservée aux comptes connectés, marqueur de version), sur le modèle de `sponsors_peut_acceder` / `sponsors_est_membre_club`. Réutiliser ces deux fonctions là où elles conviennent plutôt que d'en recréer.
4. **Une fenêtre par table**, dans l'ordre proposé ci-dessous. Pour chacune : script de fermeture avec garde-fous (« ARRÊT : … Rien n'a été modifié » si l'état diffère), contrôles finaux dans la même transaction, puis tests SQL, puis tests à l'écran.
5. **Tests SQL** (`supabase_securite_novembre_tests.sql`) : chaque test dans une transaction annulée, avec de vrais identifiants de **deux clubs** (club A et club B) : club, staff avec et sans droit, éducateur, joueur affilié, parent, dirigeant, compte externe, visiteur sans compte. Chaque cas vérifie « A voit A » et « A ne voit pas B ».
6. **Plan de secours** par table, dans un fichier séparé dont la première ligne bloque l'exécution. Règle : un secours ne rouvre jamais une table au public ; il rétablit au pire une règle limitée au club.
7. **Tests à l'écran** par Kevin, liste précise par table (quel compte, quelle page, ce qui doit s'afficher).
8. **Commit dédié** pour chaque correction de code éventuelle, jamais mélangé avec un autre chantier.

### Ordre retenu (Kevin, 2026-11-14)
Du plus simple au plus risqué, pour roder le protocole avant la table la plus lue :
1. `role_categories_access` (un seul écran lecteur).
2. `staff_club` + correction de l'invitation (lecture des lignes : soi-même, le compte club, le président ; coordonnées des collègues masquées, voir Décisions ; écriture : club et président, ajout au staff uniquement via la fonction serveur `inviter-staff`).
3. `convocation_joueurs` (lecture : éducateur de la convocation, club, joueur convoqué, ses parents ; écriture : éducateur de la convocation et club).
4. `entrainements` (12 lecteurs, la plus délicate).

### Masquage des coordonnées du staff : piste technique [HYPOTHÈSE, à confirmer au /plan]
Une règle d'accès (RLS) filtre des lignes, pas des colonnes. Piste privilégiée : la table `staff_club` n'est lisible en entier que par le compte club, le président et la personne elle-même ; les collègues passent par une fonction (SECURITY DEFINER) qui ne renvoie que nom, prénom, rôle et catégories. Les écrans du staff qui listent les collègues sont branchés sur cette fonction. Le bloc 0 recense les écrans qui affichent aujourd'hui les coordonnées des collègues.

## Idées signature [IDÉE]
- **Retenue** : masquer les coordonnées du staff entre collègues. Un membre du staff voit le nom et le rôle de ses collègues ; emails et téléphones restent visibles du club et du président seulement. Pourquoi : c'est ce qu'un club attend en matière de RGPD, et c'est un argument commercial.
- **Retenue** : inclure la faille d'invitation du staff (`AcceptInvite.jsx:172`, signalée comme prioritaire par le chantier sponsors). Aujourd'hui l'ajout au staff s'appuie sur des données que le navigateur peut forger, donc quelqu'un peut se déclarer « président » d'un club. On passe l'ajout par la fonction serveur `inviter-staff` qui existe déjà, et la règle d'écriture de `staff_club` interdit l'auto-ajout depuis le navigateur.
- [IDÉE] **Requête de contrôle permanente** (`supabase_controle_ouvertures.sql`) : un seul SELECT à relancer après chaque migration, qui liste toute règle `USING true` ou ouverte à `anon` dans toute la base. Pourquoi : ces quatre failles ont été trouvées par hasard ; la prochaine sera trouvée en 10 secondes.

## Contraintes (plateforme, existant, budget, délai)
- Supabase offre gratuite, **sans sauvegarde automatique** : sauvegarde manuelle (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`) avant chaque script qui modifie la base.
- Kevin lance chaque bloc SQL qu'il voit : seuls les scripts à exécuter vont dans des blocs de code ; résultats attendus en texte ; aucun secours prêt à lancer dans le même message.
- Ne jamais désactiver la RLS, ne jamais recréer une règle `USING (true)`, ne jamais donner de droit à `anon` ou `PUBLIC` sur ces tables.
- Les écritures sont souvent faites depuis le navigateur : une règle trop stricte casse un enregistrement **sans message clair**. D'où les tests d'écriture avec chaque compte.
- Doit être terminé **avant le bloc 3 du chantier catégories** (qui ajoute des règles sur ces mêmes tables).
- Commits sélectifs : d'autres chantiers ont des fichiers modifiés en cours (`DashboardClub.jsx`, `api/outils.js`, etc.).

## Décisions prises
- Démarrage après la fin vérifiée de la sécurité sponsors : fait le 2026-11-14.
- Même niveau d'exigence que sponsors : scripts SQL présentés avant exécution, plan de secours, tests avec plusieurs comptes et deux clubs (Kevin, 2026-11-14).
- Kevin n'exécute rien sans consigne ; Claude n'exécute rien sans accord (Kevin, 2026-11-14).
- Comptes de test : Kevin crée 2 clubs de test, chacun avec un éducateur, un joueur affilié, un parent et un staff (adresses type kevin+clubA@…). Tests SQL avec de vrais identifiants, tout annulé (Kevin, 2026-11-14).
- Staff : un membre voit nom et rôle de ses collègues ; email et téléphone réservés au club et au président (Kevin, 2026-11-14).
- Ordre : du plus simple au plus risqué (role_categories_access, staff_club, convocation_joueurs, entrainements) (Kevin, 2026-11-14).
- Invitation du staff : Kevin pense l'avoir déjà réglée. Vérification du code le 2026-11-14 : `AcceptInvite.jsx:172` insère encore dans `staff_club` depuis le navigateur avec `meta.role_invite` (user_metadata modifiable par l'utilisateur). À confirmer par la règle INSERT réelle de `staff_club` dans le diagnostic ; décision d'inclure ou non après ce résultat.

## Questions ouvertes
1. Règle INSERT réelle de `staff_club` (diagnostic) : la faille d'invitation existe-t-elle encore en base ?
2. Résultat du diagnostic (règles, droits, fonctions et vues qui lisent les 4 tables).

## Hors périmètre
- Fichiers publics des sponsors (buckets `documents` et `proofs`) : chantier séparé, déjà décrit dans `supabase_sponsors_plan_deploiement.md`, section 9.
- Les nouvelles règles du chantier catégories (bloc 3 de PLAN-categories.md).
- Toute nouvelle fonctionnalité.

## Ce que je dois fournir (accès, textes, photos, logos, comptes)
- Lancer le diagnostic et recoller les résultats.
- Lancer la sauvegarde avant chaque script qui modifie la base.
- Les comptes manquants du club test (adresses `deabreu.amorim+…@gmail.com`), selon la liste du bloc 0.
- La validation de la matrice des droits avant l'écriture du SQL.

## Constats du diagnostic (2026-11-14, D1 à D3)
- **`convocation_joueurs` est lisible SANS compte** (règle « lecture convocation joueurs », `USING true`, rôle public). Confirmé par une requête de visiteur : HTTP 200 avec une ligne. C'est la faille la plus grave : données de joueurs, dont des mineurs. À traiter en premier, l'ordre « simple vers risqué » est donc révisé.
- `entrainements`, `role_categories_access`, `staff_club` (lecture) : règles `auth.uid() IS NOT NULL`, donc fermées aux visiteurs mais ouvertes à tout compte connecté, tous clubs.
- `staff_club`, ajout : la règle `staff_accepte_invitation` exige `invitation_staff_valide(club_id, role)`. La faille d'invitation est donc probablement déjà réglée en base (le code `AcceptInvite.jsx:172` passe par cette règle). Définition de la fonction à vérifier (D4).
- `anon` a tous les privilèges de table sur les 4 tables. Seules les règles RLS le bloquent. À retirer en plus, après vérification qu'aucune page publique n'en dépend.
- Dépendances à contrôler : 3 déclencheurs (`marquer_invitation_staff_utilisee`, `trg_entrainement_supprime`, `trg_entrainements_updated_at`) et une trentaine de fonctions qui lisent ces tables, toutes SECURITY DEFINER (elles ne sont pas touchées par les nouvelles règles).

## Mise à jour 2026-11-14 (soir)
- Invitation du staff : **réglée en base**, confirmé. La règle `staff_accepte_invitation` n'accepte la ligne que si `staff_invitations` contient une invitation non utilisée pour ce compte, ce club et ce rôle ; cette table n'est ouverte à aucun compte du navigateur (créée seulement par la fonction serveur `inviter-staff`). Rien à corriger de ce côté.
- Le plan existe : `PLAN-securite-novembre.md` (blocs 0 et 1 faits, matrice des droits à valider par Kevin).
- Condition de démarrage « sponsors terminés » : remplie le 2026-11-14.
