# BRIEF : Refonte des fiches d'évaluation + mise à jour RGPD

Statut : brouillon du 2026-11-19, questions ouvertes en fin de document. Ne remplace pas BRIEF.md.

## Contexte
La fiche actuelle (« Rapports & Évaluations ») repose surtout sur du texte libre : points forts et points à améliorer par pilier (Tactique, Technique, Physique, Mental), objectif personnel et collectif, satisfaction en étoiles. Options existantes : « Visible par le joueur », « Pré-remplissage autorisé », « Déverrouiller ».
But : fiche plus belle, plus rapide à remplir, mesurable dans le temps, transmissible d'une saison à l'autre.

## Règles impératives
1. Ordre des chantiers : ne pas démarrer avant la fin vérifiée de la sécurité sponsors (phases 2 à 4b) et des failles de novembre, sauf accord explicite de Kevin.
2. Explorer d'abord le code et la base (évaluations, projet sportif, catégories, joueurs, rôles et droits, RLS, pages de confidentialité) et présenter un plan avant toute modification. Attendre l'accord.
3. Aucun commit, push ni déploiement sans accord explicite.
4. Toute migration Supabase (tables, colonnes, RLS, reprise de données) : script SQL présenté avec plan de secours, appliqué seulement après accord. Nouvelles tables avec RLS, aucun accès anon, droits par club et par rôle.
5. Aucune évaluation existante perdue. Anciennes fiches consultables en lecture dans l'historique du joueur, avec leur texte libre.
6. Ne rien casser : visibilité par le joueur, pré-remplissage par le joueur, verrouillage et déverrouillage, affichage dans le dashboard joueur.
7. Respecter le design actuel (thème, couleurs du club si le thème club est en place).
8. Petites étapes, avec à chaque étape ce que Kevin doit tester sur localhost.

## 1. Échelle de notation
- Échelle unique 1 à 3 : 1 = Non acquis, 2 = En cours, 3 = Acquis.
- Trois segments ou pastilles, libellé visible (pas seulement le chiffre).
- Chaque critère peut avoir une courte description de ce que signifie « Acquis ».
- Moyenne par pilier sur 3 (ex. « 2,4 / 3 ») et proportion d'acquis (ex. « 5 critères acquis sur 8 »).

## 2. Types de critères
- Critère noté (1 à 3).
- Test chiffré avec unité : jonglage (nombre), vitesse 30 m (s), VMA (km/h), détente (cm), tests libres du club. Par test : sens de progression (plus haut ou plus bas = mieux), objectif du club (optionnel, par catégorie), dernière mesure, évolution.
- Oui / non.
- Commentaire libre.
- Piliers par défaut : Tactique, Technique, Physique, Mental. Le club peut en ajouter (ex. « Gardien »).

## 3. Modèles de fiche à trois niveaux
1. Bibliothèque Digital Football (commune, lecture pour tous) : critères et tests par catégorie (U7 à seniors), par niveau (district, régional, national), par poste (gardien, défenseur, milieu, attaquant). Aucune norme chiffrée inventée : objectifs vides par défaut (« à définir par le club »). Libellés de critères : liste proposée à Kevin, validée avant enregistrement.
2. Modèle du club (Projet sportif) : le club compose ses fiches par catégorie depuis la bibliothèque, ajoute critères et tests, fixe ses objectifs, peut rendre des critères obligatoires.
3. Modèle de l'éducateur : affilié = peut créer ou compléter seulement si le club l'autorise (réglage Projet sportif), sans retirer les critères obligatoires ; indépendant = crée librement ses modèles depuis la bibliothèque.
- Modèles versionnés : modifier un modèle ne change pas les évaluations déjà faites.

