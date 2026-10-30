import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { localeOf, t } from '../../lib/translations'
import { extractYoutubeId, youtubeThumbnail } from '../../lib/youtube'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'
import ApercuPro from './ApercuPro'
import { IconVideo, IconDocument } from '../icones'

// Image d'aperçu d'une demande d'analyse. Les vidéos envoyées depuis le site
// sont hébergées sur Cloudinary : la même adresse en .jpg donne une image tirée
// de la vidéo. Un lien YouTube a sa propre vignette. Tout autre lien (Drive,
// Veo...) n'a pas d'image accessible : l'appelant affiche alors une icône.
function miniatureDe(url) {
  if (!url) return null
  const yt = extractYoutubeId(url)
  if (yt) return youtubeThumbnail(yt)
  if (/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url)) {
    return url.replace('/video/upload/', '/video/upload/so_1,w_480,h_270,c_fill/').replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg')
  }
  return null
}

function Vignette({ url, isMobile }) {
  const colors = useColors()
  const [casse, setCasse] = useState(false)
  const src = casse ? null : miniatureDe(url)
  return (
    <div
      style={{
        flexShrink: 0, width: isMobile ? '104px' : '160px', aspectRatio: '16 / 9', borderRadius: radius.xl, overflow: 'hidden',
        background: colors.background.raised, border: `1px solid ${colors.border.subtle}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.text.faint,
      }}
    >
      {src
        ? <img src={src} alt="" loading="lazy" onError={() => setCasse(true)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <IconVideo size={28} />}
    </div>
  )
}

// Page "Mes analyses" : les demandes d'analyse vidéo du joueur et leur état.
// Une demande "en_attente" n'a ni lien ni rapport ; une demande "analyse" a au
// moins l'un des deux, posés par le coach analyseur.
export default function AnalysesJoueur({
  demandes, analysesRestantes, isPro, avantagesPro, formulesPro, isMobile, lang, onNouvelleAnalyse,
}) {
  const colors = useColors()
  const locale = localeOf(lang)
  const cadre = { padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '980px', margin: '0 auto' }
  const peutDemander = (analysesRestantes || 0) > 0

  const entete = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: spacing['2xl'], flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: fontSize['6xl'], fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary }}>{t('ja_titre', lang)}</h1>
        <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary, lineHeight: 1.5 }}>
          {peutDemander
            ? `Il te reste ${analysesRestantes} ${analysesRestantes > 1 ? 'analyses' : 'analyse'} vidéo à utiliser.`
            : 'Chaque analyse arrive ici avec la vidéo commentée et ton rapport.'}
        </p>
      </div>
      {peutDemander && (
        <button
          onClick={onNouvelleAnalyse}
          style={{
            minHeight: '44px', padding: `0 ${spacing['3xl']}`, borderRadius: radius.xl, border: 'none',
            background: colors.accent.green, color: colors.black, fontSize: fontSize.xl, fontWeight: 700,
            fontFamily: 'Inter, sans-serif', cursor: 'pointer', width: isMobile ? '100%' : 'auto',
          }}
        >
          {t('ja_nouvelle', lang)}
        </button>
      )}
    </div>
  )

  // Aucune demande : un joueur Pro est invité à en envoyer une, les autres
  // voient ce que l'offre Pro leur ouvrirait (aucun paiement ici : les
  // formules ouvrent les liens Stripe existants).
  if (demandes.length === 0) {
    return (
      <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
        {entete}
        {isPro ? (
          <Carte isMobile={isMobile}>
            <TitreSection>Comment ça marche</TitreSection>
            <p style={{ margin: 0, fontSize: fontSize['3xl'], fontWeight: 700, color: colors.text.primary }}>{t('ja_aucune', lang)}</p>
            <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary, lineHeight: 1.6 }}>
              {peutDemander
                ? 'Envoie une vidéo de ton match. Notre coach analyseur te répond avec la vidéo commentée et un rapport détaillé.'
                : "Tu n'as pas d'analyse disponible pour le moment. Dès que tu en auras une, tu pourras envoyer ta vidéo ici."}
            </p>
          </Carte>
        ) : (
          <ApercuPro
            titre="Fais analyser tes matchs par un coach"
            accroche="Tu envoies une vidéo, tu reçois la vidéo commentée et un rapport personnalisé pour progresser."
            points={avantagesPro}
            formules={formulesPro}
            isMobile={isMobile}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
      {entete}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        {demandes.map(demande => {
          const recue = demande.statut === 'analyse'
          const teinte = recue ? colors.accent.green : colors.accent.amber
          return (
            <Carte key={demande.id} isMobile={isMobile} style={{ padding: isMobile ? spacing.xl : spacing['2xl'] }}>
              <div style={{ display: 'flex', gap: spacing['2xl'], alignItems: 'flex-start' }}>
                <Vignette url={demande.video_url} isMobile={isMobile} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-block', background: teinte + alpha.subtle, color: teinte,
                      fontSize: fontSize.base, fontWeight: 700, padding: `${spacing.xs} ${spacing.lg}`, borderRadius: '999px',
                    }}
                  >
                    {recue ? t('ja_recue', lang) : t('etat_en_attente', lang)}
                  </span>
                  <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize['2xl'], fontWeight: 700, color: colors.text.primary, letterSpacing: '-0.2px', overflowWrap: 'anywhere' }}>
                    {demande.titre}
                  </p>
                  <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize.md, color: colors.text.faint }}>
                    {[demande.poste, new Date(demande.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })].filter(Boolean).join(' · ')}
                  </p>
                  {!recue && (
                    <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 1.5 }}>
                      Ton coach regarde ta vidéo. Tu seras prévenu dès que l'analyse est prête.
                    </p>
                  )}
                  {(demande.loom_url || demande.rapport_pdf_url) && (
                    <div style={{ display: 'flex', gap: spacing.base, flexWrap: 'wrap', marginTop: spacing.xl }}>
                      {demande.loom_url && (
                        <a
                          href={demande.loom_url} target="_blank" rel="noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: spacing.md, minHeight: '40px', padding: `0 ${spacing['2xl']}`,
                            borderRadius: radius.xl, background: colors.accent.green, color: colors.black,
                            fontSize: fontSize.lg, fontWeight: 700, textDecoration: 'none',
                          }}
                        >
                          <IconVideo size={16} />{t('ja_voir', lang)}
                        </a>
                      )}
                      {demande.rapport_pdf_url && (
                        <a
                          href={demande.rapport_pdf_url} target="_blank" rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: spacing.md, minHeight: '40px', padding: `0 ${spacing['2xl']}`,
                            borderRadius: radius.xl, background: 'transparent', color: colors.accent.green,
                            border: `1px solid ${colors.accent.green + alpha.light}`,
                            fontSize: fontSize.lg, fontWeight: 700, textDecoration: 'none',
                          }}
                        >
                          <IconDocument size={16} />{t('ja_telecharger_rapport', lang)}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Carte>
          )
        })}
      </div>
    </div>
  )
}
