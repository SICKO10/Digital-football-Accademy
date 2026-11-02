# PLAN : « Séance du jour » visible par les joueurs
Date : 2026-11-02 · Brief : BRIEF-entrainement.md
Lancer chaque bloc avec `/bloc N PLAN-entrainement.md`, une session neuve par bloc.

## Bloc 0 : Inventaire (Sonnet, effort medium, lecture seule)
Lire seulement : où est stockée une fiche de séance et ses procédés (lien `entrainements.fiche_id`), comment le schéma animé est rendu côté joueur (TactipadViewer), comment l'équipe active et les joueurs d'une équipe sont retrouvés, où se place « Préparation » dans le dashboard joueur. Écrire les constats dans ce fichier. Aucune modification.
Validation : Kevin lit les constats.

## Bloc 1 : Base de données (Opus, effort high)
Table de publication (séance, date, équipe, éducateur) et table des destinataires (joueur ou groupe de poste), avec les procédés cochés. Règle de lecture joueur : publié pour lui, jour J, avant 22h Paris. Règle d'écriture : l'éducateur propriétaire seulement. Fichier `supabase_entrainement_publie.sql`, que Kevin exécute après la sauvegarde.
Validation : Kevin exécute le SQL, on vérifie avec une lecture de test.

## Bloc 2 : Côté éducateur (Sonnet, effort medium)
Cases « Visible par les joueurs » sur les procédés, fenêtre de publication (équipe, postes, joueurs au choix), voir, modifier et retirer ce qui est publié.
Validation : Kevin publie une séance test sur son équipe.

## Bloc 3 : Côté joueur (Sonnet, effort medium)
Rubrique « Entraînement » dans Préparation, carte « Séance du jour », consigne, critères, schéma animé, état vide, disparition à 22h. Vérifier les deux variantes du dashboard joueur.
Validation : Kevin vérifie avec un compte joueur concerné et un non concerné.

## Bloc 4 : Notification (Sonnet, effort medium)
Notification clochette aux joueurs destinataires à la publication (via `notifierJoueur`). Email seulement après « ok » explicite de Kevin.
Validation : Kevin reçoit la clochette sur le compte de test.

## Bloc 5 : Contrôle final (Sonnet, effort medium)
Parcours complet, cas limites (publication à 21h59 et 22h01, joueur d'une autre équipe, procédé décoché ensuite), build, commit et push.
