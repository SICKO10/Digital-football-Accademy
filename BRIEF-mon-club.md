# BRIEF : « Mon club », un seul endroit pour personnaliser et composer les dashboards
Date : 2026-11-11 · Statut : prêt pour /plan

## Vision en 3 lignes
Le président règle tout son club depuis une seule page « Mon club » : identité, outils du club, dashboard de ses éducateurs.
Chaque réglage agit tout de suite, s'annule en un clic et ne supprime jamais de données.
Les clubs de l'ancien modèle y ont accès sans que rien ne change pour eux tant qu'ils ne touchent à rien.

## Pour qui, et ce qui change pour eux
- **Président (ou responsable du club)** : aujourd'hui trois écrans séparés (« Personnaliser » dans l'accueil, « Mes outils », « Droits des éducateurs »), trois logiques. Demain : une page, trois étapes, un aperçu de ce que voient les autres.
- **Éducateurs du club** : un menu qui ne montre que ce que le club utilise vraiment, prévenus de chaque changement avec sa date d'effet.
- **Kevin** : moins de questions « où je règle ça ? », un argument de vente (« votre plateforme à vos couleurs, avec vos outils »).

## Promesse et différenciation
« Votre club, réglé en 5 minutes, et modifiable à tout moment sans rien perdre. »
Différence : l'aperçu en direct (on voit exactement le dashboard d'un éducateur avant de valider) et l'absence de risque (rien n'est supprimé, tout s'annule).

## Parcours et éléments à produire
Une page « Mon club » (entrée du menu club), quatre onglets ou étapes :
1. **Identité** : couleurs principale et secondaire, logo, photo, slogan, aperçu en direct (reprend le panneau Personnaliser de `DashboardClub.jsx` et `ApercuCouleurClub.jsx`). L'ancien panneau de l'accueil est remplacé par un lien vers cette étape.
2. **Outils du club** : cartes rangées par thème (Entraînement, Match, Effectif, Communication, Gestion), un interrupteur et une ligne d'explication par outil. Nouveau modèle : reprend `MesOutils.jsx` (actif, essai, payant). Ancien modèle : tout est allumé par défaut, l'interrupteur ne règle que l'affichage du menu.
3. **Dashboard de mes éducateurs** : choix du mode en haut (« Le même pour tous » par défaut, ou « Individualisé »), même grille de cartes, bouton « Voir comme un éducateur ».
   - Individualisé : chaque éducateur part du réglage commun ; le club ajuste ; l'éducateur ajusté porte une pastille dans la liste. Le réglage individuel passe avant le commun. Repasser en « même pour tous » met les réglages individuels de côté sans les effacer. Un nouvel éducateur reçoit le réglage commun.
4. **Accès du bureau** : la matrice actuelle « Droits des éducateurs » (droits par rôle : directeur sportif, trésorier, secrétaire…) déplacée ici, logique inchangée, renommée « Accès du bureau » pour lever la confusion avec l'étape 3. Une nouvelle ligne « Mon club » y apparaît (voir Décisions). L'ancien écran redirige vers cette étape.

Règles communes :
- Un interrupteur agit tout de suite, bandeau « Annuler » pendant quelques secondes.
- Désactiver ne supprime jamais de données ; réactiver retrouve tout.
- Chaque changement côté éducateurs les prévient avec la date d'effet (notifications du bloc 10, déjà en place pour les retraits).
- [HYPOTHÈSE] Le club ne peut masquer que les outils qu'il fournit ; un outil qu'un éducateur paie lui-même reste toujours dans son menu.

Éléments techniques probables : stockage du mode et des réglages individuels (nouvelle colonne ou table côté Supabase, à préparer avec sauvegarde), adaptation de `menuVisible` dans `outilsAcces.js`, page `MonClub.jsx`, textes d'explication par outil dans le catalogue.

## Idées signature [IDÉE]
1. **[IDÉE] Modèles de départ** : « Club compétition », « École de foot / formation », « Minimal ». Un clic pré-règle les étapes 2 et 3, puis on ajuste. Pourquoi : un président bénévole ne veut pas lire 20 cartes le premier soir.
2. **[IDÉE] « Voir comme… »** : choisir un éducateur (ou « un éducateur type ») et voir son menu réel, aux couleurs du club, avant et après le changement. Pourquoi : supprime la peur de « casser » le dashboard des coachs.
3. **[IDÉE] Journal des changements** : liste courte « 12/11, outil Vidéo retiré pour U15, par Président » avec un bouton « Rétablir ». Pourquoi : dans un club à plusieurs dirigeants, on sait qui a fait quoi et on revient en arrière sans appeler Kevin.

## Contraintes (plateforme, existant, budget, délai)
- React + Vite, Supabase, Stripe en production. Toute migration : sauvegarde manuelle avant (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`).
- Ancien modèle (6 clubs, 17 éducateurs) : aucun changement par défaut, aucun verrou, aucune facturation. Le verrou du bloc 15 ne concerne que le nouveau modèle.
- Aucun changement de prix ni de lien Stripe dans ce chantier.
- Pas d'emoji dans la nouvelle interface.
- `DashboardClub.jsx` fait 7 600 lignes : sortir la page dans son propre fichier.

## Décisions prises
- Tous les clubs ont accès à « Mon club », y compris l'ancien modèle.
- Ancien modèle : tout reste affiché par défaut ; le club retire ou ajoute seulement s'il le veut ; l'interrupteur ne règle que l'affichage.
- Deux modes éducateurs (même pour tous / individualisé), réversible à tout moment, sans perte de réglage.
- Aucune donnée supprimée par un interrupteur.
- Pas de réglage par équipe : les deux modes suffisent (2026-11-11).
- Qui modifie : le président, plus les rôles du bureau à qui il donne le droit « Mon club » dans la matrice (nouvelle section, par défaut président seul). Décision de Claude : l'étape 4 « Accès du bureau » reste réservée au président, pour qu'un rôle délégué ne puisse pas s'attribuer d'autres droits.
- « Droits des éducateurs » est déplacé dans Mon club (étape 4), renommé « Accès du bureau », logique inchangée.
- Ancien modèle : l'éducateur suit les choix du club (masquage d'affichage seulement). Comme tout est affiché par défaut, rien ne change tant que le club ne touche à rien.
- Les 3 idées signature sont dans le périmètre ; le journal des changements vient en dernier bloc et peut être reporté sans bloquer le reste.

## Questions ouvertes
Aucune bloquante. Reste [HYPOTHÈSE] : le club ne peut masquer que les outils qu'il fournit ; un outil payé par l'éducateur lui-même reste dans son menu. À confirmer au /plan si le code montre un autre cas.

## Hors périmètre
- Changement de prix, de lien Stripe ou bascule des anciens comptes vers le nouveau modèle.
- Personnalisation du dashboard joueur (chantier séparé).
- Réglages par l'éducateur lui-même de son propre menu.
- Réglage par équipe.

## Ce que je dois fournir (accès, textes, photos, logos, comptes)
- Un compte club de test avec au moins deux éducateurs test pour vérifier les deux modes (aujourd'hui supprimés, voir mémoire « comptes de test »).
- Validation des noms des modèles de départ et de leur contenu.
