import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { localeOf } from '../../lib/translations'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'
import EmptyState from '../EmptyState'
import { IconShirt, IconCheck } from '../icones'

// Au-delà de ce nombre de tailles possibles (pointures, par exemple), des
// boutons côte à côte prendraient tout l'écran : on bascule sur une liste.
const MAX_BOUTONS = 10

// Page "Mon équipement" du joueur : il indique ses tailles pour que le club
// prépare son pack de début de saison. Utilisée par les deux branches du
// dashboard (affilié et navItems), qui avaient chacune une copie de ce code.
//
// La logique de chargement et d'enregistrement reste dans DashboardJoueur :
// `onSauvegarderTaille(champId, valeur)` doit renvoyer `{ error }`.
export default function EquipementJoueur({
  packAttribue, champsEquipement, mesTailles, equipementPret, equipementCommande,
  aUnClub, readOnly, isMobile, lang,
  onSauvegarderTaille, onRecupere, onNaviguer,
}) {
  const colors = useColors()
  const locale = localeOf(lang)
  // État d'enregistrement par article, pour que le joueur voie que sa taille
  // est bien partie : 'ok' ou 'erreur'. Absent tant qu'il n'a rien touché.
  const [statuts, setStatuts] = useState({})

  const choisir = async (champId, valeur) => {
    if (readOnly) return
    const res = await onSauvegarderTaille(champId, valeur)
    setStatuts(prev => ({ ...prev, [champId]: res?.error ? 'erreur' : 'ok' }))
  }

  const cadre = { padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '980px', margin: '0 auto' }
  const valeurDe = (champId) => mesTailles.find(t => t.champ_id === champId)?.valeur || ''
  const aTailler = champsEquipement.filter(c => !c.taille_unique)
  const renseignees = aTailler.filter(c => valeurDe(c.id)).length
  const toutRempli = aTailler.length > 0 && renseignees === aTailler.length

  const dateRemise = equipementCommande?.recupere_le ? new Date(equipementCommande.recupere_le) : null
  const horaires = equipementPret && [
    equipementPret.jours || 'Passe le récupérer auprès du club',
    equipementPret.heure_debut && equipementPret.heure_fin ? `entre ${equipementPret.heure_debut} et ${equipementPret.heure_fin}` : null,
    equipementPret.heure_debut_2 && equipementPret.heure_fin_2 ? `puis entre ${equipementPret.heure_debut_2} et ${equipementPret.heure_fin_2}` : null,
  ].filter(Boolean).join(' · ').replace(' · puis', ' puis')

  const bouton = (actif) => ({
    minHeight: '44px', minWidth: '44px', padding: `0 ${spacing['2xl']}`, borderRadius: radius.xl,
    border: `1px solid ${actif ? colors.accent.green : colors.border.default}`,
    background: actif ? colors.accent.green + alpha.soft : colors.background.raised,
    color: actif ? colors.accent.green : colors.text.primary,
    fontSize: fontSize.xl, fontWeight: 700, fontFamily: 'Inter, sans-serif',
    cursor: readOnly ? 'default' : 'pointer',
  })

  return (
    <div style={{ ...cadre, display: 'flex', flexDirection: 'column', gap: spacing['2xl'] }}>
      <div>
        <h1 style={{ margin: 0, fontSize: fontSize['6xl'], fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary }}>Mon équipement</h1>
        <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.lg, color: colors.text.faint, lineHeight: 1.5 }}>
          Indique tes tailles ici : ton club les reçoit et prépare ton pack de début de saison. Plus tôt elles sont renseignées, plus vite tu reçois ton équipement.
        </p>
      </div>

      {equipementPret && (
        <Carte isMobile={isMobile} accent={colors.accent.amber}>
          <TitreSection couleur={colors.accent.amber}>Ton équipement est prêt</TitreSection>
          <p style={{ margin: `0 0 ${spacing.lg}`, fontSize: fontSize.xl, color: colors.text.primary, lineHeight: 1.5 }}>{horaires}</p>
          {!readOnly && (
            <button
              onClick={onRecupere}
              style={{ background: colors.accent.amber, color: colors.black, border: 'none', borderRadius: radius.base, minHeight: '44px', padding: `0 ${spacing['3xl']}`, fontSize: fontSize.xl, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              J'ai récupéré mon équipement
            </button>
          )}
        </Carte>
      )}

      {equipementCommande?.statut === 'recupere' && dateRemise && (
        <Carte isMobile={isMobile} style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
          <span style={{ color: colors.accent.green, display: 'flex' }}><IconCheck /></span>
          <p style={{ margin: 0, fontSize: fontSize.xl, fontWeight: 700, color: colors.text.primary }}>
            Équipement remis le {dateRemise.toLocaleDateString(locale)} à {dateRemise.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
          </p>
        </Carte>
      )}

      {!packAttribue ? (
        <EmptyState
          icon={<IconShirt />}
          title={aUnClub ? "Ton club n'a pas encore choisi ton pack" : 'Ton équipement arrive avec ton club'}
          subtitle={aUnClub
            ? "Dès que ton club t'attribue un pack, les articles à renseigner apparaissent ici, avec une taille à choisir pour chacun. Tu seras prévenu."
            : "Une fois dans une équipe, ton club t'attribue un pack d'équipement et tu indiques ici tes tailles."}
          cta={!aUnClub && onNaviguer ? { label: 'Rejoindre mon équipe', onClick: () => onNaviguer('equipe') } : undefined}
        />
      ) : (
        <>
          <Carte isMobile={isMobile} style={{ display: 'flex', alignItems: 'center', gap: spacing['2xl'], flexWrap: 'wrap' }}>
            <span style={{ color: colors.accent.green, display: 'flex', flexShrink: 0 }}><IconShirt /></span>
            <div style={{ flex: '1 1 180px', minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: fontSize['3xl'], fontWeight: 800, color: colors.text.primary }}>{packAttribue.nom}</p>
              <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize.md, color: colors.text.faint }}>
                {champsEquipement.length} article{champsEquipement.length > 1 ? 's' : ''} dans ton pack
              </p>
            </div>
            {aTailler.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: fontSize['8xl'], fontWeight: 800, lineHeight: 1, color: toutRempli ? colors.accent.green : colors.text.primary }}>
                  {renseignees}<span style={{ color: colors.text.faint, fontSize: fontSize['4xl'] }}> / {aTailler.length}</span>
                </p>
                <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize.base, fontWeight: 600, color: colors.text.faint }}>
                  {toutRempli ? 'Tout est renseigné' : `taille${aTailler.length > 1 ? 's' : ''} indiquée${aTailler.length > 1 ? 's' : ''}`}
                </p>
              </div>
            )}
          </Carte>

          <Carte isMobile={isMobile} style={{ display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
            <TitreSection style={{ margin: 0 }}>Mes tailles</TitreSection>
            {champsEquipement.length === 0 && (
              <p style={{ margin: 0, fontSize: fontSize.lg, color: colors.text.faint }}>Ton pack ne contient pas encore d'article.</p>
            )}
            {champsEquipement.map(c => {
              const valeur = valeurDe(c.id)
              const statut = statuts[c.id]
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, marginBottom: spacing.base, minHeight: '18px' }}>
                    <p style={{ margin: 0, fontSize: fontSize.xl, fontWeight: 700, color: colors.text.primary }}>{c.nom}</p>
                    {statut === 'ok' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs, fontSize: fontSize.md, fontWeight: 600, color: colors.accent.green }}>
                        <IconCheck size={14} /> Enregistré
                      </span>
                    )}
                    {statut === 'erreur' && (
                      <span style={{ fontSize: fontSize.md, fontWeight: 600, color: colors.accent.red }}>Non enregistré, réessaie</span>
                    )}
                  </div>
                  {c.taille_unique ? (
                    <p style={{ margin: 0, fontSize: fontSize.lg, color: colors.text.faint }}>Taille unique, rien à indiquer.</p>
                  ) : (c.options || []).length > MAX_BOUTONS ? (
                    <select
                      value={valeur}
                      disabled={readOnly}
                      onChange={e => choisir(c.id, e.target.value)}
                      style={{ ...bouton(!!valeur), width: '100%', maxWidth: '280px', padding: `0 ${spacing.lg}`, outline: 'none', appearance: 'auto' }}
                    >
                      <option value="">Choisir une taille</option>
                      {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.md }}>
                      {(c.options || []).map(o => (
                        <button key={o} type="button" disabled={readOnly} aria-pressed={valeur === o} onClick={() => choisir(c.id, o)} style={bouton(valeur === o)}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Carte>
        </>
      )}
    </div>
  )
}
