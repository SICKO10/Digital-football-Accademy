# Sécurisation du module Sponsors — plan de déploiement

Statut : **préparé, rien n'est exécuté ni déployé.**
Ce document ne contient volontairement aucun bloc SQL : les scripts sont dans les fichiers listés ci-dessous.

## 1. Problème

État vérifié dans Supabase le 2026-10-15 :

- **`sponsors_all`** est une policy `PERMISSIVE FOR ALL TO public USING (true)`. Les policies permissives se combinent en OU : toute la table `sponsors` est donc lisible **et modifiable ou supprimable** par n'importe qui, y compris sans compte, puisque `anon` a SELECT, INSERT, UPDATE et DELETE.
  - Données exposées, pour tous les clubs : contacts, `montant_contrat`, `paiements`, `notes`, `documents`, `contreparties_suivi`, et `acces_token`, qui ouvre le portail partenaire de chaque sponsor.
- **`sponsors_bandeau_select`** donne en plus à tout compte connecté toutes les colonnes des sponsors affichés en bandeau.
- **« Club manages sponsors »** donne les 4 opérations à **tout** membre du staff, quel que soit son rôle, alors que l'interface limite la section aux rôles autorisés.
- **`get_sponsor_by_token`** renvoie toutes les colonnes de la fiche à quiconque détient le token. Or tous les tokens ont été lisibles via `sponsors_all`.
- **`sponsor_clics_log`** : n'importe quel compte connecté peut insérer des clics pour n'importe quel club ou sponsor. Les statistiques sont donc falsifiables.
- Les buckets **`documents`** et **`proofs`** sont publics (voir section 9).

## 2. Fichiers

| Fichier | Rôle | Nature |
|---|---|---|
| `supabase_sponsors_verification.sql` | Diagnostic V1 à V17, uniquement des SELECT | Lecture seule |
| `supabase_sponsors_phase1_fonctions_rpc.sql` | Fonctions de droits et RPC `sponsors_bandeau` (révision 2) | Additive |
| `src/components/SponsorsBar.jsx` | Bandeau lu via la RPC `sponsors_bandeau` | JS |
| `supabase_sponsors_phase2_fermeture.sql` | Supprime `sponsors_all` et `sponsors_bandeau_select`, retire les droits de `anon` et `PUBLIC`, protège l'insertion des clics | Fermeture |
| `supabase_sponsors_phase3_droits_roles.sql` | Policies par rôle sur `sponsors`, `niveaux_partenariat` et la lecture des clics | Restriction |
| `supabase_sponsors_phase3b_prospects.sql` | Policies par rôle sur `prospects_sponsors` et `prospects_echanges`, et fonction `sponsors_peut_acceder_prospect` (droit vérifié à travers le club du prospect) | Restriction |
| `supabase_sponsors_phase3c_conversion_rpc.sql` | **Proposition non validée** : conversion prospect vers sponsor atomique et idempotente (`sponsors_convertir_prospect`). Non utilisée par le JS actuel | Optionnelle, après validation |
| `supabase_sponsors_phase4_portail.sql` | Nouvelle fonction `sponsor_portail`, limitée aux champs affichés | Additive |
| `src/pages/PartenairePublic.jsx` | Portail via `sponsor_portail`. Les infos du club viennent de la fonction, plus de lecture anonyme de `profiles` | JS |
| `supabase_sponsors_phase4b_portail_retrait.sql` | Retire le droit d'exécuter `get_sponsor_by_token` (REVOKE EXECUTE, **sans DROP**) | Restriction |
| `supabase_sponsors_tests.sql` | F0 et T1 à T13. Chaque section est ignorée tant que sa phase n'est pas appliquée | Transactions annulées |

### Fonctions de la phase 1 (révision 2)

Toutes sont SECURITY DEFINER, avec `search_path = ''`, des objets entièrement qualifiés, EXECUTE réservé à `authenticated`, et le marqueur `digital-football:sponsors-phase1`.

