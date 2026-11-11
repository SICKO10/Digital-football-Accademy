import { colors, alpha } from '../../tokens'
import { MAX_EQUIPES } from '../../lib/simulateurTarifs'

// Éléments d'interface partagés par l'inscription composée (ComposerOffre) et la
// page publique des tarifs : carte d'outil à cocher et choix du nombre d'équipes.
// Page publique, toujours sombre : jetons de couleur fixes (pas useColors).
const police = 'Inter, sans-serif'

const Coche = ({ coche }) => (
  <span aria-hidden="true" style={{
    flexShrink: 0, width: 22, height: 22, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: coche ? colors.accent.green : 'transparent', border: coche ? 'none' : `1.5px solid ${colors.border.strong}`,
  }}>
    {coche && (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6l4.5-5" stroke={colors.black} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </span>
)


// Sans `onSelection`, la carte est une simple fiche (outil inclus, rien à cocher).
export function CarteChoix({ nom, promesse, coche, onSelection }) {
  const Balise = onSelection ? 'button' : 'div'
  const interactif = onSelection ? { type: 'button', role: 'checkbox', 'aria-checked': coche, onClick: onSelection } : {}
  return (
    <Balise {...interactif} style={{
      display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', boxSizing: 'border-box', width: '100%',
      padding: 14, borderRadius: 14, cursor: onSelection ? 'pointer' : 'default', fontFamily: police, color: colors.text.primary,
      background: coche ? colors.accent.green + alpha.subtle : colors.background.base,
      border: `${coche ? 2 : 1}px solid ${coche ? colors.accent.green : colors.border.default}`,
    }}>
      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{nom}</span>
        <Coche coche={coche} />
      </span>
      <span style={{ fontSize: 12, lineHeight: 1.5, color: colors.text.secondary }}>{promesse}</span>
    </Balise>
  )
}


const boutonPas = (desactive) => ({
  width: 44, height: 44, borderRadius: 12, fontSize: 20, fontWeight: 800, fontFamily: police,
  background: colors.background.raised, color: desactive ? colors.text.disabled : colors.text.primary,
  border: `1px solid ${colors.border.default}`, cursor: desactive ? 'not-allowed' : 'pointer',
})

export function PasEquipes({ valeur, onChange }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button type="button" aria-label="Une équipe de moins" disabled={valeur <= 1} onClick={() => onChange(Math.max(1, valeur - 1))} style={boutonPas(valeur <= 1)}>-</button>
      <span aria-live="polite" style={{ minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>{valeur}</span>
      <button type="button" aria-label="Une équipe de plus" disabled={valeur > MAX_EQUIPES} onClick={() => onChange(valeur + 1)} style={boutonPas(valeur > MAX_EQUIPES)}>+</button>
    </div>
  )
}
