import { useColors, useTheme } from '../../lib/theme'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import { numeroDePoste } from '../../lib/ecranJoueur'
import { t } from '../../lib/translations'
import Avatar from '../Avatar'
import Carte from './Carte'
import { IconCard } from '../icones'

// En-tête de l'accueil joueur : la carte de joueur. Un seul squelette pour les
// deux profils, seul le contenu change (cf. BRIEF-joueur-v2.md, emplacement 1) :
//   - affilié (clubAffilieInfo présent) : catégorie + nom du club, logo du club
//     en médaille sur l'avatar ;
//   - indépendant : région + badge Pro à la place de la catégorie et du club.
// Une donnée absente fait disparaître son élément : jamais de « — » ni de case
// vide. Le chiffre fantôme est le numéro de maillot classique du poste (voir
// numeroDePoste), absent si le poste n'est pas renseigné.
// L'envoi de la photo de profil reste géré par le parent (handleAvatarUpload,
// avatarUploading) : ce composant ne fait que le brancher sur le <label>.
export default function EnTeteJoueur({ profil, clubAffilieInfo, isPro, nbDemandes, onAvatarUpload, avatarUploading, isMobile, lang, style }) {
  const colors = useColors()
  const { theme } = useTheme()
  const numero = numeroDePoste(profil?.poste)
  const affilie = !!clubAffilieInfo
  const nomClub = clubAffilieInfo?.club || null
  const fantome = theme === 'claire' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)'
  const centre = isMobile ? 'center' : 'flex-start'

  const pastille = (couleur, extra) => ({
    background: couleur + alpha.subtle,
    border: `1px solid ${couleur + alpha.light}`,
    color: couleur,
    fontSize: fontSize.base,
    fontWeight: 700,
    padding: `${spacing.xs} ${spacing.lg}`,
    borderRadius: radius.pill,
    flexShrink: 0,
    ...extra,
  })

  const stats = []
  if (profil?.analyses_restantes != null) stats.push({ valeur: profil.analyses_restantes, libelle: t('jd_analyses_stat', lang) })
  stats.push({ valeur: nbDemandes, libelle: t('jd_demandes_stat', lang), couleur: nbDemandes > 0 ? colors.accent.blue : undefined })

  const medaillePourtour = `3px solid ${colors.background.surface}`

  return (
    <Carte isMobile={isMobile} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {numero !== null && (
        <span
          className="dj-display"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            ...(isMobile ? { left: '50%', transform: 'translate(-50%, -50%)' } : { right: spacing['3xl'], transform: 'translateY(-50%)' }),
            fontSize: '150px',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: 0,
            color: fantome,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {numero}
        </span>
      )}

      <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', textAlign: isMobile ? 'center' : 'left', gap: isMobile ? spacing['2xl'] : spacing['4xl'] }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Avatar person={profil} size={88} border={`2.5px solid ${colors.accent.green}`} />
          <label style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', background: colors.accent.green, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: avatarUploading ? 'wait' : 'pointer', border: `2.5px solid ${colors.background.surface}` }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.black} strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onAvatarUpload} disabled={avatarUploading} />
          </label>
          {affilie && (
            clubAffilieInfo.avatar_url
              ? <img src={clubAffilieInfo.avatar_url} alt={nomClub || ''} title={nomClub || ''} style={{ position: 'absolute', bottom: '-4px', left: '-8px', width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: medaillePourtour, background: colors.background.raised }} />
              : <div title={nomClub || ''} style={{ position: 'absolute', bottom: '-4px', left: '-8px', width: '36px', height: '36px', borderRadius: '50%', background: colors.background.raised, border: medaillePourtour, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: colors.text.secondary }}>
                  {(nomClub || '?').trim()[0]?.toUpperCase() || '?'}
                </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="dj-display" style={{ fontSize: isMobile ? '34px' : '44px', lineHeight: 1.02, margin: 0, color: colors.text.primary, textTransform: 'uppercase', overflowWrap: 'anywhere' }}>
            {profil?.prenom} {profil?.nom}
          </h1>

          {(profil?.poste || nomClub) && (
            <p style={{ margin: `${spacing.md} 0 0`, color: colors.text.faint, fontSize: '13px' }}>
              {[profil?.poste, nomClub].filter(Boolean).join(' · ')}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: centre, gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.lg }}>
            {isPro && (
              <span style={{ background: colors.accent.green, color: colors.accent.onBrand, fontSize: fontSize.base, fontWeight: 800, padding: `${spacing.xs} ${spacing.lg}`, borderRadius: radius.pill, letterSpacing: '0.8px', textTransform: 'uppercase', flexShrink: 0 }}>
                Pro
              </span>
            )}
            {affilie && profil?.categorie && (
              <span style={pastille(colors.accent.green)}>{profil.categorie}</span>
            )}
            {!affilie && profil?.region && (
              <span style={{ ...pastille(colors.text.secondary), background: 'transparent', border: `1px solid ${colors.border.default}` }}>{profil.region}</span>
            )}
            {profil?.numero_licence && (
              <span style={pastille(colors.accent.blue, { display: 'inline-flex', alignItems: 'center', gap: spacing.md })}>
                <IconCard /> {t('jd_licencie', lang)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: centre, marginTop: spacing['2xl'] }}>
            {stats.map((s, i) => (
              <div key={s.libelle} style={{ paddingLeft: i === 0 ? 0 : spacing['3xl'], marginLeft: i === 0 ? 0 : spacing['3xl'], borderLeft: i === 0 ? 'none' : `1px solid ${colors.border.subtle}`, textAlign: isMobile ? 'center' : 'left' }}>
                <div className="dj-chiffre" style={{ fontSize: '32px', lineHeight: 1, color: s.couleur || colors.text.primary }}>{s.valeur}</div>
                <div className="dj-eyebrow" style={{ marginTop: spacing.sm, color: colors.text.faint }}>{s.libelle}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Carte>
  )
}
