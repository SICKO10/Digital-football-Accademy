import { useColors } from '../lib/theme'
import EcussonClub from './EcussonClub'

const IcoRapport = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>

// Carte d'un match joué (Compétition > Résultats) façon feuille de match :
// notre club à gauche, score + résultat au centre, adversaire à droite,
// date · heure | compétition · domicile/extérieur · lieu en dessous, puis
// Rapport et le menu « ··· » fourni par le parent (menu). enVedette : dernier
// match joué, mis en avant. Score affiché nous–eux, comme avant.
export default function LigneResultat({ m, nomClub, logoClub, logoAdversaire, enVedette, isMobile, locale = 'fr-FR', aRapport, afficherRapport, onOuvrir, onRapport, menu }) {
  const colors = useColors()
  const nous = Number(m.score_nous)
  const eux = Number(m.score_eux)
  const resultat = nous > eux ? 'Victoire' : nous === eux ? 'Nul' : 'Défaite'
  const couleur = nous > eux ? colors.accent.green : nous === eux ? colors.text.secondary : colors.accent.red
  // Nul : cadre neutre bien visible (le gris translucide se perdait sur fond sombre).
  const cadre = nous === eux ? colors.border.strong : couleur + '55'

  const date = new Date(`${m.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  const meta = [m.competition, m.domicile ? 'Domicile' : 'Extérieur', m.lieu].filter(Boolean).join(' · ')
  const tailleLogo = isMobile ? 34 : (enVedette ? 52 : 44)

  const equipe = (nom, logo, alignement) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px', minWidth: 0, flexDirection: alignement === 'droite' ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
      <EcussonClub nom={nom} logo={logo} taille={tailleLogo} />
      <span style={{ fontWeight: 800, fontSize: isMobile ? '12px' : (enVedette ? '17px' : '15px'), color: colors.text.primary, textTransform: 'uppercase', letterSpacing: '0.2px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textAlign: alignement === 'droite' ? 'right' : 'left', lineHeight: 1.2 }}>
        {nom}
      </span>
    </div>
  )

  return (
    <div onClick={onOuvrir} style={{
      cursor: 'pointer', borderRadius: '10px', padding: isMobile ? '12px' : (enVedette ? '18px 20px' : '14px 18px'),
      background: enVedette ? colors.background.raised : colors.background.surface,
      border: `1px solid ${enVedette || nous === eux ? cadre : colors.border.subtle}`, borderLeft: `4px solid ${nous === eux ? colors.text.muted : couleur}`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) auto minmax(0,1fr)' : 'minmax(0,1fr) auto minmax(0,1fr) auto', alignItems: 'center', gap: isMobile ? '8px' : '18px' }}>
        {equipe(nomClub, logoClub, 'gauche')}

        <div style={{ textAlign: 'center', padding: isMobile ? 0 : '0 8px', borderLeft: isMobile ? 'none' : `1px solid ${colors.border.subtle}`, borderRight: isMobile ? 'none' : `1px solid ${colors.border.subtle}`, minWidth: isMobile ? '64px' : '120px' }}>
          <p style={{ margin: 0, fontSize: isMobile ? '22px' : (enVedette ? '34px' : '28px'), fontWeight: 800, color: couleur, fontVariantNumeric: 'tabular-nums', letterSpacing: '1px', lineHeight: 1.1 }}>
            {m.score_nous} - {m.score_eux}
          </p>
          <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '6px', color: couleur, background: couleur + '1f' }}>{resultat}</span>
        </div>

        {equipe(m.adversaire || 'Adversaire', logoAdversaire, 'droite')}

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px', borderLeft: `1px solid ${colors.border.subtle}` }} onClick={e => e.stopPropagation()}>
            {afficherRapport && (
              <button onClick={onRapport} title={aRapport ? 'Voir le rapport de match' : 'Rapport de match'}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'transparent', border: `1px solid ${aRapport ? colors.accent.green + '60' : colors.border.default}`, color: aRapport ? colors.accent.green : colors.text.secondary, borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', minHeight: '36px' }}>
                <IcoRapport /> Rapport
              </button>
            )}
            {menu}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: '10px', marginTop: isMobile ? '10px' : '8px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: isMobile ? '11px' : '12px', color: colors.text.faint, textAlign: 'center' }}>
          {date}{m.heure ? ` · ${m.heure}` : ''}{meta ? <span style={{ color: colors.text.disabled }}>{`  |  ${meta}`}</span> : null}
        </p>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
            {afficherRapport && (
              <button onClick={onRapport}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'transparent', border: `1px solid ${aRapport ? colors.accent.green + '60' : colors.border.default}`, color: aRapport ? colors.accent.green : colors.text.secondary, borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', minHeight: '32px' }}>
                <IcoRapport /> Rapport
              </button>
            )}
            {menu}
          </div>
        )}
      </div>
    </div>
  )
}
