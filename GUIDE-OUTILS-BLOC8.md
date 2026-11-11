# Guide du bloc 8 : modifier, résilier, factures et carte

Tout se passe en mode **réel** (les tarifs ont été créés en live au bloc 6). Il n'y a pas d'horloge de test en mode réel : la fin de période se simule en annulant un abonnement tout de suite dans Stripe (étape 9).

## A. Base de données (toi)
1. Dans le Terminal : `~/Sauvegardes-DigitalFootball/sauvegarder.sh`
2. Supabase > SQL Editor : coller et lancer `supabase_outils_a_la_carte_bloc8.sql`.
3. Puis lancer `supabase_outils_a_la_carte_bloc8_verification.sql` : une ligne, 5 colonnes à `true`. Me coller le résultat.

## B. Mise en ligne (moi, après ton « ok »)
4. Je redéploie la fonction `stripe-webhook-outils`, puis je pousse le code (Vercel).

## C. Réglages Stripe (toi, mode réel)
5. Stripe > Développeurs > Webhooks > l'endpoint `stripe-webhook-outils` > « Modifier » > « Sélectionner les événements » : garder `checkout.session.completed` et **ajouter** `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`. Enregistrer.
6. Stripe > Paramètres > Facturation > Portail client :
   - activer : mettre à jour les moyens de paiement, historique des factures, informations de facturation ;
   - résiliation : activée, **à la fin de la période de facturation**, sans remboursement au prorata ;
   - changement d'abonnement (changer de formule, de quantité) : **désactivé** (le choix des outils se fait dans Mes outils, sinon le portail créerait des incohérences) ;
   - enregistrer.

## D. Tests (toi, compte éducateur de test puis compte club de test)
Avant : vérifier dans Stripe > Abonnements que l'abonnement de test est « Actif ». Sinon, refaire un paiement avec un code promo à 100 %.
Attention : si ton code promo vaut « une fois » (et non « pour toujours »), la différence de l'étape 8 est prélevée réellement (quelques euros) : la rembourser ensuite dans Stripe.

Éducateur, page Mes outils, bloc « Mon abonnement » :
7. « Modifier mes outils » : remplacer un outil par un autre (même nombre). Attendu : même prix, l'ancien disparaît, le nouveau apparaît dans les 10 secondes.
8. Cocher pour arriver à 4 outils. Attendu : texte « Tu paies aujourd'hui la différence... », bouton « Confirmer et payer la différence » ; après : palier jusqu'à 6 outils, nouvelle facture dans Stripe.
9. Revenir à 3 outils. Attendu : « Ton prix passe à 10 € à partir du ... », l'outil retiré affiche « Actif jusqu'au ... ».
10. « Factures et carte » : le portail Stripe s'ouvre, le retour ramène sur Mes outils.
11. « Résilier », confirmer : bandeau « Résilié : tes outils restent actifs jusqu'au ... ». Puis « Reprendre mon abonnement » : tout redevient normal.
12. Fin de période simulée : Stripe > l'abonnement > « Annuler l'abonnement » > **immédiatement**. Attendu : les outils payés disparaissent, l'écran de paiement revient.

Club (compte du club) : 13. « Changer de forfait » (plus grand, puis plus petit), 14. « Factures et carte », 15. « Résilier » puis « Reprendre ». 16. Annulation immédiate dans Stripe : le club revient à l'écran « Active le forfait de ton club ».

17. Page Revenus : un paiement réel supérieur à 0 € des outils y apparaît (pas ceux à 0 €).
