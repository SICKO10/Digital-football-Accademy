import { useColors } from '../../lib/theme'

// Interrupteur des cartes d'outils (Mes outils, Mon club). `occupe` : une
// action est en cours (bouton grisé) ; `desactive` : choix impossible.
export default function Interrupteur({ actif, libelle, onClick, occupe = false, desactive = false }) {
  const colors = useColors()
  const grise = occupe || desactive
  return (
    <button
      type="button" role="switch" aria-checked={actif} aria-label={libelle}
      disabled={grise} onClick={onClick}
      style={{
        flexShrink: 0, width: 46, height: 26, borderRadius: 999, border: 'none', padding: 3, cursor: desactive ? 'default' : 'pointer',
        background: actif ? colors.accent.brand : colors.border.strong, opacity: grise ? 0.6 : 1,
        display: 'flex', justifyContent: actif ? 'flex-end' : 'flex-start', transition: 'background .15s',
      }}
    >
      <span style={{ width: 20, height: 20, borderRadius: 999, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
    </button>
  )
}
