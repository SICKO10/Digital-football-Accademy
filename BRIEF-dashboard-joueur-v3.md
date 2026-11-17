# BRIEF : dashboard joueur, identité unique et accès rapide (v3)
Date : 2026-11-17 · Statut : prêt pour /plan

## Vision en 3 lignes
Le joueur ouvre l'app et sait en 3 secondes quand il joue, ce qu'il doit faire et où il en est.
L'écran parle football amateur réel (affiche de match, feuille de match, tableau d'affichage), pas « tableau de bord SaaS ».
Moins de rubriques visibles, plus de choses faisables en un geste.

## Pour qui, et ce qui change pour eux
- **Joueur rattaché à un club** (ado, téléphone) [HYPOTHÈSE : public principal] : aujourd'hui 14 entrées de menu en 5 sections ; il cherche. Demain : son prochain rendez-vous en grand, ses actions en un pouce.
- **Joueur indépendant Pro** (adulte, recherche de club) : veut voir sa progression et ce que l'abonnement lui apporte, sans fouiller.
- **Kevin** : un écran qu'il peut montrer en démo sans qu'on pense « fait par une IA ».

## Promesse et différenciation
Promesse : « Ton club dans la poche : ton prochain match, ta semaine, ta progression, en un coup d'œil. »
Différence : les codes visuels viennent du terrain (affiche du match du week-end, numéro de maillot, classement FFF), dans la continuité de l'identité « Maison de club » déjà posée sur les dashboards club et éducateur (Barlow / Barlow Condensed, coins 6 px, liseré d'écusson, pastilles V/N/D, jauges type possession).

## Parcours et éléments à produire
1. **Navigation resserrée** : 4 entrées + 1 action centrale (barre en bas sur téléphone, menu latéral court sur ordinateur) [HYPOTHÈSE] :
   Accueil · Mon équipe (équipe, actualités, compétition) · Progresser (entraînement, prépa tactique, prépa physique, nutrition, analyses) · Moi (profil, stats, certif, équipement) + action centrale.
   Toutes les rubriques actuelles restent joignables, regroupées dans des sous-onglets.
2. **Accueil refait** autour de trois réponses : quand je joue / ce que je dois faire cette semaine / où j'en suis.
3. **Passe identité** sur les rubriques internes (icônes au trait, coins, typographie condensée pour les chiffres, liseré d'écusson, fin des styles divergents).
4. Écran témoin validé par Kevin avant toute généralisation (même méthode que le chantier design identité).

## Idées signature [IDÉE]
- **[IDÉE] L'affiche du prochain match en tête d'accueil** : deux écussons, jour, heure de rendez-vous, lieu, comme l'affiche punaisée au club-house. Pourquoi : c'est la première question de tout joueur, et aucun outil générique n'a cette forme.
- **[IDÉE] Le pouce d'abord** : barre basse à 4 entrées et une action centrale (ex. « Saisir mon match »). Pourquoi : un ado consulte sur téléphone, d'une main, entre deux choses ; 14 entrées de menu le perdent.
- **[IDÉE] La fiche de joueur façon feuille de match** : numéro, poste, stats de saison en tableau d'affichage condensé, série V/N/D en pastilles. Pourquoi : le joueur se reconnaît, il a envie de la montrer.

## Contraintes (plateforme, existant, budget, délai)
- Production : React + Vite, Supabase, Stripe. Aucune modification de base, de paiement ou d'email dans ce chantier [HYPOTHÈSE].
- `src/pages/DashboardJoueur.jsx` : 5 595 lignes, menu `navItems` ligne ~3460 (14 entrées), 21 onglets. Socle `src/components/joueur/` (19 composants) déjà en place.
- Déjà fait, à ne pas défaire : Barlow chargée, coins à 4 px majoritaires, zéro emoji (PLAN.md), en-tête carte de joueur et coque commune (PLAN-joueur-v2.md), couleurs du club (PLAN-theme-club.md), identité Maison de club (PLAN-design-identite.md).
- Branche `estAffilie` abandonnée : on travaille la branche `navItems` / `isPro` uniquement.
- Icônes du menu : composants maison `Icon*`, pas lucide-react (à harmoniser avec les dashboards club/éducateur).
- Claude n'a pas de navigateur : chaque bloc finit par un contrôle visuel de Kevin.

## Décisions prises (Kevin, 2026-11-17)
- Nouveau brief séparé (BRIEF.md reste celui du chantier d'octobre). Plan à écrire dans `PLAN-dashboard-joueur-v3.md`.
- **Périmètre** : nouvel accueil + menu resserré + passe identité sur toutes les rubriques internes. Aucune rubrique supprimée ni fusionnée sur le fond : on range, on ne retire rien.
- **Menu** : 4 entrées + 1 action centrale. Barre fixe en bas sur téléphone, menu latéral court sur ordinateur. Rangement :
  - Accueil
  - Mon équipe : équipe, actualités du club (badge non lus), compétition
  - Progresser : entraînement, préparation tactique, préparation physique, nutrition (cadenas si non Pro), analyses
  - Moi : profil, mes statistiques, certification, équipement
  - Action centrale : « Saisir mon match » (seule action d'écriture fréquente ; décision Claude).
  Badges existants conservés et remontés sur l'entrée parente. Les ids d'onglet et les liens internes existants (Santé, Recruteurs, OnboardingGuide `NAV_SECTION_IDS`) continuent de fonctionner.
- **Accueil, 4 accès en un geste**, dans cet ordre :
  1. Prochain match (affiche) avec réponse à la convocation présent / absent si une convocation est active (données : `widgetProchainMatch`, `convocationActive`, `matchs_equipe`).
  2. Séance du jour (composant existant `SeanceDuJourJoueur`).
  3. Saisir un match joué.
  4. Ma progression (stats de saison, série V/N/D, lien vers Mes statistiques).
  État vide de chaque bloc : une phrase + une action, jamais une carte vide (ex. pas de club : « Rejoins ton club » ; pas de match prévu : « Aucun match annoncé »).
- **Public prioritaire** : ado rattaché à un club, sur téléphone. L'écran est conçu en 390 px d'abord ; le joueur indépendant Pro garde le même écran, la carte prochain match étant remplacée par sa progression quand il n'a pas de club.
- **Affiche de match** : écusson du club du joueur (existant) face au nom de l'adversaire en monogramme (initiales en Barlow Condensed dans une pastille), car aucun logo d'adversaire n'existe en base. Pas de nouvelle donnée.
- **Icônes** : passage du dashboard joueur à lucide-react, comme club et éducateur, pour une seule famille d'icônes dans l'app.
- **Méthode** : bloc témoin d'abord (coque + menu + accueil), validé par Kevin sur téléphone avant toute passe sur les rubriques. Sauvegarde datée avant chaque bloc, `npm run build` à chaque bloc, aucun commit sans accord.

## Questions ouvertes
- Aucune.

## Hors périmètre
- Dashboards club et éducateur. Base de données, paiements, emails. Branche `estAffilie`.

## Ce que je dois fournir (accès, textes, photos, logos, comptes)
- Un compte joueur de test rattaché à un club, avec un match à venir et si possible une convocation publiée (pour voir l'affiche remplie), plus un compte joueur Pro sans club. À vérifier au bloc 0.

## Impact sur les plans existants
- `PLAN.md` et `PLAN-joueur-v2.md` : terminés ; leurs validations visuelles en attente sont remplacées par celle de ce chantier.
- Les composants `EnTeteJoueur`, `ALaUne`, `BandeSemaine`, `BarreActions`, `JaugeSaison` (v2) sont réutilisés ou refaits, pas dupliqués.
