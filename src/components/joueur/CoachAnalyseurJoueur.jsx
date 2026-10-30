import { useColors } from '../../lib/theme'
import { localeOf, t } from '../../lib/translations'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'
import EmptyState from '../EmptyState'
import { IconMic, IconCheckCircle } from '../icones'

// Page "Coach analyseur" : le joueur écrit au coach qui analyse ses vidéos.
// L'état (messages, brouillon, envoi) reste dans DashboardJoueur ; ce
// composant ne fait que l'afficher.
//
// Hiérarchie voulue : 1) titre et explication, 2) l'action principale (écrire),
// 3) l'historique des échanges en dessous. Avant, l'historique passait avant le champ de saisie : un joueur qui
// voulait écrire devait d'abord descendre sous toute la conversation.
export default function CoachAnalyseurJoueur({
  coaches, coachSelectionne, onChoisirCoach, messages, userId, aHistorique,
  brouillon, onBrouillon, onEnvoyer, envoiEnCours, envoye, erreur, readOnly, isMobile, lang,
}) {
  const colors = useColors()
  const locale = localeOf(lang)
  const cadre = { padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '980px', margin: '0 auto' }
  const prenom = coachSelectionne?.prenom
  const coachIds = coaches.map(c => c.id)
  const echanges = messages
    .filter(m => coachIds.includes(m.sender_id) || coachIds.includes(m.receiver_id))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const inactif = envoiEnCours || !brouillon.trim() || readOnly

  const bulle = (mine) => ({
    maxWidth: isMobile ? '88%' : '70%', padding: `${spacing.base} ${spacing.xl}`,
    borderRadius: mine ? `${radius['3xl']} ${radius['3xl']} ${radius.sm} ${radius['3xl']}` : `${radius['3xl']} ${radius['3xl']} ${radius['3xl']} ${radius.sm}`,
    background: mine ? colors.accent.green : colors.background.raised,
    color: mine ? colors.black : colors.text.primary,
    fontSize: fontSize.xl, alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: spacing.md, lineHeight: 1.5,
  })

  const entete = (
    <div>
      <h1 style={{ margin: 0, fontSize: fontSize['6xl'], fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary }}>{t('jnav_coach', lang)}</h1>
      <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary, lineHeight: 1.5 }}>
        Une question sur une analyse, ton rapport ou ta vidéo ? Écris à ton coach analyseur, il te répond ici.
      </p>
    </div>
  )

  if (coaches.length === 0) {
    return (
      <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
        {entete}
        <EmptyState dashed icon={<IconMic size={40} />} title={t('jcoach_aucun', lang)} />
      </div>
    )
  }

  return (
    <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
      {entete}

      <Carte isMobile={isMobile}>
        {coaches.length > 1 && (
          <div style={{ marginBottom: spacing['2xl'] }}>
            <TitreSection>{t('jcoach_coach', lang)}</TitreSection>
            <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
              {coaches.map(c => {
                const actif = coachSelectionne?.id === c.id
                return (
                  <button
                    key={c.id} onClick={() => onChoisirCoach(c)}
                    style={{
                      minHeight: '44px', padding: `0 ${spacing['2xl']}`, borderRadius: radius.xl, cursor: 'pointer',
                      border: `1px solid ${actif ? colors.accent.green : colors.border.default}`,
                      background: actif ? colors.accent.green + alpha.soft : colors.background.raised,
                      color: actif ? colors.accent.green : colors.text.primary,
                      fontSize: fontSize.xl, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {c.prenom} {c.nom}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <TitreSection>{aHistorique ? t('jcoach_nouveau_msg', lang) : `Écrire à ${prenom || 'ton coach analyseur'}`}</TitreSection>

        {envoye ? (
          <div style={{ textAlign: 'center', padding: `${spacing['5xl']} 0`, color: colors.accent.green }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: spacing.md }}><IconCheckCircle size={28} /></div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: fontSize.xl }}>{t('jcoach_msg_envoye', lang)}</p>
          </div>
        ) : (
          <>
            <textarea
              value={brouillon} onChange={e => onBrouillon(e.target.value)}
              placeholder={`Bonjour ${prenom || ''}, j'aurais une question sur...`}
              style={{
                width: '100%', boxSizing: 'border-box', minHeight: '140px', resize: 'vertical', outline: 'none',
                background: colors.background.surfaceAlt, border: `1px solid ${colors.border.default}`, borderRadius: radius.xl,
                color: colors.text.primary, padding: spacing.xl, fontSize: fontSize['3xl'], lineHeight: 1.5, fontFamily: 'Inter, sans-serif',
              }}
            />
            {erreur && (
              <p role="alert" style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.lg, color: colors.accent.red }}>
                Le message n'est pas parti. Vérifie ta connexion et réessaie.
              </p>
            )}
            <button
              onClick={onEnvoyer} disabled={inactif}
              style={{
                marginTop: spacing.lg, width: '100%', minHeight: '48px', border: 'none', borderRadius: radius.xl,
                background: colors.accent.green, color: colors.black, fontSize: fontSize.xl, fontWeight: 700,
                fontFamily: 'Inter, sans-serif', cursor: inactif ? 'default' : 'pointer', opacity: inactif ? 0.4 : 1, transition: 'opacity 0.2s',
              }}
            >
              {envoiEnCours ? t('etat_envoi_cours', lang) : t('jcoach_envoyer', lang)}
            </button>
          </>
        )}
      </Carte>

      {echanges.length > 0 && (
        <Carte isMobile={isMobile}>
          <TitreSection>{t('jcoach_historique', lang)}</TitreSection>
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '380px', overflowY: 'auto' }}>
            {echanges.map((m, i) => {
              const mine = m.sender_id === userId
              return (
                <div key={m.id ?? i} style={bulle(mine)}>
                  <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{m.content}</p>
                  <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize.sm, opacity: 0.6 }}>
                    {new Date(m.created_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} · {mine ? t('jcoach_toi', lang) : t('jnav_coach', lang)}
                  </p>
                </div>
              )
            })}
          </div>
        </Carte>
      )}
    </div>
  )
}
