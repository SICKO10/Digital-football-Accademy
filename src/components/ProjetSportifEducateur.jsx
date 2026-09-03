import { useState } from 'react'
import { useColors } from '../lib/theme'
import { getPoleDeCategorie } from '../constants/poles'
import PlanificationAnnuelle from './club/PlanificationAnnuelle'
import { SectionPrincipes, SectionRegles } from './club/ProjetSportif'

const ONGLETS = [
  { key: 'planification', label: 'Planification annuelle' },
  { key: 'principes', label: 'Principes de jeu' },
  { key: 'regles', label: 'Règles du jeu' },
]

// Vue lecture seule du Projet Sportif du club, pour la catégorie gérée par
// l'éducateur — réutilise les mêmes composants que le dashboard club
// (PlanificationAnnuelle, SectionPrincipes, SectionRegles), simplement avec
// readOnly=true (masque déjà tous les boutons d'édition dans ces 3 composants).
export default function ProjetSportifEducateur({ categorie, clubId }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('planification')
  const pole = categorie ? getPoleDeCategorie(categorie) : null

  if (!categorie) {
    return <div style={{ padding: 40, color: colors.text.faint, textAlign: 'center' }}>Déclare d'abord ta catégorie dans "Mon équipe" pour voir le Projet Sportif.</div>
  }
  if (!pole || !clubId) {
    return <div style={{ padding: 40, color: colors.text.faint, textAlign: 'center' }}>Aucun pôle trouvé pour cette catégorie.</div>
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: pole.couleur, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{pole.label}</div>
        <h1 style={{ color: colors.text.primary, fontSize: 24, fontWeight: 900, margin: '0 0 4px' }}>Projet Sportif</h1>
        <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Catégorie {categorie} · Lecture seule</p>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 24, overflowX: 'auto' }}>
        {ONGLETS.map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
              color: onglet === o.key ? pole.couleur : colors.text.faint,
              borderBottom: onglet === o.key ? `2px solid ${pole.couleur}` : '2px solid transparent',
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'planification' && <PlanificationAnnuelle categorie={categorie} clubId={clubId} pole={pole} readOnly />}
      {onglet === 'principes' && <SectionPrincipes pole={pole} clubId={clubId} readOnly />}
      {onglet === 'regles' && <SectionRegles pole={pole} clubId={clubId} readOnly />}
    </div>
  )
}
