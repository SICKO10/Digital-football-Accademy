# BRIEF : outils à la carte et dashboard composé
Date : 2026-11-07 · Statut : prêt pour /plan

## Vision en 3 lignes
Un club ou un éducateur ne paie plus « toute la plateforme » : il choisit les outils dont il a besoin, chacun avec son prix.
Son dashboard ne montre que ces outils, il reste léger et lisible.
Il ajoute, retire ou résilie un outil à tout moment, et paie le juste montant.

## Pour qui, et ce qui change pour eux
- **Éducateurs** : aujourd'hui ils voient une quinzaine d'entrées de menu et se sentent noyés. Demain : un compte gratuit et quelques outils choisis, avec un accueil qui ne parle que de ça.
- **Éducateurs affiliés à un club** : ils profitent sans payer des outils que le club met à leur disposition, et composent leur propre dashboard parmi ces outils.
- **Clubs** : ils gardent leur forfait selon le nombre d'équipes, puis ajoutent seulement les outils qu'ils utilisent.
- **Kevin** : un discours marketing simple (« composez votre outil »), un ticket d'entrée bas pour les éducateurs, l'essai gratuit comme levier commercial, et une hausse du panier quand le client ajoute des outils.

## Promesse et différenciation
« Ne payez que ce que vous utilisez vraiment. » La plateforme s'adapte à chaque personne, et pas l'inverse.

## Modèle économique (décidé)
| Profil | Base | Outils |
|---|---|---|
| Éducateur indépendant | Socle **gratuit** | Chaque outil éducateur a un prix mensuel et un prix annuel. |
| Club | **Forfait selon les équipes**, mêmes montants qu'aujourd'hui (50 € à 250 €/mois, ou 500 € à 2 500 €/an) | Chaque outil club a un prix unique, identique pour tous les clubs, avec un prix mensuel et un prix annuel. |
| Éducateur affilié | Gratuit | Il a accès sans payer aux outils que le club a pris et met à sa disposition. Il peut acheter lui-même un outil que le club n'a pas pris. |

- Le **socle** (toujours inclus) : accueil, profil, effectif, messagerie, notifications, paramètres. La liste exacte sera validée au bloc 0.
- **Mensuel ou annuel** : le client choisit une seule périodicité pour toute sa composition. Stripe impose une même période pour toutes les lignes d'un abonnement. Il peut changer de périodicité au renouvellement.
- **Ajouter un outil** : il est actif tout de suite. Le client paie le prorata jusqu'à sa prochaine échéance.
- **Retirer un outil** : il reste actif jusqu'à la fin de la période déjà payée (mois ou année), puis il est masqué. Pas de remboursement. Les données sont conservées et réapparaissent si l'outil est repris.
- **Résilier tout** : même règle, et le compte retombe sur le socle gratuit (pour un éducateur) ou en accès limité (pour un club). Les données sont conservées.
- **Le club retire un outil** : ses éducateurs affiliés le perdent à la même date et sont prévenus.
- **Doublon** : si le club prend un outil qu'un de ses éducateurs payait lui-même, l'éducateur est prévenu qu'il peut retirer le sien.

## Parcours et éléments à produire
1. **Catalogue des outils**, dans un seul fichier source : pour chaque outil, le rôle (club ou éducateur), le nom, une phrase de promesse, le prix mensuel, le prix annuel, l'identifiant Stripe et les entrées de menu qu'il débloque.
2. **Composer son offre en 3 questions** [IDÉE retenue] : à l'inscription, on demande « Vous êtes ? », « Quelle catégorie ? » et « Votre priorité cette saison ? ». Les outils adaptés sont pré-cochés et le total s'affiche en direct (mensuel ou annuel). Le client ajuste, puis paie (ou continue gratuitement s'il n'a pris aucun outil).
3. **Espace « Mes outils »** : outils actifs, outils en essai (avec les jours restants), outils disponibles avec leur aperçu et leur prix, boutons Ajouter, Retirer et Essayer, accès aux factures et à la carte bancaire (portail client Stripe).
4. **Dashboard composé** : le menu et l'accueil n'affichent que les outils actifs, en essai ou fournis par le club.
5. **Côté club : outils pour mes éducateurs** : parmi les outils du club, le club choisit ceux qu'il ouvre à ses éducateurs.
6. **Côté éducateur affilié** : il choisit lesquels afficher parmi les outils ouverts par le club, et il peut acheter les autres lui-même.
7. **Essai gratuit de 14 jours** [IDÉE retenue] : un essai par outil et par compte, sans carte bancaire. À la fin, l'outil est masqué et le client reçoit une proposition de le garder.
8. **Offres commerciales à partir de l'essai** : depuis l'espace administrateur (coach admin), Kevin peut offrir un essai d'un outil, avec la durée de son choix, à un compte ou à un groupe (tous les clubs, tous les éducateurs). La personne reçoit une notification sur la plateforme. Pas d'email en masse sans validation.
9. **Page publique des tarifs** avec un simulateur : cocher des outils et voir le total mensuel ou annuel.
10. **CGV** mises à jour (prorata, retrait, résiliation, essai) et relues par Kevin.

