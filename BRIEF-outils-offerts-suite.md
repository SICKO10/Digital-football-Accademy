# BRIEF : suite du chantier « le club offre les outils » (3 améliorations)
Date : 2026-11-13 · Statut : décisions de Kevin prises, prêt pour /plan (Opus, session neuve) · Suite de BRIEF-outils-offerts.md et PLAN-outils-offerts.md (blocs 0 à 9 faits côté code, parcours de test de Kevin en cours)

## Décisions de Kevin (2026-11-13)
1. **Le club choisit qui a une place.** À tout moment, le club change quels éducateurs affiliés bénéficient de l'abonnement club, dans la limite des places de son forfait (`profiles.quota_equipes`). Remplace la règle actuelle (rang = date de la demande, `educateur_a_place` en base).
2. **Journal et « Rétablir » pour les outils fournis.** Le club change les outils fournis quand il veut, sans limite de nombre de changements. Chaque changement (outil fourni à tous, ou à un seul éducateur) est inscrit au journal de Mon club et peut être rétabli.
3. **Prévenir l'éducateur avant la fin du forfait.** Quand le club résilie, l'éducateur reçoit une notification dans sa cloche avec la date de fin, pour anticiper. Cloche seulement, pas d'email (décision du premier chantier).

## Ce qui existe déjà
- Règle des places : `educateur_a_place(club, educateur)` (rang par `club_educateurs.created_at`), utilisée par `outils_actifs`, `a_outil`, le déclencheur `prevenir_fin_outils_club`, `api/outils.js`, `BandeauPlaces.jsx`, `EtapeEducateurs.jsx`.
- Journal de Mon club : ne connaît que « retiré du menu » et « réaffiché » (table `mon_club_affichage`), bouton Rétablir et bandeau Annuler.
- Fin de forfait : avis envoyé APRÈS la perte (déclencheur sur `profiles`). La base ne garde pas la date de fin programmée pour un club : `outils_synchroniser_abonnement`, branche club, ne retient rien tant que l'abonnement court.

## Risques à traiter au /plan
- Changer la règle des places touche `outils_actifs`, `a_outil` et le verrou en production : sauvegarde, SQL exécuté par Kevin, contrôles avant et après, comptes réels identiques pour tous les clubs sans priorité choisie (par défaut : l'ordre actuel).
- Décider ce que devient l'éducateur qui perd sa place parce que le club en choisit un autre : avis dans la cloche (même texte que « plus de place »).
- Modifier la fonction de paiement Stripe (garder la date de fin programmée) : le point le plus délicat, à isoler dans son propre bloc, sans changer un prix ni un webhook existant.
- Quand le club annule sa résiliation avant la date : l'avis préalable doit être levé ou corrigé.
- Un seul avis par éducateur, pas de doublon avec l'avis « après la fin » existant.
- Clubs de l'ancien modèle : aucun changement.

## Marche à suivre
`/clear`, `/model opus`, `/effort high`, puis `/plan` (il lit ce BRIEF et écrit PLAN-outils-offerts-suite.md). Sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` avant tout SQL.
