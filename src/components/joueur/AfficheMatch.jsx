import { useColors } from '../../lib/theme'
import { forme, spacing } from '../../tokens'
import { localeOf } from '../../lib/translations'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Affiche du prochain match, façon affiche du club-house : l'écusson du club
// d'un côté, le monogramme de l'adversaire de l'autre (le club qui reçoit à
// gauche), le jour en grand, l'heure, le lieu, et la réponse présent / absent
// quand une convocation est publiée pour ce match.
//
// Aucune requête : tout vient de ce que le dashboard a déjà chargé.
//   - `match`        : { date, heure, lieu, adversaire, domicile, competition, equipe } ou null
//   - `convocation`  : { timeline, notes, type_terrain, arbitre_nom } ou null (si le joueur est convoqué)
//   - `club`         : { nom, logo } du club du joueur
//   - `affilie`      : false → carte « Rejoins ton club »
//   - `repConvoc`    : 'present' | 'absent' | null ; `onRepondre('present' | 'absent')` est la
//                      fonction existante du dashboard (table convocation_reponses).
//   - `niveau`       : "relief" quand l'affiche est le bloc à la une de l'écran, sinon "standard".

const MOTS_VIDES = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'd', 'l', 'et', 'sur', 'en'])

// 2 ou 3 initiales : « AS Saint-Denis » → ASD ; « Racing » → RAC. Jamais plus de 3.
export const monogramme = (nom) => {
  const mots = (nom || '').split(/[\s'’\-]+/).filter(m => m && !MOTS_VIDES.has(m.toLowerCase()))
  if (mots.length === 0) return '?'
  if (mots.length === 1) return mots[0].slice(0, 3).toUpperCase()
  return mots.slice(0, 3).map(m => m[0]).join('').toUpperCase()
}

const Pastille = ({ children, plein, couleur, fond, texte, grand }) => (
  <div
    className="dj-display"
    style={{
      width: grand, height: grand, boxSizing: 'border-box', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: forme.rayonCarte, fontSize: grand * 0.36, letterSpacing: '0.02em',
      background: plein ? fond : 'transparent',
      color: texte,
      border: plein ? 'none' : `2px solid ${couleur}`,
    }}
  >
    {children}
  </div>
)

const Equipe = ({ nom, sousTitre, grand, enfant }) => {
  const colors = useColors()
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md, textAlign: 'center' }}>
      {enfant}
      <div style={{ minWidth: 0, maxWidth: '100%' }}>
        <p style={{ margin: 0, fontSize: grand ? 16 : 14, fontWeight: 700, color: colors.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom}</p>
        {sousTitre && <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.text.faint }}>{sousTitre}</p>}
      </div>
    </div>
  )
}

const Bouton = ({ children, onClick, actif, couleurActif, texteActif, isMobile }) => {
  const colors = useColors()
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        flex: 1, minHeight: 48, cursor: 'pointer', fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: isMobile ? 16 : 17,
        borderRadius: forme.rayonPastille,
        border: actif ? `2px solid ${couleurActif}` : `1px solid ${colors.border.default}`,
        background: actif ? couleurActif : 'transparent',
        color: actif ? texteActif : colors.text.primary,
      }}
    >
      {children}
    </button>
  )
}

