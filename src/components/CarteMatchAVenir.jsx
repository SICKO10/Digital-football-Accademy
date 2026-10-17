import { useColors } from '../lib/theme'
import EcussonClub from './EcussonClub'

// Carte d'un match à venir (Compétition > Calendrier), même langage visuel que
// LigneResultat : pavé date façon feuille de match, notre club contre
// l'adversaire (logo ou écusson aux initiales), étiquettes compétition et
// domicile/extérieur, compte à rebours, disponibilités en barre segmentée,
// puis l'action principale (actionPrincipale) et le menu « ⋮ » (menu) fournis
// par le parent. enVedette : prochain match, mis en avant.
const SEGMENTS = [
  ['present', 'présent', 'présents', 'green'],
  ['convoque', 'convoqué', 'convoqués', 'blue'],
  ['absent', 'absent', 'absents', 'red'],
  ['blesse', 'blessé', 'blessés', 'orange'],
  ['malade', 'malade', 'malades', 'purple'],
]

const COULEURS_COMPETITION = { championnat: 'blue', coupe: 'amber', amical: 'orange' }

export default function CarteMatchAVenir({ m, nomClub, logoClub, logoAdversaire, enVedette, isMobile, locale = 'fr-FR', dispo, actionPrincipale, menu }) {
  const colors = useColors()
  const date = new Date(`${m.date}T12:00:00`)
  const aujourdhui = new Date(); aujourdhui.setHours(12, 0, 0, 0)
  const jours = Math.round((date - aujourdhui) / 86400000)
  const echeance = jours <= 0 ? "Aujourd'hui" : jours === 1 ? 'Demain' : jours <= 7 ? `Dans ${jours} jours` : `J-${jours}`
  const couleurComp = colors.accent[COULEURS_COMPETITION[(m.competition || '').trim().toLowerCase()]] || colors.text.secondary
  const etiquette = (texte, couleur) => (
    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', color: couleur, background: couleur + '1a', border: `1px solid ${couleur}40`, whiteSpace: 'nowrap' }}>{texte}</span>
  )

  const total = dispo ? SEGMENTS.reduce((s, [k]) => s + (dispo[k] || 0), 0) + (dispo.sans_reponse || 0) : 0
  const tailleLogo = isMobile ? 30 : 38

  return (
    <div style={{
      background: enVedette ? colors.background.raised : colors.background.surface,
      border: `1px solid ${enVedette ? colors.accent.blue + '55' : colors.border.subtle}`, borderLeft: `4px solid ${enVedette ? colors.accent.blue : colors.border.strong}`,
      borderRadius: '10px', padding: isMobile ? '12px' : '16px 18px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto minmax(0,1fr)' : 'auto minmax(0,1fr) auto', alignItems: 'center', gap: isMobile ? '12px' : '18px' }}>
        {/* Pavé date */}
        <div style={{ width: isMobile ? '54px' : '64px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
          <p style={{ margin: 0, padding: '3px 0', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: enVedette ? colors.black : colors.text.faint, background: enVedette ? colors.accent.blue : colors.background.raised }}>
            {date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}
          </p>
          <p style={{ margin: 0, padding: '5px 0 0', fontSize: isMobile ? '22px' : '26px', fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{date.getDate()}</p>
          <p style={{ margin: 0, padding: '2px 0 4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: colors.text.faint }}>{date.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</p>
          {m.heure && <p style={{ margin: 0, padding: '3px 0', fontSize: '11px', fontWeight: 800, borderTop: `1px solid ${colors.border.default}`, fontVariantNumeric: 'tabular-nums' }}>{m.heure.slice(0, 5)}</p>}
        </div>

        {/* Affiche + étiquettes */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0 }}>
            <EcussonClub nom={nomClub} logo={logoClub} taille={tailleLogo} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text.faint, flexShrink: 0 }}>vs</span>
            <EcussonClub nom={m.adversaire} logo={logoAdversaire} taille={tailleLogo} />
            <span style={{ fontWeight: 800, fontSize: isMobile ? '14px' : '16px', textTransform: 'uppercase', letterSpacing: '0.2px', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {m.adversaire || 'Adversaire'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            {etiquette(echeance, enVedette ? colors.accent.blue : colors.text.secondary)}
            {m.competition && etiquette(m.competition, couleurComp)}
            {etiquette(m.domicile ? 'Domicile' : 'Extérieur', m.domicile ? colors.accent.green : colors.text.secondary)}
            {m.lieu && <span style={{ fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.lieu}</span>}
          </div>
        </div>

        {/* Actions (desktop) */}
        {!isMobile && (actionPrincipale || menu) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actionPrincipale}{menu}</div>
        )}
      </div>

      {/* Disponibilités : barre segmentée + légende */}
      {total > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', height: '6px', borderRadius: '4px', overflow: 'hidden', background: colors.background.base }}>
            {SEGMENTS.map(([k, , , c]) => dispo[k] > 0 && <div key={k} style={{ width: `${(dispo[k] / total) * 100}%`, background: colors.accent[c] }} />)}
            {dispo.sans_reponse > 0 && <div style={{ width: `${(dispo.sans_reponse / total) * 100}%`, background: colors.border.strong }} />}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: colors.text.faint, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {SEGMENTS.filter(([k]) => dispo[k] > 0).map(([k, un, plusieurs, c]) => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors.accent[c] }} />
                <strong style={{ color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{dispo[k]}</strong> {dispo[k] > 1 ? plusieurs : un}
              </span>
            ))}
            {dispo.sans_reponse > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors.border.strong }} />
                <strong style={{ color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>{dispo.sans_reponse}</strong> en attente
              </span>
            )}
          </p>
        </div>
      )}

      {/* Actions (mobile) */}
      {isMobile && (actionPrincipale || menu) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>{actionPrincipale}{menu}</div>
      )}
    </div>
  )
}
