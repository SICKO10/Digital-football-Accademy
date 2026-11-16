# BRIEF : bibliothèque du club
Date : 2026-11-16 · Statut : décisions prises par Kevin, prêt pour /plan (Opus, session neuve)

## Idée
Une section « Bibliothèque » dans l'espace club. Le club y range ses propres procédés (exercices, schémas, vidéos), selon les droits que chaque club configure. Les éducateurs affiliés les lisent et les reprennent dans leurs séances. Le club lit aussi la bibliothèque Digital Football.

## Décisions de Kevin (2026-11-16)
1. **Propriété** : les procédés du club vivent dans la bibliothèque du club, ils n'appartiennent à aucun éducateur. Si un éducateur part, le club les garde.
2. **Droits** : nouvelle permission « Bibliothèque » dans la configuration des rôles du club, lecture et écriture réglables par rôle, chaque club la configure. Valeur par défaut proposée : écriture pour le président et le directeur sportif, lecture pour les autres rôles.
3. **Éducateurs affiliés** : ils voient la bibliothèque du club en lecture seule. Ils peuvent ajouter un procédé à leur fiche séance et le modifier sur leur fiche séance (leur copie). L'original du club ne change jamais.
4. **Digital Football** : le club lit toute la bibliothèque Digital Football, procédés et vidéos (« inclure tout »), en lecture seule.
5. **Abonnement** : la bibliothèque du club est incluse gratuitement dans l'outil club, sans achat supplémentaire.

## Réponses du /plan (2026-11-16)
Toutes les hypothèses ci-dessous sont confirmées par Kevin : procédés et vidéos du club, accès offert aux éducateurs affiliés sans l'outil payant, modification par les seuls rôles en écriture (auteur affiché), copie Digital Football vers le club autorisée, clubs existants avec les valeurs par défaut. Plan : PLAN-bibliotheque-club.md.

## Points à confirmer au /plan (une seule série de questions)
- « Inclure tout » pour la bibliothèque club : procédés ET vidéos du club ? (hypothèse : oui, comme la bibliothèque éducateur).
- Un éducateur affilié sans l'outil Bibliothèque payant (4 €/mois ou 40 €/an) lit-il quand même la bibliothèque du club ? (hypothèse : oui, lecture et reprise dans ses séances gratuites, puisque c'est inclus au club.)
- Qui peut supprimer ou modifier un procédé du club : seulement ceux qui ont l'écriture, ou aussi l'auteur ? Garder la trace de l'auteur ?
- Le club peut-il reprendre un procédé Digital Football dans sa bibliothèque (copie) ? (hypothèse : oui, utile, copie modifiable.)
- Les clubs existants : la permission apparaît-elle avec les valeurs par défaut, sans rien changer d'autre ? (hypothèse : oui.)

## Ce qui existe déjà (à réutiliser, vérifié le 2026-11-16)
- Table `bibliotheque_exercices` (procédés des éducateurs) avec partage additif : `partage_club` + `club_id`, `partage_platform`. Règle de lecture : le créateur, les éducateurs acceptés du club si `partage_club`, tout le monde si `partage_platform` (fichiers `supabase_bibliotheque_visibilite_multiple.sql`, `supabase_bibliotheque_platform_acces_club_educateurs.sql`).
- Table de vidéos de bibliothèque (`supabase_bibliotheque_videos*.sql`), composant `BibliothequeVideos.jsx`, page `src/pages/coach/Bibliotheque.jsx`, import de procédé par scan `ScannerProc.jsx`.
- Droits du club : `canViewSection` / `canEditSection` dans `DashboardClub.jsx` (rôles, `PERMISSION_DEFAULTS`, ligne par section). Les procédés partagés « au club » par un éducateur existent déjà : à distinguer des procédés possédés par le club (décision 1).
- Outil éducateur `bibliotheque` : 4 € ou 40 € (`catalogueOutils.js`).

## Contraintes impératives
- Base de production : tout SQL présenté, sauvegarde avant (`~/Sauvegardes-DigitalFootball/sauvegarder.sh`), exécuté par Kevin, vérification annulée, retour arrière fourni à part. Pas de nouvelle ouverture RLS (cf. PLAN-securite-novembre.md : ne jamais s'appuyer sur les règles trop ouvertes).
- Un club ne voit jamais la bibliothèque d'un autre club. Les procédés de la bibliothèque club ne sont jamais visibles hors du club, sauf copie volontaire.
- Les clubs et éducateurs existants : rien ne change tant qu'on n'ajoute rien.
- Gros fichiers `DashboardClub.jsx`, `DashboardEducateur.jsx` : ne pas les lire en entier, brancher le minimum, nouveau code dans `src/components/bibliotheque-club/`.
- Pas d'emoji dans les nouveaux boutons, couleurs par le thème du club.
- Aucun commit ni push sans accord explicite de Kevin.

## Vérifications attendues
Président (écrit), directeur sportif (écrit), rôle sans droit (ne voit pas ou lit seulement selon réglage), éducateur affilié (lit, reprend dans une séance, modifie sa copie, l'original reste intact), éducateur non affilié (ne voit rien), deuxième club (isolation), lecture de la bibliothèque Digital Football par un club, ordinateur et téléphone, build et console sans erreur.
