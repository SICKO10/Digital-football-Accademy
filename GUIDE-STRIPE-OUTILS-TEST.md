# Guide : Stripe en mode test pour les outils à la carte

À faire toi-même, dans cet ordre. Tout se passe en **mode test** : aucun vrai paiement, aucun vrai client touché. Ne m'envoie jamais une clé, colle-la seulement aux endroits indiqués.

## Étape 1 : passer Stripe en mode test
1. Ouvre https://dashboard.stripe.com
2. Vérifie que le bouton « Mode test » (ou « Sandbox », selon l'affichage) est activé, souvent un bandeau orange en haut.
3. Tout ce qui suit se fait dans ce mode.

## Étape 2 : récupérer ta clé secrète de test
1. Dans Stripe test : Développeurs > Clés API.
2. « Clé secrète » : clique pour la révéler, elle commence par `sk_test_`. Garde-la dans le presse-papier. Si elle commence par `sk_live_`, tu es en mode production : reviens à l'étape 1.

## Étape 3 : créer les produits et les prix
Dans le terminal, dans le dossier du projet :

```
cd ~/digital-football
node scripts/stripe-creer-produits-outils.mjs --simulation
```
Cette première commande n'envoie rien : elle liste les 30 prix qui seront créés (9 outils éducateur et 6 forfaits club, en mensuel et annuel). Vérifie les montants.

Puis la vraie création :
```
node scripts/stripe-creer-produits-outils.mjs
```
Le script te demande la clé : colle-la (rien ne s'affiche) puis Entrée. Il écrit « créé » pour chaque prix. Tu peux le relancer sans danger : il n'ajoute jamais de doublon. S'il écrit « DIFFÈRE », il ne modifie rien : dis-le-moi dans la session.

## Étape 4 : contrôler
```
node scripts/stripe-verifier-prix-outils.mjs
```
Même clé. Résultat attendu : « Mode Stripe : test », « 30 prix conformes sur 30 », « CONTRÔLE VERT ». Colle-moi ces lignes (pas la clé).

Tu peux aussi regarder dans Stripe test : Catalogue de produits. Tu dois voir 15 produits.

## Étape 5 : régler le portail client
Le portail est la page Stripe où le client voit ses factures, change sa carte et résilie. Dans Stripe test : Paramètres > Facturation > Portail client.
- Activer : mettre à jour le moyen de paiement ; historique des factures ; annulation d'abonnement, **à la fin de la période de facturation** (pas immédiate).
- Laisser désactivé : changement de formule et de quantité (l'ajout et le retrait d'outils se font dans la plateforme, dans Mes outils).
- Enregistrer.

## Étape 6 : la clé dans Vercel
1. https://vercel.com > ton projet > Settings > Environment Variables.
2. Nom : `STRIPE_OUTILS_SECRET_KEY`. Valeur : la clé `sk_test_...`.
3. Environnements : Production et Preview.
4. Enregistrer. Il faut ensuite un nouveau déploiement pour qu'elle soit prise en compte (je te le dirai quand on mettra en ligne).

## Étape 7 : la clé dans Supabase
1. Supabase > ton projet > Edge Functions > Secrets (ou Project Settings > Edge Functions).
2. Ajouter : nom `STRIPE_OUTILS_SECRET_KEY`, valeur la même clé `sk_test_...`.
3. Le secret du webhook (`STRIPE_OUTILS_WEBHOOK_SECRET`) vient au bloc 7, quand le webhook sera créé.

## Ce que je regarde ensuite
La fonction serveur `api/outils.js` sait déjà faire le même contrôle côté Vercel (action `verifier-prix`, réservée aux administrateurs). Elle n'est testable qu'une fois déployée avec la clé de l'étape 6.

---

# Bloc 7 : premier paiement test

À faire après les étapes 1 à 7 ci-dessus. Toujours en **mode test**, avec la carte de test, jamais une vraie carte.

## Étape 8 : la base de données
1. Lance la sauvegarde : `~/Sauvegardes-DigitalFootball/sauvegarder.sh`
2. Si ce n'est pas déjà fait (bloc 5) : dans Supabase > SQL Editor, exécute `supabase_outils_a_la_carte_bloc5.sql`, puis `supabase_outils_a_la_carte_bloc5_verification.sql`.
3. Exécute `supabase_outils_a_la_carte_bloc7.sql`, puis `supabase_outils_a_la_carte_bloc7_verification.sql`. Résultat attendu : une ligne, toutes les colonnes à `true`. Colle-moi ce résultat.

## Étape 9 : créer le webhook dans Stripe test
1. Stripe test : Développeurs > Webhooks > « Ajouter une destination » (ou « Ajouter un endpoint »).
2. Type : « Compte » (événements de ton compte). URL :
   `https://ogxladkyvcnhwctyiknu.supabase.co/functions/v1/stripe-webhook-outils`
3. Événements à cocher (les 4 derniers serviront au bloc 8, autant les mettre tout de suite) :
   `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Enregistre. Sur la page du webhook, « Secret de signature » : clique pour le révéler, il commence par `whsec_`.
5. Supabase > Edge Functions > Secrets : ajoute `STRIPE_OUTILS_WEBHOOK_SECRET` avec cette valeur. Vérifie que `STRIPE_OUTILS_SECRET_KEY` (étape 7) est bien là aussi.

## Étape 10 : mettre le code en ligne
Dis-moi « ok push » dans la session : je mets en ligne les blocs 5, 6 et 7 (seuls tes 3 comptes de test voient la différence). Vercel prend alors aussi la clé de l'étape 6.

## Étape 11 : paiement test de l'éducateur
1. Connecte-toi avec l'éducateur de test, menu « Mes outils ».
2. Dans « Payer mes outils », coche 2 outils, laisse « Mensuel », vérifie le total, clique « Payer ».
3. Sur la page Stripe : carte `4242 4242 4242 4242`, une date future (ex. 12/30), n'importe quel code à 3 chiffres, n'importe quel nom.
4. Tu reviens sur Mes outils : « Paiement validé : tes outils sont actifs ». Les 2 outils sont marqués « Actif » et apparaissent dans le menu.

## Étape 12 : paiement test du club
1. Dans Supabase > SQL Editor : exécute `supabase_outils_a_la_carte_bloc7_club_test_sans_forfait.sql` (il ne touche que le club de test).
2. Connecte-toi avec le club de test : l'écran « Active le forfait de ton club » s'affiche.
3. Choisis un forfait, « Mensuel », « Payer », même carte de test.
4. Au retour, le dashboard du club s'ouvre tout seul en quelques secondes.

## Étape 13 : contrôler dans Stripe test
- Abonnements : 2 abonnements, avec les bonnes lignes (2 outils pour l'éducateur, 1 forfait pour le club).
- Développeurs > Webhooks > ton webhook : les livraisons `checkout.session.completed` sont en vert (200).
- Relis le nom des produits sur la facture test (ex. « Séances ») : dis-moi s'il faut les renommer.

Si quelque chose est rouge ou si l'activation tarde : ne refais pas de paiement, dis-le-moi dans la session.
