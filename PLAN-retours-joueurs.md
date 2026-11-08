# PLAN : Deux retours de joueurs (2026-11-09)
Deux problèmes indépendants, un bloc chacun, une session neuve par bloc. Commande : `/bloc N PLAN-retours-joueurs.md`.

## Bloc 1 : Le thème sombre est retenu à la prochaine connexion
- Statut : piste A validée et commitée (2026-11-09) ; piste B (mémoire entre appareils) reportée à plus tard, à reprendre sur demande
- Constat : la mémoire existe déjà (`df_dashboard_theme` dans `src/lib/ThemeProvider.jsx`), mais seulement dans le navigateur de l'appareil, et seulement si le joueur a cliqué sur le bouton soleil/lune. Depuis le clair par défaut (chantier thème club), un joueur qui était en sombre sans jamais cliquer arrive en clair. Aucune mémoire d'un appareil à l'autre.
- Objectif : un joueur qui choisit le sombre le retrouve à chaque connexion, sur tous ses appareils.
- Pistes : (A) vérifier et durcir la mémoire locale (cas navigation privée, stockage vidé, changement de compte sur le même appareil) ; (B) enregistrer le choix sur le profil (colonne en base) pour suivre la personne partout, avec repli sur la mémoire locale.
- Recommandation : A d'abord (aucune modification de la base), B seulement si tu veux la mémoire entre téléphone et ordinateur. B touche la base : sauvegarde `~/Sauvegardes-DigitalFootball/sauvegarder.sh` avant, SQL à te donner à exécuter.
- Modèle : sonnet · Effort : medium · Coût : faible (A) à moyen (B)
- Test : choisir sombre, se déconnecter, se reconnecter (puis un autre appareil pour B) : le sombre est conservé.

## Bloc 2 : Schéma tactique en lecture, plein écran et proportions sur mobile
- Statut : validé (2026-11-09), commit 3b76ea3
- Constat : côté joueur, `src/components/TactipadViewer.jsx` affiche le schéma à largeur fixe (écran moins 64 px dans `PreparationTactiqueJoueur.jsx` ~254) sans mode plein écran ni adaptation à l'orientation. Le ratio est imposé à 16:10 alors que l'éditeur mobile utilise un ratio 0.56 : les éléments sont remis à l'échelle de façon non uniforme, d'où des proportions différentes de l'ordinateur.
- Objectif : au clic sur Lire, le schéma s'affiche comme une vidéo plein écran (portrait et paysage), avec les mêmes proportions que sur ordinateur.
- Étapes : (1) reproduire avec un schéma réel sur téléphone et noter l'écart ; (2) respecter le ratio d'origine du schéma (`terrain.w/h`) ; (3) bouton plein écran (API plein écran, repli en superposition fixe si le navigateur du téléphone la refuse, notamment iPhone) ; (4) ajustement à la rotation ; (5) test portrait et paysage.
- Prérequis : un schéma partagé avec animation, et un téléphone ou l'émulation mobile.
- Modèle : sonnet · Effort : high · Coût : moyen à élevé
- Test : sur téléphone, ouvrir la préparation tactique, lancer Lire : plein écran, schéma entier visible, mêmes proportions qu'à l'ordinateur, en portrait et en paysage.

- Reste à finir : test sur un vrai téléphone (iPhone surtout : le plein écran du navigateur n'y existe pas, le calque fixe prend le relais). Non modifié : la page de partage public (`TactipadPublic.jsx`, ratio 16:10 fixe, sans animation) et la Causerie (`CauserieAvantMatch.jsx`) ; elles bénéficient quand même du ratio réel via `TactipadViewer`.
- Journal (2026-11-09, Sonnet 5.5) : `TactipadViewer` prend la hauteur du ratio réel enregistré (`terrain.h/terrain.w`, repli 0,625) donc mise à l'échelle uniforme ; `SchemaPleinEcran` s'adapte au portrait et au paysage (plus de blocage « tourne ton téléphone », plus de verrouillage en paysage), terrain entier visible ; sur téléphone, toucher Lire/le terrain ouvre le plein écran et lance l'animation (`onLire`, `lectureAuto`) dans `PreparationTactiqueJoueur` et `SeanceDuJourJoueur`. Testé en émulation Chromium (390x844 et 844x390) : ratio 0,56 respecté, schéma entier dans l'écran, animation lancée à l'ouverture, aucune erreur. Commit 3b76ea3.

- Journal bloc 1 (2026-11-09, Sonnet 5.5) : piste A. `ThemeProvider.jsx` : lecture/écriture du thème protégées (plus de plantage si le stockage est bloqué, valeur invalide ignorée), et un changement de thème dans un autre onglet est suivi. Lint et build OK. Non testé à la main dans le navigateur. Pas de commit. Limite : un joueur qui était en sombre sans jamais cliquer arrive en clair (ancien défaut impossible à retrouver), et rien ne suit d'un appareil à l'autre sans la piste B.
