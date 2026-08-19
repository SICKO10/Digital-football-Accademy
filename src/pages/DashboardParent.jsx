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
  const [onglet, setOnglet] = useState('profil')

  const [reels, setReels] = useState([])
  const [matchsAVenir, setMatchsAVenir] = useState([])
  const [matchsPasses, setMatchsPasses] = useState([])
  const [prepResume, setPrepResume] = useState(null) // { dernierTest, seancesTotal, seancesFaites }
  const [planningAVenir, setPlanningAVenir] = useState([])
  const [dispoMap, setDispoMap] = useState({})
  const [notesCoachDetail, setNotesCoachDetail] = useState(null)
  const [analyses, setAnalyses] = useState([])
  const [visibleRecruteurs, setVisibleRecruteurs] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: accesData } = await supabase
        .from('parents_acces').select('joueur_id, permissions')
        .eq('parent_id', user.id).eq('statut', 'accepte').maybeSingle()
      if (!accesData) { navigate('/'); return }
      setAcces(accesData)

      const [{ data: pp }, { data: joueurProfil }, { data: affiliation }] = await Promise.all([
        supabase.from('profil_parent').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('prenom, nom, poste, club, region, ville, avatar_url, categorie, niveau_equipe, plan, abonnement_actif').eq('id', accesData.joueur_id).maybeSingle(),
        // presences_entrainement/stats_match référencent equipe_joueurs.id, pas
        // le compte du joueur — même chemin que partout ailleurs dans l'app
        // (chargerStatsJoueur, DashboardJoueur.jsx) : passer par l'affiliation
        // acceptée pour retrouver equipe_joueur_id ET educateur_id.
        supabase.from('affiliations').select('equipe_joueur_id, educateur_id').eq('joueur_id', accesData.joueur_id).eq('statut', 'accepte').maybeSingle(),
      ])

      setProfilParent(pp)
      setJoueur(joueurProfil)
      setFormParent({
        prenom: pp?.prenom || '', nom: pp?.nom || '', telephone: pp?.telephone || '',
        email: pp?.email || user.email || '', profession: pp?.profession || '',
      })
      // "Visible aux recruteurs" reflète exactement le critère utilisé par
      // DashboardRecruteur.jsx pour lister les joueurs (plan='joueur_pro' +
      // abonnement_actif) — pas de flag dédié. Aucun suivi de "qui a consulté
      // le profil" n'existe dans l'app (ni pour le joueur, ni ailleurs), donc
      // pas de liste de recruteurs affichée ici.
      setVisibleRecruteurs(joueurProfil?.plan === 'joueur_pro' && !!joueurProfil?.abonnement_actif)

      if (affiliation?.equipe_joueur_id) {
        const [{ data: statsMatch }, { data: notations }, { data: notesJoueur }] = await Promise.all([
          supabase.from('stats_match').select('buts, passes_dec, minutes, clean_sheet, carton_jaune, carton_rouge').eq('joueur_id', affiliation.equipe_joueur_id),
          supabase.from('notations_match').select('note, commentaire, created_at, matchs_equipe(adversaire, date, domicile, score_nous, score_eux)').eq('joueur_id', affiliation.equipe_joueur_id).eq('est_note_equipe', false).order('created_at', { ascending: false }).limit(5),
          supabase.from('notes_joueurs').select('technique, physique, mental, tactique, commentaire').eq('joueur_id', affiliation.equipe_joueur_id).eq('visible_joueur', true).maybeSingle(),
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
        setNotesCoachDetail(notesJoueur || null)
      }

      // ── Jogabonito : clips publiés par le joueur ──
      const { data: reelsData } = await supabase.from('reels').select('id, video_url, titre, description, created_at').eq('joueur_id', accesData.joueur_id).order('created_at', { ascending: false }).limit(10)
      setReels(reelsData || [])

      // ── Analyses vidéo reçues ──
      const { data: analysesData } = await supabase.from('demandes').select('id, titre, statut, poste, created_at, loom_url, rapport_pdf_url').eq('joueur_id', accesData.joueur_id).eq('statut', 'analyse').order('created_at', { ascending: false }).limit(10)
      setAnalyses(analysesData || [])

      if (affiliation?.educateur_id) {
        const aujourdHui = new Date().toISOString().split('T')[0]
        const dans60jours = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // ── Compétition : matchs à venir + passés ──
        const [{ data: aVenir }, { data: passes }] = await Promise.all([
          supabase.from('matchs_equipe').select('id, date, heure, lieu, adversaire, competition, domicile').eq('educateur_id', affiliation.educateur_id).gte('date', aujourdHui).order('date', { ascending: true }).limit(10),
          supabase.from('matchs_equipe').select('id, date, heure, lieu, adversaire, competition, domicile, score_nous, score_eux').eq('educateur_id', affiliation.educateur_id).lt('date', aujourdHui).order('date', { ascending: false }).limit(10),
        ])
        setMatchsAVenir(aVenir || [])
        setMatchsPasses(passes || [])

        // ── Planning : entraînements à venir + ma dispo déclarée ──
        const { data: entrainements } = await supabase.from('entrainements').select('id, date, description, heure, lieu').eq('educateur_id', affiliation.educateur_id).gte('date', aujourdHui).lte('date', dans60jours).order('date', { ascending: true }).limit(10)
        setPlanningAVenir(entrainements || [])
        const entrainementIds = (entrainements || []).map(e => e.id)
        if (entrainementIds.length > 0) {
          const { data: dispos } = await supabase.from('disponibilites').select('seance_id, statut').eq('joueur_id', accesData.joueur_id).in('seance_id', entrainementIds)
          setDispoMap(Object.fromEntries((dispos || []).map(d => [d.seance_id, d.statut])))
        }

        // ── Préparation physique : résumé du programme actif ──
        const { data: programme } = await supabase.from('programmes_prep').select('*').eq('educateur_id', affiliation.educateur_id).eq('statut', 'actif').order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (programme) {
          const [{ data: seances }, { data: soumissions }, { data: tests }] = await Promise.all([
            supabase.from('seances_prep').select('id').eq('programme_id', programme.id),
            supabase.from('soumissions_prep').select('seance_id').eq('joueur_id', accesData.joueur_id),
            supabase.from('tests_physiques').select('*').eq('joueur_id', accesData.joueur_id).order('date_test', { ascending: false }).limit(1),
          ])
          setPrepResume({
            nomProgramme: programme.nom || null,
            seancesTotal: (seances || []).length,
            seancesFaites: new Set((soumissions || []).map(s => s.seance_id)).size,
            dernierTest: tests?.[0] || null,
          })
        }
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

  // Permissions par section (parents_acces.permissions) — même mécanisme que
  // canViewSection pour les dirigeants, mais jamais configuré par le joueur :
  // toujours 'lecture' par défaut (cf. PARENT_PERMISSIONS_DEFAUT côté edge
  // functions). acces.permissions absent (ligne créée avant cette migration)
  // → tout reste visible, pas de régression pour les accès existants.
  const canViewSection = (id) => !acces?.permissions || acces.permissions[id] !== 'aucun'

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
        <div style={{ maxWidth: '880px', margin: '0 auto', padding: '2rem' }}>
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

          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '8px 14px', marginBottom: '16px', color: '#444', fontSize: '11px', textAlign: 'center' }}>
            👁️ Vue en lecture seule — Profil de {joueur?.prenom} {joueur?.nom}
          </div>

          {/* ── Onglets ── */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {[
              { id: 'profil', label: '👤 Profil' },
              { id: 'videos', label: '🎬 Jogabonito' },
              { id: 'competition', label: '🏆 Compétition' },
              { id: 'physique', label: '💪 Prépa physique' },
              { id: 'planning', label: '📅 Planning' },
              { id: 'notes', label: '📝 Notes coach' },
              { id: 'analyses', label: '🎯 Analyses' },
              { id: 'recruteurs', label: '🔍 Recruteurs' },
            ].filter(s => canViewSection(s.id)).map(s => (
              <button key={s.id} onClick={() => setOnglet(s.id)}
                style={{ background: onglet === s.id ? colors.accent.green : colors.background.surface, color: onglet === s.id ? colors.black : colors.text.dim, border: `1px solid ${onglet === s.id ? colors.accent.green : colors.border.default}`, borderRadius: '20px', padding: '7px 14px', fontSize: '12px', fontWeight: onglet === s.id ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {s.label}
              </button>
            ))}
          </div>

          {onglet === 'profil' && canViewSection('profil') && (
            <>
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
            </>
          )}

          {onglet === 'videos' && canViewSection('videos') && (
            reels.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '2rem' }}>Aucun clip publié pour l'instant.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
                {reels.map(r => (
                  <div key={r.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <video src={r.video_url} controls style={{ width: '100%', display: 'block', maxHeight: '320px', background: '#000' }} />
                    <div style={{ padding: '10px 12px' }}>
                      {r.titre && <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{r.titre}</p>}
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint }}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {onglet === 'competition' && canViewSection('competition') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Matchs à venir</h3>
                {matchsAVenir.length === 0 ? (
                  <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucun match à venir programmé.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchsAVenir.map(m => (
                      <div key={m.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire || 'Match'} {m.competition ? `· ${m.competition}` : ''}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}{m.heure ? ` · ${m.heure.slice(0, 5)}` : ''}{m.lieu ? ` · ${m.lieu}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Résultats récents</h3>
                {matchsPasses.length === 0 ? (
                  <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucun résultat enregistré.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {matchsPasses.map(m => (
                      <div key={m.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire || 'Match'}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{new Date(m.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</p>
                        </div>
                        {(m.score_nous != null && m.score_eux != null) && (
                          <div style={{ fontSize: '16px', fontWeight: 800 }}>{m.score_nous} — {m.score_eux}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {onglet === 'physique' && canViewSection('physique') && (
            prepResume ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>{prepResume.nomProgramme || 'Programme en cours'}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>{prepResume.seancesFaites} / {prepResume.seancesTotal} séances réalisées</p>
                </div>
                {prepResume.dernierTest && (
                  <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Dernier test physique</h3>
                    <p style={{ margin: 0, fontSize: '12px', color: colors.text.faint }}>{new Date(prepResume.dernierTest.date_test).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <pre style={{ margin: '10px 0 0', fontSize: '12px', color: colors.text.secondary, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                      {Object.entries(prepResume.dernierTest).filter(([k]) => !['id', 'joueur_id', 'date_test', 'created_at'].includes(k) && prepResume.dernierTest[k] != null).map(([k, v]) => `${k} : ${v}`).join('\n')}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '2rem' }}>Aucun programme de préparation physique actif pour l'instant.</p>
            )
          )}

          {onglet === 'planning' && canViewSection('planning') && (
            planningAVenir.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '2rem' }}>Aucun entraînement programmé pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {planningAVenir.map(e => {
                  const dispo = dispoMap[e.id]
                  const dispoLabel = dispo === 'present' ? '✓ Présent' : dispo === 'absent' ? '✕ Absent' : dispo === 'incertain' ? '? Incertain' : null
                  const dispoColor = dispo === 'present' ? colors.accent.green : dispo === 'absent' ? colors.accent.red : colors.text.faint
                  return (
                    <div key={e.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{e.description || 'Entraînement'}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{new Date(e.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}{e.heure ? ` · ${e.heure.slice(0, 5)}` : ''}{e.lieu ? ` · ${e.lieu}` : ''}</p>
                      </div>
                      {dispoLabel && <span style={{ fontSize: '12px', fontWeight: 700, color: dispoColor }}>{dispoLabel}</span>}
                    </div>
                  )
                })}
              </div>
            )
          )}

          {onglet === 'notes' && canViewSection('notes') && (
            notesCoachDetail ? (
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginBottom: notesCoachDetail.commentaire ? '16px' : 0 }}>
                  {[
                    { val: notesCoachDetail.technique, label: 'Technique' },
                    { val: notesCoachDetail.physique, label: 'Physique' },
                    { val: notesCoachDetail.mental, label: 'Mental' },
                    { val: notesCoachDetail.tactique, label: 'Tactique' },
                  ].filter(c => c.val != null).map(c => (
                    <div key={c.label} style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: colors.accent.green }}>{c.val}/10</p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: colors.text.faint }}>{c.label}</p>
                    </div>
                  ))}
                </div>
                {notesCoachDetail.commentaire && (
                  <p style={{ margin: 0, fontSize: '13px', color: colors.text.secondary, fontStyle: 'italic', borderTop: `1px solid ${colors.border.faint}`, paddingTop: '14px' }}>"{notesCoachDetail.commentaire}"</p>
                )}
              </div>
            ) : (
              <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '2rem' }}>Aucune note du coach partagée pour l'instant.</p>
            )
          )}

          {onglet === 'analyses' && canViewSection('analyses') && (
            analyses.length === 0 ? (
              <p style={{ color: colors.text.disabled, fontSize: '13px', textAlign: 'center', padding: '2rem' }}>Aucune analyse vidéo pour l'instant.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {analyses.map(a => (
                  <div key={a.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '10px', padding: '12px 16px' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{a.titre || 'Analyse vidéo'}{a.poste ? ` · ${a.poste}` : ''}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: colors.text.faint }}>{new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      {a.loom_url && <a href={a.loom_url} target="_blank" rel="noreferrer" style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 600 }}>🎬 Voir la vidéo</a>}
                      {a.rapport_pdf_url && <a href={a.rapport_pdf_url} target="_blank" rel="noreferrer" style={{ color: colors.accent.green, fontSize: '12px', fontWeight: 600 }}>📄 Voir le rapport</a>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {onglet === 'recruteurs' && canViewSection('recruteurs') && (
            <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: visibleRecruteurs ? colors.accent.green : colors.text.faint }}>
                {visibleRecruteurs ? '✓ Profil visible par les recruteurs' : '○ Profil non visible par les recruteurs'}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: colors.text.faint }}>
                {visibleRecruteurs
                  ? "Le profil apparaît dans les recherches du Scout Center."
                  : "Un abonnement Pro actif est nécessaire pour apparaître dans les recherches du Scout Center."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
