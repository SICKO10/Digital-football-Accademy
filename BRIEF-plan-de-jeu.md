# BRIEF : Plan de jeu (fusion Principes de jeu + Zones de terrain)
Date : 2026-11-18 · Statut : prêt pour /plan

## Vision en 3 lignes
Aujourd'hui le club écrit ses principes dans un onglet et dessine ses zones dans un autre : deux moitiés d'une même idée.
On les réunit en un seul onglet « Plan de jeu » : pour chaque phase, le terrain et les principes côte à côte, reliés entre eux.
Le joueur retrouve ce même plan, lisible sur téléphone, et voit enfin les principes (aujourd'hui il ne voit que les zones).

## Existant (relevé dans le code)
- Club : `src/components/club/ProjetSportif.jsx`, onglets `principes` (SectionPrincipes) et `zones` (SectionZones).
  - Principes : table `principes_jeu` (club_id, pole_key, phase, principe, ordre), 8 phases + `coups_pied_arretes` ; photo par phase pour les 6 phases d'organisation (`principes_photos`).
  - Zones : tables `terrain_zones` (rectangles x, y, largeur, hauteur, label, description, couleur), `terrain_fonds` (image de fond par phase), `terrain_galerie`, `cpa_schemas` (CPA offensifs / défensifs séparés).
- Éducateur : `src/components/ProjetSportifEducateur.jsx` réutilise les mêmes sections (lecture seule sauf droit accordé par le club).
- Joueur : `src/components/PreparationTactiqueJoueur.jsx`, onglets Schémas partagés + 8 phases + CPA ; lit zones, fonds, galerie, CPA. **Ne lit pas `principes_jeu`** : les principes écrits par le club n'arrivent jamais au joueur.
- Autres lecteurs à garder en tête : `HistoriqueClub.jsx` (saisons), `TutorielsClub.jsx` (2 tutoriels séparés), FAQ et permissions dans `DashboardClub.jsx`.

## Pour qui, et ce qui change pour eux
- Club / directeur technique : une seule page par phase pour écrire « ce qu'on fait » et « où on le fait ». Moins d'allers-retours, un projet plus cohérent.
- Éducateur : voit le plan complet de son pôle d'un coup d'œil, peut s'en servir en causerie.
- Joueur : comprend son rôle par phase avec le terrain sous les yeux, au lieu de rectangles sans explication.

## Promesse et différenciation
« Le plan de jeu de ton club, phase par phase, sur un terrain. » Peu d'outils amateurs relient le texte des principes au dessin : c'est ce lien qui fait la valeur.

## Parcours et éléments à produire
1. Club et éducateur : onglet unique « Plan de jeu » à la place des deux. Sélecteur de phase (8 phases + CPA). Terrain à gauche (zones éditables comme aujourd'hui), liste des principes à droite. Sur téléphone : terrain en haut, principes dessous.
2. Lien principe ↔ zone : chaque principe peut être rattaché à une zone ; une pastille numérotée apparaît sur la zone ; toucher l'un met l'autre en évidence.
3. Joueur : dans Préparation tactique, chaque onglet phase affiche terrain + principes du club pour son pôle.
4. Mise à jour des tutoriels, de la FAQ, du libellé des permissions et de l'historique des saisons.
5. Aucune donnée supprimée : les tables restent, on ajoute seulement des colonnes (lien zone, poste, équipe).
6. Images : on garde les deux. Le fond (`terrain_fonds`) reste sous le terrain, la photo des principes (`principes_photos`) passe en illustration sous la liste.
7. « Mon poste dans ce plan » : chaque principe peut porter une ou plusieurs lignes (gardien, défense, milieu, attaque). Le joueur voit d'abord les principes de sa ligne, puis les autres. Sans ligne = pour tout le monde.
8. Fiche A4 imprimable par phase : terrain, zones numérotées, principes, logo et couleurs du club. Disponible pour le club, l'éducateur et le joueur.
9. Deux niveaux de plan :
   - Plan du club (écrit par le club) : visible par tous les joueurs du pôle.
   - Ajouts de l'éducateur (s'il a le droit d'éditer) : rattachés à son équipe, visibles seulement par les joueurs de cette équipe, affichés en plus du plan du club et signalés « Consigne de ton coach ».

## Idées signature [IDÉE]
- [IDÉE] Lien principe ↔ zone avec pastilles numérotées : c'est la fusion elle-même, le joueur voit où s'applique chaque consigne.
- [IDÉE] « Mon poste dans ce plan » : le club marque les principes par ligne (gardien, défense, milieu, attaque) ; le joueur voit d'abord les siens. Parle directement au joueur, pas au staff.
- [IDÉE] Fiche « Plan de jeu » imprimable par phase (A4, logo et couleurs du club) pour la causerie ou le vestiaire, dans l'esprit de la Fiche séance qui suit déjà les 8 phases.

## Contraintes (plateforme, existant, budget, délai)
- Production : toute migration SQL précédée de la sauvegarde manuelle (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`), SQL exécuté par Kevin, pas de rollback prêt à lancer.
- RLS : la lecture de `principes_jeu` par le joueur doit être vérifiée (affiliation au club) avant d'afficher quoi que ce soit.
- Outil accessible aux clubs et éducateurs affiliés comme non affiliés : ne pas ajouter de verrou.
- Pas d'emojis dans la nouvelle interface ; identité visuelle et thème couleurs club existants à respecter.

## Décisions prises
- Nom de l'onglet : « Plan de jeu ».
- Brief séparé : `BRIEF-plan-de-jeu.md` (le `BRIEF.md` racine concerne un autre chantier).
- Lien principe ↔ zone : oui (colonne ajoutée sur `principes_jeu`, SQL par Kevin après sauvegarde).
- Images : les deux gardées.
- Idées retenues : « Mon poste dans ce plan » et fiche A4 imprimable.
- Visibilité joueur : plan club = tout le pôle ; ajouts éducateur = seulement son équipe.
- [DÉCISION CLAUDE] L'éducateur autorisé ajoute et modifie ses propres principes et zones (niveau équipe) mais ne modifie plus ceux du club : la ligne commune du club reste protégée. Changement de comportement à signaler dans le tutoriel et le libellé de permission. Si un éducateur a déjà modifié le plan du club, ces lignes restent au niveau club (pas de reprise de l'historique).
- [DÉCISION CLAUDE] Une équipe = un éducateur + une catégorie (modèle `equipe_joueurs`). Un éducateur avec deux équipes choisit l'équipe concernée au moment de l'ajout. Le plan précis de la colonne équipe est laissé à /plan après lecture du schéma.
- [DÉCISION CLAUDE] La ligne du joueur (gardien, défense, milieu, attaque) vient de son poste déjà enregistré sur son profil ; sans poste, il voit tout dans l'ordre normal.
- [DÉCISION CLAUDE] CPA : les deux rubriques actuelles restent (texte « coups de pied arrêtés » côté principes, schémas CPA offensifs / défensifs côté zones), réunies sur la même page CPA.

## Questions ouvertes
Aucune bloquante. À vérifier pendant /plan en lisant le code : où est stocké le poste du joueur, et les règles RLS actuelles des 6 tables concernées.

## Hors périmètre
- Planification annuelle, Règles du jeu, Catégories & Stats : inchangés.
- Tactipad et Schémas partagés : inchangés.
- Accusé de lecture par le joueur, quiz, plan spécifique à un match : idées pour plus tard.

## Ce que je dois fournir
- Un compte club de test avec un pôle rempli (club test existant) et un joueur rattaché pour vérifier la vue joueur.
