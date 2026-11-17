# BRIEF : nouvelle fiche séance (modèle « AS Cannes »)

Statut : questions tranchées le 17/11 (réponses dans `PLAN-fiche-seance.md`, section « Décisions de Kevin »). Plan écrit : 12 blocs (0 à 11) + 1 optionnel.
Date : 17 novembre 2026.

## Objectif

Remplacer la fiche séance actuelle de l'éducateur par une fiche qui reproduit
exactement le modèle papier fourni par Kevin (`CANNES.pdf`, 2 pages), adaptée
à chaque club :

- le **logo** est celui du club de l'éducateur (modifiable selon le club) ;
- toutes les parties **rouges** du modèle prennent la **couleur principale du club** ;
- tout le reste reste identique au modèle (disposition, libellés, grilles).

PDF de référence rangé dans le projet : `docs/modeles/fiche-seance-cannes.pdf`
(copie de `~/Downloads/CANNES.pdf`, non commité, 9,5 Mo).

Document utile pour les définitions des phases de jeu, repéré sur l'iCloud de
Kevin (non copié, à lire seulement si besoin) : « Modèle de jeu et
méthodologie AS Cannes.pdf ».

## Description du modèle (lu sur CANNES.pdf)

Format : feuille A4, imprimée en paysage, **recto verso**. Chaque face contient
**3 procédés** (exercices), soit **6 procédés** par fiche. Les deux faces ont la
même mise en page.

Chaque face contient :

1. **En-tête** : logo du club, « Date : ../../.... », « Effectif : .... + .... GB ».
2. **Tableau d'effectif** : bandeau de couleur avec 4 colonnes **GB / DEF / MIL / ATT**,
   environ 5 lignes par colonne. Sur l'exemple, les prénoms des joueurs sont
   écrits à la main dans leur colonne de poste.
3. **Thème :** une ligne libre.
4. **Phase de jeu** : une rangée de cases à cocher, 8 phases :
   - Constr. basse (construction basse)
   - Constr. méd. (construction médiane)
   - Constr. haute (construction haute)
   - Trans. OFF-DEF (transition offensive vers défensive)
   - Déf. bloc haut
   - Déf. bloc médian
   - Déf. bloc bas
   - Trans. DEF-OFF (transition défensive vers offensive)
5. **Colonne de gauche** :
   - rangée **JOUR** avec les cases J+1, J+2, J+3, J-3, J-2, J-1 (jour de la
     semaine par rapport au match) ;
   - étiquette de couleur **Dominante athlétique** avec sa case ;
   - **3 grands carrés gris**, un par procédé, séparés par une bande
     **Récupération** avec de petites cases ;
   - en bas : **Tps effectif** et **Tps total**, chacun avec sa case.
6. **3 terrains** entiers quadrillés, un par procédé, chacun accompagné d'un
   **carré blanc**.

## Règles de remplissage voulues par Kevin

- **Carrés gris à gauche** : critères de réalisation et organisation du procédé.
- **Carrés blancs sous le terrain** : consignes et variantes.
- La fiche contient **automatiquement tout l'effectif de l'équipe** choisie,
  rangé dans les colonnes GB / DEF / MIL / ATT.
- **Phases de jeu** : adapter la plateforme aux 8 phases de la fiche.

## Ce qui existe aujourd'hui (repérage rapide, à approfondir pendant /plan)

- Phases actuelles de la plateforme, différentes de la fiche :
  - `src/components/club/ProjetSportif.jsx` : Organisation offensive,
    Organisation défensive, Transition offensive, Transition défensive, Coups de
    pied arrêtés (plus Pressing et CPA offensifs/défensifs pour les zones) ;
  - `src/constants/methodologie.js` : référentiel phases > thèmes > principes >
    sous-principes ;
  - `src/lib/themesSeance.js` : thèmes officiels FFF groupés par phase ;
  - phases utilisées aussi dans `PlanificationAnnuelle.jsx`, `FicheBMFContenu.jsx`,
    `TutorielsClub.jsx` et `DashboardEducateur.jsx`.
- Fiche séance actuelle : à localiser précisément (création d'entraînement dans
  `DashboardEducateur.jsx`, `GrilleSeance.jsx`, `src/components/fiches/`).
- Couleur et logo du club : le thème club existe déjà (`src/lib/clubTheme`,
  `colorsAvecClub`), à réutiliser.
- Attention : un chantier « design identité » (`PLAN-design-identite.md`)
  modifie en ce moment près de 200 fichiers, dont DashboardEducateur.jsx. Ne
  rien démarrer sur ces fichiers avant qu'il soit commité.

## Contraintes

- Plateforme en production : aucune donnée existante perdue. Les séances déjà
  créées avec les anciennes phases doivent rester lisibles (correspondance
  ancienne phase vers nouvelle, ou conservation de l'ancienne valeur).
- Toute modification de la base passe par un script SQL présenté à Kevin et
  lancé par lui, après sauvegarde (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`).
- Impression : rendu fidèle sur A4 paysage recto verso depuis le navigateur.
- Pas d'emoji dans l'interface.

## Questions ouvertes (à trancher avant /plan)

1. **Pour qui ?** Cette fiche remplace-t-elle la fiche séance de **tous** les
   éducateurs de la plateforme, ou devient-elle un modèle au choix (par club ou
   par éducateur), l'ancienne restant disponible ?
2. **Phases de jeu : jusqu'où ?** Les 8 phases de la fiche remplacent-elles les
   phases **partout** (projet sportif, planification annuelle, thèmes FFF,
   référentiel méthodologie), ou seulement dans la fiche séance ? Les coups de
   pied arrêtés n'existent pas dans la fiche : on les garde ailleurs ?
3. **Écran ou papier ?** L'éducateur remplit-il la fiche à l'écran puis
   l'imprime, ou imprime-t-il une fiche vierge (avec l'effectif) pour la remplir
   à la main ? Ou les deux ?
4. **Terrains** : à l'écran, on dessine dans chaque terrain avec le Tactipad,
   ou on laisse le terrain quadrillé vide pour dessiner à la main après impression ?
5. **Effectif** : tous les joueurs de l'équipe, ou seulement les présents de la
   séance (blessés et absents exclus) ? Un joueur sans poste renseigné va dans
   quelle colonne ? Plus de 5 joueurs dans une colonne : on agrandit le tableau ?
   « Effectif : .. + .. GB » se remplit tout seul ?
6. **Verso** : l'effectif est-il répété au verso, ou seulement au recto ? (sur
   l'exemple scanné, le verso est vide)
7. **J+1 à J-1** : coché automatiquement selon la date du prochain match, ou à
   la main ?
8. **Dominante athlétique, Récupération, Tps effectif / total** : texte libre,
   ou listes et durées calculées (somme des durées des procédés) ?
9. **Éducateur sans club** : quel logo et quelle couleur (Digital Football et
   le rouge du modèle) ?

## Étapes suivantes

1. Session neuve en Opus : `/plan BRIEF-fiche-seance.md` en répondant d'abord
   aux 9 questions ci-dessus.
