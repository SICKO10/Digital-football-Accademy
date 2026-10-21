import { useColors } from '../../lib/theme'

// Bouton « Tutoriel » des pages Mon équipe, Séances, Compétition et du
// Tacticboard — relance le tutoriel même s'il a déjà été vu.
export default function BoutonTutoriel({ onClick, style }) {
  const colors = useColors()
  return (
    <button onClick={onClick} title="Voir le tutoriel"
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px 14px', minHeight: '40px', borderRadius: '10px', border: `1px solid ${colors.accent.blue}66`, background: colors.accent.blue + '14', color: colors.accent.blue, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', flexShrink: 0, ...style }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" /></svg>
      Tutoriel
    </button>
  )
}
