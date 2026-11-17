import { useColors } from '../../lib/theme'
import { styleCarte, couleurCraie, CLASSE_CLIQUABLE } from '../../lib/identite'
import { police, forme } from '../../tokens'
import { Icone } from '../identite'
import { TriangleAlert, CircleCheck, Info } from 'lucide-react'

// Briques communes aux écrans du chantier catégories (liste, création, mode, grille).

// Fil d'Ariane : étapes cliquables en texte secondaire souligné, page courante
// en texte plein. Jamais de couleur de club en petit texte (règle du bloc 1).
export function FilAriane({ etapes = [], courant }) {
  const colors = useColors()
  return (
    <nav aria-label="Fil d'Ariane" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 8px', fontFamily: police.texte, fontSize: '13px' }}>
      {etapes.map((e, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" className={CLASSE_CLIQUABLE} onClick={e.onClick}
            style={{ background: 'none', border: 'none', padding: '4px 0', color: colors.text.secondary, fontFamily: police.texte, fontSize: '13px', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '3px', cursor: 'pointer' }}>
            {e.label}
          </button>
          <span aria-hidden="true" style={{ color: colors.text.dim }}>/</span>
        </span>
      ))}
      <span aria-current="page" style={{ color: colors.text.primary, fontWeight: 600 }}>{courant}</span>
    </nav>
  )
}

const TONS = {
  erreur: { icone: TriangleAlert, couleur: c => c.accent.red, role: 'alert' },
  alerte: { icone: TriangleAlert, couleur: c => c.accent.orange, role: 'status' },
  succes: { icone: CircleCheck, couleur: c => c.accent.success, role: 'status' },
  info: { icone: Info, couleur: c => c.accent.info, role: 'status' },
}

// Message : carte à liseré de statut + icône + texte plein. Le sens est porté
// par l'icône et le texte, pas par la seule couleur.
export function Message({ ton = 'info', children, style }) {
  const colors = useColors()
  const t = TONS[ton] || TONS.info
  const couleur = t.couleur(colors)
  return (
    <div role={t.role}
      style={{ ...styleCarte(colors), display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px 12px 19px', boxShadow: `inset ${forme.lisere} 0 0 ${couleur}`, fontFamily: police.texte, fontSize: '14px', lineHeight: 1.5, color: colors.text.primary, ...style }}>
      <span style={{ color: couleur, display: 'inline-flex', marginTop: '1px' }}><Icone icone={t.icone} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>{children}</div>
    </div>
  )
}

// Petit rectangle d'étiquette (nom d'équipe, mode) : coins 4 px, texte plein.
export function Pastille({ children, style }) {
  const colors = useColors()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '28px', padding: '0 10px', borderRadius: forme.rayonPastille, background: colors.background.sunken, border: `1px solid ${couleurCraie(colors)}`, fontFamily: police.texte, fontSize: '13px', fontWeight: 600, color: colors.text.primary, ...style }}>
      {children}
    </span>
  )
}
