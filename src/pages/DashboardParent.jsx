import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOutSafe } from '../supabase'
import { colors, alpha } from '../tokens'

// Dashboard parent : lecture seule du profil d'un seul joueur (celui qui a
// invité ce parent, cf. parents_acces). Page neuve et volontairement simple —
// pas un DashboardJoueur.jsx restreint par props (bien plus gros, bien plus
// de fonctionnalités interactives à neutraliser une par une pour un usage
// lecture seule ; même logique que ClubPublic.jsx, qui est déjà une vue
// simplifiée séparée plutôt qu'un DashboardEducateur.jsx en lecture seule).
export default function DashboardParent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [acces, setAcces] = useState(null) // { joueur_id }
  const [joueur, setJoueur] = useState(null)
  const [statsJoueur, setStatsJoueur] = useState(null)
  const [notesRecues, setNotesRecues] = useState([])
  const [profilParent, setProfilParent] = useState(null)
  const [formParent, setFormParent] = useState({ prenom: '', nom: '', telephone: '', email: '', profession: '' })
  const [savingProfil, setSavingProfil] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: accesData } = await supabase
        .from('parents_acces').select('joueur_id')
        .eq('parent_id', user.id).eq('statut', 'accepte').maybeSingle()
      if (!accesData) { navigate('/'); return }
      setAcces(accesData)

      const [{ data: pp }, { data: joueurProfil }, { data: affiliation }] = await Promise.all([
        supabase.from('profil_parent').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('prenom, nom, poste, club, region, ville, avatar_url, categorie, niveau_equipe').eq('id', accesData.joueur_id).maybeSingle(),
        // presences_entrainement/stats_match référencent equipe_joueurs.id, pas
        // le compte du joueur — même chemin que partout ailleurs dans l'app
        // (chargerStatsJoueur, DashboardJoueur.jsx) : passer par l'affiliation
        // acceptée pour retrouver equipe_joueur_id.
        supabase.from('affiliations').select('equipe_joueur_id').eq('joueur_id', accesData.joueur_id).eq('statut', 'accepte').maybeSingle(),
      ])

      setProfilParent(pp)
      setJoueur(joueurProfil)
      setFormParent({
        prenom: pp?.prenom || '', nom: pp?.nom || '', telephone: pp?.telephone || '',
        email: pp?.email || user.email || '', profession: pp?.profession || '',
      })

      if (affiliation?.equipe_joueur_id) {
        const [{ data: statsMatch }, { data: notations }] = await Promise.all([
          supabase.from('stats_match').select('buts, passes_dec, minutes, clean_sheet, carton_jaune, carton_rouge').eq('joueur_id', affiliation.equipe_joueur_id),
          supabase.from('notations_match').select('note, commentaire, created_at, matchs_equipe(adversaire, date, domicile, score_nous, score_eux)').eq('joueur_id', affiliation.equipe_joueur_id).eq('est_note_equipe', false).order('created_at', { ascending: false }).limit(5),
        ])
        if (statsMatch?.length) {
          setStatsJoueur({
            buts: statsMatch.reduce((s, m) => s + (m.buts || 0), 0),
            passes: statsMatch.reduce((s, m) => s + (m.passes_dec || 0), 0),
            minutes: statsMatch.reduce((s, m) => s + (m.minutes || 0), 0),
            matchsJoues: statsMatch.filter(m => (m.minutes || 0) > 0).length,
            cleanSheets: statsMatch.filter(m => m.clean_sheet).length,
          })
        }
        setNotesRecues(notations || [])
      }

      setLoading(false)
    }
    init()
  }, [])

  const sauvegarderProfilParent = async () => {
    const { prenom, nom, telephone, email, profession } = formParent
    if (!prenom || !nom || !telephone || !email || !profession) return
    setSavingProfil(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profil_parent').upsert({
      user_id: user.id, joueur_id: acces.joueur_id,
      prenom, nom, telephone, email, profession,
      profil_complet: true,
    }, { onConflict: 'user_id' })
    setSavingProfil(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setProfilParent(p => ({ ...(p || {}), prenom, nom, telephone, email, profession, profil_complet: true }))
  }

  const handleLogout = async () => { await signOutSafe(); navigate('/login') }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green, fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
    </div>
  )

  const profilIncomplet = !profilParent?.profil_complet
  const champsRequis = ['prenom', 'nom', 'telephone', 'email', 'profession']
  const formValide = champsRequis.every(c => formParent[c]?.trim())
  const inputStyle = { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '14px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
      {/* ── Modale profil obligatoire ── */}
      {profilIncomplet && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '32px', maxWidth: '460px', width: '100%' }}>
            <h2 style={{ fontWeight: 800, marginBottom: '8px' }}>👋 Bienvenue sur Digital Football</h2>
            <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '24px' }}>
              Avant d'accéder au profil de {joueur?.prenom || 'votre enfant'}, merci de compléter votre profil. Ces informations sont transmises au club.
            </p>
            {[
              { label: 'Prénom', champ: 'prenom', type: 'text' },
              { label: 'Nom', champ: 'nom', type: 'text' },
              { label: 'Téléphone', champ: 'telephone', type: 'tel' },
              { label: 'Email', champ: 'email', type: 'email' },
              { label: 'Profession', champ: 'profession', type: 'text' },
            ].map(({ label, champ, type }) => (
              <div key={champ} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px' }}>{label}</label>
                <input type={type} value={formParent[champ]} onChange={e => setFormParent(prev => ({ ...prev, [champ]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <button onClick={sauvegarderProfilParent} disabled={!formValide || savingProfil}
              style={{ width: '100%', background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '8px', opacity: formValide ? 1 : 0.4 }}>
              {savingProfil ? 'Enregistrement...' : '✅ Confirmer mon profil'}
            </button>
            <p style={{ color: colors.text.ghost, fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>Tous les champs sont obligatoires</p>
          </div>
        </div>
      )}

      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: `1px solid ${colors.border.subtle}` }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
        <span onClick={handleLogout} style={{ color: colors.text.faint, fontSize: '13px', cursor: 'pointer' }}>Déconnexion</span>
      </nav>

      {!profilIncomplet && (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem' }}>
          <p style={{ color: colors.text.faint, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Profil de mon enfant · Lecture seule</p>

          {/* ── En-tête joueur ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
            {joueur?.avatar_url
              ? <img src={joueur.avatar_url} alt="" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: colors.accent.green + alpha.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: colors.accent.green }}>
                  {(joueur?.prenom?.[0] || '?')}{joueur?.nom?.[0] || ''}
                </div>}
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{joueur?.prenom} {joueur?.nom}</h1>
              <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>
                {joueur?.poste || '—'}{joueur?.club ? ` · ${joueur.club}` : ''}{joueur?.categorie ? ` · ${joueur.categorie}` : ''}
              </p>
            </div>
          </div>

          {/* ── Stats ── */}
          {statsJoueur && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              {[
                { val: statsJoueur.matchsJoues, label: 'Matchs joués' },
                { val: statsJoueur.buts, label: 'Buts' },
                { val: statsJoueur.passes, label: 'Passes D.' },
                { val: statsJoueur.minutes, label: 'Minutes' },
                { val: statsJoueur.cleanSheets, label: 'Clean sheets' },
              ].map(s => (
                <div key={s.label} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: colors.accent.green }}>{s.val}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Dernières évaluations coach ── */}
          {notesRecues.length > 0 && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px' }}>Dernières évaluations coach</h3>
              {notesRecues.map((n, i) => {
                const m = n.matchs_equipe
                const note = Number(n.note)
                const c = note >= 7 ? colors.accent.green : note >= 5 ? colors.accent.amber : colors.accent.red
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 0', borderBottom: i < notesRecues.length - 1 ? `1px solid ${colors.border.faint}` : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, color: colors.text.primary, fontWeight: 600, fontSize: '14px' }}>{m?.domicile ? 'vs' : '@'} {m?.adversaire || 'Match'}</p>
                      <p style={{ margin: '2px 0 0', color: colors.text.ghost, fontSize: '12px' }}>{m?.date ? new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''}</p>
                      {n.commentaire && <p style={{ margin: '6px 0 0', color: colors.text.secondary, fontSize: '12px', fontStyle: 'italic' }}>"{n.commentaire}"</p>}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: c, marginLeft: '16px', flexShrink: 0 }}>{n.note}/10</div>
                  </div>
                )
              })}
            </div>
          )}

          {!statsJoueur && notesRecues.length === 0 && (
            <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '2rem' }}>Pas encore de statistiques disponibles pour l'instant.</p>
          )}
        </div>
      )}
    </div>
  )
}
