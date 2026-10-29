# PLAN : refonte esthétique du dashboard joueur
Date : 2026-10-29 · Brief : BRIEF.md

Objectif : donner aux deux variantes du dashboard joueur (affilié à un club, et indépendant Pro) un seul langage visuel de niveau app de club pro, lisible en 2 secondes sur téléphone.
Aucune nouvelle fonctionnalité, aucune requête Supabase touchée, aucun changement de paiement ou d'email.

## Décisions de cadrage (prises le 2026-10-29)
- Nettoyage des couleurs en dur : uniquement dans le socle et les deux écrans d'accueil. Les autres onglets gardent leurs hex pour l'instant.
- Barre d'onglets mobile : visible partout dans l'espace joueur, pas seulement sur l'accueil. Un bloc dédié vérifie qu'aucun bouton de bas de page n'est masqué.
- Une seule branche `main`. Commit et push à la fin de chaque bloc validé par Kevin.

## Ce que je dois fournir
| Élément | Pourquoi | Où le trouver | Nécessaire avant |
|---|---|---|---|
| Un compte joueur affilié (plan `fan` + affiliation acceptée) **que Kevin ouvre lui-même** | C'est Kevin qui teste à l'œil : les sessions Claude Code n'ont pas de navigateur et ne peuvent pas se connecter. **Ne jamais demander d'identifiants, ils ne servent à rien ici.** | Kevin, sur son téléphone et son ordinateur | bloc 1 |
| Un compte joueur Pro (plan `joueur_pro` + abonnement actif) que Kevin ouvre lui-même | Idem pour la branche indépendante | Idem | bloc 4 |
| Ton avis visuel à chaque fin de bloc | Un bloc validé ne se repasse pas en revue plus tard | Toi, sur ton téléphone et sur ordinateur | chaque bloc |
| Références visuelles d'apps que tu aimes (facultatif) | La direction est déjà fixée, c'est un bonus | Captures d'écran dans un dossier | bloc 2 |

## Manipulations à faire moi-même
1. **À chaque fin de bloc** : être connecté au compte concerné (affilié pour les blocs 1 à 3, Pro pour les blocs 4 et 5) et regarder l'écran. Moi je ne vois rien : je n'ai pas de navigateur, je prouve seulement que le code compile et passe le lint.
2. **Ne pas m'envoyer d'identifiants** : je ne peux pas m'en servir.
3. **À chaque fin de bloc** : ouvrir l'adresse indiquée sur ton téléphone ET sur ordinateur, en thème sombre ET en thème clair, puis répondre « ok » ou dire ce qui ne va pas. Je ne commite rien avant ton « ok ».
4. **En cours** : si tu changes d'avis sur une couleur ou un ordre de blocs, le dire pendant le bloc concerné, pas trois blocs plus tard : revenir en arrière coûte un bloc entier.

## Répartition suggérée
- **Aujourd'hui** (fenêtre 5 h sous 30 %) : bloc 0 puis bloc 1. Le bloc 1 est le plus structurant du chantier, il mérite une fenêtre fraîche.
- **Jour 2** : blocs 2 et 3 (accueil affilié complet, le public principal).
- **Jour 3** : blocs 4 et 5 (accueil Pro complet).
- **Jour 4** : blocs 6 et 7 (navigation et upsell).
- **Jour 5** : bloc 8 (vérification finale, build, commit).
Rappel : `/clear` et une session neuve par bloc. Deux blocs maximum par fenêtre de 5 h.

## Règle d'économie valable pour tous les blocs
`src/pages/DashboardJoueur.jsx` fait 5 785 lignes. **Ne jamais le lire en entier.**
Les numéros de ligne de ce plan bougent dès le premier bloc : repérer les zones avec `grep -n`, pas avec les numéros écrits ici.
- Branche affilié : `grep -n "if (estAffilie) {" src/pages/DashboardJoueur.jsx`
- Accueil affilié : `grep -n "onglet === 'accueil' &&" src/pages/DashboardJoueur.jsx`
- Accueil Pro : `grep -n "onglet === 'dashboard' &&" src/pages/DashboardJoueur.jsx`
- Navigation Pro : `grep -n "const navItems" src/pages/DashboardJoueur.jsx`
Puis lire seulement la plage utile avec `sed -n 'X,Yp'`.

## Blocs

