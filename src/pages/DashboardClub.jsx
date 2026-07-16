import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const CATEGORIES_STANDARD = ['U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Senior']
const EQUIPES = ['A', 'B']

export default function DashboardClub() {
  const navigate = useNavigate()
  const [club, setClub] = useState(null)
  const [clubId, setClubId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('categories')

  // Catégories & équipes
  const [categories, setCategories] = useState([])
  const [showAddCategorie, setShowAddCategorie] = useState(false)
  const [newCategorie, setNewCategorie] = useState({ nom: 'U13', equipe: 'A', educateur_id: '' })
  const [savingCategorie, setSavingCategorie] = useState(false)

  // Éducateurs affiliés
  const [educateursAffilies, setEducateursAffilies] = useState([])
  const [searchEducateur, setSearchEducateur] = useState('')
  const [resultatsEducateurs, setResultatsEducateurs] = useState([])
  const [invitingId, setInvitingId] = useState(null)
  const [codeClub, setCodeClub] = useState('')

  // Classements
  const [statsParCategorie, setStatsParCategorie] = useState({})
  const [loadingClassements, setLoadingClassements] = useState(false)
  const [categorieActive, setCategorieActive] = useState(null)
  const [triClassement, setTriClassement] = useState('buts')
  const [clubMatchs, setClubMatchs] = useState({}) // { categorieId: [matchs] }
  const [loadingMatchs, setLoadingMatchs] = useState(false)

  const st = {
    page: { background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' },
    navbar: { background: '#111', borderBottom: '1px solid #222', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' },
    logo: { color: '#4ade80', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '1px' },
    content: { padding: '2rem', maxWidth: '1100px', margin: '0 auto' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' },
    tab: (active) => ({ padding: '10px 20px', borderRadius: '8px', border: active ? 'none' : '1px solid #333', background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#aaa', fontWeight: active ? 700 : 400, cursor: 'pointer', fontSize: '13px' }),
    card: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.25rem' },
    btnSolid: { background: '#4ade80', color: '#000', border: 'none', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'transparent', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px' },
    input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', width: '100%' },
    label: { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' },
  }

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (activeTab === 'classements' && Object.keys(statsParCategorie).length === 0) {
      chargerClassements()
    }
  }, [activeTab, categories])

  useEffect(() => {
    if (activeTab === 'classements' && categorieActive) {
      chargerMatchsCategorie(categorieActive)
    }
  }, [activeTab, categorieActive])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.plan !== 'club') { navigate('/'); return }
    setClubId(user.id)
    setClub(profile)

    // Génère un code club s'il n'existe pas encore
    if (!profile.code_club) {
      const code = generateCode()
      await supabase.from('profiles').update({ code_club: code }).eq('id', user.id)
      setCodeClub(code)
    } else {
      setCodeClub(profile.code_club)
    }

    await Promise.all([chargerCategories(user.id), chargerEducateurs(user.id)])
    setLoading(false)
  }

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const chargerCategories = async (uid) => {
    const { data } = await supabase
      .from('club_categories')
      .select('*, educateur:educateur_id(prenom, nom)')
      .eq('club_id', uid)
      .order('nom')
    setCategories(data || [])
  }

  const chargerEducateurs = async (uid) => {
    const { data } = await supabase
      .from('club_educateurs')
      .select('*, educateur:educateur_id(prenom, nom, email, avatar_url)')
      .eq('club_id', uid)
      .order('created_at', { ascending: false })
    setEducateursAffilies(data || [])
  }

  const chargerClassements = async () => {
    if (categories.length === 0) return
    setLoadingClassements(true)
    const educateurIds = [...new Set(categories.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setLoadingClassements(false); return }

    const { data: joueurs } = await supabase
      .from('equipe_joueurs')
      .select('id, prenom, nom, poste, educateur_id, club_categorie_id, numero_maillot')
      .in('educateur_id', educateurIds)

    if (!joueurs || joueurs.length === 0) { setStatsParCategorie({}); setLoadingClassements(false); return }

    const joueurIds = joueurs.map(j => j.id)

    const [{ data: statsMatch }, { data: presences }, { data: notes }] = await Promise.all([
      supabase.from('stats_match').select('joueur_id, buts, passes_dec, minutes, clean_sheet').in('joueur_id', joueurIds),
      supabase.from('presences_entrainement').select('joueur_id, statut, point_seance').in('joueur_id', joueurIds),
      supabase.from('notes_joueurs').select('joueur_id, technique, physique, mental, tactique').in('joueur_id', joueurIds),
    ])

    const buildStats = (joueurId) => {
      const sm = (statsMatch || []).filter(s => s.joueur_id === joueurId)
      const pr = (presences || []).filter(p => p.joueur_id === joueurId)
      const note = (notes || []).find(n => n.joueur_id === joueurId)
      const totalPresences = pr.filter(p => p.statut && p.statut !== 'non_saisi').length
      const presents = pr.filter(p => p.statut === 'present' || p.statut === 'convoque').length
      const points = pr.filter(p => p.point_seance).length
      const noteGlobale = note ? ((note.technique + note.physique + note.mental + note.tactique) / 4) : null
      return {
        buts: sm.reduce((s, r) => s + (r.buts || 0), 0),
        passes: sm.reduce((s, r) => s + (r.passes_dec || 0), 0),
        matchsJoues: sm.filter(r => (r.minutes || 0) > 0).length,
        cleanSheets: sm.filter(r => r.clean_sheet).length,
        tauxPresence: totalPresences ? Math.round((presents / totalPresences) * 100) : null,
        pointsSeance: points,
        noteGlobale,
      }
    }

    const grouped = {}
    categories.forEach(cat => {
      const joueursCat = joueurs.filter(j => j.club_categorie_id === cat.id)
      grouped[cat.id] = { categorie: cat, joueurs: joueursCat.map(j => ({ ...j, stats: buildStats(j.id) })) }
    })

    setStatsParCategorie(grouped)
    if (!categorieActive && categories.length > 0) setCategorieActive(categories[0].id)
    setLoadingClassements(false)
  }

  const chargerMatchsCategorie = async (categorieId) => {
    const cat = categories.find(c => c.id === categorieId)
    if (!cat || !cat.educateur_id || clubMatchs[categorieId]) return
    setLoadingMatchs(true)
    const { data } = await supabase
      .from('matchs_equipe')
      .select('*')
      .eq('educateur_id', cat.educateur_id)
      .order('date', { ascending: false })
    setClubMatchs(prev => ({ ...prev, [categorieId]: data || [] }))
    setLoadingMatchs(false)
  }

  const calculerClassementEquipe = (matchs, nomClub) => {
    const equipes = {}
    matchs.filter(m => m.score_nous !== '' && m.score_nous !== null && m.score_eux !== '' && m.score_eux !== null).forEach(m => {
      const nous = parseInt(m.score_nous)
      const eux = parseInt(m.score_eux)
      if (!equipes[nomClub]) equipes[nomClub] = { nom: nomClub, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: true }
      if (!equipes[m.adversaire]) equipes[m.adversaire] = { nom: m.adversaire, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: false }
      equipes[nomClub].j++; equipes[m.adversaire].j++
      equipes[nomClub].bp += nous; equipes[nomClub].bc += eux
      equipes[m.adversaire].bp += eux; equipes[m.adversaire].bc += nous
      if (nous > eux) { equipes[nomClub].v++; equipes[nomClub].pts += 3; equipes[m.adversaire].d++ }
      else if (nous < eux) { equipes[m.adversaire].v++; equipes[m.adversaire].pts += 3; equipes[nomClub].d++ }
      else { equipes[nomClub].n++; equipes[nomClub].pts++; equipes[m.adversaire].n++; equipes[m.adversaire].pts++ }
    })
    return Object.values(equipes).sort((a, b) => b.pts - a.pts || (b.bp - b.bc) - (a.bp - a.bc))
  }

  const [autoAssignLoading, setAutoAssignLoading] = useState(false)
  const [autoAssignResult, setAutoAssignResult] = useState(null)

  const autoAssignerJoueurs = async () => {
    setAutoAssignLoading(true)
    setAutoAssignResult(null)
    const educateurIds = [...new Set(categories.map(c => c.educateur_id).filter(Boolean))]
    if (educateurIds.length === 0) { setAutoAssignLoading(false); return }

    const { data: joueurs } = await supabase
      .from('equipe_joueurs')
      .select('id, categorie, club_categorie_id')
      .in('educateur_id', educateurIds)
      .is('club_categorie_id', null)

    if (!joueurs || joueurs.length === 0) {
      setAutoAssignResult({ count: 0 })
      setAutoAssignLoading(false)
      return
    }

    let count = 0
    for (const j of joueurs) {
      if (!j.categorie) continue
      const match = categories.find(c => c.nom.toLowerCase() === j.categorie.toLowerCase().trim() && c.equipe === 'A')
      if (match) {
        await supabase.from('equipe_joueurs').update({ club_categorie_id: match.id }).eq('id', j.id)
        count++
      }
    }
    setAutoAssignResult({ count })
    setAutoAssignLoading(false)
    setStatsParCategorie({}) // force le rechargement des classements
  }

  // ── Gestion catégories ──
  const ajouterCategorie = async () => {
    if (!newCategorie.nom) return
    setSavingCategorie(true)
    await supabase.from('club_categories').insert({
      club_id: clubId,
      nom: newCategorie.nom,
      equipe: newCategorie.equipe,
      educateur_id: newCategorie.educateur_id || null,
    })
    await chargerCategories(clubId)
    setNewCategorie({ nom: 'U13', equipe: 'A', educateur_id: '' })
    setShowAddCategorie(false)
    setSavingCategorie(false)
  }

  const supprimerCategorie = async (id) => {
    if (!confirm('Supprimer cette catégorie/équipe ?')) return
    await supabase.from('club_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  // ── Gestion éducateurs (méthode 1 : recherche + invitation) ──
  const rechercherEducateurs = async (query) => {
    setSearchEducateur(query)
    if (query.length < 2) { setResultatsEducateurs([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, prenom, nom, email, club, avatar_url')
      .eq('plan', 'educateur')
      .or(`prenom.ilike.%${query}%,nom.ilike.%${query}%,club.ilike.%${query}%`)
      .limit(8)
    setResultatsEducateurs(data || [])
  }

  const inviterEducateur = async (educateurId) => {
    setInvitingId(educateurId)
    const existing = educateursAffilies.find(e => e.educateur_id === educateurId)
    if (existing) { setInvitingId(null); return }
    await supabase.from('club_educateurs').insert({
      club_id: clubId, educateur_id: educateurId, statut: 'en_attente', methode: 'invite',
    })
    await chargerEducateurs(clubId)
    setSearchEducateur('')
    setResultatsEducateurs([])
    setInvitingId(null)
  }

  const retirerEducateur = async (id) => {
    if (!confirm('Retirer cet éducateur du club ?')) return
    await supabase.from('club_educateurs').delete().eq('id', id)
    setEducateursAffilies(prev => prev.filter(e => e.id !== id))
  }

  const accepterEducateur = async (id) => {
    await supabase.from('club_educateurs').update({ statut: 'accepte' }).eq('id', id)
    await chargerEducateurs(clubId)
  }

  const copierCode = () => {
    navigator.clipboard.writeText(codeClub)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/') }

  if (loading) return <div style={{ ...st.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#4ade80' }}>Chargement...</p></div>

  const educateursAcceptes = educateursAffilies.filter(e => e.statut === 'accepte')
  const educateursEnAttente = educateursAffilies.filter(e => e.statut === 'en_attente')

  return (
    <div style={st.page}>
      <nav style={st.navbar}>
        <span style={st.logo}>⬡ DIGITAL FOOTBALL — Club</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '13px', color: '#666' }}>{club?.club || club?.prenom}</span>
          <button style={st.btnSecondary} onClick={handleLogout}>Déconnexion</button>
        </div>
      </nav>

      <div style={st.content}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>{club?.club || 'Mon club'}</h1>
          <p style={{ margin: 0, color: '#555', fontSize: '13px' }}>{categories.length} catégorie{categories.length !== 1 ? 's' : ''} · {educateursAcceptes.length} éducateur{educateursAcceptes.length !== 1 ? 's' : ''} affilié{educateursAcceptes.length !== 1 ? 's' : ''}</p>
        </div>

        <div style={st.tabs}>
          {[
            { id: 'categories', label: '📋 Catégories & Équipes' },
            { id: 'educateurs', label: `👥 Éducateurs${educateursEnAttente.length ? ` (${educateursEnAttente.length})` : ''}` },
            { id: 'classements', label: '🏆 Classements' },
            { id: 'recrutement', label: '🔍 Recrutement' },
            { id: 'profil', label: '⭐ Profil club' },
          ].map(t => (
            <button key={t.id} style={st.tab(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* ── CATÉGORIES ── */}
        {activeTab === 'categories' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem' }}>
              <button style={st.btnSecondary} onClick={autoAssignerJoueurs} disabled={autoAssignLoading}>
                {autoAssignLoading ? '⏳ Assignation...' : '⚡ Auto-assigner les joueurs (équipe A)'}
              </button>
              <button style={st.btnSolid} onClick={() => setShowAddCategorie(true)}>+ Ajouter une catégorie</button>
            </div>

            {autoAssignResult && (
              <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem', color: '#4ade80', fontSize: '13px' }}>
                ✅ {autoAssignResult.count} joueur{autoAssignResult.count !== 1 ? 's' : ''} assigné{autoAssignResult.count !== 1 ? 's' : ''} automatiquement (équipe A par défaut — ajuste manuellement si besoin pour l'équipe B)
              </div>
            )}

            {showAddCategorie && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={st.label}>Catégorie</label>
                    <select style={st.input} value={newCategorie.nom} onChange={e => setNewCategorie(p => ({ ...p, nom: e.target.value }))}>
                      {CATEGORIES_STANDARD.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>Équipe</label>
                    <select style={st.input} value={newCategorie.equipe} onChange={e => setNewCategorie(p => ({ ...p, equipe: e.target.value }))}>
                      {EQUIPES.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={st.label}>Éducateur responsable</label>
                    <select style={st.input} value={newCategorie.educateur_id} onChange={e => setNewCategorie(p => ({ ...p, educateur_id: e.target.value }))}>
                      <option value="">— Aucun pour l'instant —</option>
                      {educateursAcceptes.map(e => (
                        <option key={e.educateur_id} value={e.educateur_id}>{e.educateur?.prenom} {e.educateur?.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={st.btnSolid} onClick={ajouterCategorie} disabled={savingCategorie}>{savingCategorie ? 'Ajout...' : 'Ajouter'}</button>
                  <button style={st.btnSecondary} onClick={() => setShowAddCategorie(false)}>Annuler</button>
                </div>
              </div>
            )}

            {categories.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
                Aucune catégorie créée. Commence par ajouter U13, U15... avec les équipes A/B.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {CATEGORIES_STANDARD.map(nom => {
                  const cats = categories.filter(c => c.nom === nom)
                  if (!cats.length) return null
                  return (
                    <div key={nom} style={st.card}>
                      <p style={{ margin: '0 0 10px', fontWeight: 800, color: '#4ade80', fontSize: '14px' }}>{nom}</p>
                      {cats.map(c => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 12px', marginBottom: '6px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Équipe {c.equipe}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>
                              {c.educateur ? `${c.educateur.prenom} ${c.educateur.nom}` : 'Pas d\'éducateur assigné'}
                            </p>
                          </div>
                          <button onClick={() => supprimerCategorie(c.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── ÉDUCATEURS ── */}
        {activeTab === 'educateurs' && (
          <>
            {/* Code club */}
            <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '14px' }}>🔑 Ton code club</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Partage ce code à tes éducateurs — ils peuvent rejoindre depuis leur dashboard.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontWeight: 800, fontSize: '18px', padding: '8px 18px', borderRadius: '10px', letterSpacing: '3px', fontFamily: 'monospace' }}>{codeClub}</span>
                <button onClick={copierCode} style={st.btnSecondary}>📋 Copier</button>
              </div>
            </div>

            {/* Recherche & invitation */}
            <div style={{ ...st.card, marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '14px' }}>🔍 Inviter un éducateur</p>
              <input
                style={st.input}
                placeholder="Rechercher par nom, prénom, club..."
                value={searchEducateur}
                onChange={e => rechercherEducateurs(e.target.value)}
              />
              {resultatsEducateurs.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {resultatsEducateurs.map(e => {
                    const dejaInvite = educateursAffilies.some(a => a.educateur_id === e.id)
                    return (
                      <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.prenom} {e.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>{e.club || e.email}</p>
                        </div>
                        <button
                          onClick={() => inviterEducateur(e.id)}
                          disabled={dejaInvite || invitingId === e.id}
                          style={{ ...st.btnSolid, opacity: dejaInvite ? 0.4 : 1, fontSize: '12px', padding: '6px 14px' }}>
                          {dejaInvite ? 'Déjà invité' : invitingId === e.id ? '...' : 'Inviter'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* En attente */}
            {educateursEnAttente.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#f59e0b' }}>⏳ En attente de validation ({educateursEnAttente.length})</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {educateursEnAttente.map(e => (
                    <div key={e.id} style={{ ...st.card, borderColor: '#f59e0b30', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>Méthode : {e.methode === 'code' ? 'a rejoint via code' : 'invité par le club'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => accepterEducateur(e.id)} style={st.btnSolid}>✅ Accepter</button>
                        <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440' }}>Refuser</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliés */}
            <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '13px', color: '#4ade80' }}>✅ Éducateurs affiliés ({educateursAcceptes.length})</p>
            {educateursAcceptes.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Aucun éducateur affilié pour le moment.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {educateursAcceptes.map(e => (
                  <div key={e.id} style={{ ...st.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700, fontSize: '12px' }}>
                        {e.educateur?.prenom?.[0]}{e.educateur?.nom?.[0]}
                      </div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{e.educateur?.prenom} {e.educateur?.nom}</p>
                    </div>
                    <button onClick={() => retirerEducateur(e.id)} style={{ ...st.btnSecondary, color: '#ef4444', borderColor: '#ef444440' }}>Retirer</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'classements' && (() => {
          const TRIS = [
            { key: 'buts', label: '⚽ Buteurs', color: '#4ade80' },
            { key: 'passes', label: '🎯 Passeurs', color: '#60a5fa' },
            { key: 'matchsJoues', label: '📅 Matchs joués', color: '#a78bfa' },
            { key: 'tauxPresence', label: '🏃 Présence', color: '#34d399', unit: '%' },
            { key: 'pointsSeance', label: '⭐ Points séance', color: '#fbbf24' },
            { key: 'noteGlobale', label: '📝 Note éducateur', color: '#f59e0b', unit: '/5' },
          ]
          const catData = categorieActive ? statsParCategorie[categorieActive] : null
          const triActif = TRIS.find(t => t.key === triClassement) || TRIS[0]
          const sorted = catData ? [...catData.joueurs].sort((a, b) => (b.stats[triClassement] || 0) - (a.stats[triClassement] || 0)) : []

          if (categories.length === 0) {
            return <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>Crée d'abord des catégories dans l'onglet précédent.</div>
          }
          if (loadingClassements) {
            return <p style={{ color: '#4ade80', textAlign: 'center', padding: '2rem' }}>Chargement des classements...</p>
          }

          return (
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setCategorieActive(c.id)} style={st.tab(categorieActive === c.id)}>
                    {c.nom} — {c.equipe}
                  </button>
                ))}
              </div>

              {/* ── Résultats & classement équipe ── */}
              {(() => {
                const matchsCat = clubMatchs[categorieActive] || []
                const nomEquipe = `${club?.club || 'Mon équipe'} ${categories.find(c => c.id === categorieActive)?.equipe || ''}`
                const classementEquipe = calculerClassementEquipe(matchsCat, nomEquipe)
                const derniersMatchs = matchsCat.slice(0, 5)
                return (
                  <div style={{ marginBottom: '2rem' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', marginBottom: '10px' }}>🏆 Classement de l'équipe</p>
                    {loadingMatchs ? (
                      <p style={{ color: '#555', fontSize: '13px' }}>Chargement...</p>
                    ) : classementEquipe.length === 0 ? (
                      <p style={{ color: '#444', fontSize: '13px', marginBottom: '1.5rem' }}>Aucun résultat de match enregistré par l'éducateur pour cette catégorie.</p>
                    ) : (
                      <div style={{ ...st.card, overflow: 'auto', marginBottom: '1.5rem' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                              {['#', 'Équipe', 'J', 'V', 'N', 'D', 'BP', 'BC', 'Pts'].map(h => (
                                <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Équipe' ? 'left' : 'center', color: '#555', fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {classementEquipe.map((e, i) => (
                              <tr key={e.nom} style={{ borderBottom: '1px solid #141414', background: e.moi ? '#4ade8008' : 'transparent' }}>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#555' }}>{i + 1}</td>
                                <td style={{ padding: '8px 10px', fontWeight: e.moi ? 700 : 400, color: e.moi ? '#4ade80' : '#fff' }}>{e.nom}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{e.j}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#4ade80' }}>{e.v}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#f59e0b' }}>{e.n}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ef4444' }}>{e.d}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{e.bp}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>{e.bc}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{e.pts}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {derniersMatchs.length > 0 && (
                      <>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginBottom: '10px' }}>⚽ Derniers résultats</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.5rem' }}>
                          {derniersMatchs.map(m => {
                            const aScore = m.score_nous !== '' && m.score_nous !== null
                            const nous = parseInt(m.score_nous)
                            const eux = parseInt(m.score_eux)
                            const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                            const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#ef4444' : '#f59e0b'
                            return (
                              <div key={m.id} style={{ ...st.card, display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                                {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{resultat}</span>}
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>{m.domicile ? 'vs' : '@'} {m.adversaire}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>{new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{m.competition ? ` · ${m.competition}` : ''}</p>
                                </div>
                                {aScore && <span style={{ fontWeight: 800, fontSize: '14px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              {!catData || catData.joueurs.length === 0 ? (
                <div style={{ ...st.card, textAlign: 'center', padding: '3rem', color: '#555' }}>
                  Aucun joueur rattaché à cette catégorie pour l'instant.<br />
                  <span style={{ fontSize: '12px', color: '#444' }}>L'éducateur doit lier ses joueurs à cette catégorie club.</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {TRIS.map(t => (
                      <button key={t.key} onClick={() => setTriClassement(t.key)}
                        style={{ background: triClassement === t.key ? t.color + '20' : '#111', border: `1px solid ${triClassement === t.key ? t.color + '60' : '#222'}`, color: triClassement === t.key ? t.color : '#555', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ ...st.card, overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: '#444', fontSize: '11px', width: '40px' }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '11px' }}>Joueur</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#444', fontSize: '11px' }}>Poste</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: triActif.color, fontSize: '11px' }}>{triActif.label}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((j, i) => {
                          const val = j.stats[triClassement]
                          return (
                            <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: i < 3 ? triActif.color : '#444' }}>{i + 1}</td>
                              <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                              <td style={{ padding: '10px 12px', color: '#666' }}>{j.poste || '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: triActif.color }}>
                                {val !== null && val !== undefined ? (typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val) : '—'}{triActif.unit === '%' ? '%' : ''}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )
        })()}
        {activeTab === 'recrutement' && <p style={{ color: '#555' }}>🚧 Onglet Recrutement — Partie 3, à venir</p>}
        {activeTab === 'profil' && <p style={{ color: '#555' }}>🚧 Onglet Profil club — Partie 4, à venir</p>}
      </div>
    </div>
  )
}
