import { useState } from 'react'
import { useColors } from '../lib/theme'
import { coqueVars } from '../lib/menuLateral'
import { TitreEcran } from './identite'
import { getPoleDeCategorie } from '../constants/poles'
import PlanificationAnnuelle from './club/PlanificationAnnuelle'
import PlanDeJeu from './club/PlanDeJeu'
import { SectionRegles } from './club/ProjetSportif'

const ONGLETS = [
  { key: 'planification', label: 'Planification annuelle' },
  { key: 'plan_de_jeu', label: 'Plan de jeu' },
  { key: 'regles', label: 'Règles du jeu' },
]

// Vue du Projet Sportif du club, pour la catégorie gérée par l'éducateur —
// réutilise les mêmes composants que le dashboard club (PlanificationAnnuelle,
// PlanDeJeu, SectionRegles). Lecture seule par défaut
// (readOnlyProjet/readOnlyPlanification = true), sauf si le club a autorisé
// l'édition (réglage global ou override par éducateur, cf. DashboardClub.jsx
// "Permissions éducateurs" + menu ⋯ d'un éducateur "Droits Projet Sportif").
// Exception permanente : accrocher une séance réelle à une semaine du plan
// reste possible pour l'éducateur (peutGererSeances) même en lecture seule —
// c'est lui qui crée ces séances, le club ne fait qu'écrire les thèmes/
// objectifs de la semaine.
export default function ProjetSportifEducateur({ categorie, clubId, mesEquipes = [], equipeActiveId = null, readOnlyProjet = true, readOnlyPlanification = true }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('planification')
  const pole = categorie ? getPoleDeCategorie(categorie) : null

  // Ses équipes de ce pôle (l'équipe active en premier) : le plan de jeu y accueille ses ajouts
  const equipesDuPole = pole
    ? mesEquipes.filter(e => getPoleDeCategorie(e.nom)?.key === pole.key).sort((a, b) => (b.id === equipeActiveId) - (a.id === equipeActiveId))
    : []

  if (!categorie) {
    return <div style={{ padding: 40, color: colors.text.secondary, textAlign: 'center' }}>Déclare d'abord ta catégorie dans "Mon équipe" pour voir le Projet Sportif.</div>
  }
  if (!pole || !clubId) {
    return <div style={{ padding: 40, color: colors.text.secondary, textAlign: 'center' }}>Aucun pôle trouvé pour cette catégorie.</div>
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <TitreEcran surTitre={pole.label} titre="Projet Sportif" sousTitre={`Catégorie ${categorie} · Plan du club en lecture seule, tes ajouts pour ton équipe`} />

      <div role="tablist" aria-label="Rubriques du projet sportif" className="df-onglets" style={{ ...coqueVars(colors, colors.accent.blue), marginBottom: 24 }}>
        {ONGLETS.map(o => (
          <button key={o.key} type="button" role="tab" aria-selected={onglet === o.key} className="df-onglet" onClick={() => setOnglet(o.key)}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'planification' && <PlanificationAnnuelle categorie={categorie} clubId={clubId} pole={pole} readOnly={readOnlyPlanification} peutGererSeances />}
      {onglet === 'plan_de_jeu' && <PlanDeJeu pole={pole} clubId={clubId} readOnly={readOnlyProjet} equipes={equipesDuPole} peutAjouter={!readOnlyProjet} />}
      {onglet === 'regles' && <SectionRegles pole={pole} clubId={clubId} readOnly={readOnlyProjet} />}
    </div>
  )
}