export default function AfficheMatch({
  match, convocation, club, affilie = false, repConvoc, onRepondre, onOuvrirEquipe,
  niveau = 'standard', isMobile = false, lang = 'fr', style,
}) {
  const colors = useColors()
  const marque = colors.accent.brand

  // ── États vides : une phrase + une action ──
  if (!affilie || !match) {
    return (
      <Carte niveau="discret" isMobile={isMobile} style={{ borderLeft: `${forme.lisere} solid ${marque}`, ...style }}>
        <TitreSection style={{ margin: 0 }}>Prochain match</TitreSection>
        <p style={{ margin: `${spacing.md} 0 0`, fontSize: isMobile ? 20 : 24, fontWeight: 700, lineHeight: 1.25, color: colors.text.primary }}>
          {affilie ? 'Aucun match annoncé' : 'Rejoins ton club'}
        </p>
        <p style={{ margin: `${spacing.md} 0 0`, fontSize: 15, color: colors.text.secondary }}>
          {affilie
            ? 'Ton éducateur le publiera ici dès qu’un match sera programmé.'
            : 'Entre le code d’équipe de ton éducateur pour voir tes matchs et répondre aux convocations.'}
        </p>
        <button
          onClick={onOuvrirEquipe}
          style={{
            marginTop: spacing['2xl'], minHeight: 44, padding: `0 ${spacing['3xl']}`, cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
            fontWeight: 700, fontSize: 16, borderRadius: forme.rayonPastille, border: `1px solid ${colors.border.default}`,
            background: 'transparent', color: colors.text.primary,
          }}
        >
          {affilie ? 'Voir mon équipe' : 'Rejoindre mon équipe'}
        </button>
      </Carte>
    )
  }

  const locale = localeOf(lang)
  const jour = match.date
    ? new Date(`${match.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    : null
  const heure = match.heure ? match.heure.slice(0, 5) : null
  const rdv = (convocation?.timeline || []).find(s => /rendez|rdv|rassemblement|convocation/i.test(s?.label || ''))
  const grand = isMobile ? 64 : 88
  const nomClub = club?.nom || 'Mon club'
  const domicile = match.domicile !== false

  const blocClub = (
    <Equipe
      key="club"
      nom={nomClub}
      sousTitre={match.equipe || null}
      grand={!isMobile}
      enfant={club?.logo
        ? <img src={club.logo} alt="" style={{ width: grand, height: grand, objectFit: 'contain', flexShrink: 0 }} />
        : <Pastille plein fond={marque} texte={colors.accent.onBrand} grand={grand}>{monogramme(nomClub)}</Pastille>}
    />
  )
  const blocAdversaire = (
    <Equipe
      key="adv"
      nom={match.adversaire || 'Adversaire à confirmer'}
      grand={!isMobile}
      enfant={<Pastille couleur={colors.border.default} texte={colors.text.secondary} grand={grand}>{match.adversaire ? monogramme(match.adversaire) : '?'}</Pastille>}
    />
  )

  const infos = [
    heure && { cle: rdv ? 'Coup d’envoi' : 'Heure', valeur: heure },
    rdv?.heure && { cle: 'Rendez-vous', valeur: rdv.heure },
    match.lieu && { cle: 'Lieu', valeur: match.lieu },
  ].filter(Boolean)

  const convoque = !!convocation

  return (
    <Carte
      niveau={niveau}
      isMobile={isMobile}
      style={{ borderLeft: `${forme.lisere} solid ${marque}`, ...style }}
    >
      <TitreSection couleur={colors.accent.green} style={{ margin: 0 }}>
        {convoque ? 'Tu es convoqué' : 'Prochain match'}{match.competition ? ` · ${match.competition}` : ''}
      </TitreSection>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.base, marginTop: spacing['2xl'] }}>
        {domicile ? blocClub : blocAdversaire}
        <div className="dj-display" style={{ alignSelf: 'center', fontSize: isMobile ? 22 : 28, color: colors.text.faint, flexShrink: 0 }}>VS</div>
        {domicile ? blocAdversaire : blocClub}
      </div>

      <div style={{ marginTop: spacing['2xl'], paddingTop: spacing['2xl'], borderTop: `1px solid ${colors.border.subtle}` }}>
        {jour && (
          <p className="dj-display" style={{ margin: 0, fontSize: isMobile ? 30 : 40, lineHeight: 1.05, textTransform: 'uppercase', color: colors.text.primary }}>
            {jour}
          </p>
        )}
        <p style={{ margin: `${spacing.md} 0 0`, fontSize: 13, color: colors.text.faint }}>
          {domicile ? 'À domicile' : 'À l’extérieur'}
        </p>
        {infos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: `${spacing.base} ${spacing['3xl']}`, marginTop: spacing.lg }}>
            {infos.map(i => (
              <div key={i.cle} style={{ minWidth: 0 }}>
                <p className="dj-eyebrow" style={{ margin: 0, color: colors.text.faint }}>{i.cle}</p>
                <p className="dj-display" style={{ margin: '2px 0 0', fontSize: isMobile ? 22 : 26, color: colors.text.primary }}>{i.valeur}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {convoque && (
        <>
          <div style={{ display: 'flex', gap: spacing.base, marginTop: spacing['2xl'] }}>
            <Bouton isMobile={isMobile} actif={repConvoc === 'present'} couleurActif={colors.accent.green} texteActif={colors.accent.onBrand} onClick={() => onRepondre('present')}>Présent</Bouton>
            <Bouton isMobile={isMobile} actif={repConvoc === 'absent'} couleurActif={colors.accent.red} texteActif="#fff" onClick={() => onRepondre('absent')}>Absent</Bouton>
          </div>
          <p style={{ margin: `${spacing.md} 0 0`, fontSize: 13, color: repConvoc ? colors.text.secondary : colors.text.faint }}>
            {repConvoc === 'present' && 'Réponse envoyée : tu seras présent. Tu peux la changer.'}
            {repConvoc === 'absent' && 'Réponse envoyée : tu seras absent. Tu peux la changer.'}
            {!repConvoc && 'Ton éducateur attend ta réponse.'}
          </p>

          {convocation.timeline?.length > 0 && (
            <div style={{ marginTop: spacing['2xl'] }}>
              <TitreSection style={{ margin: `0 0 ${spacing.sm}` }}>Programme</TitreSection>
              {convocation.timeline.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: spacing.lg, alignItems: 'baseline', padding: `${spacing.sm} 0`, borderBottom: i < convocation.timeline.length - 1 ? `1px solid ${colors.border.subtle}` : 'none' }}>
                  <span className="dj-chiffre" style={{ color: colors.accent.green, fontSize: 18, minWidth: 52 }}>{step.heure}</span>
                  <span style={{ color: colors.text.secondary, fontSize: 15 }}>{step.label}</span>
                </div>
              ))}
            </div>
          )}

          {convocation.notes && (
            <p style={{ margin: `${spacing['2xl']} 0 0`, padding: `${spacing.base} ${spacing.lg}`, fontSize: 15, fontStyle: 'italic', color: colors.text.secondary, background: colors.background.base, borderRadius: forme.rayonPastille }}>
              {convocation.notes}
            </p>
          )}

          {(convocation.type_terrain || convocation.arbitre_nom) && (
            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing['2xl'] }}>
              {convocation.type_terrain && <span style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: 13, color: colors.text.dim, background: colors.background.raised, borderRadius: forme.rayonPastille }}>{convocation.type_terrain}</span>}
              {convocation.arbitre_nom && <span style={{ padding: `${spacing.sm} ${spacing.lg}`, fontSize: 13, color: colors.text.dim, background: colors.background.raised, borderRadius: forme.rayonPastille }}>Arbitre : {convocation.arbitre_nom}</span>}
            </div>
          )}
        </>
      )}
    </Carte>
  )
}