- **`sponsors_peut_acceder(club_id, edition)`** : droit de gestion. Il est accordé à :
  - le compte club lui-même, si son profil est de plan `club` ;
  - un staff `president` ;
  - un staff dont la ligne `role_permissions('sponsors')` le permet (lecture = `can_view`, édition = `can_view` et `can_edit`) ;
  - par défaut, `marketing` et `secretaire`.

  **Un rôle NULL n'a aucun droit.**
- **`sponsors_est_membre_club(club_id)`** : club, staff, éducateur accepté, dirigeant délégué, joueur affilié accepté, parent accepté.
- **`sponsors_bandeau(club_id, saison)`** : les 6 champs publics, uniquement pour les membres.
- **`sponsors_clic_autorise(sponsor_id, club_id)`** : l'appelant est membre du club, et le sponsor appartient à ce club et est affiché en bandeau.

## 3. Droits après les phases 2 et 3

| Acteur | `sponsors` (lecture directe) | `sponsors` (écriture) | `niveaux_partenariat` | Bandeau (RPC) | Statistiques de clics |
|---|---|---|---|---|---|
| Compte club (plan `club`) | Oui | Oui | Oui | Oui | Oui |
| Staff `president` | Oui | Oui | Oui | Oui | Oui |
| Staff avec ligne `role_permissions` | Si `can_view` | Si `can_view` et `can_edit` | idem | Oui | Si `can_view` |
| Staff `marketing` / `secretaire` sans ligne | Oui | Oui | Oui | Oui | Oui |
| Autre rôle staff sans ligne, ou rôle NULL | Non | Non | Non | Oui | Non |
| Éducateur, dirigeant, joueur, parent du club | Non | Non | Non | Oui | Non (insertion de clics : oui) |
| Compte d'un autre club | Non | Non | Non | Non | Non |
| `anon` | Non (aucun droit) | Non | Non | Non | Non |
| Portail (token) | Via `sponsor_portail` : champs affichés uniquement | Demande de renouvellement seulement | — | — | — |

Pour UPDATE, `USING` (la ligne existante) **et** `WITH CHECK` (la ligne modifiée) exigent tous deux l'édition. Il est donc impossible de déplacer un sponsor vers un club où l'on n'a pas ce droit. Pour INSERT, `WITH CHECK` exige l'édition sur le club de la nouvelle ligne. La phase 3 vérifie les deux dans ses contrôles finaux, et le test T10c le teste.

### Compatibilité des dashboards et du CRM

| Écran | Effet |
|---|---|
| `GestionSponsors.jsx` (CRM, contrats, paiements, documents, niveaux, statistiques, lien portail) | Inchangé pour les rôles autorisés. Il est déjà rendu uniquement si `canViewSection('sponsors')`, en lecture seule si `!canEditSection('sponsors')`. Les règles en base sont désormais les mêmes |
| `DashboardClub.jsx:385` (alerte de fin de contrat) | **Changement visible** : un staff sans droit `sponsors` ne voit plus cette alerte |
| `SponsorsBar.jsx` (dashboards club, éducateur, dirigeant, joueur, parent) | Inchangé, via la RPC. **Changement assumé** : un éducateur seulement « en attente » ne voit plus le bandeau |
| `PartenairePublic.jsx` | Même affichage, avec les données via `sponsor_portail` |
| `CatalogueOffres.jsx`, `ValorisationClub.jsx` | Tables `offres_sponsoring` et `club_valorisation` absentes en production : ces écrans sont probablement déjà en erreur. Non traité |

Écart restant : `DashboardClub.jsx:1421` et `api/_droits.js:41` traitent encore un rôle NULL comme président. La base les refuse désormais. À aligner après le diagnostic V14 (compléter les rôles, puis ajouter une contrainte NOT NULL).

## 4. Prérequis avant toute exécution

