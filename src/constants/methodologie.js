// Base de référence football (phases de jeu → thèmes → principes → sous-principes)
// utilisée par les sélecteurs en cascade de la Planification Annuelle. Contenu
// générique de méthodologie sportive, pas de données club — sert de bibliothèque
// de suggestions, le champ reste éditable/complétable au besoin.
export const METHODOLOGIE = {

  offensif: {

    conservation: {
      label: 'Conservation',
      themes: {
        'Conserver pour bien progresser': {
          principes: {
            'Se rendre disponible': ['Proposer des solutions au porteur', 'Qualifier ses déplacements', 'Créer des angles de passe variés'],
            'Jouer en mouvement': ['Bouger avant la passe', 'Ne pas jouer statique', 'Créer du déséquilibre par le mouvement'],
            'Circuler le ballon': ['Faire tourner rapidement', "Ne pas s'accrocher au ballon", 'Jouer à 1 ou 2 touches'],
            'Qualité technique': ['Réception orientée', 'Passe juste et dosée', 'Prise d\'information avant réception'],
            'Fixer pour libérer': ['Attirer l\'adversaire pour libérer un partenaire', 'Jeu à 2 (fixation + passe)'],
          },
        },
        'Maîtriser le tempo': {
          principes: {
            'Gérer le rythme': ['Accélérer ou ralentir intentionnellement', 'Varier les tempos', 'Lire le jeu adverse'],
            'Possession sécurisée': ['Garder son avance au score', 'Limiter les risques', 'Jeu latéral + reculer si nécessaire'],
            'Maîtriser en supériorité ou infériorité': ['Adapter le jeu au contexte', 'Gérer les temps forts / faibles'],
          },
        },
      },
    },

    progression: {
      label: 'Progression',
      themes: {
        "Progresser vers l'avant": {
          principes: {
            'Jouer vers l\'avant': ['Passe en profondeur dès que possible', 'Regard vers l\'avant', 'Passes vers l\'avant réussies'],
            'Trouver le joueur libre': ['Jeu entre les lignes', 'Trouver la solution libre', 'Circuler pour libérer des espaces'],
            'Fixer pour libérer': ['Attirer puis donner', 'Créer du surnombre local', 'Jeu à 2 intérieur/extérieur'],
            "Se projeter après la passe": ["Ne pas s'arrêter après avoir joué", 'Appel en profondeur', 'Soutien immédiat'],
          },
        },
        'Sortir de la pression': {
          principes: {
            'Trouver une solution sous pression': ['Jouer vite sous pression', 'Dégagement orienté', 'Appel de démarquage du GB'],
            'Jouer long si nécessaire': ['Utiliser le long ballon', 'Cibler les duels gagnables', '2e ballon'],
          },
        },
      },
    },

    desequilibre: {
      label: 'Déséquilibre',
      themes: {
        'Déséquilibrer pour créer des occasions': {
          principes: {
            'Créer le surnombre': ['Situations 2c1, 3c2', 'Appel + passe + appel', 'Troisième homme'],
            'Jouer entre les lignes': ['Trouver des joueurs entre les lignes', 'Passes dans les intervalles', 'Réception face au jeu'],
            'Éliminer son adversaire': ['Dribble orienté', 'Rythme changeant', 'Feinte de corps'],
            'Créer des occasions de frappe': ['Centres, tirs, têtes', 'Entrer dans la surface', 'Attaquer les 6m'],
            "Se créer des occasions": ['Finitions en mouvement', 'Récupérer les 2e ballons', 'Appel en profondeur'],
          },
        },
        'Attaquer la surface pour finir': {
          principes: {
            'Attaquer la profondeur': ['Course en profondeur', 'Timing de la passe/appel', 'Exploiter le dos de la défense'],
            'Se mettre en situation de frappe': ['Frapper plus souvent', 'Frapper mieux', 'Déclencher tôt'],
            'Efficacité offensive': ['Taux de conversion', 'Qualité des centres', 'Réalisme'],
          },
        },
      },
    },

    finalisation: {
      label: 'Finalisation & Bilan',
      themes: {
        "S'exprimer collectivement": {
          principes: {
            'Réinvestir tous les principes': ['Être complet offensivement', 'Être performant en match', 'Autonomie collective'],
            'Plaisir et progression': ["Liberté d'initiative", 'Prise de risque maîtrisée', 'Expression individuelle'],
            'Efficacité collective': ['Solidarité', 'Communication', 'Organisation automatique'],
          },
        },
      },
    },

  },

  defensif: {

    pressing: {
      label: 'Pressing / Pression',
      themes: {
        'Pression sur le porteur et repli': {
          principes: {
            'Presser le porteur': ['Intensité sur le porteur', "Fermer la passe en avant", 'Orienter vers le côté'],
            "Fermer l'axe": ['Bloquer le couloir central', 'Couper les lignes de passe centrales'],
            'Replier rapidement': ['Transition défensive immédiate', 'Bloquer les espaces', 'Sprint retour'],
            'Pression coordonnée': ['Pressing collectif', 'Signal de déclenchement', 'Coulisser ensemble'],
          },
        },
        'Pressing haut': {
          principes: {
            'Presser haut': ['Récupérer haut sur le terrain', 'Forcer les erreurs adverses', 'Intensité collective'],
            'Défendre en avançant': ['Intervention au bon moment', 'Réduire les espaces rapidement'],
          },
        },
      },
    },

    opposition: {
      label: 'Opposition à la Progression',
      themes: {
        "S'opposer à la progression": {
          principes: {
            "Orienter l'adversaire": ['Diriger vers le côté', "Fermer l'axe", 'Empêcher le demi-tour'],
            'Coulisser ensemble': ['Décalage collectif', 'Garder les distances', 'Ne pas se faire éliminer'],
            'Réduire les espaces': ['Bloc compact', 'Distances réduites entre les lignes', 'Bloquer les intervalles'],
            'Intervenir au bon moment': ['Ni trop tôt ni trop tard', 'Lecture des appuis adverses', 'Tacle juste'],
          },
        },
        'Gêner pour récupérer': {
          principes: {
            'Récupérer haut': ['Forcer la faute ou la perte', 'Pressing coordonné', "Deuxième défenseur dans l'axe"],
            'Empêcher la combinaison': ['Couper les lignes de passe', 'Fermer le jeu intérieur', 'Suivi des courses'],
          },
        },
      },
    },

    protection: {
      label: 'Protection du But',
      themes: {
        'Protéger notre but': {
          principes: {
            'Défendre la surface': ['Marquage en zone / individuel', "Protéger l'axe", 'Éliminer les centres'],
            'Couvrir / équilibrer': ['Couverture du défenseur en duel', 'Équilibre défensif', 'Ne pas laisser de ligne libre'],
            'Communication': ['Parler en défense', 'Organiser la ligne', 'Prévenir les situations 2c1'],
            'Défense des centres': ['Marquer au 2e poteau', 'Couper la trajectoire', "Sortir en attaquant le ballon"],
            "Protection de l'axe": ['Bloc serré dans l\'axe', 'Éviter les tirs centraux', 'Fermer les espaces entre les lignes'],
          },
        },
        'Être solide dans la surface': {
          principes: {
            'Bloc compact': ['Équipe soudée', 'Distances courtes', "Peu d'espaces entre les lignes"],
            'Gestion de la profondeur': ['Ligne défensive haute ou basse selon contexte', 'Éviter le hors jeu passif'],
            'Discipline tactique': ['Respect du bloc', 'Ne pas sortir inutilement', 'Réactions collectives'],
          },
        },
      },
    },

    transition: {
      label: 'Transition Défensive',
      themes: {
        'Transition défensive': {
          principes: {
            'Réagir à la perte': ['Basculer immédiatement', 'Récupérer le ballon ou le porteur', 'Intensité collective'],
            'Reformer le bloc': ['Retraiter vite', 'Retrouver son organisation', 'Bloc soudé'],
            'Contre-attaques adverses': ['Couvrir les espaces en profondeur', 'Dernier défenseur vigilant'],
            'Repli organisé': ['Repli rapide', 'Communication', "Couvrir l'axe en priorité"],
          },
        },
      },
    },

    maitrise: {
      label: 'Maîtrise collective',
      themes: {
        'Maîtriser collectivement sans le ballon': {
          principes: {
            'Gérer le match': ['Lire le score et adapter', 'Gérer les temps forts adverses', 'Rester compact'],
            'Garder le contrôle': ["Ne pas s'emballer", 'Jouer simple en récupérant', 'Bloc organisé'],
            "S'adapter à l'adversaire": ['Ajustements tactiques', 'Lire le jeu adverse', 'Réponses collectives adaptées'],
          },
        },
        'Optimiser notre organisation': {
          principes: {
            'Efficacité défensive': ['Peu de situations concédées', 'Résultats / Classement', 'Attitudes irréprochables'],
            'Solidarité': ['Communication permanente', 'Entraide', 'Progression individuelle constatée'],
          },
        },
      },
    },

  },
}

export const getPhasesOffensives = () => Object.entries(METHODOLOGIE.offensif).map(([key, val]) => ({ key, label: val.label }))
export const getPhasesDefensives = () => Object.entries(METHODOLOGIE.defensif).map(([key, val]) => ({ key, label: val.label }))
export const getThemes = (camp, phase) => Object.keys(METHODOLOGIE[camp]?.[phase]?.themes || {})
export const getPrincipes = (camp, phase, theme) => Object.keys(METHODOLOGIE[camp]?.[phase]?.themes?.[theme]?.principes || {})
export const getSousPrincipes = (camp, phase, theme, principe) => METHODOLOGIE[camp]?.[phase]?.themes?.[theme]?.principes?.[principe] || []

// Retrouve la phase de jeu (clé) à laquelle appartient un thème déjà
// enregistré — nécessaire pour pré-remplir le sélecteur en cascade à
// l'édition d'une phase existante.
export const trouverPhaseDuTheme = (camp, theme) => {
  if (!theme) return ''
  for (const [phaseKey, phaseVal] of Object.entries(METHODOLOGIE[camp] || {})) {
    if (Object.keys(phaseVal.themes).includes(theme)) return phaseKey
  }
  return ''
}