### Bloc 0 : mise en place
- Statut : validé (Kevin le 2026-10-29 : aucune différence visible, ce qui est le résultat attendu pour ce bloc)
- Objectif : sauvegarde datée, dossier des composants créé, point de départ sain vérifié.
- Résultat testable : le site tourne exactement comme avant, et une copie de sauvegarde du fichier existe avec la date du jour.
- Modèle : haiku · Effort : low · Coût estimé : faible
- Pourquoi ce modèle : pur mécanique, aucune décision visuelle.
- Lancement : `/clear`, puis `/model haiku`, puis `/effort low`, puis `/bloc 0`
- Dépend de : rien
- Prérequis : aucun
- Étapes :
  - Copier `src/pages/DashboardJoueur.jsx` vers `~/Sauvegardes-DigitalFootball/DashboardJoueur-2026-10-29.jsx` (jamais de `rm`, jamais d'écrasement d'une sauvegarde existante).
  - Créer le dossier `src/components/joueur/`.
  - Lancer `npm run build` et noter que le build passe, avec le nombre d'avertissements, pour comparaison en fin de chantier.
  - Lancer `npm run dev` et noter l'adresse locale.
  - Écrire dans le journal du bloc le résultat du build de référence.
- Ce que je teste pour valider : j'ouvre l'adresse locale, l'espace joueur s'affiche comme avant.
- Reste à finir : rien
- Journal : 2026-10-29, exécuté en session Opus (bloc mécanique très court, enchaîné après l'écriture du plan au lieu d'une session Haiku dédiée).
  - Sauvegarde : `~/Sauvegardes-DigitalFootball/DashboardJoueur-2026-10-29.jsx`, 5 785 lignes, aucun fichier écrasé.
  - Dossier `src/components/joueur/` créé, vide.
  - Build de référence : `npm run build` passe, built in 665 ms, **1 avertissement** (chunks > 500 kB, déjà présent avant ce chantier). Poids du bundle joueur à battre ou à tenir : `DashboardJoueur-*.js` 421,03 kB, gzip 91,34 kB. PWA : 111 entrées précachées, 6 493 KiB.
  - Serveur de développement : http://localhost:5173/