1. Exécuter `supabase_sponsors_verification.sql` et **conserver les résultats**. C'est l'état de référence, indispensable au retour arrière, notamment V2 qui contient les définitions de « Club manages sponsors », des policies de `niveaux_partenariat` et de `sponsor_clics_log_select`.
2. Valider avec ces résultats :
   - V4 (types de `sponsors`) ;
   - V5 et V17 (signature réelle de `get_sponsor_by_token`) ;
   - V6 (pas de fonction `sponsors_*` ni `sponsor_portail` existante) ;
   - V11 (propriétaires et contournement de la RLS) ;
   - V12 (policies d'écriture des tables d'appartenance) ;
   - V13 (statut `'accepte'`) ;
   - V14 (rôles NULL) ;
   - V16 (policies permissives restantes).
3. Préparer des comptes de test réels pour les identifiants de `supabase_sponsors_tests.sql` :
   - un club avec un sponsor affiché en bandeau, et un sponsor d'un autre club ;
   - un staff avec droit sponsors, un staff sans droit ;
   - un joueur affilié, et un compte externe.
4. Vérifier si Vercel déploie automatiquement `main` au push.
5. **Commits sélectifs** : ne jamais embarquer `src/pages/Upload.jsx` ni `supabase/functions/scan-fiche-seance/index.ts`, modifiés localement. `Upload.jsx` dépend d'un trigger SQL non déployé.

## 5. Ordre de déploiement

| # | Action | Contrôle avant de continuer |
|---|---|---|
| 1 | Diagnostic (section 4) | Résultats conformes et conservés |
| 2 | SQL phase 1 | V15, tests F0 et T1 à T4 |
| 3 | Déployer `SponsorsBar.jsx` (commit dédié) | U1 à U5 (bandeau et clics) |
| 4 | SQL phase 2 | V10, tests T5 à T9, requête REST anonyme refusée |
| 5 | SQL phase 3 | Test T10 ; U1, U2, U8 avec chaque rôle ; U9 |
| 5b | SQL phase 3b (prospects), dans la même fenêtre | Test T13 ; U10 |
| 6 | SQL phase 4 | Test T11 |
| 7 | Déployer `PartenairePublic.jsx` (commit dédié) | U7 avec un lien réel |
| 8 | SQL phase 4b | Test T12, U7 de nouveau |
| 9 | Rotation des `acces_token` (section 7), après décision | U7 avec les nouveaux liens |

Ordres interdits :
- l'étape 3 avant l'étape 2 : la RPC n'existerait pas, le bandeau serait vide ;
- l'étape 7 avant l'étape 6 : le portail serait en panne ;
- l'étape 8 avant l'étape 7 : le portail serait en panne.

Chaque script SQL s'arrête de lui-même, sans rien modifier, si sa phase précédente manque ou si l'état réel diffère des hypothèses.

## 6. Tests d'interface

| # | Compte | Attendu |
|---|---|---|
| U1 | Club | Bandeau visible. GestionSponsors : liste, création, modification, paiements, documents, contreparties, niveaux, statistiques, lien portail, suppression |
| U2 | Staff président, marketing, secrétaire | Comme U1 |
| U3 | Éducateur affilié accepté, dirigeant délégué | Bandeau visible |
| U4 | Joueur affilié, parent | Bandeau visible |
| U5 | Clic bannière et CTA | Le lien s'ouvre ; le clic apparaît dans Statistiques |
| U6 | Joueur d'un autre club | Aucun bandeau de ce club |
| U7 | Portail (lien valide / invalide) | Fiche, paiements, contreparties, documents, nom, logo et couleur du club ; renouvellement OK. Lien invalide : « Lien invalide ou expiré » |
| U8 | Club | Alerte « contrat sponsor bientôt échu » présente |
| U9 | Staff avec `role_permissions` en lecture seule ; staff sans droit (ex. buvette) | Lecture seule : CRM visible, aucune écriture possible. Sans droit : section Sponsors absente, bandeau visible |
| U10 | Club, président, marketing, secrétaire | Prospects : liste, création, modification, statut, ajout d'échange, historique, dossier commercial, conversion en sponsor (lien `sponsor_id`), suppression |

