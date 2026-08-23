import { colors } from '../../tokens'

// Placeholder honnête pour les sections sans donnée réelle en base (Revenus,
// Parrainage FreePlay) — pas de graphique/chiffres inventés tant que la
// fonctionnalité n'existe pas côté produit.
export default function ComingSoon({ icon, title, description }) {
  return (
    <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
      <p style={{ fontSize: '48px', marginBottom: '1rem' }}>{icon}</p>
      <p style={{ color: colors.text.primary, fontWeight: 700, fontSize: '16px', margin: '0 0 8px' }}>{title}</p>
      <p style={{ color: colors.text.dim, fontSize: '13px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>{description}</p>
    </div>
  )
}
