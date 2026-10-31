import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { radius } from '../../tokens'
import { fetchToutesLignes, fetchToutesLignesIn } from '../../lib/supabasePagination'
import { rpeDeReponse } from '../../lib/rpe'
import { saisonActuelle, saisonDeDate, libelleSaison, aSaisonsPassees, MESSAGE_AUCUNE_SAISON_ARCHIVEE } from '../../lib/saison'
import { bilanSaisonEquipe } from '../../lib/statsSaison'

// Carrière du coach : une carte par saison, une ligne de bilan par équipe encadrée.
// Tout est recalculé depuis les données datées du coach (matchs, séances, RPE,
// blessures) : une équipe apparaît dans une saison si le coach y a un match ou
// une séance. La saison en cours est incluse (étiquetée « en cours »).
const SANS_EQUIPE = 'sans-equipe'

export default function MesSaisonsCoach({ educateurId }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const [etat, setEtat] = useState({ chargement: true })

  useEffect(() => {
    if (!educateurId) return
    let annule = false
    ;(async () => {
      const [m, e, ej, dem] = await Promise.all([
        fetchToutesLignes(() => supabase.from('matchs_equipe').select('id, date, club_categorie_id, score_nous, score_eux, competition, buts_detail').eq('educateur_id', educateurId).order('id')),
        fetchToutesLignes(() => supabase.from('entrainements').select('id, date, club_categorie_id, presences_entrainement(statut, present)').eq('educateur_id', educateurId).order('id')),
        fetchToutesLignes(() => supabase.from('equipe_joueurs').select('id, club_categorie_id').eq('educateur_id', educateurId).order('id')),
        fetchToutesLignes(() => supabase.from('seances_notes_demandes').select('id, date_seance, club_categorie_id').eq('educateur_id', educateurId).order('id')),
      ])
      if (m.error || e.error || ej.error || dem.error) { if (!annule) setEtat({ erreur: true }); return }
      const demandeIds = dem.data.map(d => d.id)
      const joueurIds = ej.data.map(j => j.id)
      const [rep, bl] = await Promise.all([
        demandeIds.length ? fetchToutesLignesIn(demandeIds, ids => supabase.from('seances_notes_joueurs').select('id, demande_id, rpe, charge_travail').in('demande_id', ids).order('id')) : { data: [] },
        joueurIds.length ? fetchToutesLignesIn(joueurIds, ids => supabase.from('blessures').select('id, equipe_joueur_id, statut, saison, date_debut').in('equipe_joueur_id', ids).order('id')) : { data: [] },
      ])
      const catIds = [...new Set([...m.data, ...e.data].map(x => x.club_categorie_id).filter(Boolean))]
      const { data: cats } = catIds.length
        ? await supabase.from('club_categories').select('id, nom, equipe, club_id').in('id', catIds)
        : { data: [] }
      const clubIds = [...new Set((cats || []).map(c => c.club_id).filter(Boolean))]
      const { data: clubs } = clubIds.length
        ? await supabase.from('profiles_public').select('id, club').in('id', clubIds)
        : { data: [] }
      if (annule) return
      setEtat({ matchs: m.data, entrainements: e.data, joueursEq: ej.data, demandes: dem.data, reponses: rep.data || [], blessures: bl.data || [], cats: cats || [], clubs: clubs || [] })
    })()
    return () => { annule = true }
  }, [educateurId])

  const saisons = useMemo(() => {
    if (!etat.matchs) return []
    const { matchs, entrainements, joueursEq, demandes, reponses, blessures, cats, clubs } = etat
    const catParId = Object.fromEntries(cats.map(c => [c.id, c]))
    const clubParId = Object.fromEntries(clubs.map(c => [c.id, c.club]))
    const equipeDeJoueur = Object.fromEntries(joueursEq.map(j => [j.id, j.club_categorie_id || SANS_EQUIPE]))
    const demandeParId = Object.fromEntries(demandes.map(d => [d.id, d]))
    const cle = (id) => id || SANS_EQUIPE

    // saison -> équipe -> morceaux de données
    const arbre = {}
    const poche = (saison, eq) => {
      arbre[saison] ||= {}
      return (arbre[saison][eq] ||= { matchs: [], entrainements: [], blessures: [], rpes: [] })
    }
    matchs.forEach(x => { const s = saisonDeDate(x.date); if (s) poche(s, cle(x.club_categorie_id)).matchs.push(x) })
    entrainements.forEach(x => { const s = saisonDeDate(x.date); if (s) poche(s, cle(x.club_categorie_id)).entrainements.push(x) })
    reponses.forEach(r => {
      const d = demandeParId[r.demande_id]
      const v = rpeDeReponse(r)
      const s = d && saisonDeDate(d.date_seance)
      if (s && v) poche(s, cle(d.club_categorie_id)).rpes.push(v.valeur)
    })
    // Une blessure n'est comptée que pour une équipe déjà présente cette saison-là.
    blessures.forEach(b => {
      const s = b.saison || saisonDeDate(b.date_debut)
      const eq = equipeDeJoueur[b.equipe_joueur_id]
      if (s && arbre[s]?.[eq]) arbre[s][eq].blessures.push(b)
    })

    return Object.keys(arbre).sort().reverse().map(saison => ({
      saison,
      enCours: saison === saisonActuelle(),
      equipes: Object.entries(arbre[saison]).map(([eq, donnees]) => {
        const cat = catParId[eq]
        return {
          id: eq,
          club: cat ? clubParId[cat.club_id] || null : null,
          nom: cat ? [cat.nom, cat.equipe].filter(Boolean).join(' ') : 'Équipe non précisée',
          bilan: bilanSaisonEquipe(donnees),
        }
      }).sort((a, b) => a.nom.localeCompare(b.nom)),
    }))
  }, [etat])

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: isMobile ? 14 : '16px 18px', minWidth: 0 }
  const eyebrow = (texte) => (
    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{texte}</p>
  )
  const nd = <span style={{ color: colors.text.faint }}>n.d.</span>
  const val = (v, suffixe = '') => (v === null || v === undefined ? nd : `${v}${suffixe}`)

  if (etat.chargement) return <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>
  if (etat.erreur) return <div style={carte}><p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>Impossible de charger tes saisons. Réessaie dans un instant.</p></div>

  const tuile = (label, contenu) => (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 11, color: colors.text.faint }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{contenu}</p>
    </div>
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
      {saisons.map(s => (
        <div key={s.saison} style={carte}>
          <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>
            Saison {libelleSaison(s.saison)}
            {s.enCours && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: colors.accent.blue }}>en cours</span>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {s.equipes.map(eq => {
              const b = eq.bilan
              return (
                <div key={eq.id} style={{ borderTop: `1px solid ${colors.border.subtle}`, paddingTop: 12 }}>
                  {eyebrow(eq.club ? `${eq.club} · ${eq.nom}` : eq.nom)}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 12, marginTop: 8 }}>
                    {tuile('Matchs joués', b.matchs)}
                    {tuile('Victoires', val(b.victoires, ' %'))}
                    {tuile('Nuls', val(b.nuls, ' %'))}
                    {tuile('Défaites', val(b.defaites, ' %'))}
                    {tuile('Buts marqués / match', val(b.butsMarquesParMatch))}
                    {tuile('Buts encaissés / match', val(b.butsEncaissesParMatch))}
                    {tuile('Présence entraînement', val(b.presence, ' %'))}
                    {tuile('RPE moyen', b.rpeMoyen === null ? nd : `${b.rpeMoyen}/10`)}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: colors.text.secondary }}>
                    <span>Nature des buts marqués : {b.natures.length ? b.natures.map(n => `${n.label} ${n.pct} %`).join(' · ') : nd}</span>
                    <span>Blessures : {b.sante.total === 0 ? 'aucune enregistrée' : `${b.sante.total} (${b.sante.gueries} guérie${b.sante.gueries > 1 ? 's' : ''}, ${b.sante.enCours} en cours, ${b.sante.joueursTouches} joueur${b.sante.joueursTouches > 1 ? 's' : ''} touché${b.sante.joueursTouches > 1 ? 's' : ''})`}</span>
                    <span>
                      Compétitions : {b.parCompetition.length
                        ? b.parCompetition.map(c => `${c.nom} ${c.v}V ${c.n}N ${c.d}D`).join(' · ')
                        : nd}
                      {b.parCompetition.length > 0 && <span style={{ color: colors.text.faint }}> (le classement n'est pas enregistré)</span>}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
