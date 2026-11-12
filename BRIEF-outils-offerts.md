# BRIEF : le club offre les outils à ses éducateurs affiliés
Date : 2026-11-12 · Statut : prêt pour /plan (à lancer en Opus, session neuve) · Suite de BRIEF-mon-club.md

## Vision en 3 lignes
Un club qui prend un forfait (par exemple jusqu'à 4 équipes) peut affilier autant d'éducateurs que son forfait le prévoit et leur donner tous les outils qu'il veut. L'éducateur ne paie rien.
Dans Mon club, étape « Dashboard de mes éducateurs », un interrupteur allumé veut dire « le club fournit cet outil à mes éducateurs » (et plus seulement « ne pas le masquer »).
Si le club arrête son forfait, l'éducateur perd ces outils : à lui de prendre son propre abonnement ou de changer de club.

## Constat de départ (2026-11-12, captures de Kevin)
- Compte test éducateur `testfinal` (nouveau modèle, aucun outil) : son menu ne montre que le socle, alors que l'aperçu côté club liste Stages, Préparation physique, Tacticboard, Bibliothèque, Projets.
- Cause : aujourd'hui le club ne peut que retirer des entrées du menu. Il ne peut offrir que 3 outils (Stages, Projet sportif, Projet Club CFF4), qui ont un équivalent côté club. Les 6 autres outils éducateur sont payés par l'éducateur.
- L'écran actuel promet plus qu'il ne fait : il doit être corrigé par ce chantier.

## Décisions de Kevin
1. **Quels outils** : les 9 outils éducateur, le club choisit librement.
2. **Limite** : le nombre d'éducateurs affiliés est limité par le forfait du club (forfait 4 équipes = 4 éducateurs ; un éducateur qui a 4 équipes compte pour un seul). Au-delà, les éducateurs n'ont que le socle gratuit et ne peuvent pas être affiliés : le club passe au forfait supérieur.
3. **Éducateur qui paie déjà** : il peut résilier le sien puisque son club le lui offre (règle de « doublon » déjà en place). Quand le club résilie, l'éducateur perd les outils offerts, sans effacer ses données.
4. **Qui est concerné** : seulement les clubs du nouveau modèle, y compris le club d'essai `deabreu.amorim+test@gmail.com` [À CONFIRMER : les comptes de test précédents utilisaient `deabreu.amorim+club@gmail.com`].
5. **Individualisé** (pas urgent, mais voulu) : une fois l'affiliation enregistrée, le club clique sur le nom de l'éducateur dans sa liste et personnalise son dashboard (outils fournis et menu).

## Ce qui existe déjà (à réutiliser)
- Forfaits club par nombre d'équipes : `FORFAITS_CLUB` (2, 4, 7, 11, 15, 22 équipes) dans `src/lib/catalogueOutils.js`, et `PALIERS_QUOTA_EQUIPES` dans `src/lib/stripeLinks.js`.
- Table `outils_club_ouverts` et fonctions `outils_actifs` et `a_outil` (`supabase_outils_a_la_carte.sql`) : l'outil ouvert à l'éducateur doit aujourd'hui être aussi détenu par le club (`viaClub`).
- Étape « Dashboard de mes éducateurs », modes commun et individualisé, journal et bouton Rétablir, notifications aux éducateurs (blocs 6 à 10 de PLAN-mon-club.md).
- Verrou des pages en base (`supabase_outils_verrou.sql`) : à ne pas casser.

## Risques et points à trancher au /plan
- Changement des règles en base de production (fonctions `outils_actifs` et `a_outil`, verrou) : sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` avant, SQL exécuté par Kevin, pas de retour arrière prêt à lancer.
- Limite d'éducateurs : où la faire respecter (acceptation d'une demande d'affiliation, côté base ou serveur) et que faire d'un club déjà au-dessus de la limite.
- Un éducateur rattaché à plusieurs équipes compte pour un siège : confirmer comment on compte (éducateurs distincts affiliés, pas équipes).
- Message clair à l'éducateur quand le club résilie ou change de forfait (notification, avec date).
- Aucun nouveau tarif Stripe prévu : à confirmer avec Kevin au /plan.
- Corriger l'aperçu « Voir comme un éducateur » et les textes de l'étape pour qu'ils reflètent ce que l'éducateur reçoit vraiment.
