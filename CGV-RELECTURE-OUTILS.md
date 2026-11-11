> **Mise à jour 2026-11-11 (après tes réponses)** : texte intégré dans `src/pages/CGV.jsx` derrière l'interrupteur `NOUVEAU_MODELE` (éteint : la page publiée est inchangée). Les tableaux de prix viennent du catalogue. Règle de changement de palier : hausse facturée tout de suite, baisse à l'échéance (lue dans `api/outils.js`). TTC confirmé. Essai gratuit : non écrit (suspendu) ; les offres marketing sont couvertes par l'article 3.10. Clients professionnels : nouvel alinéa dans l'article 7. Le texte ci-dessous est la première version, la version à jour est dans CGV.jsx.

# CGV : texte proposé pour les outils à la carte (relecture)

Date : 2026-11-11. Fichier de relecture : rien n'est encore dans `src/pages/CGV.jsx`.
Les prix viennent de `src/lib/catalogueOutils.js` (rien d'inventé). Chaque passage porte une étiquette :
- [REMPLACE] remplace un passage existant
- [NOUVEAU] ajouté

Ce n'est pas un avis d'avocat. Les points juridiques à faire valider sont listés en bas.

---

## Article 2 (Objet) : [REMPLACE] 2e paragraphe

Digital Football propose : l'analyse vidéo personnalisée avec retour vocal expert, un feed social pour les clips des joueurs, une mise en relation joueurs / clubs / agents / recruteurs, et des outils de gestion pour les éducateurs et les clubs (séances, tacticboard, bibliothèque, suivi des joueurs, statistiques collectives, préparation physique, évaluations et vidéo, projet sportif, projet club, stages).

## Article 3.3 Abonnement Éducateur : [REMPLACE]

L'éducateur dispose d'un socle gratuit. Il compose ensuite ses outils et paie selon leur nombre :

| Palier | Mensuel | Annuel |
|---|---|---|
| De 1 à 3 outils | 10,00 € | 80,00 € |
| De 4 à 6 outils | 15,00 € | 120,00 € |
| De 7 à 9 outils (tous les outils) | 18,00 € | 150,00 € |

Le palier dépend du nombre d'outils choisis. Un paiement pour 1 ou 2 outils reste au tarif du premier palier. À partir de 7 outils, le palier « tous les outils » donne accès aux 9 outils achetables. Les outils fournis par un club (voir 3.5) ne comptent pas dans le palier.

## Article 3.5 Abonnement Club : [REMPLACE] introduction du tableau

Le forfait du club dépend du nombre d'équipes (tableau ci-dessous). Il couvre tous les outils du club, sans supplément. Le club choisit les outils qu'il ouvre et peut en ajouter ou en retirer quand il le souhaite.

Les prix du tableau sont ceux du forfait par nombre d'équipes : 2 équipes 50 € / 500 € ; 4 équipes 100 € / 1 000 € ; 7 équipes 130 € / 1 300 € ; 11 équipes 160 € / 1 600 € ; 15 équipes 190 € / 1 900 € ; 22 équipes 250 € / 2 500 € (mensuel / annuel).
> À CONFIRMER PAR KEVIN : le tableau actuel de la page est généré par `STRIPE_LINKS_CLUB` (anciens forfaits). À la bascule (bloc 16), il doit afficher cette grille. Si tu préfères, je remplace le tableau automatique par celui-ci au bloc 16.

## Article 3.9 Outils fournis par le club : [NOUVEAU]

Un club abonné peut ouvrir ses outils aux éducateurs affiliés à son club, sans frais pour ces éducateurs. Ces outils cessent d'être accessibles à l'éducateur dès que le club les ferme, les retire ou met fin à son abonnement (à la fin de la période payée). L'éducateur qui s'inscrit via l'invitation d'un club est informé, à l'inscription, que les outils du club s'ajoutent à son compte sans frais.

## Article 3.10 Offres offertes : [NOUVEAU]

Digital Football peut offrir l'accès à un outil pour une durée limitée, sans carte bancaire. À la date de fin indiquée, l'accès s'arrête de lui-même, sans engagement ni facturation. Un outil déjà payé et retiré, encore accessible jusqu'à sa fin de période, est prolongé si l'offre va plus loin.

## Article 3.11 Essai gratuit : [NOUVEAU, SEULEMENT SI RÉACTIVÉ]

> Les essais gratuits sont suspendus aujourd'hui (`ESSAIS_GRATUITS = false`). Ce paragraphe n'est à publier que si tu les rallumes avant la bascule.

Un essai gratuit de 14 jours est proposé une seule fois par outil et par compte éducateur, sans carte bancaire. À la fin de l'essai, l'accès s'arrête sauf souscription.

## Article 6 Durée et renouvellement : [REMPLACE]

6.1 Les abonnements se renouvellent tacitement (mensuel ou annuel). La résiliation se fait depuis la page « Mes outils » ou par email à {CONTACT_EMAIL}. Elle prend effet à la fin de la période déjà payée : l'accès reste ouvert jusqu'à cette date.

6.2 Pour l'éducateur : en résiliant tout, il revient au socle gratuit à la fin de la période payée. Pour le club : il passe en accès limité à la fin de la période payée.

6.3 Changement de périodicité : l'abonné peut passer du mensuel à l'annuel (ou l'inverse). Le changement prend effet à la prochaine échéance, avec les mêmes outils, et peut être annulé jusque-là. La date de passage est affichée avant confirmation.

## Article 6 bis Modifier ses outils en cours d'abonnement : [NOUVEAU]

6 bis.1 Ajouter un outil : l'outil est activé dès le paiement confirmé. Le prix du palier ou du forfait est facturé au prorata de la période restante, immédiatement.

6 bis.2 Retirer un outil : le retrait est enregistré tout de suite. L'outil reste accessible jusqu'à la date de fin de la période déjà payée, affichée avant confirmation. Aucun remboursement n'est effectué.

6 bis.3 Changer de palier : le changement de palier (par exemple de 3 à 6 outils) suit les mêmes règles : [TEXTE À COMPLÉTER SELON TES RÈGLES : remplacement immédiat, baisse à l'échéance, différence facturée à la hausse, voir « Reste à finir »].

6 bis.4 Retirer le dernier outil d'un éducateur revient à résilier : l'abonnement prend fin à la fin de la période payée.

## Article 5 Paiement : [REMPLACE] dernière phrase

En cas d'échec de paiement, un avertissement est affiché dans « Mes outils ». Faute de régularisation, l'accès aux outils est suspendu.

## Article 8 Remboursement : [REMPLACE] première phrase

Hors rétractation valide, aucun remboursement ni avoir en cas de retrait d'un outil, de baisse de palier ou de résiliation en cours de période : l'accès reste ouvert jusqu'à la fin de la période payée.

---

## Points à décider ou faire valider avant publication (bloc 16)

1. **Changement de palier (6 bis.3)** : le plan note trois règles du bloc 8 (remplacement immédiat, baisse à l'échéance, différence facturée à la hausse) mais je n'ai pas relu le code pour confirmer laquelle s'applique à quel cas. Je n'ai donc pas écrit la phrase : dis-moi la règle voulue ou je vérifie le code `api/outils.js` au prochain échange.
2. **TTC ou HT** : les CGV actuelles disent TTC. Je n'ai pas vérifié que les prix Stripe des outils incluent la TVA. À confirmer.
3. **Droit de rétractation pour les clubs** : un club est un professionnel, la rétractation de l'article 7 ne le concerne en principe pas. À faire valider par un juriste, je ne tranche pas.
4. **Essai gratuit** : suspendu, donc paragraphe 3.11 conditionnel.
5. **Anciens forfaits et anciens tarifs** (Éducateur 10 € / 100 €, forfaits actuels) : encore vendus aux comptes sans le nouveau modèle jusqu'à la bascule. Le texte neuf ne doit être publié qu'au bloc 16 (comme prévu au plan).
6. **Date de version** (« version en vigueur au 08/10/2026 ») : à changer à la publication. Les abonnés actuels doivent être prévenus 30 jours à l'avance (article 15) par email : je ne le fais pas, c'est un envoi réel soumis à ton « ok ».
7. **Page /tarifs (bloc 13)** : relire ses textes en même temps que ces CGV, comme prévu.
