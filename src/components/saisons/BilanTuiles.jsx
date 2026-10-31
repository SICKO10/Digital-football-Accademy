import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { radius } from '../../tokens'

// Les sept chiffres d'un bilan (une équipe, ou plusieurs additionnées).
// `bilan` : { matchs, victoires, nuls, defaites, butsMarquesParMatch, butsEncaissesParMatch, presence } (null = n.d.).
export default function BilanTuiles({ bilan, avecRpe = false }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const b = bilan
  const val = (v, suffixe = '') => (v === null || v === undefined ? <span style={{ color: colors.text.faint }}>n.d.</span> : `${v}${suffixe}`)
  const tuile = (label, contenu, couleur) => (
    <div key={label} style={{ minWidth: 0, background: colors.background.base, borderRadius: radius.md, padding: '10px 12px' }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: couleur || colors.text.primary }}>{contenu}</p>
      <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.text.faint }}>{label}</p>
    </div>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
      {tuile('Matchs joués', b.matchs)}
      {tuile('Victoires', val(b.victoires, ' %'), colors.accent.green)}
      {tuile('Nuls', val(b.nuls, ' %'), colors.accent.amber)}
      {tuile('Défaites', val(b.defaites, ' %'), colors.accent.red)}
      {tuile('Buts marqués / match', val(b.butsMarquesParMatch))}
      {tuile('Buts encaissés / match', val(b.butsEncaissesParMatch))}
      {tuile('Présence entraînement', val(b.presence, ' %'))}
      {avecRpe && tuile('RPE moyen', b.rpeMoyen === null ? val(null) : `${b.rpeMoyen}/10`)}
    </div>
  )
}
