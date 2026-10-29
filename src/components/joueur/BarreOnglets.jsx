import { useColors } from '../../lib/theme'
import { fontSize, spacing } from '../../tokens'

// Barre d'onglets du bas, sur téléphone uniquement — cinq destinations
// atteignables au pouce, au lieu d'ouvrir le menu à chaque changement d'écran.
// Le cinquième bouton, « Plus », ouvre le tiroir latéral existant : tout le
// reste de la navigation continue d'y vivre, rien n'est retiré.
//
// Hauteur 56 px plus la zone sûre du bas (barre d'accueil des iPhone récents).
// Le parent doit prévoir autant de marge basse dans son contenu, sinon le
// dernier bouton d'une page passe sous la barre.
//
// z-index 30 : au-dessus du contenu, mais sous le voile (40) et le tiroir (50),
// pour que la barre passe derrière le menu quand il est ouvert.

const IcoPlus = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
  </svg>
)

// `decalageBas` remonte la barre quand un autre élément occupe déjà le bas de
// l'écran — c'est le cas de la bannière sponsor (56 px sur téléphone), affichée
// uniquement sur l'écran d'accueil. Sans ce décalage, les deux se superposent :
// elles ont la même position et le même niveau d'empilement.
export default function BarreOnglets({ items = [], actif, onChoisir, onPlus, libellePlus = 'Plus', decalageBas = 0 }) {
  const colors = useColors()

  const boutons = [
    ...items.slice(0, 4).map(it => ({ ...it, estPlus: false })),
    { id: '__plus', label: libellePlus, icon: <IcoPlus />, estPlus: true },
  ]

  return (
    <nav
      style={{
        position: 'fixed', left: 0, right: 0, zIndex: 30,
        bottom: decalageBas ? `calc(${decalageBas}px + env(safe-area-inset-bottom, 0px))` : 0,
        display: 'grid', gridTemplateColumns: `repeat(${boutons.length}, 1fr)`,
        background: colors.background.surface,
        borderTop: `1px solid ${colors.border.subtle}`,
        paddingBottom: decalageBas ? 0 : 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {boutons.map(b => {
        const estActif = !b.estPlus && actif === b.id
        return (
          <button
            key={b.id}
            onClick={() => (b.estPlus ? onPlus?.() : onChoisir?.(b.id))}
            aria-current={estActif ? 'page' : undefined}
            style={{
              height: '56px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              color: estActif ? colors.accent.green : colors.text.faint,
              fontFamily: 'Inter, sans-serif', minWidth: 0,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '22px' }}>
              {b.icon}
            </span>
            <span
              style={{
                fontSize: fontSize.sm, fontWeight: estActif ? 700 : 600,
                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                paddingLeft: '2px', paddingRight: '2px',
              }}
            >
              {b.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
