import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function DashboardEducateur() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState(null)
  const [profil, setProfil] = useState(null)
  const [activeSection, setActiveSection] = useState('equipe')
  const [loading, setLoading] = useState(true)

  // Équipe
  const [joueurs, setJoueurs] = useState([])
  const [showAddJoueur, setShowAddJoueur] = useState(false)
  const [newJoueur, setNewJoueur] = useState({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
  const [savingJoueur, setSavingJoueur] = useState(false)
  const [joueurActif, setJoueurActif] = useState(null)

  // Matchs
  const [matchs, setMatchs] = useState([])
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [newMatch, setNewMatch] = useState({ date: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
  const [savingMatch, setSavingMatch] = useState(false)
  const [matchActif, setMatchActif] = useState(null)
  const [statsMatch, setStatsMatch] = useState({})

  // Entraînements
  const [entrainements, setEntrainements] = useState([])
  const [showAddEntrainement, setShowAddEntrainement] = useState(false)
  const [newEntrainement, setNewEntrainement] = useState({ date: '', description: '' })
  const [presences, setPresences] = useState({})
  const [entrainementActif, setEntrainementActif] = useState(null)

  // Notes
  const [notes, setNotes] = useState({})
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!p || p.plan !== 'educateur') { navigate('/'); return }
    setUserId(user.id)
    setProfil(p)
    await Promise.all([chargerJoueurs(user.id), chargerMatchs(user.id), chargerEntrainements(user.id), chargerNotes(user.id)])
    setLoading(false)
  }

  const chargerJoueurs = async (uid) => {
    const { data } = await supabase.from('equipe_joueurs').select('*').eq('educateur_id', uid).order('nom')
    setJoueurs(data || [])
  }

  const chargerMatchs = async (uid) => {
    const { data } = await supabase.from('matchs_equipe').select('*, stats_match(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setMatchs(data || [])
  }

  const chargerEntrainements = async (uid) => {
    const { data } = await supabase.from('entrainements').select('*, presences_entrainement(*)').eq('educateur_id', uid).order('date', { ascending: false })
    setEntrainements(data || [])
  }

  const chargerNotes = async (uid) => {
    const { data } = await supabase.from('notes_joueurs').select('*').eq('educateur_id', uid)
    if (data) {
      const map = {}
      data.forEach(n => { map[n.joueur_id] = n })
      setNotes(map)
    }
  }

  const ajouterJoueur = async () => {
    if (!newJoueur.prenom || !newJoueur.nom) return
    setSavingJoueur(true)
    await supabase.from('equipe_joueurs').insert({ ...newJoueur, educateur_id: userId })
    await chargerJoueurs(userId)
    setNewJoueur({ prenom: '', nom: '', poste: '', categorie: '', numero_maillot: '', date_naissance: '', numero_licence: '' })
    setShowAddJoueur(false)
    setSavingJoueur(false)
  }

  const supprimerJoueur = async (id) => {
    if (!confirm('Supprimer ce joueur ?')) return
    await supabase.from('equipe_joueurs').delete().eq('id', id)
    setJoueurs(prev => prev.filter(j => j.id !== id))
    if (joueurActif?.id === id) setJoueurActif(null)
  }

  const ajouterMatch = async () => {
    if (!newMatch.adversaire || !newMatch.date) return
    setSavingMatch(true)
    await supabase.from('matchs_equipe').insert({ ...newMatch, educateur_id: userId, domicile: newMatch.domicile })
    await chargerMatchs(userId)
    setNewMatch({ date: '', adversaire: '', domicile: true, competition: '', score_nous: '', score_eux: '' })
    setShowAddMatch(false)
    setSavingMatch(false)
  }

  const sauvegarderStatsMatch = async (matchId) => {
    const entries = Object.entries(statsMatch[matchId] || {})
    for (const [joueurId, s] of entries) {
      await supabase.from('stats_match').upsert({
        match_id: matchId, joueur_id: joueurId, educateur_id: userId,
        minutes: s.minutes || 0, buts: s.buts || 0, passes_dec: s.passes_dec || 0,
        clean_sheet: s.clean_sheet || false, carton_jaune: s.carton_jaune || false, carton_rouge: s.carton_rouge || false
      }, { onConflict: 'match_id,joueur_id' })
    }
    await chargerMatchs(userId)
    setMatchActif(null)
    setStatsMatch({})
  }

  const ajouterEntrainement = async () => {
    if (!newEntrainement.date) return
    const { data } = await supabase.from('entrainements').insert({ ...newEntrainement, educateur_id: userId }).select().single()
    if (data) {
      // Initialiser présences à false pour tous les joueurs
      const presRows = joueurs.map(j => ({ entrainement_id: data.id, joueur_id: j.id, educateur_id: userId, present: false }))
      if (presRows.length) await supabase.from('presences_entrainement').insert(presRows)
    }
    await chargerEntrainements(userId)
    setNewEntrainement({ date: '', description: '' })
    setShowAddEntrainement(false)
  }

  const togglePresence = async (entrainementId, joueurId, actuel) => {
    await supabase.from('presences_entrainement').upsert(
      { entrainement_id: entrainementId, joueur_id: joueurId, educateur_id: userId, present: !actuel },
      { onConflict: 'entrainement_id,joueur_id' }
    )
    await chargerEntrainements(userId)
  }

  const sauvegarderNote = async (joueurId, noteData) => {
    setSavingNote(true)
    await supabase.from('notes_joueurs').upsert(
      { joueur_id: joueurId, educateur_id: userId, ...noteData },
      { onConflict: 'joueur_id,educateur_id' }
    )
    await chargerNotes(userId)
    setSavingNote(false)
  }

  // Classement calculé
  const classement = () => {
    const equipes = {}
    matchs.filter(m => m.score_nous !== '' && m.score_eux !== '').forEach(m => {
      const nous = parseInt(m.score_nous)
      const eux = parseInt(m.score_eux)
      const nomNous = profil?.club || 'Mon équipe'
      if (!equipes[nomNous]) equipes[nomNous] = { nom: nomNous, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: true }
      if (!equipes[m.adversaire]) equipes[m.adversaire] = { nom: m.adversaire, j: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, pts: 0, moi: false }
      equipes[nomNous].j++; equipes[m.adversaire].j++
      equipes[nomNous].bp += nous; equipes[nomNous].bc += eux
      equipes[m.adversaire].bp += eux; equipes[m.adversaire].bc += nous
      if (nous > eux) { equipes[nomNous].v++; equipes[nomNous].pts += 3; equipes[m.adversaire].d++ }
      else if (nous < eux) { equipes[m.adversaire].v++; equipes[m.adversaire].pts += 3; equipes[nomNous].d++ }
      else { equipes[nomNous].n++; equipes[nomNous].pts++; equipes[m.adversaire].n++; equipes[m.adversaire].pts++ }
    })
    return Object.values(equipes).sort((a, b) => b.pts - a.pts || (b.bp - b.bc) - (a.bp - a.bc))
  }

  // Stats globales joueur
  const statsGlobalesJoueur = (joueurId) => {
    const allStats = matchs.flatMap(m => (m.stats_match || []).filter(s => s.joueur_id === joueurId))
    return {
      matchs: allStats.filter(s => s.minutes > 0).length,
      minutes: allStats.reduce((s, r) => s + (r.minutes || 0), 0),
      buts: allStats.reduce((s, r) => s + (r.buts || 0), 0),
      passes_dec: allStats.reduce((s, r) => s + (r.passes_dec || 0), 0),
      clean_sheets: allStats.filter(s => s.clean_sheet).length,
      cartons_j: allStats.filter(s => s.carton_jaune).length,
      cartons_r: allStats.filter(s => s.carton_rouge).length,
    }
  }

  const tauxPresence = (joueurId) => {
    if (!entrainements.length) return null
    const total = entrainements.length
    const present = entrainements.reduce((acc, e) => {
      const p = (e.presences_entrainement || []).find(p => p.joueur_id === joueurId)
      return acc + (p?.present ? 1 : 0)
    }, 0)
    return Math.round((present / total) * 100)
  }

  const postes = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']

  const st = {
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
    label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
    card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
    btn: (color = '#4ade80') => ({ background: color + '15', border: `1px solid ${color}40`, color, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }),
    btnSolid: { background: '#4ade80', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80', fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
    </div>
  )

  const tabs = [
    { key: 'equipe', label: '👥 Mon équipe' },
    { key: 'stats', label: '📊 Stats joueurs' },
    { key: 'matchs', label: '⚽ Matchs & Classement' },
    { key: 'entrainements', label: '🏃 Entraînements' },
    { key: 'notes', label: '📋 Carnet de notes' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></span>
          <span style={{ background: '#4ade8020', color: '#4ade80', fontSize: '11px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px' }}>Éducateur</span>
          {profil?.club && <span style={{ fontSize: '13px', color: '#555' }}>· {profil.club}</span>}
        </div>
        <button onClick={() => { supabase.auth.signOut(); navigate('/') }}
          style={{ background: 'transparent', color: '#555', border: '1px solid #222', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </nav>

      {/* TABS */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 2rem', display: 'flex', gap: '4px', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveSection(tab.key)}
            style={{ background: 'transparent', border: 'none', borderBottom: activeSection === tab.key ? '2px solid #4ade80' : '2px solid transparent', color: activeSection === tab.key ? '#4ade80' : '#555', padding: '14px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem' }}>

        {/* ===== MON ÉQUIPE ===== */}
        {activeSection === 'equipe' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Mon équipe</h1>
                <p style={{ color: '#555', fontSize: '13px', margin: '4px 0 0' }}>{joueurs.length} joueur{joueurs.length > 1 ? 's' : ''} dans l'effectif</p>
              </div>
              <button onClick={() => setShowAddJoueur(true)} style={st.btnSolid}>+ Ajouter un joueur</button>
            </div>

            {showAddJoueur && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 700, marginBottom: '1rem', color: '#4ade80' }}>Nouveau joueur</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>Prénom *</label><input style={st.input} value={newJoueur.prenom} onChange={e => setNewJoueur({ ...newJoueur, prenom: e.target.value })} /></div>
                  <div><label style={st.label}>Nom *</label><input style={st.input} value={newJoueur.nom} onChange={e => setNewJoueur({ ...newJoueur, nom: e.target.value })} /></div>
                  <div><label style={st.label}>N° maillot</label><input style={st.input} type="number" value={newJoueur.numero_maillot} onChange={e => setNewJoueur({ ...newJoueur, numero_maillot: e.target.value })} /></div>
                  <div>
                    <label style={st.label}>Poste</label>
                    <select style={st.input} value={newJoueur.poste} onChange={e => setNewJoueur({ ...newJoueur, poste: e.target.value })}>
                      <option value="">— Choisir —</option>
                      {postes.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div><label style={st.label}>Date de naissance</label><input style={st.input} type="date" value={newJoueur.date_naissance} onChange={e => setNewJoueur({ ...newJoueur, date_naissance: e.target.value })} /></div>
                  <div><label style={st.label}>Licence FFF</label><input style={st.input} placeholder="N° de licence" value={newJoueur.numero_licence} onChange={e => setNewJoueur({ ...newJoueur, numero_licence: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={ajouterJoueur} disabled={savingJoueur || !newJoueur.prenom || !newJoueur.nom} style={st.btnSolid}>{savingJoueur ? 'Ajout...' : 'Ajouter'}</button>
                  <button onClick={() => setShowAddJoueur(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '4rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</p>
                <p style={{ color: '#555' }}>Aucun joueur dans l'effectif. Commence par en ajouter un !</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {joueurs.map(j => {
                  const age = j.date_naissance ? Math.floor((new Date() - new Date(j.date_naissance)) / (365.25 * 24 * 3600 * 1000)) : null
                  const tx = tauxPresence(j.id)
                  return (
                    <div key={j.id} style={{ ...st.card, cursor: 'pointer', transition: 'border-color 0.2s', borderColor: joueurActif?.id === j.id ? '#4ade8040' : '#1a1a1a' }} onClick={() => setJoueurActif(joueurActif?.id === j.id ? null : j)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                          {j.numero_maillot || `${j.prenom[0]}${j.nom[0]}`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4ade80' }}>{j.poste || '—'}{age ? ` · ${age} ans` : ''}</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); supprimerJoueur(j.id) }} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '16px', padding: '4px' }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {j.numero_licence && <span style={{ background: '#1a2e4a', border: '1px solid #3b82f630', color: '#60a5fa', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>🪪 Licencié</span>}
                        {tx !== null && <span style={{ background: tx >= 80 ? '#4ade8015' : tx >= 50 ? '#f59e0b15' : '#f8717115', border: `1px solid ${tx >= 80 ? '#4ade8030' : tx >= 50 ? '#f59e0b30' : '#f8717130'}`, color: tx >= 80 ? '#4ade80' : tx >= 50 ? '#f59e0b' : '#f87171', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>🏃 {tx}% présence</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ===== STATS JOUEURS ===== */}
        {activeSection === 'stats' && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '1.5rem' }}>Stats joueurs — Saison</h1>
            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                <p style={{ color: '#555' }}>Ajoute d'abord des joueurs dans "Mon équipe"</p>
              </div>
            ) : (
              <div style={{ ...st.card, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      {['Joueur', 'Poste', 'MJ', 'Min', 'Buts', 'Passes D.', 'CS', '🟨', '🟥', 'Présence'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {joueurs.map(j => {
                      const s = statsGlobalesJoueur(j.id)
                      const tx = tauxPresence(j.id)
                      return (
                        <tr key={j.id} style={{ borderBottom: '1px solid #141414' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{j.prenom} {j.nom}</td>
                          <td style={{ padding: '10px 12px', color: '#555', fontSize: '12px' }}>{j.poste || '—'}</td>
                          <td style={{ padding: '10px 12px', color: s.matchs > 0 ? '#fff' : '#333' }}>{s.matchs}</td>
                          <td style={{ padding: '10px 12px', color: s.minutes > 0 ? '#fff' : '#333' }}>{s.minutes}'</td>
                          <td style={{ padding: '10px 12px', color: s.buts > 0 ? '#4ade80' : '#333', fontWeight: s.buts > 0 ? 700 : 400 }}>{s.buts}</td>
                          <td style={{ padding: '10px 12px', color: s.passes_dec > 0 ? '#60a5fa' : '#333', fontWeight: s.passes_dec > 0 ? 700 : 400 }}>{s.passes_dec}</td>
                          <td style={{ padding: '10px 12px', color: s.clean_sheets > 0 ? '#4ade80' : '#333' }}>{s.clean_sheets}</td>
                          <td style={{ padding: '10px 12px', color: s.cartons_j > 0 ? '#f59e0b' : '#333' }}>{s.cartons_j}</td>
                          <td style={{ padding: '10px 12px', color: s.cartons_r > 0 ? '#f87171' : '#333' }}>{s.cartons_r}</td>
                          <td style={{ padding: '10px 12px' }}>
                            {tx !== null ? <span style={{ color: tx >= 80 ? '#4ade80' : tx >= 50 ? '#f59e0b' : '#f87171', fontWeight: 700 }}>{tx}%</span> : <span style={{ color: '#333' }}>—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ===== MATCHS & CLASSEMENT ===== */}
        {activeSection === 'matchs' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

              {/* Matchs */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>⚽ Calendrier & Résultats</h2>
                  <button onClick={() => setShowAddMatch(true)} style={st.btn()}>+ Match</button>
                </div>

                {showAddMatch && (
                  <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div><label style={st.label}>Date</label><input style={st.input} type="date" value={newMatch.date} onChange={e => setNewMatch({ ...newMatch, date: e.target.value })} /></div>
                      <div><label style={st.label}>Adversaire</label><input style={st.input} placeholder="Nom de l'équipe" value={newMatch.adversaire} onChange={e => setNewMatch({ ...newMatch, adversaire: e.target.value })} /></div>
                      <div><label style={st.label}>Compétition</label><input style={st.input} placeholder="Championnat, Coupe..." value={newMatch.competition} onChange={e => setNewMatch({ ...newMatch, competition: e.target.value })} /></div>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (nous)</label><input style={st.input} type="number" min="0" value={newMatch.score_nous} onChange={e => setNewMatch({ ...newMatch, score_nous: e.target.value })} /></div>
                        <span style={{ color: '#555', paddingBottom: '10px', fontWeight: 700 }}>-</span>
                        <div style={{ flex: 1 }}><label style={st.label}>Score (eux)</label><input style={st.input} type="number" min="0" value={newMatch.score_eux} onChange={e => setNewMatch({ ...newMatch, score_eux: e.target.value })} /></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#aaa' }}>
                        <input type="checkbox" checked={newMatch.domicile} onChange={e => setNewMatch({ ...newMatch, domicile: e.target.checked })} />
                        Domicile
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={ajouterMatch} disabled={savingMatch} style={st.btnSolid}>{savingMatch ? 'Ajout...' : 'Ajouter'}</button>
                      <button onClick={() => setShowAddMatch(false)} style={st.btn('#666')}>Annuler</button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {matchs.map(m => {
                    const aScore = m.score_nous !== '' && m.score_nous !== null
                    const nous = parseInt(m.score_nous)
                    const eux = parseInt(m.score_eux)
                    const resultat = aScore ? (nous > eux ? 'V' : nous < eux ? 'D' : 'N') : null
                    const couleur = resultat === 'V' ? '#4ade80' : resultat === 'D' ? '#f87171' : '#f59e0b'
                    return (
                      <div key={m.id} style={{ ...st.card, cursor: 'pointer' }} onClick={() => setMatchActif(matchActif?.id === m.id ? null : m)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {resultat && <span style={{ background: couleur + '20', color: couleur, fontWeight: 800, fontSize: '12px', padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{resultat}</span>}
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
                              {m.domicile ? 'vs' : '@'} {m.adversaire}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#555' }}>
                              {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {m.competition ? ` · ${m.competition}` : ''}
                              {m.domicile ? ' · Domicile' : ' · Extérieur'}
                            </p>
                          </div>
                          {aScore && <span style={{ fontWeight: 800, fontSize: '16px', color: couleur }}>{m.score_nous} - {m.score_eux}</span>}
                        </div>

                        {/* Feuille de match */}
                        {matchActif?.id === m.id && (
                          <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '14px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Feuille de match</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {joueurs.map(j => {
                                const key = m.id
                                const s = (statsMatch[key] || {})[j.id] || {}
                                const existingStat = (m.stats_match || []).find(st => st.joueur_id === j.id) || {}
                                const val = (field) => s[field] !== undefined ? s[field] : (existingStat[field] ?? '')
                                return (
                                  <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '120px 50px 50px 50px 50px 30px 30px', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.prenom} {j.nom[0]}.</span>
                                    <input type="number" placeholder="Min" min="0" max="120" value={val('minutes')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), minutes: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="Buts" min="0" value={val('buts')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), buts: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="PD" min="0" value={val('passes_dec')}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), passes_dec: parseInt(e.target.value) || 0 } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <input type="number" placeholder="CS" min="0" max="1" value={val('clean_sheet') ? 1 : 0}
                                      onChange={e => setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), clean_sheet: e.target.value === '1' } } }))}
                                      style={{ ...st.input, padding: '5px 8px', fontSize: '12px', textAlign: 'center' }} />
                                    <span title="Carton jaune" style={{ cursor: 'pointer', fontSize: '16px', opacity: val('carton_jaune') ? 1 : 0.25 }}
                                      onClick={e => { e.stopPropagation(); setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_jaune: !val('carton_jaune') } } })) }}>🟨</span>
                                    <span title="Carton rouge" style={{ cursor: 'pointer', fontSize: '16px', opacity: val('carton_rouge') ? 1 : 0.25 }}
                                      onClick={e => { e.stopPropagation(); setStatsMatch(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [j.id]: { ...(prev[key]?.[j.id] || existingStat), carton_rouge: !val('carton_rouge') } } })) }}>🟥</span>
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                              <p style={{ fontSize: '10px', color: '#444', margin: '0', alignSelf: 'center' }}>Min · Buts · PD · CS</p>
                              <button onClick={e => { e.stopPropagation(); sauvegarderStatsMatch(m.id) }} style={{ ...st.btnSolid, marginLeft: 'auto', padding: '7px 16px', fontSize: '12px' }}>💾 Sauvegarder</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {matchs.length === 0 && <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Aucun match enregistré</p></div>}
                </div>
              </div>

              {/* Classement */}
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '1rem' }}>🏆 Classement</h2>
                {classement().length === 0 ? (
                  <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}>
                    <p style={{ color: '#555' }}>Le classement apparaîtra dès que des résultats sont saisis</p>
                  </div>
                ) : (
                  <div style={st.card}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                          {['#', 'Équipe', 'J', 'V', 'N', 'D', 'BP', 'BC', 'Diff', 'Pts'].map(h => (
                            <th key={h} style={{ padding: '8px', textAlign: h === 'Équipe' ? 'left' : 'center', color: '#444', fontWeight: 700, fontSize: '11px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classement().map((e, i) => (
                          <tr key={e.nom} style={{ borderBottom: '1px solid #141414', background: e.moi ? '#4ade8008' : 'transparent' }}>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#555', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '8px', fontWeight: e.moi ? 800 : 600, color: e.moi ? '#4ade80' : '#fff' }}>{e.nom}{e.moi ? ' ⬅' : ''}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#aaa' }}>{e.j}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#4ade80' }}>{e.v}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#f59e0b' }}>{e.n}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#f87171' }}>{e.d}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{e.bp}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{e.bc}</td>
                            <td style={{ padding: '8px', textAlign: 'center', color: e.bp - e.bc > 0 ? '#4ade80' : e.bp - e.bc < 0 ? '#f87171' : '#aaa' }}>{e.bp - e.bc > 0 ? '+' : ''}{e.bp - e.bc}</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: '#fff', fontSize: '15px' }}>{e.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===== ENTRAÎNEMENTS ===== */}
        {activeSection === 'entrainements' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Entraînements</h1>
              <button onClick={() => setShowAddEntrainement(true)} style={st.btnSolid}>+ Séance</button>
            </div>

            {showAddEntrainement && (
              <div style={{ ...st.card, border: '1px solid #4ade8030', marginBottom: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={st.label}>Date</label><input style={st.input} type="date" value={newEntrainement.date} onChange={e => setNewEntrainement({ ...newEntrainement, date: e.target.value })} /></div>
                  <div><label style={st.label}>Thème (optionnel)</label><input style={st.input} placeholder="Ex: Travail défensif, Jeu de transition..." value={newEntrainement.description} onChange={e => setNewEntrainement({ ...newEntrainement, description: e.target.value })} /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={ajouterEntrainement} style={st.btnSolid}>Créer la séance</button>
                  <button onClick={() => setShowAddEntrainement(false)} style={st.btn('#666')}>Annuler</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {entrainements.map(e => {
                const ouvert = entrainementActif === e.id
                const nbPresents = (e.presences_entrainement || []).filter(p => p.present).length
                const total = joueurs.length
                return (
                  <div key={e.id} style={st.card}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setEntrainementActif(ouvert ? null : e.id)}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700 }}>{new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        {e.description && <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{e.description}</p>}
                      </div>
                      <span style={{ background: nbPresents >= total * 0.8 ? '#4ade8015' : '#f59e0b15', border: `1px solid ${nbPresents >= total * 0.8 ? '#4ade8030' : '#f59e0b30'}`, color: nbPresents >= total * 0.8 ? '#4ade80' : '#f59e0b', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>
                        {nbPresents}/{total} présents
                      </span>
                      <span style={{ color: '#444' }}>{ouvert ? '▲' : '▼'}</span>
                    </div>

                    {ouvert && (
                      <div style={{ marginTop: '14px', borderTop: '1px solid #1a1a1a', paddingTop: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                          {joueurs.map(j => {
                            const p = (e.presences_entrainement || []).find(p => p.joueur_id === j.id)
                            const present = p?.present || false
                            return (
                              <div key={j.id} onClick={() => togglePresence(e.id, j.id, present)}
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: present ? '#4ade8010' : '#141414', border: `1px solid ${present ? '#4ade8030' : '#222'}`, borderRadius: '8px', cursor: 'pointer' }}>
                                <span style={{ fontSize: '16px' }}>{present ? '✅' : '❌'}</span>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{j.prenom} {j.nom}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {entrainements.length === 0 && <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Aucune séance enregistrée</p></div>}
            </div>
          </>
        )}

        {/* ===== CARNET DE NOTES ===== */}
        {activeSection === 'notes' && (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '1.5rem' }}>Carnet de notes</h1>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem', marginTop: '-1rem' }}>Notes privées — visibles uniquement par vous</p>
            {joueurs.length === 0 ? (
              <div style={{ ...st.card, textAlign: 'center', padding: '3rem' }}><p style={{ color: '#555' }}>Ajoute d'abord des joueurs dans "Mon équipe"</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {joueurs.map(j => {
                  const note = notes[j.id] || {}
                  const [localNote, setLocalNote] = useState({ technique: note.technique || 0, physique: note.physique || 0, mental: note.mental || 0, tactique: note.tactique || 0, commentaire: note.commentaire || '' })
                  const noteGlobale = localNote.technique || localNote.physique || localNote.mental || localNote.tactique
                    ? ((localNote.technique + localNote.physique + localNote.mental + localNote.tactique) / 4).toFixed(1)
                    : null
                  return (
                    <div key={j.id} style={st.card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a2e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '13px' }}>
                          {j.prenom[0]}{j.nom[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 700 }}>{j.prenom} {j.nom}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#555' }}>{j.poste || '—'}</p>
                        </div>
                        {noteGlobale && <span style={{ background: '#4ade8015', border: '1px solid #4ade8030', color: '#4ade80', fontWeight: 800, fontSize: '16px', padding: '4px 14px', borderRadius: '20px' }}>⭐ {noteGlobale}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                        {[['technique', '🎯 Technique'], ['physique', '💪 Physique'], ['mental', '🧠 Mental'], ['tactique', '♟️ Tactique']].map(([key, label]) => (
                          <div key={key}>
                            <label style={st.label}>{label}</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[1,2,3,4,5].map(n => (
                                <span key={n} onClick={() => setLocalNote(prev => ({ ...prev, [key]: n }))}
                                  style={{ cursor: 'pointer', fontSize: '20px', opacity: localNote[key] >= n ? 1 : 0.2 }}>⭐</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={st.label}>Commentaire privé</label>
                        <textarea value={localNote.commentaire} onChange={e => setLocalNote(prev => ({ ...prev, commentaire: e.target.value }))}
                          placeholder="Points forts, axes de progression, comportement..."
                          style={{ ...st.input, minHeight: '70px', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                      </div>
                      <button onClick={() => sauvegarderNote(j.id, localNote)} disabled={savingNote} style={st.btnSolid}>
                        {savingNote ? 'Sauvegarde...' : '💾 Sauvegarder'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