### Bloc 1 : socle visuel partagé et fin de la duplication des alertes
- Statut : validé (Kevin le 2026-10-29)
- Objectif : créer les composants de base communs aux deux variantes, et prouver qu'ils marchent en remplaçant tout de suite le panneau « Alertes » recopié deux fois.
- Résultat testable : le panneau d'alertes est identique sur le compte affilié et sur le compte Pro, correct en thème clair comme en sombre, et plus aucun style d'alerte n'est écrit deux fois dans le fichier.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : production de composants, mais c'est le bloc dont tous les autres héritent : une erreur de contrat de props ici se paie dans six blocs.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 1`
- Dépend de : bloc 0
- Prérequis : Kevin connecté au compte affilié pour le test final
- Étapes :
  - Créer dans `src/components/joueur/` : `Carte.jsx`, `TitreSection.jsx`, `TuileChiffre.jsx`, `ListeAlertes.jsx`.
  - Chaque composant appelle `useColors()` depuis `src/lib/theme.js` et prend ses espacements, rayons et tailles de texte dans `src/tokens.js`. Aucun import statique de `colors`, aucun hex littéral.
  - Valeurs imposées par le brief : espacements 4/8/12/16/20/24/32 ; rayons 12, 16, 999 ; carte = fond `background.surface`, bordure 1 px `border.subtle`, rayon 16, padding 16 px mobile / 20 px desktop ; une seule variante accentuée (prop `accent`), réservée au bloc « à la une ».
  - Lire les deux panneaux d'alertes existants (repérer avec `grep -n "Alertes"`), extraire le contrat de props réel, puis remplacer les deux par `<ListeAlertes />`.
  - Vérifier que `src/components/AlertesPanel.jsx` (déjà existant, 279 lignes) ne fait pas déjà le travail : s'il convient, l'adapter plutôt que créer un doublon, et le dire dans le compte rendu.
  - `npm run build`, puis test réel sur le compte affilié, thème sombre et thème clair.
- Ce que je teste pour valider : sur mon téléphone, l'écran d'accueil affilié, le panneau d'alertes s'affiche sans décalage ni couleur fausse, et pareil en thème clair.
- Reste à finir :
  - `Carte`, `TitreSection` et `TuileChiffre` sont créés et testés par le build, mais seuls `Carte` et `TitreSection` sont réellement à l'écran pour l'instant (via `ListeAlertes`). `TuileChiffre` entre en service au bloc 2. C'est prévu : le bloc 1 pose le socle.
  - L'espacement sous le panneau d'alertes passe de 14 px à 16 px (l'échelle du brief n'a pas de 14 px). Les cartes voisines sont encore à 14 px, donc un micro-décalage subsiste jusqu'au bloc 2 qui aligne tout l'accueil.
- Journal : 2026-10-29, exécuté en Opus 5 et non en Sonnet (le `/clear` et le `/model sonnet` collés dans un message n'ont pas pris effet ; décision prise de continuer puisque le contexte du plan était déjà chargé, donc aucune relecture de BRIEF.md ni de PLAN.md à payer).
  - `src/components/AlertesPanel.jsx` vérifié comme demandé : c'est le panneau de l'**éducateur** (ses propres requêtes Supabase, props `educateurId`/`clubId`, cartons jaunes, véhicules, tâches du club). Aucun rapport avec les alertes du joueur. Nouveau composant créé, ce n'est donc pas un doublon ; la distinction est écrite en commentaire dans les deux fichiers.
  - Les deux panneaux d'alertes recopiés ont été remplacés par un seul `<ListeAlertes />`. Le fichier passe de 5 785 à 5 676 lignes (109 de moins, dont 104 de pure duplication), le bundle joueur de 421,03 à 415,53 kB (gzip 91,34 → 91,24).
  - `IconCheck` est devenu du code mort après le remplacement, retiré. Sa coche vit maintenant dans `ListeAlertes`.
  - `spacing` ajouté à l'import des tokens dans DashboardJoueur.jsx (seuls `colors` et `alpha` l'étaient).
  - Deux écarts volontaires au code d'origine, signalés à Kevin : les tirets longs des textes d'alerte sont remplacés par des points médians ou une reformulation (règle permanente sur les textes vus par les clients), et le bouton de validation passe de 20 à 24 px (cible tactile trop petite au pouce).
  - Lint : les 4 nouveaux fichiers passent sans aucun problème. Le dashboard garde exactement les 10 problèmes préexistants (7 erreurs, 3 avertissements, tous dans les `useEffect` de chargement des lignes 662-833), vérifié en lintant la version git du fichier côté à côté : mêmes problèmes, mêmes positions au décalage de 4 lignes près.
  - Build : passe en 533 ms, un seul avertissement, le même qu'au bloc 0 (taille des chunks).
  - Non vérifié par moi : l'affichage réel. Cette session n'a pas d'outil navigateur, je ne peux pas me connecter au compte de test. Le serveur de développement répond HTTP 200 et compile le nouveau module sans erreur, mais c'est Kevin qui valide à l'œil.

### Bloc 2 : accueil du joueur affilié, haut de page
- Statut : validé (Kevin le 2026-10-29)
- Objectif : refaire le haut de l'accueil affilié : en-tête compact, carte « à la une », bande « Ma semaine ».
- Résultat testable : en ouvrant l'app, je sais en 2 secondes quand est mon prochain rendez-vous et si je suis convoqué.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : c'est le travail de design le plus visible du chantier, sur l'écran le plus vu.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 2`
- Dépend de : blocs 0, 1
- Prérequis : socle du bloc 1 validé, Kevin connecté au compte affilié pour le test final
- Étapes :
  - Créer `src/components/joueur/BandeSemaine.jsx` : lundi à dimanche, séances, match, présence déclarée. Données déjà chargées dans le composant (`PlanningSemaineWidget`, `SondageSemaine`, `entrainementsNouveaux`, `prochainMatchSemaine`) : vérifier les variables réellement disponibles avant d'écrire, ne rien inventer, aucune nouvelle requête.
  - Remplacer l'en-tête « Bonjour X 👋 » par un en-tête compact : avatar 56 px, prénom, club et catégorie, badge de plan. L'emoji 👋 disparaît, remplacé par rien ou par un SVG déjà présent dans le fichier.
  - Créer la carte « à la une » : une seule carte accentuée, qui affiche la convocation si elle existe, sinon la prochaine séance, sinon le prochain match.
  - Passer la largeur de contenu à 980 px maximum, centrée (fin du 640 px).
  - `npm run build`, test réel sur le compte affilié, téléphone et ordinateur, deux thèmes.
