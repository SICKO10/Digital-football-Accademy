import { useColors } from '../../lib/theme'
import { ICONES, stylesMonClub } from './uiMonClub'

// Pièces visuelles partagées par les étapes de « Mon club ».

export function Icone({ d, size = 16, trait = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={trait} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  )
}

// En-tête d'une étape : icône dans un rond à la couleur du club, titre, explication.
export function EnteteEtape({ icone, titre, texte, children }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
      <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: s.marque + '24', color: s.marque }}>
        <Icone d={icone} size={24} />
      </span>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px', color: colors.text.primary }}>{titre}</h2>
        <p style={{ margin: '6px 0 0', maxWidth: 680, fontSize: 14, lineHeight: 1.6, color: colors.text.faint }}>{texte}</p>
      </div>
      {children}
    </div>
  )
}

// Carte d'un outil avec son interrupteur (étapes Outils et Dashboard des éducateurs).
// Éteinte, elle s'estompe et porte une pastille : l'état se lit sans la couleur seule.
export function CarteReglage({ nom, description, pied, actif, badge, action, extra = null }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  return (
    <div className="mc-carte" style={{
      position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 18px 16px', borderRadius: 18,
      background: colors.background.surface, border: `1px solid ${actif ? s.marque + '66' : colors.border.subtle}`,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 8px 22px rgba(0,0,0,0.04)', opacity: actif ? 1 : 0.74,
    }}>
      <span aria-hidden="true" style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 3, borderRadius: '0 0 4px 4px', background: actif ? s.marque : 'transparent' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.2px', color: colors.text.primary }}>{nom}</h3>
        {action}
      </div>
      {badge && (
        <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: colors.text.primary, background: badge.couleur + '2a', border: `1px solid ${badge.couleur}66` }}>{badge.texte}</span>
      )}
      <p style={{ margin: 0, flex: 1, fontSize: 13, lineHeight: 1.55, color: colors.text.secondary }}>{description}</p>
      {extra}
      {pied && (
        <p style={{ margin: 0, paddingTop: 10, borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: colors.text.faint }}>
          <Icone d={ICONES.menu} size={13} />{pied}
        </p>
      )}
    </div>
  )
}

// Petit encadré d'information (icône + texte).
export function Encart({ children }) {
  const colors = useColors()
  return (
    <div role="note" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 14, background: colors.accent.blue + '14', border: `1px solid ${colors.accent.blue}33`, marginBottom: 18 }}>
      <span style={{ color: colors.accent.blue, display: 'inline-flex', marginTop: 1 }}><Icone d={ICONES.info} size={18} /></span>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: colors.text.secondary }}>{children}</div>
    </div>
  )
}
