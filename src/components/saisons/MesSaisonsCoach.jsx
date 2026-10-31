import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { radius } from '../../tokens'
import { libelleSaison, aSaisonsPassees, MESSAGE_AUCUNE_SAISON_ARCHIVEE } from '../../lib/saison'
import { cumulerBilans, NIVEAUX_PRATIQUE } from '../../lib/statsSaison'
import { chargerDonneesParcours, construireSaisons, publierParcours } from '../../lib/parcoursCoach'
import BilanTuiles from './BilanTuiles'

// Carrière du coach : une carte par saison, une ligne de bilan par équipe encadrée.
// Tout est recalculé depuis les données datées du coach (matchs, séances, RPE,
// blessures) : une équipe apparaît dans une saison si le coach y a un match ou
// une séance. La saison en cours est incluse (étiquetée « en cours »).

export default function MesSaisonsCoach({ educateurId }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const [etat, setEtat] = useState({ chargement: true })
  const [ouvertes, setOuvertes] = useState({})
  const [niveaux, setNiveaux] = useState({}) // 'saison|equipe' -> niveau
  const [erreurNiveau, setErreurNiveau] = useState(false)

  useEffect(() => {
    if (!educateurId) return
    let annule = false
    ;(async () => {
      const donnees = await chargerDonneesParcours(educateurId)
      if (annule) return
      setEtat(donnees || { erreur: true })
    })()
    return () => { annule = true }
  }, [educateurId])

  const saisons = useMemo(() => construireSaisons(etat), [etat])

  // Publie les totaux (visibles des éducateurs et clubs dans Explorer) puis relit les niveaux choisis.
  useEffect(() => {
    if (!educateurId || !saisons.length) return
    let annule = false
    ;(async () => {
      await publierParcours(educateurId, saisons)
      const { data } = await supabase.from('coach_bilans_publics').select('saison, club_categorie_id, niveau').eq('educateur_id', educateurId)
      if (!annule) setNiveaux(Object.fromEntries((data || []).filter(l => l.niveau).map(l => [`${l.saison}|${l.club_categorie_id}`, l.niveau])))
    })()
    return () => { annule = true }
  }, [educateurId, saisons])

  const choisirNiveau = async (saison, equipeId, niveau) => {
    const ancien = niveaux[`${saison}|${equipeId}`] || null
    setErreurNiveau(false)
    setNiveaux(n => ({ ...n, [`${saison}|${equipeId}`]: niveau || undefined }))
    const { error } = await supabase.from('coach_bilans_publics').update({ niveau: niveau || null })
      .eq('educateur_id', educateurId).eq('saison', saison).eq('club_categorie_id', equipeId)
    if (error) {
      setErreurNiveau(true)
      setNiveaux(n => ({ ...n, [`${saison}|${equipeId}`]: ancien || undefined }))
    }
  }

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: isMobile ? 14 : '16px 18px', minWidth: 0 }
  const nd = <span style={{ color: colors.text.faint }}>n.d.</span>

  if (etat.chargement) return <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>
  if (etat.erreur) return <div style={carte}><p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>Impossible de charger tes saisons. Réessaie dans un instant.</p></div>

  const ligneInfo = (label, contenu) => (
    <p style={{ margin: 0, fontSize: 12, color: colors.text.secondary, lineHeight: 1.5 }}>
      <span style={{ color: colors.text.faint }}>{label} : </span>{contenu}
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>
      {!aSaisonsPassees(saisons.map(s => ({ enCours: s.enCours }))) && (
        <p style={{ margin: 0, fontSize: 12, color: colors.text.faint }}>{MESSAGE_AUCUNE_SAISON_ARCHIVEE}</p>
      )}
      {saisons.length === 0 && (
        <div style={{ ...carte, textAlign: 'center', padding: 28 }}>
          <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>Aucun match ni séance enregistré pour le moment.</p>
        </div>
      )}
      {saisons.length > 0 && (
        <div style={carte}>
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800 }}>Vue d'ensemble</p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: colors.text.faint }}>Toutes les saisons et toutes les équipes additionnées.</p>
          <BilanTuiles bilan={cumulerBilans(saisons.flatMap(sa => sa.equipes.map(eq => eq.bilan)))} />
        </div>
      )}
      {erreurNiveau && <p style={{ margin: 0, fontSize: 12, color: colors.accent.red }}>Le niveau n'a pas pu être enregistré. Réessaie dans un instant.</p>}
      {saisons.map(s => (
        <div key={s.saison} style={carte}>
          <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>
            Saison {libelleSaison(s.saison)}
            {s.enCours && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: colors.accent.blue }}>en cours</span>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {s.equipes.map(eq => {
              const b = eq.bilan
              const cleOuv = `${s.saison}|${eq.id}`
              const ouverte = !!ouvertes[cleOuv]
              return (
                <div key={eq.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 10 }}>
                  <button onClick={() => setOuvertes(o => ({ ...o, [cleOuv]: !o[cleOuv] }))} aria-expanded={ouverte}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{eq.nom}</span>
                      {eq.club && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: colors.text.faint }}>{eq.club}</span>}
                    </span>
                    <span style={{ fontSize: 12, color: colors.text.faint, whiteSpace: 'nowrap' }}>
                      {b.matchs} match{b.matchs > 1 ? 's' : ''}{b.victoires !== null ? ` · ${b.victoires} % V` : ''}
                    </span>
                    <span aria-hidden="true" style={{ fontSize: 12, color: colors.text.faint, transform: ouverte ? 'rotate(90deg)' : 'none' }}>›</span>
                  </button>
                  {ouverte && <>
                  <div style={{ margin: '10px 0' }}><BilanTuiles bilan={b} avecRpe /></div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text.secondary }}>
                    Niveau de pratique (visible dans Explorer)
                    <select value={niveaux[cleOuv] || ''} onChange={e => choisirNiveau(s.saison, eq.id, e.target.value)}
                      style={{ background: colors.background.base, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: radius.md, padding: '5px 8px', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                      <option value="">Non précisé</option>
                      {NIVEAUX_PRATIQUE.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {ligneInfo('Nature des buts marqués', b.natures.length ? b.natures.map(n => `${n.label} ${n.pct} %`).join(' · ') : nd)}
                    {ligneInfo('Blessures', b.sante.total === 0 ? 'aucune enregistrée' : `${b.sante.total} (${b.sante.gueries} guérie${b.sante.gueries > 1 ? 's' : ''}, ${b.sante.enCours} en cours, ${b.sante.joueursTouches} joueur${b.sante.joueursTouches > 1 ? 's' : ''} touché${b.sante.joueursTouches > 1 ? 's' : ''})`)}
                    {ligneInfo('Compétitions', <>
                      {b.parCompetition.length ? b.parCompetition.map(c => `${c.nom} ${c.v}V ${c.n}N ${c.d}D`).join(' · ') : nd}
                      {b.parCompetition.length > 0 && <span style={{ color: colors.text.faint }}> (classement non enregistré)</span>}
                    </>)}
                  </div>
                  </>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
