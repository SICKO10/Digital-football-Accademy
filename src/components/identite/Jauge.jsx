import { useColors } from '../../lib/theme'
import { couleursJauge, styleEtiquette } from '../../lib/identite'
import { police } from '../../tokens'

// Jauge type possession : barre fine à 2 ou 3 segments séparés d'un trait de 2 px.
// segments : [{ libelle, valeur, couleur? }]. Couleurs par défaut : club contre
// neutre (2 segments), victoires / nuls / défaites (3 segments).
// `format` met en forme la valeur affichée dans la légende (ex. v => `${v} €`).
// `pourcentages` : la légende affiche la part de chaque segment au lieu de la valeur.
export default function Jauge({ segments, libelle, hauteur = 6, legende = true, pourcentages = false, format = v => v, style }) {
  const colors = useColors()
  const defauts = couleursJauge(colors, segments.length)
  const total = segments.reduce((s, x) => s + (Number(x.valeur) || 0), 0)
  const part = v => (total > 0 ? Math.round(((Number(v) || 0) / total) * 100) : 0)
  const texte = s => (pourcentages ? `${part(s.valeur)}\u00A0%` : format(s.valeur))
  const resume = [libelle, ...segments.map(s => `${s.libelle} ${texte(s)}`)].filter(Boolean).join(', ')

  return (
    <div style={{ minWidth: 0, ...style }}>
      {libelle && <div style={{ ...styleEtiquette(colors), marginBottom: '8px' }}>{libelle}</div>}
      <div role="img" aria-label={resume}
        style={{ display: 'flex', gap: '2px', height: `${hauteur}px`, width: '100%', background: total > 0 ? 'transparent' : colors.border.strong, borderRadius: '1px', overflow: 'hidden' }}>
        {total > 0 && segments.map((s, i) => (Number(s.valeur) > 0 ? (
          <span key={s.libelle} style={{ flex: `${Number(s.valeur)} 1 0`, minWidth: '2px', background: s.couleur || defauts[i], borderRadius: '1px' }} />
        ) : null))}
      </div>
      {legende && (
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          {segments.map((s, i) => (
            <span key={s.libelle} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '1px', background: s.couleur || defauts[i], alignSelf: 'center', flexShrink: 0 }} />
              {s.libelle}
              <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: '16px', color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{texte(s)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
