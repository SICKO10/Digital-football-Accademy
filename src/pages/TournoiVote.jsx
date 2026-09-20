import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import SelecteurRosterEquipe from '../components/SelecteurRosterEquipe'

// Une "inscription" (Phase C, formulaire public) n'est pas reliée à une
// ligne tournois_equipes (le roster du tableau/bracket, géré séparément côté
// club) — il n'existe donc pas de vraie clé pour exclure "sa propre équipe"
// des candidats. Comparaison approximative par nom, comme meilleursDuRang
// dans lib/tournoi.js pour un cas similaire.
const normalise = (s) => (s || '').trim().toLowerCase()
const estMonEquipe = (nomClubInscription, ...noms) => noms.some(n => n && normalise(n) === normalise(nomClubInscription))

const VIDE_VOTE = {
  vote_beau_jeu_equipe_id: '',
  vote_fairplay_equipe_id: '',
  vote_supporters_fairplay_equipe_id: '',
  vote_meilleur_joueur_nom: '',
  vote_meilleur_joueur_equipe: '',
  vote_meilleur_gardien_nom: '',
  vote_meilleur_gardien_equipe: '',
}

export default function TournoiVote() {
  const { code, inscriptionCode } = useParams()
  const [tournoi, setTournoi] = useState(null)
  const [inscription, setInscription] = useState(null)
  const [equipes, setEquipes] = useState([])
  const [buteurs, setButeurs] = useState([])
  const [roster, setRoster] = useState([]) // lister_roster_tournoi(tournoi_id) — joueurs inscrits par club, pour choisir par n° de maillot
  const [loading, setLoading] = useState(true)
  const [dejaVote, setDejaVote] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [vote, setVote] = useState(VIDE_VOTE)

  const charger = useCallback(async () => {
    const { data: t } = await supabase.from('tournois_organises').select('*').eq('code_public', code?.toUpperCase()).maybeSingle()
    if (!t) { setLoading(false); return }
    setTournoi(t)

    const { data: ins } = await supabase.from('tournois_inscriptions').select('*')
      .eq('code_confirmation', inscriptionCode?.toUpperCase()).eq('tournoi_id', t.id).maybeSingle()
    setInscription(ins)

    const [{ data: eqs }, { data: buts }, { data: rosterData }] = await Promise.all([
      supabase.from('tournois_equipes').select('*').eq('tournoi_id', t.id).order('poule'),
      supabase.from('tournois_buteurs').select('*').eq('tournoi_id', t.id),
      supabase.rpc('lister_roster_tournoi', { p_tournoi_id: t.id }),
    ])
    setEquipes(eqs || [])
    setButeurs(buts || [])
    setRoster(rosterData || [])
    setLoading(false)
  }, [code, inscriptionCode])

  useEffect(() => { charger() }, [charger])

  async function soumettre() {
    if (!inscription) return
    setSubmitting(true)
    setErreur(null)
    const { error } = await supabase.from('tournois_votes').insert({
      tournoi_id: tournoi.id,
      inscription_id: inscription.id,
      ...vote,
      vote_beau_jeu_equipe_id: vote.vote_beau_jeu_equipe_id || null,
      vote_fairplay_equipe_id: vote.vote_fairplay_equipe_id || null,
      vote_supporters_fairplay_equipe_id: vote.vote_supporters_fairplay_equipe_id || null,
    })
    setSubmitting(false)
    if (error) {
      if (error.code === '23505') { setDejaVote(true); return }
      console.error('vote error:', error)
      setErreur("Erreur lors de l'enregistrement du vote. Réessaie.")
      return
    }
    setSubmitted(true)
  }

  const st = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' },
    header: { background: colors.background.surface, borderBottom: `1px solid ${colors.border.subtle}`, padding: '24px', textAlign: 'center' },
    body: { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '12px', padding: '24px', marginBottom: '20px' },
    input: { background: colors.background.raised, border: `1px solid ${colors.border.strong}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '14px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '14px 28px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', width: '100%', fontFamily: 'Inter, sans-serif' },
    option: (sel) => ({ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${sel ? colors.accent.green : colors.border.faint}`, background: sel ? colors.accent.green + '11' : colors.background.raised, marginBottom: '8px' }),
    radio: (sel) => ({ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${sel ? colors.accent.green : colors.border.strong}`, background: sel ? colors.accent.green : 'transparent', flexShrink: 0 }),
  }

  if (loading) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: colors.accent.green, fontSize: '16px' }}>Chargement…</div>
    </div>
  )

  if (!tournoi || !inscription) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <p style={{ color: colors.text.faint }}>Lien de vote invalide ou tournoi introuvable.</p>
    </div>
  )

  if (inscription.statut !== 'validee') return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', textAlign: 'center', padding: '24px' }}>
      <p style={{ color: colors.text.faint, maxWidth: '360px' }}>Le vote s'ouvre une fois l'inscription de <strong style={{ color: colors.text.primary }}>{inscription.nom_club}</strong> validée par l'organisateur.</p>
    </div>
  )

  if (dejaVote || submitted) return (
    <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: colors.accent.green }}>{submitted ? 'Vote enregistré !' : 'Vous avez déjà voté'}</h2>
        <p style={{ color: colors.text.faint, marginTop: '12px' }}>Merci pour votre participation au tournoi <strong style={{ color: colors.text.primary }}>{tournoi.nom}</strong>.</p>
        <a href={`/tournoi/${code}`} style={{ color: colors.accent.green, fontSize: '14px', fontWeight: 600, display: 'block', marginTop: '20px' }}>
          → Voir le classement et les résultats
        </a>
      </div>
    </div>
  )

  const statsButeurs = {}
  buteurs.forEach(b => {
    const cle = `${b.prenom_joueur} ${b.nom_joueur}`.trim()
    if (!statsButeurs[cle]) statsButeurs[cle] = { nom: cle, equipe: equipes.find(e => e.id === b.equipe_id)?.nom || '', total: 0 }
    statsButeurs[cle].total += b.nb_buts
  })
  const topButeurs = Object.values(statsButeurs)
    .filter(b => !estMonEquipe(inscription.nom_club, b.equipe))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const equipesAdverses = equipes.filter(e => !estMonEquipe(inscription.nom_club, e.nom, e.club))

  return (
    <div style={st.page}>
      <div style={st.header}>
        <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Digital Football · Votes distinctions</div>
        <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 900 }}>{tournoi.nom}</h1>
        <p style={{ color: colors.text.faint, margin: 0, fontSize: '14px' }}>Vote de <strong style={{ color: colors.text.primary }}>{inscription.nom_club}</strong></p>
      </div>

      <div style={st.body}>
        <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', marginBottom: '28px' }}>
          Chaque équipe dispose d'<strong style={{ color: colors.text.primary }}>un vote</strong> par distinction. Les catégories par équipe proposent toutes les équipes du tournoi ; pour les catégories individuelles, vous ne pouvez pas voter pour un joueur de votre propre équipe.
        </p>

        {[
          { champ: 'vote_beau_jeu_equipe_id', titre: 'Plus beau jeu', sousTitre: "L'équipe qui a proposé le jeu le plus agréable à regarder" },
          { champ: 'vote_fairplay_equipe_id', titre: 'Équipe la plus fair-play', sousTitre: 'L\'équipe qui a montré le meilleur esprit sportif' },
          { champ: 'vote_supporters_fairplay_equipe_id', titre: 'Supporters les plus fair-play', sousTitre: "Le public qui a soutenu dans le respect et la bonne humeur" },
        ].map(({ champ, titre, sousTitre }) => (
          <div key={champ} style={st.card}>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>{titre}</h3>
            <p style={{ color: colors.text.disabled, fontSize: '12px', margin: '0 0 16px' }}>{sousTitre}</p>
            {equipes.map(eq => (
              <div key={eq.id} style={st.option(vote[champ] === eq.id)}
                onClick={() => setVote(v => ({ ...v, [champ]: eq.id }))}>
                <div style={st.radio(vote[champ] === eq.id)} />
                <div>
                  <div style={{ fontWeight: 600 }}>{eq.nom}</div>
                  {eq.club && <div style={{ color: colors.text.disabled, fontSize: '12px' }}>{eq.club}</div>}
                </div>
                <span style={{ marginLeft: 'auto', color: colors.text.disabled, fontSize: '12px' }}>Poule {eq.poule}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={st.card}>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>Meilleur joueur du tournoi</h3>
          <p style={{ color: colors.text.disabled, fontSize: '12px', margin: '0 0 16px' }}>Le joueur qui vous a le plus impressionné — dépliez une équipe pour choisir par numéro de maillot</p>

          {topButeurs.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: colors.text.disabled, fontSize: '11px', marginBottom: '8px', fontWeight: 700, textTransform: 'uppercase' }}>Suggestions (top buteurs)</div>
              {topButeurs.map(b => (
                <div key={b.nom} style={st.option(vote.vote_meilleur_joueur_nom === b.nom && vote.vote_meilleur_joueur_equipe === b.equipe)}
                  onClick={() => setVote(v => ({ ...v, vote_meilleur_joueur_nom: b.nom, vote_meilleur_joueur_equipe: b.equipe }))}>
                  <div style={st.radio(vote.vote_meilleur_joueur_nom === b.nom)} />
                  <div style={{ fontWeight: 600 }}>{b.nom}</div>
                  <span style={{ color: colors.text.disabled, fontSize: '12px' }}>{b.equipe}</span>
                  <span style={{ color: colors.accent.green, fontSize: '12px', marginLeft: 'auto', fontWeight: 700 }}>{b.total} but{b.total > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}

          <SelecteurRosterEquipe equipes={equipesAdverses} roster={roster}
            nomChoisi={vote.vote_meilleur_joueur_nom} equipeChoisie={vote.vote_meilleur_joueur_equipe}
            onChoisir={(nom, equipe) => setVote(v => ({ ...v, vote_meilleur_joueur_nom: nom, vote_meilleur_joueur_equipe: equipe }))}
            colors={colors} st={st} />
        </div>

        <div style={st.card}>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>Meilleur gardien</h3>
          <p style={{ color: colors.text.disabled, fontSize: '12px', margin: '0 0 16px' }}>Le gardien le plus décisif du tournoi — dépliez une équipe pour choisir par numéro de maillot</p>
          <SelecteurRosterEquipe equipes={equipesAdverses} roster={roster}
            nomChoisi={vote.vote_meilleur_gardien_nom} equipeChoisie={vote.vote_meilleur_gardien_equipe}
            onChoisir={(nom, equipe) => setVote(v => ({ ...v, vote_meilleur_gardien_nom: nom, vote_meilleur_gardien_equipe: equipe }))}
            colors={colors} st={st} />
        </div>

        {erreur && <p style={{ color: colors.accent.red, fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{erreur}</p>}

        {(() => {
          const aucunVote = !vote.vote_beau_jeu_equipe_id && !vote.vote_fairplay_equipe_id && !vote.vote_supporters_fairplay_equipe_id
            && !vote.vote_meilleur_joueur_nom.trim() && !vote.vote_meilleur_gardien_nom.trim()
          return (
            <button style={{ ...st.btn, opacity: submitting || aucunVote ? 0.5 : 1 }}
              disabled={submitting || aucunVote}
              onClick={soumettre}>
              {submitting ? 'Envoi en cours…' : 'Soumettre mon vote'}
            </button>
          )
        })()}

        <div style={{ textAlign: 'center', marginTop: '24px', color: colors.text.ghost, fontSize: '12px' }}>
          Propulsé par <span style={{ color: colors.accent.green, fontWeight: 700 }}>Digital Football</span>
        </div>
      </div>
    </div>
  )
}
