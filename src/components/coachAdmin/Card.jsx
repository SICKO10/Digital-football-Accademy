import { colors } from '../../tokens'

// Conteneur "surface" standard — bordure de couleur optionnelle (ex. orange
// pour signaler un élément en attente), sinon bordure neutre par défaut.
export default function Card({ children, accent, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: colors.background.surface,
      border: `1px solid ${accent ? accent + '30' : '#222'}`,
      borderRadius: '14px', padding: '1.25rem',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>
      {children}
    </div>
  )
}
