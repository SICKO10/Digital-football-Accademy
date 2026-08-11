import { colors } from '../tokens'

// Bouton CTA au format st.btnSolid() (cf. DashboardJoueur.jsx) — dupliqué ici
// en dur plutôt qu'importé, car `st` y est défini au niveau module et n'est
// pas exporté (et ce composant doit rester réutilisable par d'autres pages
// sans dépendre d'un fichier dashboard précis).
const ctaStyle = {
  background: colors.accent.green,
  color: colors.black,
  border: 'none',
  padding: '10px 20px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}

// État vide générique (liste vide, fonctionnalité verrouillée, aucun résultat...).
// icon accepte soit un emoji (string — rendu à 40px, unifié), soit un composant
// icône déjà existant (ex: <IconSearch size={40} />) — dans ce second cas la
// taille reste celle passée par l'appelant, ce composant ne peut pas forcer la
// taille d'un SVG qu'il ne contrôle pas.
export default function EmptyState({ icon, title, subtitle, cta, dashed = false, compact = false, children }) {
  return (
    <div style={{
      background: compact ? 'transparent' : colors.background.surface,
      border: compact ? 'none' : `1px ${dashed ? 'dashed' : 'solid'} ${dashed ? '#222' : colors.border.subtle}`,
      borderRadius: compact ? 0 : '16px',
      padding: compact ? '24px 0' : '56px 24px',
      textAlign: 'center',
    }}>
      {icon && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '12px',
          color: colors.icon.muted,
          fontSize: typeof icon === 'string' ? '40px' : undefined,
          lineHeight: 1,
        }}>
          {icon}
        </div>
      )}
      <p style={{
        margin: 0,
        fontWeight: subtitle ? 700 : 400,
        fontSize: compact ? '13px' : '14px',
        color: compact ? colors.text.disabled : colors.text.primary,
      }}>
        {title}
      </p>
      {subtitle && (
        <p style={{ margin: '6px 0 0', fontSize: '13px', color: colors.text.faint, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
      {cta && (
        <button onClick={cta.onClick} style={{ ...ctaStyle, marginTop: '16px' }}>
          {cta.label}
        </button>
      )}
      {/* Échappatoire non listée dans l'API demandée, ajoutée pour un seul cas
          réel (DashboardJoueur.jsx, formulaire "rejoindre une équipe" : input
          contrôlé + bouton dépendant d'un state local que ce composant ne
          peut pas posséder) plutôt que de dupliquer tout le composant pour ça. */}
      {children && <div style={{ marginTop: '16px', textAlign: 'left' }}>{children}</div>}
    </div>
  )
}
