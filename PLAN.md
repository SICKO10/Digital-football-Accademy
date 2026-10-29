# PLAN : finition de l'espace joueur (starter et Pro)
Date : 2026-10-29 · Chantier précédent archivé dans `PLAN-archive-refonte-accueil-joueur.md`

Objectif : reprendre une à une les pages internes de l'espace joueur, qui font aujourd'hui brouillon ou enfantin, et les amener au niveau de l'accueil refait le 2026-10-29.
Périmètre : les écrans que voient les comptes `joueur_starter` et `joueur_pro`. Aucune modification de base de données, de paiement ou d'email.

## Un atout à réutiliser systématiquement
Le socle visuel existe déjà dans `src/components/joueur/` : `Carte`, `TitreSection`, `TuileChiffre`, `ListeAlertes`, `BandeSemaine`, `JaugeSaison`, `ApercuPro`. **Chaque page refaite doit s'appuyer dessus**, jamais recopier des styles à la main. Tous lisent les couleurs via `useColors()` et les valeurs via `src/tokens.js`.

Valeurs imposées, identiques au chantier précédent : espacements 4/8/12/16/20/24/32 ; rayons 12, 16, 999 ; carte = fond `background.surface`, bordure 1 px `border.subtle`, rayon 16, padding 16 px mobile et 20 px desktop ; une seule carte accentuée par écran ; largeur de contenu 980 px centrés ; zéro couleur en dur ; zéro emoji.

## Décisions de cadrage (prises le 2026-10-29)
- **Actualités du club** : un seul visuel football par défaut, livré avec l'application. **Pas de personnalisation par club** pour l'instant : cela demanderait une colonne en base et un envoi d'image. À reproposer seulement si Kevin le redemande.
- **Explorer** : un joueur **ne doit pas** pouvoir contacter un éducateur. C'est une règle à faire respecter, pas une fonctionnalité à créer. S'il existe un bouton qui le permet, il faut le retirer.
- **Nutrition** : premier écran adapté au joueur (poste, objectifs) avec des conseils différents selon son profil, plus un tutoriel.
- **Ordre** : le nettoyage transversal des émoticônes d'abord, puis page par page.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Un compte joueur `joueur_starter` ou `joueur_pro` que Kevin ouvre lui-même | C'est lui qui valide à l'œil, les sessions Claude Code n'ont pas de navigateur | Son compte habituel | chaque bloc |
| Une photo de fond football (facultatif) | Pour l'en-tête des Actualités. À défaut, un visuel sera dessiné en SVG, sans image à fournir | Kevin, ou rien | bloc 9 |
| Les conseils nutrition par poste (facultatif) | Pour que le premier écran nutrition dise quelque chose de vrai et d'utile | Kevin, ou un contenu générique assumé | bloc 10 |

## Manipulations à faire moi-même
1. **À chaque fin de bloc** : ouvrir la page concernée sur téléphone ET ordinateur, en thème sombre ET clair, puis valider ou dire ce qui ne va pas.
2. **Ne pas m'envoyer d'identifiants** : je ne peux pas m'en servir, je n'ai pas de navigateur.
3. **Rien n'est poussé sans mon « ok »** : un push déclenche un déploiement en production.

## Répartition suggérée
Douze blocs courts. Deux par séance au maximum, une session neuve par bloc. Les blocs 1 à 4 donnent le plus d'effet visible pour le moins de risque : les faire en premier.

## Règle d'économie, valable pour tous les blocs
`src/pages/DashboardJoueur.jsx` dépasse 5 600 lignes. **Ne jamais le lire en entier.** Repérer la zone avec `grep -n "onglet === '<nom>'"` puis lire seulement la plage utile avec `sed -n 'X,Yp'`. Les numéros de ligne bougent à chaque bloc.

## Blocs

### Bloc 0 : mise en place
- Statut : à faire
- Objectif : sauvegarde datée et build de référence pour ce nouveau chantier.
- Résultat testable : le site tourne comme avant, une copie datée existe.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : purement mécanique.
- Lancement : `/clear`, `/model haiku`, `/effort low`, `/bloc 0`
- Étapes :
  - Copier `src/pages/DashboardJoueur.jsx` dans `~/Sauvegardes-DigitalFootball/` avec la date du jour, sans écraser une sauvegarde existante.
  - `npm run build` : noter la durée, le nombre d'avertissements et le poids du bundle joueur, pour comparaison finale.
  - `npm run dev -- --host` et noter l'adresse réseau pour les tests sur téléphone.
- Ce que je teste : le site s'ouvre normalement.

