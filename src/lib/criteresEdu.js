// Grille d'évaluation d'un éducateur, partagée par les dashboards éducateur, club et joueur.
// Dans son propre fichier pour que le dashboard club ou joueur n'embarque pas tout le dashboard éducateur.
import { colors } from '../tokens'

export const CRITERES_EDU = [
  { key: 'leadership', label: '👥 Leadership & Management', color: '#f59e0b', criteres: [
    { key: 'gestion_groupe', label: 'Gestion du groupe' },
    { key: 'discipline', label: 'Discipline' },
    { key: 'cohesion', label: 'Création de cohésion' },
    { key: 'gestion_conflits', label: 'Gestion des conflits' },
  ]},
  { key: 'pedagogie', label: '🎓 Pédagogie', color: colors.accent.purpleLight, criteres: [
    { key: 'qualite_explications', label: 'Qualité des explications' },
    { key: 'capacite_corriger', label: 'Capacité à corriger' },
    { key: 'individualisation', label: 'Individualisation' },
    { key: 'adaptation_age', label: 'Adaptation à l\'âge' },
  ]},
  { key: 'football', label: '⚽ Compétences football', color: colors.accent.green, criteres: [
    { key: 'animation_seances', label: 'Animation des séances' },
    { key: 'competence_tactique', label: 'Compétence tactique' },
    { key: 'coaching_match', label: 'Coaching en match' },
    { key: 'planification', label: 'Planification' },
  ]},
  { key: 'developpement', label: '📈 Développement joueurs', color: '#34d399', criteres: [
    { key: 'progression_technique', label: 'Progression technique' },
    { key: 'progression_tactique', label: 'Progression tactique' },
    { key: 'progression_physique', label: 'Progression physique' },
    { key: 'progression_mentale', label: 'Progression mentale' },
  ]},
  { key: 'professionnalisme', label: '🤝 Professionnalisme', color: colors.accent.blue, criteres: [
    { key: 'ponctualite', label: 'Ponctualité' },
    { key: 'organisation', label: 'Organisation' },
    { key: 'communication_club', label: 'Communication avec le club' },
    { key: 'investissement', label: 'Investissement' },
  ]},
  { key: 'performance', label: '🏅 Performance', color: '#f87171', criteres: [
    { key: 'resultats', label: 'Résultats' },
    { key: 'respect_projet_jeu', label: 'Respect du projet de jeu' },
    { key: 'valorisation_joueurs', label: 'Valorisation des joueurs' },
    { key: 'objectifs_atteints', label: 'Objectifs atteints' },
  ]},
]
