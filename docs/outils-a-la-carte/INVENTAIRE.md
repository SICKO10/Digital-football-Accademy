# Inventaire et proposition de découpage : outils à la carte
Date : 2026-11-07 · Bloc 0 · À valider par Kevin avant le bloc 1

## 1. Ce qui existe aujourd'hui (constaté dans le code)

**Accès payant actuel**
- Éducateur : `DashboardEducateur.jsx` ligne ~5743. Si `profil.abonnement_actif` est faux **et** que l'éducateur n'est pas affilié accepté à un club, il voit un écran plein « Abonnement non actif ». Un éducateur affilié passe sans payer (le club paie).
- Club : `DashboardClub.jsx` ligne ~3473. Si `club.abonnement_actif` est faux, même écran plein, pour le président et le staff.
- Club : forfait par nombre d'équipes (`club.palier`, `club.quota_equipes`, `club.educateurs_inclus`), liens fixes dans `src/lib/stripeLinks.js` (c0 à c500).
- Éducateur : un seul lien mensuel (10 €) et un annuel (100 €).
- Le webhook `stripe-webhook` reconnaît l'offre par le **montant**.

**Inscription**
- `Register.jsx` : l'éducateur crée son profil (plan `educateur`, `abonnement_actif` faux) puis Stripe s'ouvre dans un nouvel onglet. Le club passe par `ClubWizard` (3 étapes : compte, disponibilités, formule et paiement).
- Le profil existe donc **avant** le paiement : c'est ce qui permet de créer des comptes de test sans payer (voir section 6).

**Droits fins**
- Club : `src/lib/permissionsClub.js` (`PERMISSION_DEFAULTS`) et table `role_permissions` décident ce que voit chaque rôle du staff (président, directeur sportif, secrétaire, marketing). Ce système reste **à côté** des outils : l'outil dit « la section existe pour ce club », la permission dit « ce membre du staff la voit ».
- Éducateur : `PERMISSION_PAR_SECTION` (dirigeant délégué : effectif, stats, compétition, entraînements, prép. physique, notes).

**Menus**
- Éducateur : tableau `sidebarSections` (`DashboardEducateur.jsx` ligne ~5772), plus Accueil et Profil boutons à part.
- Club : `NAV_GENERAL`, `NAV_SPORTIF`, `NAV_ADMINISTRATIF` (`DashboardClub.jsx` ligne ~3522).
- Point technique important : plusieurs entrées éducateur sont des **groupes** (`subKeys`). Filtrer par outil se fait sur les clés réelles (ex. `stats`, `sante`), pas seulement sur l'entrée du menu.

## 2. Tableau « entrée de menu → socle ou outil »

### Éducateur

