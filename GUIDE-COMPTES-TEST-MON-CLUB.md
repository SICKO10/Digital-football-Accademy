# Guide : comptes de test pour « Mon club »

Written for: Kevin, qui crée les comptes à la main dans la plateforme et dans Supabase.

Ce guide sert aux blocs 4 à 9 de PLAN-mon-club.md. Il faut deux clubs et quatre éducateurs de test, avant le bloc 4.

## Ce qu'il faut à la fin

| Compte de test | Type | Modèle | Pourquoi |
|---|---|---|---|
| Club A | club | ancien modèle (aucun réglage à la main) | vérifier que rien ne change par défaut |
| Éducateur A1 et A2 | éducateur affilié à Club A | ancien modèle | voir le menu de l'ancien modèle |
| Club B | club | nouveau modèle (`modele_outils` = vrai) | tester les outils, les deux modes, les notifications |
| Éducateur B1 et B2 | éducateur affilié à Club B | nouveau modèle | tester le mode commun et le mode individualisé |

Les adresses utilisent ton adresse Gmail avec un suffixe `+`, comme dans le SQL existant (`deabreu.amorim+club1@gmail.com`, `deabreu.amorim+edu2@gmail.com`). Gmail reçoit tout ce qui est envoyé à ces adresses.

## Étape 1 : créer les comptes

1. Crée les quatre comptes depuis l'inscription du site, avec les adresses ci-dessus.
2. Pour chaque éducateur, fais la demande d'affiliation à son club de test, puis accepte-la depuis le compte club.
3. Vérifie dans la base que les quatre comptes existent (table `profiles` et `auth.users`).

Je n'ai pas pu vérifier ici la procédure exacte d'affiliation : elle est décrite dans `docs/outils-a-la-carte/INVENTAIRE.md` (section 6) si ce fichier existe. Sinon, je la confirmerai au bloc 4 avant de l'utiliser.

## Étape 2 : marquer le club B en nouveau modèle

Le fichier `supabase_outils_a_la_carte_comptes_test.sql` passe les comptes en nouveau modèle, mais il ne liste que trois adresses. Il faut donc l'adapter avant de le lancer (mise à jour de la liste des adresses). Ce SQL modifie la table `profiles` : il ne sert qu'aux comptes de test.

Règles à respecter :
- Lance d'abord la sauvegarde : `~/Sauvegardes-DigitalFootball/sauvegarder.sh`.
- Ne lance jamais de `delete` ou de `drop`. Ce guide n'en demande aucun.
- Vérifie que la liste ne contient que des adresses de test (`+club`, `+edu`).

Le bloc 3 réécrit ce point proprement avec le nouveau modèle. D'ici là, je ne touche pas à la base.

## Étape 3 : contrôle

Ouvre chaque compte dans un navigateur de navigation privée et regarde :
- Club A : le menu est celui d'aujourd'hui, rien de nouveau.
- Club B : l'écran « Mes outils » est présent dans le menu du club (à confirmer au bloc 4).
- Éducateur A1 : son menu est identique à avant.
- Éducateur B1 : il voit les outils du club B.

## Points à confirmer avant le bloc 4

- La procédure d'affiliation exacte (voir étape 1).
- L'adresse du deuxième éducateur de chaque club, qui n'est pas dans le SQL actuel.
- Si le compte club B doit aussi avoir un abonnement actif : le SQL actuel le fait (`abonnement_actif = true`).

## Ce qui ne doit jamais arriver
- Un vrai paiement ou un vrai email déclenché par un compte de test. Avant chaque action qui pourrait en envoyer (paiement, notification par email), on s'arrête et on demande ton « ok ».
- Un compte de test laissé sans affiliation : le bloc 4 ne peut pas se tester.
