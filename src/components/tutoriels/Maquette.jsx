import { useColors } from '../../lib/theme'

// Briques des maquettes illustrant les tutoriels (cf. TutorielsEducateur,
// TutorielsClub) : mêmes libellés que l'app, suivent le thème clair/sombre.

export function Bouton({ children, plein, couleur, actif }) {
  const colors = useColors()
  const c = couleur || colors.accent.green
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
      background: plein ? c : 'transparent', color: plein ? colors.black : colors.text.secondary,
      border: plein ? 'none' : `1px solid ${colors.border.default}`,
      boxShadow: actif ? `0 0 0 3px ${c}55, 0 0 0 6px ${c}22` : 'none',
    }}>{children}</span>
  )
}

export function Champ({ label, valeur, large }) {
  const colors = useColors()
  return (
    <div style={{ gridColumn: large ? '1 / -1' : undefined, minWidth: 0 }}>
      <p style={{ margin: '0 0 3px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.text.faint }}>{label}</p>
      <div style={{ padding: '6px 9px', borderRadius: '7px', border: `1px solid ${colors.border.default}`, background: colors.background.surface, fontSize: '12px', color: valeur ? colors.text.primary : colors.text.disabled, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{valeur || '—'}</div>
    </div>
  )
}

export function Carte({ titre, texte, couleur, icone }) {
  const colors = useColors()
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '12px', borderRadius: '12px', background: colors.background.surface, border: `1px solid ${couleur}55` }}>
      <span style={{ width: '30px', height: '30px', borderRadius: '9px', background: couleur + '22', color: couleur, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>{icone}</span>
      <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: colors.text.primary }}>{titre}</p>
      <p style={{ margin: '3px 0 0', fontSize: '11px', lineHeight: 1.4, color: colors.text.faint }}>{texte}</p>
    </div>
  )
}

export function Fleche() {
  const colors = useColors()
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.text.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
}

// Rangée d'onglets / pastilles, l'onglet actif mis en avant.
export function Onglets({ items, actif, couleur }) {
  const colors = useColors()
  const c = couleur || colors.accent.blue
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {items.map(it => (
        <span key={it} style={{
          padding: '6px 12px', borderRadius: '20px', fontSize: '12px', whiteSpace: 'nowrap',
          border: `1px solid ${it === actif ? c : colors.border.default}`,
          background: it === actif ? c + '1f' : 'transparent',
          color: it === actif ? c : colors.text.faint, fontWeight: it === actif ? 700 : 500,
        }}>{it}</span>
      ))}
    </div>
  )
}

// Statut coloré (point + libellé), ex. « Invitation envoyée ».
export function Statut({ couleur, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: couleur, background: couleur + '1a', padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleur }} />{children}
    </span>
  )
}

// Formulaire simplifié : une grille de champs (label, valeur), un bouton de
// validation en option.
export function Formulaire({ champs, bouton, colonnes = 2 }) {
  return (
    <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))`, gap: '8px' }}>
        {champs.map(([label, valeur, large]) => <Champ key={label} label={label} valeur={valeur} large={large} />)}
      </div>
      {bouton && <div><Bouton plein actif>{bouton}</Bouton></div>}
    </div>
  )
}
