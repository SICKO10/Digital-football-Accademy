import { couleurTerrain } from '../../lib/tournoi'

// Pastille « T1 », « T2 »… dans la couleur du terrain (cf. couleurTerrain) :
// fond plein et texte foncé, lisible en thème clair comme sombre. Utilisée
// par le planning du club (TournoiOrganise) et la page publique du tournoi.
export function PastilleTerrain({ numero, taille = 'normale' }) {
  const petite = taille === 'petite'
  return (
    <span
      title={`Terrain ${numero}`}
      style={{
        background: couleurTerrain(numero), color: '#0a0a0a', borderRadius: '8px',
        padding: petite ? '2px 7px' : '4px 10px', fontSize: petite ? '11px' : '12px', fontWeight: 800,
        letterSpacing: '0.3px', whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'center',
        minWidth: petite ? undefined : '38px',
      }}
    >
      T{numero}
    </span>
  )
}

// Légende du code couleur, affichée au-dessus d'un planning.
export function LegendeTerrains({ numeros, colors }) {
  if (!numeros || numeros.length < 2) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: colors.text.faint }}>Terrains</span>
      {numeros.map(n => (
        <span key={n} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.text.secondary }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: couleurTerrain(n) }} />
          Terrain {n}
        </span>
      ))}
    </div>
  )
}
