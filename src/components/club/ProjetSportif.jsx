import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { POLES } from '../../constants/poles'

const ONGLETS = [
  { key: 'categories', label: 'Catégories & Stats' },
  { key: 'principes', label: 'Principes de jeu' },
  { key: 'planification', label: 'Planification annuelle' },
  { key: 'regles', label: 'Règles du jeu' },
]

function PlaceholderAVenir({ couleur, texte }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed', borderColor: couleur + '44', borderRadius: 14 }}>
      <p style={{ color: couleur, fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>Bientôt disponible</p>
      <p style={{ color: 'inherit', opacity: 0.6, fontSize: 13, margin: 0 }}>{texte}</p>
    </div>
  )
}

function DetailPole({ pole, categories, onRetour }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('categories')
  const equipesDuPole = categories.filter(c => {
    const base = c.nom?.endsWith('F') ? c.nom.slice(0, -1) : c.nom
    return pole.categories.includes(base)
  })

  return (
    <div>
      <button onClick={onRetour} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
        ← Projet Sportif
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: pole.couleur, flexShrink: 0 }} />
        <div>
          <h2 style={{ color: colors.text.primary, fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>{pole.label}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pole.categories.map(cat => (
              <span key={cat} style={{ background: pole.couleur + '22', color: pole.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{cat}</span>
            ))}
          </div>
        </div>
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

      {onglet === 'categories' && (
        equipesDuPole.length === 0 ? (
          <PlaceholderAVenir couleur={pole.couleur} texte="Aucune équipe créée dans ce pôle pour l'instant. Ajoute une catégorie depuis Sportif → Catégories." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipesDuPole.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: 14 }}>
                  {labelCategorie(c.nom)}{c.equipe ? ` ${c.equipe}` : ''}
                </span>
                <span style={{ color: colors.text.faint, fontSize: 12 }}>
                  {c.educateur ? `${c.educateur.prenom || ''} ${c.educateur.nom || ''}`.trim() : 'Aucun éducateur affecté'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
      {onglet === 'principes' && <PlaceholderAVenir couleur={pole.couleur} texte="Principes de jeu du pôle — à venir." />}
      {onglet === 'planification' && <PlaceholderAVenir couleur={pole.couleur} texte="Planification annuelle du pôle — à venir." />}
      {onglet === 'regles' && <PlaceholderAVenir couleur={pole.couleur} texte="Règles du jeu du pôle — à venir." />}
    </div>
  )
}

// Structure et navigation des 4 pôles du club (École de Foot, Préformation,
// Formation, Pôle Senior). Les 4 sous-onglets de chaque pôle sont des
// placeholders pour l'instant, à remplir étape par étape — seule "Catégories
// & Stats" affiche déjà les vraies équipes du club (club_categories), le
// reste n'a pas encore de modèle de données.
export default function ProjetSportif({ categories = [] }) {
  const colors = useColors()
  const [poleActifKey, setPoleActifKey] = useState(null)

  if (poleActifKey) {
    return <DetailPole pole={{ key: poleActifKey, ...POLES[poleActifKey] }} categories={categories} onRetour={() => setPoleActifKey(null)} />
  }

  return (
    <div>
      <p style={{ color: colors.text.faint, fontSize: 13, margin: '0 0 20px' }}>
        Organisation, objectifs et principes de jeu par pôle.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {Object.entries(POLES).map(([key, pole]) => {
          const nbEquipes = categories.filter(c => {
            const base = c.nom?.endsWith('F') ? c.nom.slice(0, -1) : c.nom
            return pole.categories.includes(base)
          }).length
          return (
            <div key={key} onClick={() => setPoleActifKey(key)}
              style={{ background: colors.background.surface, border: `1px solid ${pole.couleur}33`, borderRadius: 16, padding: 22, cursor: 'pointer' }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: pole.couleur, display: 'inline-block', marginBottom: 12 }} />
              <h3 style={{ color: colors.text.primary, fontSize: 17, fontWeight: 900, margin: '0 0 8px' }}>{pole.label}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {pole.categories.map(cat => (
                  <span key={cat} style={{ background: pole.couleur + alpha.subtle, color: pole.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{cat}</span>
                ))}
              </div>
              <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>
                {nbEquipes} équipe{nbEquipes !== 1 ? 's' : ''} du club
              </p>
              <div style={{ marginTop: 14, color: pole.couleur, fontSize: 12, fontWeight: 700 }}>
                Accéder →
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