- Ce que je teste pour valider : sur téléphone, le haut de l'accueil tient dans un écran, la carte à la une est celle qui attire l'œil, et la bande semaine montre bien ma semaine réelle.
- Reste à finir :
  - **Fusion à faire au bloc 3** : la prochaine séance peut apparaître deux fois, dans la carte « à la une » et dans son ancienne carte de sondage plus bas. Kevin ne l'observe pas sur son compte de test (pas de séance à venir en plus de ce qui est déjà à la une), mais le cas existe pour un joueur qui en a une. Le bloc 3 fusionne les deux en ramenant les boutons de présence dans la carte « à la une ».
  - Les cartes du bas de l'accueil gardent leurs espacements à 14 px et leurs emojis (📅, 📋, ⚽, 🏃, ✅) : c'est le périmètre du bloc 3.
- Journal : 2026-10-29, exécuté en Opus 5 au lieu de Sonnet (les commandes `/clear` et `/model sonnet` n'ont pas pris effet trois fois de suite ; décision d'avancer plutôt que de rester bloqué sur la mécanique de l'outil, signalée à Kevin).
  - `BandeSemaine.jsx` créé : grille lundi à dimanche, pastille verte par séance, bleue par match, orange par rdv médical, jour courant détaché, résumé en une ligne dessous. Construit uniquement sur `planningEntrainements`, `planningMatchs` et `rdvsMedicaux`, déjà chargés : aucune requête ajoutée.
  - **Limite honnête sur la présence déclarée** : le dashboard ne connaît la réponse du joueur que pour le prochain entraînement et le prochain match (`widgetDispoEnt`, `widgetDispoMatch`). La bande n'affiche donc une présence que pour ces deux événements, au lieu d'en inventer une pour les autres jours. Afficher les 7 jours demanderait une requête sur `disponibilites`, ce que le brief interdit dans ce chantier.
  - En-tête compact en place : `Avatar` (composant existant) en 56 px, prénom en 20 px/800, club en dessous, catégorie en badge. L'emoji 👋 a disparu du fichier (vérifié : 0 occurrence).
  - Carte « à la une » : seule carte accentuée de l'écran, priorité convocation, puis prochaine séance, puis prochain match. Rien ne s'affiche si les trois sont absents.
  - Largeur de contenu passée de 640 px à 980 px centrés.
  - **Écart au brief, tranché par Kevin le 2026-10-29** : là où le brief demandait un « badge de plan », le badge affiche la **catégorie d'équipe** (U15, U17...). Côté affilié le plan s'appelle `fan` en base et n'a aucun libellé destiné au client. Décision définitive, à appliquer aussi à l'en-tête Pro du bloc 4.
  - `fontSize` ajouté à l'import des tokens ; `Carte` et `BandeSemaine` importés dans le dashboard.
  - Lint : `BandeSemaine.jsx` passe sans problème. Le dashboard garde exactement ses 10 problèmes préexistants, aucun nouveau.
  - Build : 534 ms, un seul avertissement (le même). Bundle joueur 415,53 → 420,92 kB : le nouveau code coûte 5,4 kB, la duplication retirée au bloc 1 en avait rendu 5,5.
  - Non vérifié par moi : l'affichage réel, toujours faute de navigateur dans cette session. Vite sert les deux modules en HTTP 200 sans erreur de compilation.

### Bloc 3 : accueil du joueur affilié, bas de page
- Statut : à faire
- Objectif : finir l'accueil affilié : éducateur, « Ma saison », actualités du club, aperçu Pro.
- Résultat testable : l'écran d'accueil affilié est entièrement refait, du haut au bas, sans carte grise restante de l'ancien style.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : assemblage avec le socle déjà posé, peu de décisions nouvelles.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 3`
- Dépend de : blocs 1, 2
- Prérequis : bloc 2 validé
- Étapes :
  - Créer `src/components/joueur/JaugeSaison.jsx` : présence, évaluations coach, buts et passes racontés comme une progression de saison, à partir de `tauxPresenceAccueil` et `mesNotes` déjà calculés.
  - Créer `src/components/joueur/ApercuPro.jsx` : une carte désirable, pas un mur. Elle montre ce que Pro ouvre, avec un seul bouton.
  - Brancher dans l'ordre du brief : éducateur et raccourci pour lui écrire, puis `JaugeSaison`, puis les 2 dernières actualités du club avec lien vers l'onglet, puis `ApercuPro`.
  - Remplacer l'emoji 🎬 par un SVG déjà présent dans le fichier.
  - Supprimer les styles de l'ancien accueil affilié devenus morts.
  - `npm run build`, test réel, deux thèmes.
- Ce que je teste pour valider : je fais défiler l'accueil affilié du haut en bas sur téléphone : tout est au même langage visuel, et l'aperçu Pro donne envie sans bloquer.
- Reste à finir :
- Journal :

### Bloc 4 : accueil du joueur Pro, haut de page
- Statut : à faire
- Objectif : en-tête identité (carte joueur compacte + 3 chiffres), carte « à la une », bande « Ma semaine ».
- Résultat testable : le dashboard Pro commence par une identité de joueur qu'on a envie de montrer, au lieu d'un héros encombré.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : il faut réutiliser `CarteJoueur.jsx` en version compacte sans casser son usage actuel dans son onglet.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 4`
- Dépend de : blocs 1, 2
- Prérequis : `BandeSemaine` du bloc 2, Kevin connecté au compte Pro pour le test final
- Étapes :
  - Ajouter une variante compacte à `src/components/CarteJoueur.jsx` (prop `compact`), sans modifier le rendu actuel dans l'onglet `carte_joueur`.
  - Construire l'en-tête identité : carte compacte (avatar, nom, poste, club, région, badges Pro et licencié) + 3 `TuileChiffre` (analyses restantes, demandes, catégorie).
  - Carte « à la une » : convocation ou composition si le joueur Pro est aussi affilié, sinon dernière analyse vidéo.
  - Réutiliser `BandeSemaine` tel quel, sans le dupliquer ni le forker.
  - Remplacer l'emoji 🪪 par un SVG déjà présent dans le fichier.
  - Largeur de contenu 980 px maximum, centrée, comme la variante affiliée.
  - `npm run build`, test réel sur le compte Pro, deux thèmes.
- Ce que je teste pour valider : sur le compte Pro, le haut du dashboard montre mon identité et mes 3 chiffres, et la bande semaine est visuellement identique à celle du compte affilié.
- Reste à finir :
- Journal :

### Bloc 5 : accueil du joueur Pro, bas de page et colonne droite
- Statut : à faire
- Objectif : alertes, « Ma saison », cartes d'action de même poids, colonne droite rangée.
- Résultat testable : le dashboard Pro est entièrement refait, et l'abonnement est rangé dans la colonne droite au lieu d'encombrer le contenu.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : assemblage avec le socle, mais la zone abonnement touche à de l'affichage Stripe : lecture seule, aucune modification de paiement.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 5`
- Dépend de : blocs 1, 3, 4
- Prérequis : `ListeAlertes` et `JaugeSaison` validés
- Étapes :
  - Brancher `ListeAlertes` puis `JaugeSaison` dans l'ordre du brief.
  - Refaire les actions Jogabonito, Feed, Publier en cartes de même poids visuel (fin des 3 cartes d'action hétérogènes).
  - Colonne droite de 320 px sur desktop : quota d'analyses, vidéo, abonnement. Sur mobile, elle passe sous le contenu.
  - Ne toucher aucun appel Stripe ni aucun texte de prix : affichage seulement.
  - Supprimer les styles de l'ancien dashboard Pro devenus morts.
  - `npm run build`, test réel, deux thèmes, téléphone et ordinateur.
- Ce que je teste pour valider : sur ordinateur la colonne droite est propre et l'abonnement s'affiche juste ; sur téléphone elle passe bien dessous sans rien casser.
- Reste à finir :
- Journal :

### Bloc 6 : navigation, barre latérale harmonisée et barre d'onglets mobile
- Statut : à faire
- Objectif : une seule barre latérale pour les deux variantes, et une barre d'onglets en bas sur mobile, présente partout dans l'espace joueur.
- Résultat testable : sur téléphone, je navigue dans tout l'espace joueur avec le pouce, sans ouvrir le menu, et aucun bouton de bas de page n'est caché par la barre.
- Modèle : sonnet · Effort : high · Coût estimé : moyen
- Pourquoi ce modèle : la barre touche tous les onglets de l'espace joueur, y compris ceux qu'on ne redessine pas : c'est le bloc le plus à risque de régression.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort high`, puis `/bloc 6`
- Dépend de : blocs 3, 5
- Prérequis : les deux accueils validés
- Étapes :
  - Créer `src/components/joueur/BarreOnglets.jsx` : hauteur 56 px + `env(safe-area-inset-bottom)`, 5 destinations, icônes SVG déjà présentes dans le fichier.
  - Affilié : Accueil, Mon équipe, Compétition, Mes stats, Plus. Pro : Accueil, Mes statistiques, Analyses, Explorer, Plus. « Plus » ouvre le tiroir latéral existant, qui reste en place pour tout le reste.
  - Harmoniser les deux barres latérales (styles, espacements, états actifs) entre la branche affiliée et la branche Pro.
  - Ajouter au conteneur `main` un `paddingBottom` qui tient compte de la barre et de la zone sûre, dans les deux branches, pour tous les onglets.
  - Passer en revue les onglets qui ont un bouton ou un formulaire en bas de page (profil, santé, nutrition, équipement, messagerie, certification) et vérifier qu'aucun n'est masqué.
  - `npm run build`, test réel sur les deux comptes, téléphone surtout, deux thèmes.
- Ce que je teste pour valider : sur mon téléphone, je passe par les 5 onglets de la barre sur les deux comptes, puis j'ouvre « Plus » et je vérifie 3 onglets internes avec un bouton en bas : rien n'est caché.
- Reste à finir :
- Journal :

### Bloc 7 : upsell Pro, remplacer les murs par des aperçus (optionnel mais recommandé)
- Statut : à faire
- Objectif : les pages entières `UpgradeCard` deviennent des aperçus désirables avec `ApercuPro`.
- Résultat testable : sur le compte affilié, les onglets Nutrition, Analyses, Feed et Messagerie recruteurs montrent ce que Pro apporte au lieu d'un mur de blocage.
- Modèle : sonnet · Effort : medium · Coût estimé : faible
- Pourquoi ce modèle : production de contenu et de mise en page, avec du texte vu par les clients, donc pas Haiku.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 7`
- Dépend de : bloc 3 (`ApercuPro`)
- Prérequis : `ApercuPro` validé
- Étapes :
  - Repérer les usages avec `grep -n "UpgradeCard"` (environ 5 endroits).
  - Remplacer chaque mur par un aperçu : un titre, ce que ça fait concrètement pour le joueur, un seul bouton. Textes français, pas de tiret long, pas de formule creuse, aucun emoji décoratif.
  - Garder le composant `UpgradeCard` si un endroit hors périmètre s'en sert encore, sinon le retirer.
  - `npm run build`, test réel sur le compte affilié.
- Ce que je teste pour valider : j'ouvre Nutrition et Analyses sur le compte affilié : je comprends ce que Pro m'apporte, et le bouton fonctionne vraiment.
- Reste à finir :
- Journal :

### Bloc 8 : vérification finale, nettoyage et mise en ligne
- Statut : à faire
- Objectif : prouver que les deux variantes et les deux thèmes sont bons, nettoyer, commiter, publier.
- Résultat testable : une version de test en ligne que j'ouvre sur mon téléphone, puis la production.
- Modèle : sonnet · Effort : medium · Coût estimé : moyen
- Pourquoi ce modèle : vérification réelle et compte rendu, pas de création.
- Lancement : `/clear`, puis `/model sonnet`, puis `/effort medium`, puis `/bloc 8`
- Dépend de : tous les blocs précédents
- Prérequis : blocs 1 à 7 validés
- Étapes :
  - Vérifier qu'aucun hex littéral ne reste dans `src/components/joueur/` ni dans les deux écrans d'accueil (`grep -n "#[0-9a-fA-F]\{3,8\}"` sur ces zones).
  - Supprimer les composants, états et styles devenus morts dans les zones retouchées. Ne rien supprimer hors périmètre.
  - `npm run build` et comparer au build de référence du bloc 0 : pas de nouvelle erreur, pas de nouvel avertissement.
  - Parcours complet sur les deux comptes, téléphone et ordinateur, thème sombre et thème clair : accueil, 5 onglets de la barre, un onglet interne avec formulaire.
  - Déployer une version de test avec la skill `vercel-deploy`, me donner l'adresse, attendre mon « ok » explicite avant la production.
  - Commit et push sur `main` avec un message clair en français, après mon « ok » seulement.
- Ce que je teste pour valider : j'ouvre l'adresse de test sur mon téléphone, je fais le parcours complet sur les deux comptes dans les deux thèmes, puis je dis « ok pour la production ».
- Reste à finir :
- Journal :
