import { useColors } from '../../lib/theme'
import { coqueVars } from '../../lib/menuLateral'

// Barre de sous-onglets d'une entrée regroupée du menu club (Finance, Organisation…),
// même rendu que celle du dashboard éducateur. Un seul sous-onglet accessible : pas de barre.
export default function SousOngletsGroupe({ items, actif, onChoisir }) {
  const colors = useColors()
  if (items.length < 2) return null
  return (
    <div role="tablist" className="df-onglets" style={coqueVars(colors, colors.accent.green)}>
      {items.map(it => (
        <button key={it.id} role="tab" aria-selected={actif === it.id} className="df-onglet" onClick={() => onChoisir(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  )
}
