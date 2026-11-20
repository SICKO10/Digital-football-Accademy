# RGPD des fiches d'évaluation : dossier de travail

Statut : PROJETS du 2026-11-19 (bloc 10, PLAN-fiches-evaluation.md). Rien n'est publié, aucune page du site n'est modifiée. Ordre de publication : relecture juriste, puis bloc 11 (interface), puis bloc 12 (contrôle final), puis mise en ligne sur ton ok.

| Fichier | Pour qui | Contenu |
|---|---|---|
| [registre-evaluations.md](registre-evaluations.md) | Clubs (modèle) et Digital Football | Registre des traitements : partie club, partie sous-traitant, partie Digital Football |
| [politique-confidentialite-evaluations.md](politique-confidentialite-evaluations.md) | Tous les visiteurs | Changements de la page /confidentialite, prêts à coller |
| [conditions-fiches-evaluation.md](conditions-fiches-evaluation.md) | Clubs et éducateurs | Article 8 des CGU, conditions d'utilisation avec accord de sous-traitance et clause de responsabilité, case à cocher |
| [information-joueur-parent.md](information-joueur-parent.md) | Joueurs, parents, staff | Textes à placer dans l'interface au bloc 11 |

Faits vérifiés pour ces textes (2026-11-19) : base Supabase en région eu-central-2 (Zurich, Suisse) ; aucune fonction serveur n'envoie les fiches à un autre service ; durée de conservation déjà prévue en base (`parametres_evaluation.conservation_saisons`, défaut 2, de 0 à 10) ; éditeur JANUARIO CAPITAL (repris des CGV).

---

## Points à faire relire par un juriste ou un DPO

Documents à lui envoyer : les quatre fichiers ci-dessus, plus la matrice de droits ([bloc0-bibliotheque-et-droits.md](../fiches-evaluation/bloc0-bibliotheque-et-droits.md), partie 2).

1. **Rôles.** Club responsable de traitement, Digital Football sous-traitant. Confirmer aussi : l'éducateur indépendant est-il responsable de traitement ? S'il est bénévole et non professionnel, peut-il être traité en consommateur, ce qui rendrait la clause de responsabilité abusive à son égard ? Un éducateur affilié qui complète la fiche du club agit-il bien pour le compte du club ?
2. **Base légale.** Intérêt légitime du club (proposé) ou exécution de l'adhésion, en particulier pour des joueurs mineurs.
3. **Notes de suivi non visibles par le joueur.** Choix de Kevin : jamais affichées dans l'espace joueur ou parent. La jurisprudence européenne considère que des annotations sur une personne sont ses données personnelles, couvertes par le droit d'accès. Formulation retenue : non affichées, mais communicables sur demande d'accès adressée au club. Confirmer que cela suffit.
4. **Clause de responsabilité** (conditions, article 5). Le plafond « sommes versées sur douze mois » vaut zéro pour un club qui utilise les fiches sans payer : risque que la clause soit réputée non écrite (article 1170 du Code civil). Faut-il un plancher ? La garantie du club (5.2) est-elle valable ? Une case cochée par un membre du club engage-t-elle l'association (pouvoir de représentation) ?
5. **Analyse d'impact (AIPD).** Évaluation de personnes et mineurs : deux critères des lignes directrices européennes, donc AIPD probablement requise pour le club. Digital Football doit-il fournir un modèle pré-rempli, et le club amateur peut-il s'appuyer sur une analyse faite par l'éditeur ?
6. **Mineurs et parents.** Les parents de la plateforme sont ceux que le joueur invite : ce ne sont pas forcément ses représentants légaux, et le joueur peut les retirer. Comment informer les représentants légaux (obligation de l'article 14, données non collectées auprès du joueur) ? Même question pour les joueurs sans compte (128 sur 173 en prod) : ils ne verront jamais le texte d'information à l'écran. Le club doit-il les informer sur papier ? Un texte imprimable est-il à fournir ?
7. **Tests physiques.** Sprint, détente, VMA : confirmer qu'il s'agit de performances sportives et non de données de santé, tant qu'aucune conclusion médicale n'en est tirée.
8. **Hébergement.** Supabase stocke en Suisse (décision d'adéquation), mais sa société mère est aux États-Unis. Garanties suffisantes ? Vérifier que l'accord de sous-traitance de Supabase est bien accepté sur le compte de Digital Football.
9. **Durée de conservation.** Présence au club puis 2 saisons, réglable de 0 à 10 : cohérent avec le référentiel de la CNIL pour les associations ? Durée du journal des accès (proposée : celle de l'historique concerné).
10. **Anciennes fiches.** 34 fiches créées avant ces textes, dans un seul club : comment régulariser (information des joueurs, acceptation des conditions par le club) ?
11. **Politique de confidentialité actuelle.** Elle indique Digital Football seul responsable de traitement, y compris pour les évaluations et la santé. Le changement proposé ne concerne que les fiches d'évaluation : faut-il revoir le module Santé de la même façon ?
12. **Limitation de responsabilité en général.** La loi ne permet pas d'écarter toute responsabilité : obligations propres du sous-traitant (sécurité, instructions, notification), faute lourde, amendes CNIL.
