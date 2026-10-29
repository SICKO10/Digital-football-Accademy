# BRIEF : refonte esthétique du dashboard joueur
Date : 2026-10-29 · Statut : prêt pour /plan

## Vision en 3 lignes
Un espace joueur qui ressemble à l'app d'un club professionnel, pas à un outil de gestion.
Un seul langage visuel pour les deux variantes : joueur affilié à un club (plan `fan` + affiliation acceptée) et joueur indépendant avec l'offre Pro (`joueur_pro` + abonnement actif).
Ce qui change entre les deux, c'est le contenu affiché, jamais le style.

## Pour qui, et ce qui change pour eux
- Joueur affilié (souvent 13-18 ans, sur téléphone) : aujourd'hui une colonne étroite de 640 px, un titre « Bonjour X 👋 » et une pile de cartes grises à lire. Demain : il sait en 2 secondes quand est son prochain rendez-vous, s'il est convoqué, ce que le coach a dit.
- Joueur indépendant Pro (adulte, en recherche de club) : aujourd'hui un dashboard plus riche mais encombré (héros + alertes + 4 tuiles + 3 cartes d'action + colonne droite de 340 px). Demain : identité et progression en haut, actions ensuite, abonnement rangé.
- Kevin : un seul jeu de composants visuels au lieu de deux esthétiques recopiées à la main dans un fichier de 5 785 lignes. Chaque ajout futur coûte moins cher.

## Promesse et différenciation
Promesse : « ton espace de joueur, lisible en 2 secondes, beau comme une app de club pro ».
Différenciation : la continuité entre les deux variantes. Le joueur affilié qui passe Pro ne change pas de monde, il voit son espace s'ouvrir.

