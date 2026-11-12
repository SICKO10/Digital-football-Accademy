import { useMemo, useState } from 'react'
import { useColors } from '../../lib/theme'
import { apercuMenuEducateur } from '../../lib/menuEducateur'
import { Icone } from './ui'
import { ICONES, stylesMonClub } from './uiMonClub'

// Aperçu en lecture seule du menu d'un éducateur affilié, calculé avec les
// réglages en cours du club (même règle que l'appli de l'éducateur). Aucune
// connexion à la place de l'éducateur, aucune de ses données lue. Les entrées
// retirées sont barrées et portent la mention « Retiré », pas seulement une
// couleur. `educateurs` : [{ id, nom }]. Sans `onFermer`, pas de bouton Fermer
// (aperçu intégré à un écran de confirmation).
export default function ApercuMenuEducateur({ mode, lignes, educateurs, couleur, onFermer }) {
  const colors = useColors()
  const [choix, setChoix] = useState('type')
  const educateurId = choix === 'type' ? null : choix
  const sections = useMemo(() => apercuMenuEducateur(mode, lignes, educateurId), [mode, lignes, educateurId])
  const nbRetires = sections.reduce((n, s) => n + s.items.filter(i => i.retire).length, 0)
  const accent = couleur || colors.accent.brand

  const st = stylesMonClub(colors)
  const pastille = (actif) => ({ ...st.pastille(actif), padding: '7px 14px', minHeight: 36 })

  return (
    <section aria-label="Aperçu du menu d'un éducateur" style={{ margin: '0 0 24px', padding: 22, borderRadius: 20, border: `1px solid ${colors.border.default}`, background: colors.background.surface, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 800, color: colors.text.primary }}>
          <span style={{ display: 'inline-flex', color: accent }}><Icone d={ICONES.oeil} size={20} /></span>Voir comme un éducateur
        </h3>
        {onFermer && <button type="button" onClick={onFermer} className="mc-btn" style={{ ...st.bouton(false), minHeight: 34, padding: '6px 14px' }}>Fermer</button>}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.55, color: colors.text.faint }}>
        Aperçu du menu avec vos réglages actuels, en lecture seule. Chez un éducateur, un outil qu'il paie lui-même reste affiché, et certaines entrées (Stages, Mes outils) dépendent de son compte.
      </p>
      <div role="tablist" aria-label="Éducateur à prévisualiser" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0 14px' }}>
        <button type="button" role="tab" aria-selected={choix === 'type'} onClick={() => setChoix('type')} className="mc-btn" style={pastille(choix === 'type')}>Éducateur type</button>
        {educateurs.map(e => (
          <button key={e.id} type="button" role="tab" aria-selected={choix === e.id} onClick={() => setChoix(e.id)} className="mc-btn" style={pastille(choix === e.id)}>{e.nom}</button>
        ))}
      </div>
      <p aria-live="polite" style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: colors.text.primary }}>
        {nbRetires
          ? `${nbRetires} entrée${nbRetires > 1 ? 's' : ''} retirée${nbRetires > 1 ? 's' : ''} du menu par votre club.`
          : 'Aucun changement : ce menu est celui que voit tout éducateur sans réglage.'}
      </p>
      <div style={{ maxWidth: 320, borderRadius: 16, overflow: 'hidden', border: `1px solid ${colors.border.default}`, background: colors.background.sunken }}>
        <div style={{ height: 6, background: accent }} />
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sections.map(s => (
            <div key={s.titre}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: colors.text.faint, marginBottom: 6 }}>{s.titre}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.items.filter(i => i.visible || i.retire).map(i => (
                  <li key={i.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '8px 10px', borderRadius: 10,
                    color: i.retire ? colors.text.faint : colors.text.primary, background: i.retire ? 'transparent' : colors.background.surface,
                    border: i.retire ? `1px dashed ${colors.accent.amber}` : `1px solid ${colors.border.subtle}`,
                  }}>
                    <span style={{ textDecoration: i.retire ? 'line-through' : 'none' }}>{i.label}</span>
                    {i.retire && <span style={{ fontSize: 11, fontWeight: 800, color: colors.text.primary, background: colors.accent.amber + '2a', padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>Retiré</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