| Entrée de menu (clés réelles) | Proposition |
|---|---|
| Accueil (`accueil`) | **Socle** |
| Profil (`profil`) | **Socle** |
| Mon équipe : effectif (`equipe`) | **Socle** |
| Mon équipe : stats, santé, historique (`stats`, `sante`, `historique`) | Outil **Suivi des joueurs** |
| Compétition (`matchs`) | Outil **Matchs** |
| Création entraînement (`entrainements`, `mes_seances`) | Outil **Séances** |
| Tacticboard (`tactipad`) et Bibliothèque (`bibliotheque`) | Outil **Tactique** |
| Préparation physique (`prep_physique`) | Outil **Préparation physique** |
| Rapports et évaluations (`analyse_video`, `notes`, `clotures_saison`) | Outil **Évaluations et vidéo** |
| Organisation (`materiel`, `terrains`, `deplacements`) | Outil **Organisation** |
| Projet Sportif (`projet_sportif`) | Outil **Projet sportif** |
| Stages (`stages`, aujourd'hui réservé aux affiliés) | Outil **Stages** (voir question A) |
| Recrutement (`recrutement`, déjà limité par `recrutementActif`) | Outil **Recrutement**, visible seulement quand le drapeau actuel le permet |
| Explorer (`explorer`) | **Socle** (annuaire, il fait venir du monde) |
| Projet Club CFF4 (`projet_club_cff4`) | **À trancher** (question B) |

Messagerie, notifications, paramètres : ce ne sont pas des entrées du menu de ces dashboards. Ce sont des composants transverses. Je les laisse hors outils, à confirmer au bloc 3.

### Club

| Entrée de menu (id) | Proposition |
|---|---|
| Accueil (`accueil`) | **Socle** |
| Profil du club (`profil`) | **Socle** |
| Catégories et équipes (`categories`) | **Socle** (c'est ce que mesure le forfait) |
| Éducateurs (`educateurs`) | **Socle** (affiliation, invitations) |
| Staff (`staff`) et Organigramme (`organigramme`) | **Socle** |
| Planning (`planning`), Planifier séance (`seances`), Planning des terrains (`terrains`) | Outil **Planning et terrains** |
| Classements (`classements`) et Tournois (`tournoi`) | Outil **Compétition** |
| Projet Sportif (`projet_sportif`) | Outil **Projet sportif** |
| Déplacements (`deplacements`) et Inventaire (`inventaire`) | Outil **Logistique** |
| Budget (`budget`) et Sponsors (`sponsors`) | Outil **Finances et partenaires** |
| Événements et Projets (`evenements`), Tâches (`taches`), Newsletter (`newsletter`) | Outil **Vie du club** |
| Stages (`stages`) | Outil **Stages** |
| Recrutement (`recrutement`) | Outil **Recrutement** (même limite `recrutementActif`) |
| Projet Club CFF4 (`projet_club_cff4`) | **À trancher** (question B) |

Total proposé : 10 outils éducateur et 8 outils club (hors CFF4). Je les ai regroupés volontairement : 20 petits outils à 3 euros rendraient « Mes outils » illisible, ce qui est le problème que tu veux résoudre.

### Lien club vers éducateur
Quand le club prend un outil et l'ouvre, ses éducateurs affiliés reçoivent l'outil éducateur correspondant :
- Planning et terrains → Séances
- Compétition → Matchs et Suivi des joueurs
- Projet sportif → Projet sportif
- Logistique → Organisation
- Stages → Stages
Les autres outils club (Finances, Vie du club) n'ont pas d'équivalent éducateur. **À valider (question C).**

## 3. Les 3 questions et le pré-cochage

**Q1. Vous êtes ?** Éducateur indépendant · Éducateur d'un club · Président ou dirigeant de club
**Q2. Quelle catégorie ?** École de foot (U6 à U11) · U13 à U15 · U17 à U19 · Seniors
**Q3. Votre priorité cette saison ?** Préparer mes séances · Suivre mes joueurs · Gérer matchs et compétition · Organiser le club

| Réponse | Outils pré-cochés |
|---|---|
| Q3 Préparer mes séances | Séances, Tactique (club : Planning et terrains) |
| Q3 Suivre mes joueurs | Suivi des joueurs, Évaluations et vidéo |
| Q3 Matchs et compétition | Matchs, Tactique (club : Compétition) |
| Q3 Organiser le club | Organisation (club : Logistique, Vie du club) |
| Q2 École de foot | + Projet sportif, sans Préparation physique |
| Q2 U13 à U15 | + Préparation physique |
| Q2 U17 à U19 et Seniors | + Préparation physique, Évaluations et vidéo |
| Q1 Éducateur d'un club | La question 3 ne s'applique qu'aux outils que le club n'ouvre pas ; on montre d'abord ce qui est fourni |

Le client peut tout décocher. Aucun total n'est affiché sans prix : la grille est à fournir avant le bloc 5.

## 4. Réponses aux hypothèses 9 du plan

1. **Une offre de l'administrateur ignore la règle « un essai par outil » : oui.** Sinon Kevin ne pourrait pas relancer un client. L'offre est tracée à part de l'essai normal.
2. **Un club sans forfait actif ne peut pas lancer d'essai : oui.** Le forfait est la base. Un essai d'outil n'a de sens qu'au-dessus d'un forfait.
3. **« Accès limité » d'un club résilié : à corriger.** Aujourd'hui un club non payé ne voit **aucun accès limité** : il voit l'écran plein « Abonnement non actif ». Deux choix :
   - **Recommandé** : garder cet écran pour le club (aucun changement, aucun risque), données conservées, et le brief parle d'écran d'abonnement et non d'accès limité.
   - Alternative : créer un vrai mode lecture seule. Plus long, à ouvrir seulement si tu y tiens.
4. **Nouveau à signaler** : l'éducateur résilié passe aujourd'hui sur le même écran plein. Dans le nouveau modèle il retombe sur le **socle gratuit**. Ce changement ne concerne que les comptes `modele_outils`.

## 5. Questions pour toi (une réponse change le résultat)

- **A. Stages** : aujourd'hui seul l'éducateur **affilié** y a accès. Un éducateur indépendant qui achèterait l'outil Stages verrait quelque chose qui ne marche pas pour lui. Je propose : outil Stages côté **club uniquement**, l'éducateur affilié en profite via le club.
- **B. Projet Club CFF4** : ton choix précédent est qu'il reste accessible aux clubs et éducateurs **affiliés et non affiliés**. Le mettre dans un outil payant change cette règle. Je ne le fais pas sans ton accord. Proposition : il reste dans le socle.
- **C. Lien club vers éducateur** : la correspondance de la section 2 te convient-elle ?
- **D. Liste d'outils** : les regroupements te conviennent-ils, ou veux-tu séparer certains (ex. Budget et Sponsors) ?
- **E. Hypothèse 3** : écran d'abonnement conservé pour le club (recommandé) ou mode lecture seule ?

## 6. Méthode pour des comptes de test sans payer en live

Principe : le profil existe avant le paiement, et l'accès ne dépend que de `abonnement_actif`. On n'ouvre donc jamais Stripe.

1. **Éducateur indépendant** : inscription normale avec une adresse de test (ex. `deabreu.amorim+edu1@gmail.com`, qui arrive dans ta boîte habituelle). Ferme l'onglet Stripe qui s'ouvre sans payer.
2. **Club** : inscription normale via l'assistant club jusqu'à l'étape de paiement, que tu ne lances pas (adresse `+club1`). Le profil club est créé avant.
3. **Éducateur affilié** : inscription comme au point 1 (adresse `+edu2`), puis rejoindre le club de test avec son **code club** depuis le dashboard éducateur. Le club accepte la demande.
4. Pour entrer dans le dashboard sans payer : je te donnerai au bloc 2 un petit SQL qui passe `abonnement_actif` à vrai sur ces trois comptes seulement (et active `modele_outils`). Je ne l'exécute pas moi-même : tu le lances, comme pour tout SQL.
5. Les vrais paiements de test viendront plus tard, avec les cartes de test Stripe en mode test (bloc 6 et suivants).

À retenir : crée ces comptes **avant** le bloc 3 (éducateur) et le bloc 4 (club), pas avant.

## 7. Pièges notés pour les blocs suivants (hors périmètre ici)
- Le nouvel endroit de vérification des droits devra couvrir aussi les groupes `subKeys` de l'éducateur.
- `api/upload-image.js` utilise déjà `PERMISSION_DEFAULTS` côté serveur : le verrou du bloc 15 devra rester cohérent avec lui.
- Le chantier saisons (`PLAN-saisons.md`) ajoute `clotures_saison` : à classer dans Évaluations et vidéo, à re-vérifier si ce chantier avance.
