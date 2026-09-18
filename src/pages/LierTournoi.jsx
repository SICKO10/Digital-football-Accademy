import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { colors } from '../tokens'
import { saisonActuelle } from '../lib/saison'

export default function LierTournoi() {
  const { code, prenom, nom } = useParams()
  const navigate = useNavigate()
  const [tournoi, setTournoi] = useState(null)
  const [joueurInscrit, setJoueurInscrit] = useState(null)
  const [user, setUser] = useState(null)
  const [dejaLie, setDejaLie] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statut, setStatut] = useState('idle') // idle | loading | succes | erreur

  const redirectLien = `/lier-tournoi/${code}/${prenom}/${nom}`

  const charger = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    setUser(u)

    const { data: t } = await supabase.from('tournois_organises').select('*').eq('code_public', code?.toUpperCase()).maybeSingle()
    if (!t) { setLoading(false); return }
    setTournoi(t)

    // Recherche côté serveur (SECURITY DEFINER) — ne renvoie que le strict
    // nécessaire (pas email/date de naissance), cf. supabase_joueur_badges.sql.
    const { data: joueurs } = await supabase.rpc('trouver_joueur_inscrit_tournoi', {
      p_code_public: code, p_prenom: decodeURIComponent(prenom || ''), p_nom: decodeURIComponent(nom || ''),
    })
    const joueur = joueurs?.[0] || null
    setJoueurInscrit(joueur)

    if (u && joueur) {
      const { data: lien } = await supabase.from('tournois_joueurs_comptes').select('id')
        .eq('joueur_inscription_id', joueur.id).eq('user_id', u.id).maybeSingle()
      if (lien) setDejaLie(true)
    }
    setLoading(false)
  }, [code, prenom, nom])

  useEffect(() => { charger() }, [charger])

  async function attribuerBadges() {
    const saison = saisonActuelle()
    const { data: badgesExistants } = await supabase.from('joueur_badges').select('type').eq('joueur_id', user.id).eq('source_id', tournoi.id)
    const dejaAttribue = (type) => (badgesExistants || []).some(b => b.type === type)
    const badges = []
    const nomComplet = `${joueurInscrit.prenom} ${joueurInscrit.nom}`.trim().toLowerCase()

    if (!dejaAttribue('tournoi_participation')) {
      badges.push({
        joueur_id: user.id, saison, type: 'tournoi_participation',
        label: tournoi.nom, sous_label: tournoi.lieu || '',
        competition: tournoi.nom, club: joueurInscrit.nom_club || '', categorie: tournoi.categorie_age || '',
        couleur: '#6366f1', icone: '⚽', source_type: 'tournoi', source_id: tournoi.id,
      })
    }

    const [{ data: buteurs }, { data: votes }] = await Promise.all([
      supabase.from('tournois_buteurs').select('*').eq('tournoi_id', tournoi.id),
      supabase.from('tournois_votes').select('*').eq('tournoi_id', tournoi.id),
    ])

    if (!dejaAttribue('meilleur_buteur')) {
      const totaux = {}
      ;(buteurs || []).forEach(b => {
        const cle = `${b.prenom_joueur} ${b.nom_joueur}`.trim().toLowerCase()
        totaux[cle] = (totaux[cle] || 0) + b.nb_buts
      })
      const monTotal = totaux[nomComplet] || 0
      const maxButs = Math.max(0, ...Object.values(totaux))
      if (monTotal > 0 && monTotal === maxButs) {
        badges.push({
          joueur_id: user.id, saison, type: 'meilleur_buteur',
          label: `Meilleur buteur — ${tournoi.nom}`, sous_label: `${monTotal} but${monTotal > 1 ? 's' : ''}`,
          competition: tournoi.nom, couleur: '#f59e0b', icone: '⚽', source_type: 'tournoi', source_id: tournoi.id,
        })
      }
    }

    // Distinctions votées — même dépouillement que PalmaresVotes
    // (TournoiOrganise.jsx) : le joueur reçoit le badge s'il est le meneur
    // (au moins 1 vote), pour rester cohérent avec ce que le club affiche.
    const meneur = (champNom) => {
      const compte = {}
      ;(votes || []).forEach(v => { if (v[champNom]) compte[v[champNom]] = (compte[v[champNom]] || 0) + 1 })
      const entree = Object.entries(compte).sort(([, a], [, b]) => b - a)[0]
      return entree ? { nom: entree[0], votes: entree[1] } : null
    }

    if (!dejaAttribue('meilleur_joueur')) {
      const top = meneur('vote_meilleur_joueur_nom')
      if (top && top.nom.trim().toLowerCase() === nomComplet) {
        badges.push({
          joueur_id: user.id, saison, type: 'meilleur_joueur',
          label: `Meilleur joueur — ${tournoi.nom}`, sous_label: 'Élu par les équipes participantes',
          competition: tournoi.nom, couleur: '#f59e0b', icone: '⭐', source_type: 'tournoi', source_id: tournoi.id,
        })
      }
    }

    if (!dejaAttribue('meilleur_gardien')) {
      const top = meneur('vote_meilleur_gardien_nom')
      if (top && top.nom.trim().toLowerCase() === nomComplet) {
        badges.push({
          joueur_id: user.id, saison, type: 'meilleur_gardien',
          label: `Meilleur gardien — ${tournoi.nom}`, sous_label: 'Élu par les équipes participantes',
          competition: tournoi.nom, couleur: '#3b82f6', icone: '🧤', source_type: 'tournoi', source_id: tournoi.id,
        })
      }
    }

    if (badges.length > 0) {
      const { error } = await supabase.from('joueur_badges').insert(badges)
      if (error) console.error('attribuerBadges error:', error)
    }
  }

  async function lierCompte() {
    if (!user || !joueurInscrit || !tournoi) return
    setStatut('loading')

    const { error } = await supabase.from('tournois_joueurs_comptes').insert({
      tournoi_id: tournoi.id,
      inscription_id: joueurInscrit.inscription_id,
      joueur_inscription_id: joueurInscrit.id,
      user_id: user.id,
      verifie: true,
    })
    if (error && error.code !== '23505') {
      console.error('lierCompte error:', error)
      setStatut('erreur')
      return
    }

    await attribuerBadges()
    setStatut('succes')
  }

  const st = {
    page: { minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' },
    card: { background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', padding: '40px 32px', maxWidth: '440px', width: '100%', textAlign: 'center' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '14px 28px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '10px', fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.accent.green, border: `1px solid ${colors.accent.green}33`, borderRadius: '8px', padding: '14px 28px', cursor: 'pointer', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '10px', fontFamily: 'Inter, sans-serif' },
  }

  if (loading) return (
    <div style={st.page}><div style={{ color: colors.accent.green }}>Chargement…</div></div>
  )

  if (!tournoi || !joueurInscrit) return (
    <div style={st.page}>
      <div style={st.card}>
        <p style={{ color: colors.text.faint }}>Lien invalide ou joueur introuvable dans ce tournoi.</p>
      </div>
    </div>
  )

  return (
    <div style={st.page}>
      <div style={st.card}>
        <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 800, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Digital Football</div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>Lie ton compte au tournoi</h1>
        <p style={{ color: colors.text.faint, fontSize: '14px', margin: '0 0 24px' }}>{tournoi.nom}</p>

        <div style={{ background: colors.background.raised, borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '16px' }}>{joueurInscrit.prenom} {joueurInscrit.nom}</div>
          {joueurInscrit.numero_maillot && <div style={{ color: colors.text.faint, fontSize: '13px' }}>#{joueurInscrit.numero_maillot}</div>}
          <div style={{ color: colors.text.disabled, fontSize: '12px', marginTop: '4px' }}>{joueurInscrit.nom_club}</div>
        </div>

        {dejaLie ? (
          <div>
            <p style={{ color: colors.accent.green, fontWeight: 700 }}>Compte déjà lié à ce tournoi.</p>
            <button style={st.btn} onClick={() => navigate('/dashboard-joueur')}>Voir mes badges</button>
          </div>
        ) : statut === 'succes' ? (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: colors.accent.green }}>Badges attribués !</h2>
            <p style={{ color: colors.text.faint, fontSize: '14px', margin: '12px 0 8px' }}>Tes récompenses du tournoi ont été ajoutées à ta carte saison.</p>
            <button style={st.btn} onClick={() => navigate('/dashboard-joueur')}>Voir ma carte saison</button>
          </div>
        ) : !user ? (
          <div>
            <p style={{ color: colors.text.faint, fontSize: '14px', marginBottom: '4px' }}>Connecte-toi ou crée un compte gratuit pour recevoir tes badges.</p>
            <button style={st.btn} onClick={() => navigate(`/register?redirect=${encodeURIComponent(redirectLien)}`)}>
              Créer mon compte (gratuit)
            </button>
            <button style={st.btnGhost} onClick={() => navigate(`/login?redirect=${encodeURIComponent(redirectLien)}`)}>
              J'ai déjà un compte
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: colors.text.faint, fontSize: '14px', marginBottom: '8px' }}>Connecté en tant que <strong style={{ color: colors.text.primary }}>{user.email}</strong></p>
            {statut === 'erreur' && <p style={{ color: colors.accent.red, fontSize: '13px' }}>Erreur lors de la liaison. Réessaie.</p>}
            <button style={{ ...st.btn, opacity: statut === 'loading' ? 0.6 : 1 }} onClick={lierCompte} disabled={statut === 'loading'}>
              {statut === 'loading' ? 'Liaison en cours…' : 'Lier mon compte et recevoir mes badges'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
