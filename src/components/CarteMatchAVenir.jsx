import { useColors } from '../lib/theme'
import { styleCarte, styleCarteLiseree, styleEtiquette, couleurCraie } from '../lib/identite'
import { EtiquetteStatut, Jauge } from './identite'
import { police } from '../tokens'
import EcussonClub from './EcussonClub'

// Carte d'un match à venir (Compétition > Calendrier), même langage visuel que
// LigneResultat : pavé date façon feuille de match, notre club contre
// l'adversaire (logo ou écusson aux initiales), étiquettes compétition et
// domicile/extérieur, compte à rebours, disponibilités en jauge segmentée,
// puis l'action principale (actionPrincipale) et le menu « ⋮ » (menu) fournis
// par le parent. enVedette : prochain match, carte à liseré du club.
const SEGMENTS = [
  ['present', 'présent', 'présents', 'success'],
  ['convoque', 'convoqué', 'convoqués', 'info'],
  ['absent', 'absent', 'absents', 'red'],
  ['blesse', 'blessé', 'blessés', 'orange'],
  ['malade', 'malade', 'malades', 'purple'],
]

const COULEURS_COMPETITION = { championnat: 'info', coupe: 'amber', amical: 'orange' }

export default function CarteMatchAVenir({ m, nomClub, logoClub, logoAdversaire, enVedette, isMobile, locale = 'fr-FR', dispo, actionPrincipale, menu }) {
  const colors = useColors()
  const date = new Date(`${m.date}T12:00:00`)
  const aujourdhui = new Date(); aujourdhui.setHours(12, 0, 0, 0)
  const jours = Math.round((date - aujourdhui) / 86400000)
  const echeance = jours <= 0 ? "Aujourd'hui" : jours === 1 ? 'Demain' : jours <= 7 ? `Dans ${jours} jours` : `J-${jours}`
  const couleurComp = colors.accent[COULEURS_COMPETITION[(m.competition || '').trim().toLowerCase()]] || colors.text.dim
  const total = dispo ? SEGMENTS.reduce((s, [k]) => s + (dispo[k] || 0), 0) + (dispo.sans_reponse || 0) : 0
  const tailleLogo = isMobile ? 30 : 38

  const segmentsDispo = dispo ? [
    ...SEGMENTS.filter(([k2]) => dispo[k2] > 0).map(([k2, un, plusieurs, c]) => ({ libelle: dispo[k2] > 1 ? plusieurs : un, valeur: dispo[k2], couleur: colors.accent[c] })),
    ...(dispo.sans_reponse > 0 ? [{ libelle: 'en attente', valeur: dispo.sans_reponse, couleur: colors.border.strong }] : []),
  ] : []
  const craie = `1px solid ${couleurCraie(colors)}`
  const bandeauJour = { margin: 0, padding: '3px 0', ...styleEtiquette(colors), fontSize: '11px', textAlign: 'center', color: enVedette ? colors.accent.onBrand : colors.text.dim, background: enVedette ? colors.accent.brand : colors.background.raised }

  return (
    <div style={{ ...(enVedette ? styleCarteLiseree(colors) : styleCarte(colors)), padding: isMobile ? '12px' : '16px 18px', paddingLeft: enVedette ? (isMobile ? '15px' : '21px') : undefined }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'auto minmax(0,1fr)' : 'auto minmax(0,1fr) auto', alignItems: 'center', gap: isMobile ? '12px' : '18px' }}>
        {/* Pavé date */}
        <div style={{ width: isMobile ? '54px' : '64px', textAlign: 'center', border: craie, borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
          <p style={bandeauJour}>
            {date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '')}
          </p>
          <p style={{ margin: 0, padding: '5px 0 0', fontFamily: police.titre, fontWeight: 700, fontSize: isMobile ? '24px' : '28px', lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: colors.text.primary }}>{date.getDate()}</p>
          <p style={{ ...styleEtiquette(colors), margin: 0, padding: '2px 0 4px', fontSize: '11px' }}>{date.toLocaleDateString(locale, { month: 'short' }).replace('.', '')}</p>
          {m.heure && <p style={{ margin: 0, padding: '3px 0', fontFamily: police.titre, fontSize: '15px', fontWeight: 600, borderTop: craie, fontVariantNumeric: 'tabular-nums', color: colors.text.primary }}>{m.heure.slice(0, 5)}</p>}
        </div>

        {/* Affiche + étiquettes */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0 }}>
            <EcussonClub nom={nomClub} logo={logoClub} taille={tailleLogo} />
            <span style={{ fontFamily: police.texte, fontSize: '13px', fontWeight: 600, color: colors.text.dim, flexShrink: 0 }}>vs</span>
            <EcussonClub nom={m.adversaire} logo={logoAdversaire} taille={tailleLogo} />
            <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: isMobile ? '18px' : '22px', lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: '0.02em', color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {m.adversaire || 'Adversaire'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
            <EtiquetteStatut couleur={enVedette ? colors.accent.brand : colors.text.dim}>{echeance}</EtiquetteStatut>
            {m.competition && <EtiquetteStatut couleur={couleurComp}>{m.competition}</EtiquetteStatut>}
            <EtiquetteStatut couleur={m.domicile ? colors.accent.success : colors.text.dim}>{m.domicile ? 'Domicile' : 'Extérieur'}</EtiquetteStatut>
            {m.lieu && <span style={{ fontFamily: police.texte, fontSize: '13px', color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.lieu}</span>}
          </div>
        </div>

        {/* Actions (desktop) */}
        {!isMobile && (actionPrincipale || menu) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{actionPrincipale}{menu}</div>
        )}
      </div>

      {/* Disponibilités : jauge segmentée + légende */}
      {total > 0 && <Jauge segments={segmentsDispo} libelle="Disponibilités" style={{ marginTop: '14px' }} />}

      {/* Actions (mobile) */}
      {isMobile && (actionPrincipale || menu) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>{actionPrincipale}{menu}</div>
      )}
    </div>
  )
}
