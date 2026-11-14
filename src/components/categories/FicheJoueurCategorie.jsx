import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { fetchToutesLignesIn } from '../../lib/supabasePagination'
import { bornesDatesSaison, saisonActuelle } from '../../lib/saison'
import {
  equipeAffichee, presencesParEquipe, matchsParEquipe, dernieresActivites, pastilleEquipe,
} from '../../lib/categoriesFiche'

// Saison d'un joueur équipe par équipe (bloc 9 du chantier catégories) :
// pastille de l'équipe principale (ou de la catégorie en effectif commun),
// tableau Entraînements, tableau Matchs, dernières activités. Chaque ligne
// est rangée selon l'équipe de l'événement, le total est la somme des lignes.
// Rien n'est affiché pour une fiche hors catégorie.
export default function FicheJoueurCategorie({ ficheId }) {
  const colors = useColors()
  const [etat, setEtat] = useState({ chargement: true })

  useEffect(() => {
    let annule = false
    async function charger() {
      const { data: fiche } = await supabase.from('equipe_joueurs')
        .select('id, joueur_id, categorie_id, club_categorie_id').eq('id', ficheId).maybeSingle()
      if (!fiche?.categorie_id) { if (!annule) setEtat({ chargement: false, vide: true }); return }

      const [{ data: categorie }, { data: equipes }, { data: soeurs }] = await Promise.all([
        supabase.from('categories').select('id, nom, mode').eq('id', fiche.categorie_id).maybeSingle(),
        supabase.from('club_categories').select('id, nom, equipe').eq('categorie_id', fiche.categorie_id),
        fiche.joueur_id
          ? supabase.from('equipe_joueurs').select('id').eq('categorie_id', fiche.categorie_id).eq('joueur_id', fiche.joueur_id)
          : Promise.resolve({ data: [] }),
      ])
      const ficheIds = [...new Set([ficheId, ...(soeurs || []).map(f => f.id)])]
      const equipeIds = (equipes || []).map(e => e.id)
      const { debut, fin } = bornesDatesSaison(saisonActuelle())

      const [{ data: stats }, { data: presences }, { data: matchs }, { data: entrainements }] = await Promise.all([
        fetchToutesLignesIn(ficheIds, ids => supabase.from('stats_match').select('joueur_id, match_id, buts, passes_dec, minutes').in('joueur_id', ids).order('match_id')),
        fetchToutesLignesIn(ficheIds, ids => supabase.from('presences_entrainement').select('joueur_id, entrainement_id, statut, present').in('joueur_id', ids).order('entrainement_id')),
        supabase.from('matchs_equipe').select('id, date, adversaire, club_categorie_id').in('club_categorie_id', equipeIds).gte('date', debut).lte('date', fin),
        supabase.from('entrainements').select('id, date, club_categorie_id').in('club_categorie_id', equipeIds).gte('date', debut).lte('date', fin),
      ])
      if (annule) return
      setEtat({
        chargement: false, categorie, equipes: equipes || [], stats: stats || [], presences: presences || [],
        matchs: matchs || [], entrainements: entrainements || [], principale: (equipes || []).find(e => e.id === fiche.club_categorie_id),
      })
    }
    charger().catch(e => { console.warn('Fiche par équipe : lecture impossible', e?.message); if (!annule) setEtat({ chargement: false, vide: true }) })
    return () => { annule = true }
  }, [ficheId])

  if (etat.chargement || etat.vide || !etat.categorie) return null
  const { categorie, equipes, stats, presences, matchs, entrainements, principale } = etat
  const nomEquipe = (id) => equipeAffichee(equipes.find(e => e.id === id))
  const aujourdHui = new Date().toISOString().split('T')[0]
  const pr = presencesParEquipe(presences, entrainements, aujourdHui)
  const ma = matchsParEquipe(stats, matchs)
  const activites = dernieresActivites(stats, matchs, presences, entrainements, aujourdHui)
  if (pr.total.seances === 0 && ma.total.matchs === 0) return null

  const accent = colors.accent.info
  const th = { padding: '6px 8px', textAlign: 'center', fontSize: '11px', color: colors.text.faint, fontWeight: 700 }
  const td = { padding: '8px', textAlign: 'center', fontSize: '12px', color: colors.text.primary }
  const tdNom = { ...td, textAlign: 'left' }
  const ligneTotal = { background: accent + alpha.subtle, fontWeight: 800 }
  const nomTotal = `Total ${categorie.nom}`
  const titre = (texte) => <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{texte}</p>

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <span style={{ display: 'inline-block', marginBottom: '12px', padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, color: accent, background: accent + alpha.subtle, border: `1px solid ${accent}${alpha.light}` }}>
        {pastilleEquipe(categorie, principale)}
      </span>

      {pr.total.seances > 0 && (
        <div style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
          {titre('Entraînements par équipe')}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, textAlign: 'left' }}>Équipe</th><th style={th}>Séances</th><th style={th}>Présent</th><th style={th}>Taux</th></tr></thead>
            <tbody>
              {pr.equipes.map(l => (
                <tr key={l.equipe_id} style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                  <td style={tdNom}>{nomEquipe(l.equipe_id)}</td><td style={td}>{l.seances}</td><td style={td}>{l.presents}</td>
                  <td style={td}>{Math.round(l.presents / l.seances * 100)}%</td>
                </tr>
              ))}
              <tr style={{ ...ligneTotal, borderTop: `1px solid ${colors.border.subtle}` }}>
                <td style={tdNom}>{nomTotal}</td><td style={td}>{pr.total.seances}</td><td style={td}>{pr.total.presents}</td>
                <td style={td}>{Math.round(pr.total.presents / pr.total.seances * 100)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {ma.total.matchs > 0 && (
        <div style={{ marginBottom: '1.25rem', overflowX: 'auto' }}>
          {titre('Matchs par équipe')}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, textAlign: 'left' }}>Équipe</th><th style={th}>Matchs</th><th style={th}>Minutes</th><th style={th}>Buts</th><th style={th}>Passes</th></tr></thead>
            <tbody>
              {ma.equipes.map(l => (
                <tr key={l.equipe_id} style={{ borderTop: `1px solid ${colors.border.subtle}` }}>
                  <td style={tdNom}>{nomEquipe(l.equipe_id)}</td><td style={td}>{l.matchs}</td><td style={td}>{l.minutes}</td><td style={td}>{l.buts}</td><td style={td}>{l.passes}</td>
                </tr>
              ))}
              <tr style={{ ...ligneTotal, borderTop: `1px solid ${colors.border.subtle}` }}>
                <td style={tdNom}>{nomTotal}</td><td style={td}>{ma.total.matchs}</td><td style={td}>{ma.total.minutes}</td><td style={td}>{ma.total.buts}</td><td style={td}>{ma.total.passes}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activites.length > 0 && (
        <div>
          {titre('Dernières activités')}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activites.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', background: colors.background.surface, borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: colors.text.primary }}>
                <span>
                  {a.type === 'match'
                    ? `Match${a.adversaire ? ` contre ${a.adversaire}` : ''} · ${a.minutes} min${a.buts ? ` · ${a.buts} but${a.buts > 1 ? 's' : ''}` : ''}`
                    : `Entraînement · ${a.present ? 'présent' : 'absent'}`}
                </span>
                <span style={{ color: colors.text.faint, flexShrink: 0 }}>{nomEquipe(a.equipe_id)} · {new Date(`${a.date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
