import { useColors } from '../../lib/theme'

// Barre de sous-onglets d'une entrée regroupée du menu club (Finance, Organisation…),
// même rendu que celle du dashboard éducateur. Un seul sous-onglet accessible : pas de barre.
export default function SousOngletsGroupe({ items, actif, onChoisir }) {
  const colors = useColors()
  if (items.length < 2) return null
  return (
    <div role="tablist" style={{ display: 'flex', gap: 0, background: colors.background.sunken, borderRadius: 12, padding: 4, maxWidth: '100%', width: 'fit-content', marginBottom: 24, border: `1px solid ${colors.border.faint}`, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {items.map(it => {
        const estActif = actif === it.id
        return (
          <button key={it.id} role="tab" aria-selected={estActif} onClick={() => onChoisir(it.id)}
            style={{
              padding: '9px 22px', borderRadius: 9, border: 'none', cursor: 'pointer',
              background: estActif ? colors.text.primary : 'transparent',
              color: estActif ? colors.background.base : colors.text.faint,
              fontWeight: estActif ? 700 : 500, fontSize: 14, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}>
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
