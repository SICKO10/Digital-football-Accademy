# BRIEF : « Séance du jour » visible par les joueurs
Date : 2026-11-02 · Statut : prêt pour /plan

## Vision
L'éducateur choisit, parmi les procédés de sa séance, ceux qu'il veut montrer aux joueurs. Le joueur les retrouve le jour J dans Préparation > Entraînement, sous le titre « Séance du jour », avec la consigne, les critères de réalisation et le schéma animé. Le soir, la séance disparaît du compte joueur.

## Décisions de Kevin (2026-11-02)
1. **Choix par procédé** : l'éducateur coche les procédés à rendre visibles. Rien n'est envoyé sans case cochée.
2. **Visible dès la publication, disparition à 22h le jour de la séance** (heure de Paris). L'éducateur peut publier la veille ou plus tôt, le joueur la voit tout de suite. Après 22h le jour J le joueur ne voit plus rien. La séance reste archivée chez l'éducateur. (Précisé le 2026-11-02 : avant, visible seulement le jour J.)
3. **Destinataires** : toute l'équipe, ou les défenseurs, ou les milieux, ou les attaquants (gardiens aussi), ou des joueurs choisis un par un. Plusieurs groupes cumulables.
4. **Équipe automatique** : l'équipe active du dashboard éducateur (U18, etc.) est la destinataire. Pas de choix d'équipe dans la fenêtre de publication.
5. **Notification au joueur** : oui, dans ce premier lot (clochette dans l'appli, email selon ses préférences déjà gérées par la plateforme).

## Ce que voit le joueur
Rubrique « Entraînement » dans la section Préparation. En haut « Séance du jour » : date, heure et lieu de l'entraînement, puis une carte par procédé coché (nom, durée, consigne, critères de réalisation, schéma animé). Si rien n'est publié : message calme « Pas de séance publiée pour aujourd'hui ».

## Ce que voit l'éducateur
Dans sa séance : case « Visible par les joueurs » sur chaque procédé, bouton « Publier aux joueurs » qui ouvre le choix des destinataires (équipe entière, postes, joueurs). Il voit ce qui est publié, peut modifier ou retirer avant 22h.

## [IDÉE] hors premier lot
Bouton « Vu » côté joueur et liste des joueurs qui ont consulté, pour l'éducateur.

## Contraintes
- Base : nouvelles tables et règles de sécurité. Le SQL est donné à Kevin pour exécution, sauvegarde avant (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`), jamais de retour arrière prêt à lancer.
- Sécurité : un joueur ne lit que ce qui est publié pour lui, aujourd'hui, avant 22h. Règle posée en base, pas seulement à l'écran.
- Postes : on utilise `getPosteFamille` (Gardien, Défenseur, Milieu, Attaquant).
- Aucun email réel pendant les tests sans « ok » de Kevin.
- Les deux variantes du dashboard joueur (voir mémoire « Dashboard joueur scope ») : à vérifier au bloc de l'inventaire.