## Parcours et éléments à produire
1. **Socle visuel partagé** — nouveau dossier `src/components/joueur/` : `Carte`, `TitreSection` (eyebrow), `TuileChiffre`, `ListeAlertes` (le panneau aujourd'hui dupliqué dans les deux branches), `BandeSemaine`, `JaugeSaison`, `ApercuPro`, `BarreOnglets` (navigation mobile). Chaque composant reçoit les couleurs du thème via `useColors()`, jamais l'import statique de `colors`.
2. **Accueil du joueur affilié** (`onglet === 'accueil'`, autour de la ligne 2319) refait avec ce socle.
3. **Accueil du joueur Pro / indépendant** (`onglet === 'dashboard'`, autour de la ligne 3597) refait avec ce socle.
4. **Navigation** : barre latérale harmonisée entre les deux variantes + barre d'onglets en bas sur mobile.
5. **Upsell Pro** : remplacer les pages entières `UpgradeCard` par un aperçu désirable (`ApercuPro`) au lieu d'un mur.

### Système visuel retenu (valeurs à appliquer)
- Espacements : 4 / 8 / 12 / 16 / 20 / 24 / 32 px uniquement.
- Rayons : 12 px (ligne, petite tuile), 16 px (carte), 999 px (badge, pastille).
- Typographie Inter, déjà chargée : titre de page 20 px / 800 / -0,4 px ; sur-titre de section 11 px / 700 / majuscules / interlettrage 1 px / `text.faint` ; titre de carte 15 px / 700 ; corps 13 px ; chiffre 28 px / 800 ; légende 11 px.
- Carte standard : fond `background.surface`, bordure 1 px `border.subtle`, rayon 16, padding 16 px sur mobile et 20 px sur desktop. **Une seule** variante accentuée (bordure teintée + lueur douce), réservée à l'élément « à la une ».
- Couleurs de statut fixes, jamais décoratives : vert `accent.green` = fait, présent, victoire ; bleu `accent.blue` = information, convoqué ; orange `accent.orange` = santé, urgence ; rouge `accent.red` = annulé, absent, défaite ; ambre `accent.amber` = changement d'horaire.
- Largeur de contenu : 980 px maximum, centrée, dans **les deux** variantes (fin du 640 px d'un côté et du pleine largeur de l'autre).
- Icônes : uniquement les composants SVG déjà présents dans le fichier. Les emojis utilisés comme icônes (🎬 ligne 2221, 🪪 ligne 3627, 👋 ligne 2321) sont remplacés par des SVG.
- Zéro hex en dur : `#4ade80`, `#4ade8012`, `#3b82f6`, `#1a2e4a`, `rgba(74,222,128,0.2)` et les autres littéraux passent par `colors` + `alpha` pour que le thème clair fonctionne vraiment.

### Ordre des blocs de l'accueil affilié
1. En-tête compact : avatar 56 px, prénom, club et catégorie, badge de plan.
2. À la une : une seule carte accentuée (convocation si elle existe, sinon prochaine séance ou prochain match).
3. Bande « Ma semaine » (voir idées signature).
4. Alertes (composant `ListeAlertes` partagé).
5. Ton éducateur + raccourci pour lui écrire.
6. Ma saison (`JaugeSaison`).
7. Actualités du club : les 2 dernières, lien vers l'onglet.
8. Aperçu Pro : une carte, pas un mur.

### Ordre des blocs de l'accueil Pro
1. En-tête identité : carte joueur compacte (avatar, nom, poste, club, région, badges Pro et licencié) + 3 chiffres (analyses restantes, demandes, catégorie).
2. À la une : convocation ou composition si affilié, sinon dernière analyse vidéo.
3. Bande « Ma semaine ».
4. Alertes (même composant `ListeAlertes`).
5. Ma saison (`JaugeSaison`).
6. Actions : Jogabonito, Feed, Publier, en cartes de même poids.
7. Colonne droite (desktop, 320 px) : quota d'analyses, vidéo, abonnement. Repliée sous le contenu sur mobile.

### Barre d'onglets mobile (56 px + `env(safe-area-inset-bottom)`)
- Joueur affilié : Accueil · Mon équipe · Compétition · Mes stats · Plus.
- Joueur Pro : Accueil · Mes statistiques · Analyses · Explorer · Plus.
- « Plus » ouvre le tiroir latéral existant, qui reste en place pour tout le reste.

## Idées signature [IDÉE]
- [IDÉE] **Bande « Ma semaine »** en haut des deux accueils : lundi → dimanche, séances, match, présence déclarée, d'un coup d'œil. C'est la vraie question du joueur qui ouvre l'app ; l'information est aujourd'hui éparpillée entre les alertes, le planning et la convocation. Données déjà chargées (`PlanningSemaineWidget`, `SondageSemaine`, `entrainementsNouveaux`, `prochainMatchSemaine`), rien de neuf côté base.
- [IDÉE] **La carte joueur comme objet identitaire** : le composant `CarteJoueur` existe déjà mais dort dans un onglet. Sa version compacte devient l'en-tête du dashboard Pro, façon carte à collectionner. C'est ce qui fait qu'un joueur montre son profil à ses copains.
- [IDÉE] **Jauge de saison narrative** au lieu de 4 tuiles de chiffres isolées : présence, évaluations coach, buts et passes racontés comme une progression sur la saison. Les chiffres bruts n'intéressent personne à 15 ans, la progression si. Utilise `tauxPresenceAccueil` et `mesNotes`, déjà calculés.

## Contraintes (plateforme, existant, budget, délai)
- Application en production (React + Vite, Supabase, Stripe). Aucun changement de base de données, de paiement ou d'email.
- `src/pages/DashboardJoueur.jsx` : 5 785 lignes, les deux variantes dans un seul fichier, styles inline conservés. On ne touche que la couche visuelle : aucune requête Supabase, aucun `useEffect` de chargement modifié.
- Le composant principal fait déjà `const colors = useColors()` (ligne 473) : le thème clair fonctionne partout sauf sur les hex en dur et sur l'objet `st` défini au niveau module (lignes 52-55) avec l'import statique de `colors`.
- `src/tokens.js` déjà adopté dans ~47 fichiers ; thème clair dans `src/lib/theme.js` (`useColors`, `colorsClaire`).
- Le panneau « Alertes » est aujourd'hui dupliqué (lignes ~2336 et ~3656) avec les mêmes styles recopiés.
- Vert de marque `#4ade80` conservé.
- Pas de nouvel emoji décoratif (règle permanente).
- Sauvegarde datée du fichier avant modification, build vérifié, test réel sur les deux comptes avant tout commit.

## Décisions prises
- **Périmètre** : socle visuel partagé + les deux accueils + navigation. Les autres onglets héritent du socle sans être retouchés un par un.
- **Ambition** : même ADN (fond sombre, vert de marque), exécution nettement meilleure sur la hiérarchie, les espacements, la typographie, les cartes et les icônes. Pas de nouvelle direction artistique.
- **Mobile** : barre d'onglets en bas, 5 destinations, le tiroir reste accessible via « Plus ».
- **Thème** : clair et sombre traités au même niveau, vérifiés tous les deux sur chaque écran livré.
- Refonte visuelle seulement : aucune nouvelle fonctionnalité.

## Questions ouvertes
Aucune. Le plan peut être écrit.

## Hors périmètre
- Dashboards éducateur, coach, club, dirigeant, recruteur, parent.
- Les onglets internes du dashboard joueur (équipe, stats, santé, nutrition, préparation physique et tactique, certification, explorer, messagerie) : ils héritent du socle mais ne sont pas redessinés dans ce chantier.
- Changements de base de données, de tarifs, de Stripe, d'emails.
- Découpage du fichier de 5 785 lignes en plusieurs pages (refactor technique, à traiter séparément si tu le veux).
- Nouvelles fonctionnalités joueur.

## Ce que je dois fournir (accès, textes, photos, logos, comptes)
- Un compte de test joueur affilié à un club et un compte joueur Pro avec abonnement actif, pour voir les deux variantes en vrai.
- Les références visuelles d'apps que tu aimes, si tu en as (facultatif : la direction est déjà fixée).
