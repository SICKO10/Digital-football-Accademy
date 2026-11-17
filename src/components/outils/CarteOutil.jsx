import { useColors } from '../../lib/theme'
import { styleCarte } from '../../lib/identite'
import { forme, police } from '../../tokens'

// Carte d'un outil sur la page « Mes outils ». Avec `onSelection`, toute la
// carte devient une case à cocher (boutique de l'éducateur). `badge` :
// { texte, couleur } ; `pied` : prix ou mention ; `action` : bouton ou
// interrupteur à droite du titre (choix du club) ; `children` : bas de carte.
export default function CarteOutil({ nom, promesse, badge, pied, action, children, coche = false, onSelection, desactive = false }) {
  const colors = useColors()
  const selectionnable = !!onSelection
  const style = {
    display: 'flex', flexDirection: 'column', gap: 10, width: '100%', textAlign: 'left', boxSizing: 'border-box',
    ...styleCarte(colors), padding: '16px 16px 16px 19px', minHeight: 150, fontFamily: police.texte,
    background: coche ? colors.accent.brand + '14' : colors.background.surface,
    border: `1px solid ${coche ? colors.accent.brand : colors.border.strong}`, boxShadow: coche ? `inset ${forme.lisere} 0 0 ${colors.accent.brand}` : 'none',
    color: colors.text.primary, cursor: selectionnable && !desactive ? 'pointer' : 'default',
    opacity: desactive && !coche ? 0.55 : 1, transition: 'border-color .15s, background .15s',
  }
  const contenu = (
    <>
      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: police.titre, fontSize: 18, fontWeight: 700, lineHeight: 1.2, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{nom}</span>
        {selectionnable && (
          <span aria-hidden="true" style={{
            flexShrink: 0, width: 22, height: 22, borderRadius: forme.rayonPastille, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: coche ? colors.accent.brand : 'transparent', border: coche ? 'none' : `1.5px solid ${colors.border.strong}`,
          }}>
            {coche && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6.2 5 8.6l4.5-5" stroke={colors.accent.onBrand} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        )}
        {action}
      </span>
      {badge && (
        <span style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: colors.text.primary, background: badge.couleur + '1f', border: `1px solid ${badge.couleur}66`, borderRadius: forme.rayonPastille, padding: '3px 8px' }}>
          {badge.texte}
        </span>
      )}
      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: colors.text.secondary }}>{promesse}</span>
      {pied && <span style={{ fontSize: 13, fontWeight: 600, color: colors.text.secondary }}>{pied}</span>}
      {children}
    </>
  )
  if (!selectionnable) return <div style={style}>{contenu}</div>
  return (
    <button type="button" role="checkbox" aria-checked={coche} disabled={desactive} onClick={onSelection} style={style}>
      {contenu}
    </button>
  )
}