## 4. Nombre d'évaluations
- Par saison, réglable par le club (ou l'éducateur indépendant) : 2, 3, 4 ou à la demande.
- Chaque évaluation a un numéro et une période (ex. « Évaluation 2 sur 3 · mi-saison »).
- Évolution par rapport à la précédente pour chaque critère et test (flèche ou +/-).

## 5. Saisie rapide
- « Reprendre la dernière évaluation » : pré-remplit, l'éducateur ne change que ce qui a bougé.
- Mode « séance de tests » : grille joueurs x tests, pensée téléphone en bord de terrain (grandes zones tactiles, saisie numérique, joueur suivant rapide), enregistrement automatique dans la fiche de chaque joueur.
- Critères pré-sélectionnés selon le poste.
- Enregistrement automatique en brouillon.

## 6. Fiche joueur en onglets
- En-tête : photo ou initiales, nom, équipe ou catégorie, poste, numéro d'évaluation, modèle utilisé, pastille « Visible par le joueur ».
- Onglet Évaluation : cartes par pilier, notes 1 à 3 avec évolution, moyenne par pilier, objectif personnel, objectif collectif, auto-évaluation du joueur à côté de la note de l'éducateur avec les plus gros écarts signalés (le pré-remplissage actuel alimente cette partie).
- Onglet Tests : résultat, mesure précédente, objectif du club, évolution, courbe par test.
- Onglet Notes : observations datées, comptes rendus d'entretien, comportement. Visibilité par note : privée (auteur), staff du club, ou visible par le joueur (et ses parents si mineur). Option « transmissible » ou non.
- Onglet Historique : toutes les évaluations, tests et notes transmissibles, saison par saison, y compris les anciennes fiches en texte libre.

## 7. Passation d'une saison à l'autre
- Changement de catégorie ou d'éducateur dans le club : le nouvel éducateur voit évaluations, tests et notes « transmissibles ».
- Les notes privées ne sont jamais transmises.
- Le club règle ce qui est transmis (défaut : évaluations et tests oui, notes seulement si transmissibles).
- Si le joueur quitte le club : données conservées par le club d'origine, non transmises au nouveau club (export à l'initiative du joueur ou des parents : à proposer plus tard).

## 8. Droits d'accès (à valider par Kevin)
- Éducateur : ses joueurs actuels + historique transmissible de ses joueurs.
- Staff et direction : toutes les évaluations du club selon la matrice de droits existante.
- Joueur : uniquement évaluations et notes marquées visibles, et son auto-évaluation.
- Parents d'un mineur : mêmes accès que le joueur.
- Jamais de données d'un autre club. Un indépendant ne voit que ses joueurs.

## 9. RGPD (textes préparés, rien publié)
1. Politique de confidentialité : section données d'évaluation (finalité, catégories, destinataires, durées, droits, contact).
2. Registre des traitements : `docs/rgpd/registre-evaluations.md` (responsable = généralement le club, Digital Football sous-traitant, à confirmer).
3. Durées de conservation proposées et paramétrables (ex. présence au club + X saisons), suppression ou anonymisation automatique au-delà. Valeurs à valider par Kevin.
4. Information des personnes : court texte pour le joueur (et parents si mineur) : ce qui est évalué, qui le voit, comment demander une rectification.
5. Minimisation : aucune donnée de santé dans les fiches, avertissement dans l'onglet Notes. Tests physiques = performances sportives.
6. Droits dans l'interface : consultation, demande de rectification, export, procédure de suppression côté club.
7. Journal des accès aux historiques transmis (qui, quoi, quand), consultable par le club.
8. Signaler tout point à faire relire par un juriste ou un DPO.

## 10. Vérifications
- Un modèle à chacun des trois niveaux, critères obligatoires du club, ajout par éducateur autorisé, refus pour non autorisé.
- Évaluation complète puis seconde avec « reprendre la dernière » : évolutions justes.
- Séance de tests sur téléphone avec au moins 10 joueurs.
- Visibilité des notes avec comptes : éducateur, autre éducateur, directeur, joueur majeur, joueur mineur, parent.
- Changement de catégorie : nouvel éducateur voit l'historique transmissible, pas les notes privées.
- Anciennes fiches lisibles dans l'historique.
- Deux clubs étanches ; indépendant limité à ses joueurs.
- Rendu ordinateur, tablette, téléphone ; console sans erreur ; build Vite sans erreur.
- Fin de chaque étape : fichiers modifiés, SQL préparés (non appliqués), textes RGPD préparés (non publiés), points à regarder sur localhost, sans commit.

## Questions ouvertes
Voir la conversation du 2026-11-19 (réponses à reporter ici).
