import { useCoachTheme } from '../../pages/coach/useCoachTheme'

// Placeholder honnête pour les sections sans donnée réelle en base (Revenus,
// Parrainage FreePlay) — pas de graphique/chiffres inventés tant que la
// fonctionnalité n'existe pas côté produit.
export default function ComingSoon({ icon, title, description }) {
  const { c, fonts } = useCoachTheme()
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: '10px', padding: '3rem', textAlign: 'center' }}>
      <p style={{ fontSize: '48px', marginBottom: '1rem' }}>{icon}</p>
      <p style={{ fontFamily: fonts.display, color: c.text, fontWeight: 700, fontSize: '17px', margin: '0 0 8px' }}>{title}</p>
      <p style={{ color: c.textMuted, fontSize: '13px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>{description}</p>
    </div>
  )
}