## 7. Plan de rotation des `acces_token`

**Pourquoi** : via `sponsors_all`, n'importe qui a pu lire tous les tokens. Tant qu'ils ne sont pas changés, un token récupéré ouvre le portail du sponsor. Après la phase 4b, ce portail n'expose plus les notes ni les contacts, mais montre encore montants, paiements, contreparties et liens vers les documents.

**Conséquence** : **tous les liens « espace partenaire » déjà envoyés aux sponsors cessent de fonctionner** et affichent « Lien invalide ou expiré ».

**Déroulé proposé** (script non préparé, à rédiger après décision) :
1. Prévenir les clubs **avant** : message (newsletter ou notification plateforme) expliquant qu'une mise à jour de sécurité renouvelle les liens partenaires, et qu'ils doivent renvoyer le nouveau lien depuis Sponsors, bouton de copie du lien portail.
2. Choisir un créneau calme. Une seule mise à jour régénère tous les `acces_token`, sans toucher à aucune autre colonne.
3. Juste après : test U7 avec un ancien lien (doit être refusé) et un nouveau lien (doit fonctionner).
4. Communiquer aux clubs la confirmation, et le modèle de message à transmettre à leurs sponsors.
5. Ensuite, à prévoir : date d'expiration et bouton « régénérer le lien » par sponsor dans GestionSponsors, pour révoquer un lien sans toucher aux autres.

Il n'y a pas de retour arrière : les anciens tokens sont perdus par conception. Les clubs renvoient simplement le nouveau lien.

## 8. Retour arrière (sans jamais rouvrir `sponsors_all`)

**Interdit dans tous les cas** :
- recréer `sponsors_all` ou `sponsors_bandeau_select` ;
- redonner un droit quelconque sur `sponsors` ou `niveaux_partenariat` à `anon` ou `PUBLIC` ;
- désactiver la RLS ;
- recréer une policy `USING (true)`.

Aucune phase ne modifie de données, seulement des policies, des droits et des fonctions. Aucune restauration de données n'est donc nécessaire.

| Situation | Procédure |
|---|---|
| Phase 1 ou JS du bandeau en défaut, avant la phase 2 | Revenir à l'ancien `SponsorsBar.jsx` par un `git revert`. Les fonctions de la phase 1 sont inertes et peuvent rester |
| Après la phase 2 : bandeau vide | Aucune fuite. Corriger la RPC (nouvelle version de la fonction). Revenir au JS ne sert à rien |
| Après la phase 2 : clics légitimes refusés | Statistiques seulement. Corriger `sponsors_clic_autorise` |
| **Après la phase 3 : un rôle légitime perd l'accès** | Recréer **temporairement** « Club manages sponsors » à partir de sa définition conservée (V2, aussi tracée par les NOTICE de la phase 3), puis corriger. Elle reste limitée au club et à son staff, ce qui **ne rouvre rien au public** |
| Après la phase 3b : un rôle légitime perd l'accès aux prospects | Recréer **temporairement** les 4 policies d'origine (`membres_club_*`) à partir de V2 et des NOTICE de la phase 3b. Elles restent limitées au club et à son staff, ce qui **ne rouvre rien au public**. Ne jamais redonner de droit à `anon` ou `PUBLIC` |
| Après la phase 3 : `niveaux_partenariat` inaccessible au CRM | Recréer les policies d'origine à partir de V2, **sauf** une éventuelle policy `USING (true)`. Dans ce cas, appliquer la policy de lecture `sponsors_peut_acceder` seule |
| Après la phase 4b : portail en panne | Redonner seulement le droit d'EXÉCUTION de `get_sponsor_by_token` à `anon` et `authenticated`, et revenir à l'ancien `PartenairePublic.jsx`. Jamais de droit sur la table |
| Après la phase 4 : `sponsor_portail` incorrecte | Revenir à l'ancien `PartenairePublic.jsx` tant que la phase 4b n'est pas passée, puis corriger la fonction |