### Bloc 1 : chasse aux émoticônes dans tout l'espace joueur
- Statut : à faire
- Objectif : plus aucune émoticône dans l'espace joueur. C'est le reproche principal de Kevin : « ça fait enfant ».
- Résultat testable : je parcours toutes les rubriques du menu sans voir un seul emoji.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : ce n'est pas un simple effacement, chaque emoji doit être remplacé par la bonne icône ou par la couleur de statut, sans casser les mises en page.
- Dépend de : bloc 0
- Étapes :
  - Recenser toutes les émoticônes restantes du fichier (41 lignes en contenaient avant ce chantier) et des composants joueur.
  - Remplacer par les composants `Icon*` déjà présents dans le fichier. Si aucune icône ne convient, en dessiner une dans le même style, ou retirer l'emoji quand le texte se suffit.
  - Les emojis de statut (présence, santé) deviennent des pastilles de couleur, comme déjà fait sur l'accueil.
  - Cas particulier : les drapeaux du sélecteur de langue. Proposer à Kevin les codes « FR / EN / PT » plutôt que les drapeaux, et attendre sa réponse.
  - Vérifier par comptage qu'il n'en reste aucun, pas à l'œil.
- Ce que je teste : je passe dans chaque rubrique du menu et je cherche un emoji.

### Bloc 2 : deux règles à faire respecter
- Statut : à faire
- Objectif : retirer la statistique Veo de la carte joueur, et empêcher un joueur de contacter un éducateur depuis Explorer.
- Résultat testable : la carte joueur n'affiche plus Veo ; depuis Explorer, aucun bouton ne permet d'écrire à un éducateur.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : le point Explorer touche à une règle d'accès, il faut vérifier le parcours réel et pas seulement masquer un bouton.
- Dépend de : bloc 0
- Étapes :
  - `src/components/CarteJoueur.jsx` : retirer la statistique Veo et refermer la mise en page proprement.
  - Onglet `clubs` (Explorer) : repérer tout chemin menant à un contact éducateur, le retirer. **Vérifier qu'aucune route ou fonction ne reste atteignable autrement**, et le dire dans le compte rendu.
  - Ne rien supprimer côté base ni côté droits : c'est un retrait d'interface.
- Ce que je teste : la carte joueur, puis Explorer, en cherchant à joindre un éducateur.

### Bloc 3 : page Compétition
- Statut : à faire
- Objectif : refaire la page Compétition sur le socle visuel.
- Résultat testable : la page a la même allure que l'accueil, classement et matchs lisibles sur téléphone.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : page dense, tableaux et classements, beaucoup de décisions de hiérarchie.
- Dépend de : blocs 0, 1
- Étapes :
  - Lire la fonction de rendu de la compétition, repérée au `grep`.
  - Reconstruire sur `Carte` et `TitreSection`, chiffres sur `TuileChiffre`.
  - Classement : colonnes figées ou défilement horizontal avec le repère de défilement déjà utilisé sur la semaine.
  - Zéro couleur en dur, vérifié par comptage.
- Ce que je teste : la page sur téléphone, dans les deux thèmes.

### Bloc 4 : Mon profil désencombré
- Statut : à faire
- Objectif : la page profil est surchargée. La réorganiser en sections claires sans rien retirer de fonctionnel.
- Résultat testable : je trouve une information précise en moins de cinq secondes.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : beaucoup de champs, risque réel de casser un formulaire qui marche.
- Dépend de : blocs 0, 1
- Étapes :
  - Inventorier tous les champs et actions de la page avant de toucher quoi que ce soit, et noter l'inventaire dans le compte rendu.
  - Regrouper en sections : identité, informations sportives, compte et abonnement, réglages.
  - Replier ce qui est rarement utilisé plutôt que de le supprimer.
  - **Aucun champ ne doit disparaître** : vérifier l'inventaire avant et après.
- Ce que je teste : je modifie une information et je l'enregistre, elle doit être conservée.

### Bloc 5 : Santé et Préparation tactique
- Statut : à faire
- Objectif : ces deux pages paraissent vides ou brouillonnes. Leur donner une structure et un état vide digne.
- Résultat testable : même sans données, les deux pages expliquent à quoi elles servent au lieu d'être blanches.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : blocs 0, 1
- Étapes :
  - Pour chaque page : une carte d'en-tête qui dit en une phrase à quoi elle sert.
  - Un véritable état vide, avec une icône, une phrase et une action possible, au lieu d'un écran blanc.
  - Appliquer le socle aux blocs existants.
- Ce que je teste : les deux pages avec mon compte, qui n'a probablement pas de données partout.