### Côté technique (pourquoi c'est un vrai chantier)
- Aujourd'hui, Stripe passe par des **liens de paiement fixes** (`src/lib/stripeLinks.js`), et le webhook reconnaît l'offre **par son montant** (`supabase/functions/stripe-webhook`). Ce fonctionnement ne peut pas gérer un panier variable.
- **Nouveau fonctionnement pour les clubs et les éducateurs** :
  - un produit Stripe par outil (prix mensuel et annuel), plus les forfaits club recréés en produits ;
  - une fonction serveur qui crée le paiement avec plusieurs lignes (forfait club et outils) ;
  - une fonction serveur qui ajoute ou retire une ligne d'un abonnement en cours (avec prorata) ;
  - un webhook qui identifie les outils par leur identifiant de prix ;
  - le portail client Stripe pour la carte bancaire et les factures.
- **Base de données** : une table des outils actifs par compte (source : achat, club ou essai, avec une date de fin), une table des outils ouverts par le club à ses éducateurs, et une table des essais déjà utilisés.
- **Sécurité** : l'accès à un outil est vérifié côté base et côté serveur, pas seulement en masquant le menu. Sinon, un outil non payé resterait ouvert par son adresse.
- **Filtrage** : par un catalogue central (sur le modèle de `role_permissions`), sans réécrire les dashboards (club : 7 500 lignes, éducateur : 13 000).
- **Joueur et recruteur** : leurs liens Stripe et la reconnaissance par montant restent inchangés.

## Idées signature [IDÉE]
1. **[IDÉE] Composer en 3 questions** (retenue) : supprime la peur de mal choisir, qui est le problème de départ.
2. **[IDÉE] Essai gratuit de 14 jours par outil** (retenue) : sert aussi d'outil d'offres commerciales pour Kevin.
3. **[IDÉE] Packs à prix réduit** : écartée pour le lancement, à revoir plus tard.

## Contraintes (plateforme, existant, budget, délai)
- En production, mais **aucun vrai client club ou éducateur actif** : tout le monde bascule sur le nouveau modèle, sans période de transition. Kevin vérifie dans Stripe qu'aucun abonnement club ou éducateur n'est actif avant la bascule.
- Stripe est en mode live. Tout le chantier se construit et se teste d'abord en **mode test Stripe**. La bascule en live est un bloc à part, avec l'ok explicite de Kevin.
- Sauvegarde manuelle de la base avant chaque migration (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`).
- Il n'y a plus de compte de test club ni éducateur : il faut en recréer (un club, un éducateur affilié, un éducateur indépendant) avant les tests de paiement.
- Les dashboards sont de très gros fichiers : on ne lit et ne modifie que les parties nécessaires.

## Décisions prises
- Brief séparé des autres chantiers.
- Éducateur : socle gratuit + outils payants.
- Club : forfait actuel selon les équipes + outils payants, au même prix pour tous les clubs.
- Les outils pris par le club sont gratuits pour ses éducateurs affiliés. Le club choisit lesquels il leur ouvre, et l'éducateur compose son dashboard parmi eux.
- Mensuel et annuel, avec une seule périodicité par composition.
- Retrait et résiliation en fin de période, sans remboursement, données conservées.
- Pas de migration d'abonnés : il n'y a aucun vrai client actif.
- Idées retenues : composer en 3 questions, essai de 14 jours avec offres administrateur. Packs écartés.
- Stripe Checkout et abonnement à plusieurs lignes : les liens fixes club et éducateur sont abandonnés.

## Questions ouvertes
Aucune qui bloque le plan. Deux points seront tranchés au bloc 0, sur proposition :
- la liste exacte socle / outils, et le découpage des menus actuels en outils ;
- les 3 questions de l'inscription et les outils qu'elles pré-cochent.

## Hors périmètre
- Offres joueur (starter, Pro) et recruteur.
- Réécriture des outils eux-mêmes : on change l'accès et l'affichage, pas le contenu.
- Packs.
- Emails marketing en masse.

## Ce que je dois fournir (accès, textes, photos, logos, comptes)
- **La grille de prix** : un prix mensuel et un prix annuel par outil, après validation de la liste au bloc 0. Aucun prix ne sera inventé.
- La validation de la liste socle / outils et des 3 questions (bloc 0).
- La création des produits dans Stripe en **mode test** (guidée pas à pas), puis en live au moment de la bascule.
- Trois comptes de test : un club, un éducateur affilié à ce club, un éducateur indépendant.
- La relecture des CGV modifiées.