## 9. Documents confidentiels encore publics (chantier séparé, non traité)

**Aucune des phases 1 à 4 ne protège les fichiers.** Les buckets `documents` et `proofs` sont **publics** : toute personne qui possède l'URL télécharge le fichier, sans compte. De plus, toutes ces URL ont été lisibles via `sponsors_all` (colonnes `documents` et `contreparties_suivi`).

| Fichiers | Emplacement | Confidentiel ? |
|---|---|---|
| Contrats, factures et autres documents de sponsor | `documents/sponsors/<sponsor_id>/…` (`GestionSponsors.jsx:1093-1095`) | **Oui, et toujours publics** |
| Preuves de contreparties (photos, justificatifs) | `proofs/sponsors/<sponsor_id>/…` (`GestionSponsors.jsx:1182-1184`) | **Oui, et toujours publics** |
| Logos et bannières de sponsors | `documents/…` (`GestionSponsors.jsx:1108-1124`) | Non : publics par nature (bandeau) |
| Preuves de préparation physique | `proofs/…` | À évaluer : partagent le bucket `proofs` |

**Approche proposée** :
1. Créer un nouveau bucket privé dédié aux documents et preuves des sponsors, plutôt que basculer les buckets existants (les logos restent publics, et `proofs` sert aussi à la préparation physique).
2. Écrire des policies `storage.objects` fondées sur une fonction SECURITY DEFINER qui relie le chemin au club (le chemin contient `sponsor_id`) et sur `sponsors_peut_acceder`.
3. Enregistrer des chemins plutôt que des URL publiques dans `documents` et `contreparties_suivi`. Les URL signées de courte durée sont générées à l'affichage (CRM), et par `sponsor_portail` ou une Edge Function pour le portail.
4. Copier les fichiers existants, réécrire les entrées JSON, vérifier, puis supprimer les originaux publics.
5. Vérifier aussi les policies `storage.objects` existantes (liste, écrasement, suppression). L'envoi utilise `upsert: true`.

Considérer les documents existants comme **potentiellement divulgués**, et le signaler aux clubs selon leurs obligations envers leurs sponsors.

## 10. Risques restants après les phases 1 à 4b

1. **Insertion staff via `user_metadata`** (`AcceptInvite.jsx:172`). Une appartenance frauduleuse au staff donne les droits de son rôle. Avec un rôle forgé à `president`, c'est l'accès complet aux sponsors. À traiter par un circuit d'invitation vérifié côté serveur. **Prioritaire.**
2. **Affiliations** (`AcceptInvite.jsx:187` et `:216`, policy `parents_acces`) : une adhésion frauduleuse au club est possible selon les policies de production (V12). Pour les sponsors, l'impact se limite au bandeau et aux clics.
3. **Prospects en lecture seule** : `ModalProspect` (`GestionSponsors.jsx:592`) ne reçoit pas `readOnly`. Un staff que la matrice limite à la lecture voit donc encore les boutons Enregistrer, Supprimer, Ajouter un échange et Convertir. Après la phase 3b, la base refuse. L'enregistrement affiche une alerte ; l'ajout d'échange ne fait rien ; la suppression **semble** réussir à l'écran, mais le prospect réapparaît au rechargement. Aucune donnée n'est modifiée. Correction JS proposée, non appliquée : transmettre `readOnly` à `ModalProspect` et masquer ces boutons.
4. **Fichiers publics** (section 9).
5. **Tokens** non régénérés tant que l'étape 9 n'est pas faite.
6. **Rôle NULL** : l'interface et l'API ne sont pas encore alignées avec la base.
7. **Clics en masse** par un membre légitime : aucune limite de débit.