### Bloc 6 : Mon équipement
- Statut : à faire
- Objectif : expliquer à quoi sert l'outil et soigner la page.
- Résultat testable : en arrivant sur la page, je comprends tout de suite pourquoi donner mes tailles.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Dépend de : blocs 0, 1
- Étapes :
  - Ajouter en haut une phrase d'explication, dans l'esprit de ce que Kevin a dicté : informer son club de ses tailles pour recevoir au plus vite son pack de début de saison. À reformuler pour être direct et sans tiret long.
  - Refaire la saisie des tailles sur le socle, champs lisibles au pouce.
- Ce que je teste : je saisis une taille, je l'enregistre, je recharge, elle est là.

### Bloc 7 : Mes analyses et Coach analyseur
- Statut : à faire
- Objectif : des vignettes d'analyse plus belles, et une page Coach analyseur plus claire.
- Résultat testable : la liste des analyses donne envie d'ouvrir une vidéo.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : blocs 0, 1
- Étapes :
  - Vignettes : miniature, titre, date, statut en pastille de couleur, le tout sur `Carte`.
  - État vide soigné quand aucune analyse n'existe, avec un renvoi vers l'offre Pro via `ApercuPro`.
  - Coach analyseur : hiérarchiser l'écran, titre, explication, action principale.
- Ce que je teste : la liste des analyses et la page Coach analyseur.

### Bloc 8 : Saisir un match
- Statut : à faire
- Objectif : rendre la saisie d'un match agréable, sans émoticônes.
- Résultat testable : je saisis un match en entier sans hésiter sur un champ.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Dépend de : blocs 0, 1
- Étapes :
  - Refaire le formulaire sur le socle, champs groupés logiquement.
  - Retirer les émoticônes restantes de cet écran.
  - Vérifier que l'enregistrement fonctionne toujours, c'est un formulaire qui écrit en base.
- Ce que je teste : je saisis un match complet et je vérifie qu'il apparaît dans mes statistiques.

### Bloc 9 : Actualités du club habillées
- Statut : à faire
- Objectif : donner une vraie tête à la page Actualités, avec un visuel football par défaut.
- Résultat testable : la page a un en-tête visuel, et les annonces se lisent bien.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Dépend de : blocs 0, 1
- Étapes :
  - En-tête visuel : si Kevin fournit une photo, l'utiliser ; sinon dessiner un motif de terrain en SVG, léger et net dans les deux thèmes. **Aucune image externe, aucun changement de base.**
  - Les annonces sur `Carte`, avec date, auteur et pastille sur les non lues.
  - État vide soigné : le club de Kevin n'a aucune annonce, c'est donc l'écran qu'il verra en premier.
- Ce que je teste : la page Actualités, qui sera probablement vide chez moi.

### Bloc 10 : Nutrition, premier écran adapté au joueur
- Statut : à faire
- Objectif : un premier écran qui s'adapte au poste et aux objectifs du joueur, plus un tutoriel.
- Résultat testable : j'arrive sur la nutrition et je comprends quoi faire, sans formation.
- Modèle : sonnet · Effort : high · Coût estimé : élevé
- Pourquoi ce modèle : c'est le bloc le plus créatif et le plus long, avec du contenu à écrire.
- Dépend de : blocs 0, 1
- Prérequis : les conseils par poste, si Kevin en a ; sinon contenu générique assumé et signalé
- Étapes :
  - Premier écran : ce que la page apporte, l'état actuel du joueur, et une action claire.
  - Adapter les conseils au poste et aux objectifs **uniquement à partir de données déjà en base**. Ne rien inventer : si la donnée n'existe pas, le dire à Kevin plutôt que de simuler.
  - Tutoriel : quelques étapes expliquant la page, réutilisables via le composant d'aide existant si c'est possible.
- Ce que je teste : la page nutrition avec mon profil réel.

### Bloc 11 : vérification finale et mise en ligne
- Statut : à faire
- Objectif : prouver que tout tient, puis publier avec l'accord de Kevin.
- Résultat testable : un parcours complet de l'espace joueur sans défaut, puis la production.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Dépend de : tous les blocs
- Étapes :
  - Comptages : zéro couleur en dur et zéro emoji sur toutes les pages retouchées.
  - `npm run build` comparé au bloc 0 : aucune erreur ni avertissement nouveau.
  - Parcours complet de chaque rubrique, téléphone et ordinateur, thème clair et sombre.
  - **Ne pousser qu'avec l'accord explicite de Kevin** : un push déclenche un déploiement en production.
  - Vérifier au passage s'il reste des commits locaux non désirés avant de pousser, comme le correctif sponsors mis de côté le 2026-10-29 sur la branche `sponsors-en-attente`.
- Ce que je teste : le parcours complet, puis la production.
