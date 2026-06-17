import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const POSTES = ['Tous', 'Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']
const CATEGORIES = ['Toutes', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Seniors']
const PIEDS = ['Tous', 'Droit', 'Gauche', 'Les deux']
const NIVEAUX = ['Tous', 'Départemental', 'Régional', 'National', 'Pro']

export default function DashboardClub() {
  const navigate = useNavigate()
  const [recruteur, setRecruteur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('recherche')
  const [joueurs, setJoueurs] = useState([])
  const [filtres, setFiltres] = useState({ poste: 'Tous', categorie: 'Toutes', pied: 'Tous', niveau: 'Tous', recherche: '' })
  const [joueurSelectionne, setJoueurSelectionne] = useState(null)
  const [selections, setSelections] = useState([])
  const [messageActif, setMessageActif] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [conversations, setConversations] = useState([])
  const [userId, setUserId] = useState(null)

 useEffect(() => { checkAuth() }, [])

useEffect(() => {
  if (!userId) return
  const interval = setInterval(() => chargerConversations(userId), 4000)
  return () => clearInterval(interval)
}, [userId])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }
    setUserId(user.id)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile || profile.plan !== 'recruteur' || !profile.abonnement_actif) { navigate('/login'); return }
    setRecruteur(profile)
    const { data: joueurData } = await supabase.from('profiles').select('*').eq('plan', 'pro').eq('abonnement_actif', true)
    if (joueurData) setJoueurs(joueurData)
    const saved = localStorage.getItem('df_selections_' + user.id)
    if (saved) setSelections(JSON.parse(saved))
    await chargerConversations(user.id)
    setLoading(false)
  }

  async function chargerConversations(uid) {
    const { data } = await supabase.from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom), receiver:profiles!messages_receiver_id_fkey(prenom, nom)')
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order('created_at', { ascending: false })
    if (!data) return
    const map = {}
    data.forEach(msg => {
      const otherId = msg.sender_id === uid ? msg.receiver_id : msg.sender_id
      const otherName = msg.sender_id === uid ? `${msg.receiver?.prenom} ${msg.receiver?.nom}` : `${msg.sender?.prenom} ${msg.sender?.nom}`
      if (!map[otherId]) map[otherId] = { otherId, otherName, msgs: [] }
      map[otherId].msgs.push(msg)
    })
    setConversations(Object.values(map))
  }

  function saveSelections(newSel) {
    setSelections(newSel)
    if (userId) localStorage.setItem('df_selections_' + userId, JSON.stringify(newSel))
  }

  function toggleSelection(joueur) {
    const exists = selections.find(s => s.id === joueur.id)
    if (exists) saveSelections(selections.filter(s => s.id !== joueur.id))
    else saveSelections([...selections, joueur])
  }

  function isSelected(id) { return selections.some(s => s.id === id) }

  const joueursFiltres = joueurs.filter(j => {
    if (filtres.poste !== 'Tous' && j.poste !== filtres.poste) return false
    if (filtres.categorie !== 'Toutes' && j.categorie !== filtres.categorie) return false
    if (filtres.pied !== 'Tous' && j.pied !== filtres.pied) return false
    if (filtres.niveau !== 'Tous' && j.niveau_equipe !== filtres.niveau) return false
    if (filtres.recherche.trim()) {
      const q = filtres.recherche.toLowerCase()
      if (!`${j.prenom} ${j.nom} ${j.poste || ''} ${j.club || ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function envoyerMessage() {
    if (!newMessage.trim() || !messageActif || !userId) return
    await supabase.from('messages').insert({ sender_id: userId, receiver_id: messageActif.id, content: newMessage.trim(), created_at: new Date().toISOString() })
    setNewMessage('')
    await chargerConversations(userId)
  }

  const s = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' },
    nav: { background: '#111', borderBottom: '1px solid #222', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' },
    logo: { color: '#4ade80', fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' },
    container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
    tabs: { display: 'flex', gap: '4px', background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '4px', marginBottom: '2rem' },
    tab: (a) => ({ flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, background: a ? '#4ade80' : 'transparent', color: a ? '#000' : '#888' }),
    box: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
    filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' },
    select: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px' },
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
    label: { fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
    card: (sel) => ({ background: '#111', border: sel ? '2px solid #4ade80' : '1px solid #222', borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', position: 'relative' }),
    btn: (v) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: v === 'green' ? '#4ade80' : v === 'red' ? '#ef444420' : '#1a1a1a', color: v === 'green' ? '#000' : v === 'red' ? '#ef4444' : '#ccc' }),
    stat: { background: '#1a1a1a', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#ccc', display: 'inline-block', margin: '2px' },
    statVal: { color: '#4ade80', fontWeight: 700 },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modalBox: { background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto' },
    avatar: { width: '48px', height: '48px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#4ade80', flexShrink: 0 },
    msgBubble: (mine) => ({ maxWidth: '70%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: mine ? '#4ade80' : '#1a1a1a', color: mine ? '#000' : '#fff', fontSize: '14px', alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: '8px' }),
  }

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#4ade80' }}>Chargement...</p></div>

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.logo} onClick={() => navigate('/')}>⚽ Digital Football</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '14px', color: '#999' }}>
          <span>{recruteur?.club || recruteur?.prenom}</span>
          <span style={{ background: '#4ade8020', color: '#4ade80', border: '1px solid #4ade8040', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>🔍 Recruteur</span>
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }} style={{ ...s.btn(), padding: '6px 12px', fontSize: '12px' }}>Déconnexion</button>
        </div>
      </nav>

      <div style={s.container}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Scout Center <span style={{ color: '#4ade80' }}>🔍</span></h1>
          <p style={{ color: '#666', marginTop: '6px', fontSize: '14px' }}>{joueurs.length} joueurs PRO disponibles · {selections.length} en shortlist</p>
        </div>

        <div style={s.tabs}>
          {[['recherche', '🔍 Recherche'], ['selections', `📋 Shortlist (${selections.length})`], ['videos', '🎬 Vidéos'], ['messages', '💬 Messages']].map(([id, label]) => (
            <button key={id} style={s.tab(onglet === id)} onClick={() => setOnglet(id)}>{label}</button>
          ))}
        </div>

        {/* ═══ RECHERCHE ═══ */}
        {onglet === 'recherche' && (
          <>
            <div style={s.box}>
              <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '14px', color: '#4ade80' }}>🔍 Filtres de recherche</p>
              <div style={s.filtersGrid}>
                <div>
                  <label style={s.label}>Recherche libre</label>
                  <input style={s.input} placeholder="Nom, club..." value={filtres.recherche} onChange={e => setFiltres({ ...filtres, recherche: e.target.value })} />
                </div>
                <div>
                  <label style={s.label}>Poste</label>
                  <select style={s.select} value={filtres.poste} onChange={e => setFiltres({ ...filtres, poste: e.target.value })}>
                    {POSTES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Catégorie d'âge</label>
                  <select style={s.select} value={filtres.categorie} onChange={e => setFiltres({ ...filtres, categorie: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Pied fort</label>
                  <select style={s.select} value={filtres.pied} onChange={e => setFiltres({ ...filtres, pied: e.target.value })}>
                    {PIEDS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Niveau</label>
                  <select style={s.select} value={filtres.niveau} onChange={e => setFiltres({ ...filtres, niveau: e.target.value })}>
                    {NIVEAUX.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ margin: '1rem 0 0', fontSize: '13px', color: '#555' }}>{joueursFiltres.length} résultat{joueursFiltres.length !== 1 ? 's' : ''}</p>
            </div>

            {joueursFiltres.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
                <p style={{ fontSize: '2rem' }}>🔍</p>
                <p>Aucun joueur trouvé avec ces critères.</p>
              </div>
            ) : (
              <div style={s.grid}>
                {joueursFiltres.map(j => (
                  <div key={j.id} style={s.card(isSelected(j.id))} onClick={() => setJoueurSelectionne(j)}>
                    {isSelected(j.id) && <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#4ade8020', color: '#4ade80', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', border: '1px solid #4ade8040' }}>✓ Shortlist</span>}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={s.avatar}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>{j.prenom} {j.nom}</p>
                        <p style={{ color: '#4ade80', fontSize: '13px', margin: '2px 0 0' }}>{j.poste || 'Poste non renseigné'}</p>
                      </div>
                    </div>
                    <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {j.categorie && <span style={s.stat}>{j.categorie}</span>}
                      {j.pied && <span style={s.stat}>Pied {j.pied?.toLowerCase()}</span>}
                      {j.niveau_equipe && <span style={s.stat}>{j.niveau_equipe}</span>}
                      {j.club && <span style={s.stat}>{j.club}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      <span style={s.stat}>⚽ <span style={s.statVal}>{j.buts_total ?? 0}</span> buts</span>
                      <span style={s.stat}>🎯 <span style={s.statVal}>{j.passes_decisives ?? 0}</span> passes</span>
                      <span style={s.stat}>📋 <span style={s.statVal}>{j.matchs_officiel ?? 0}</span> matchs</span>
                      <span style={s.stat}>⏱ <span style={s.statVal}>{j.minutes_jouees ?? 0}</span> min</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={s.btn('green')} onClick={e => { e.stopPropagation(); setJoueurSelectionne(j) }}>Voir profil</button>
                      <button style={s.btn(isSelected(j.id) ? 'red' : '')} onClick={e => { e.stopPropagation(); toggleSelection(j) }}>
                        {isSelected(j.id) ? '− Retirer' : '+ Shortlist'}
                      </button>
                      <button style={s.btn()} onClick={e => { e.stopPropagation(); setMessageActif(j); setOnglet('messages') }}>💬</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ SHORTLIST ═══ */}
        {onglet === 'selections' && (
          <div>
            <div style={s.box}>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#4ade80' }}>📋 Ma Shortlist</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Joueurs que vous suivez — accès rapide à leur profil et vidéos</p>
            </div>
            {selections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
                <p style={{ fontSize: '2rem' }}>📋</p>
                <p>Votre shortlist est vide.</p>
                <p style={{ fontSize: '13px' }}>Ajoutez des joueurs depuis l'onglet Recherche.</p>
              </div>
            ) : (
              <div style={s.grid}>
                {selections.map(j => (
                  <div key={j.id} style={s.card(true)}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={s.avatar}>{j.prenom?.[0]}{j.nom?.[0]}</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '16px', margin: 0 }}>{j.prenom} {j.nom}</p>
                        <p style={{ color: '#4ade80', fontSize: '13px', margin: '2px 0 0' }}>{j.poste}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {j.categorie && <span style={s.stat}>{j.categorie}</span>}
                      {j.club && <span style={s.stat}>{j.club}</span>}
                      {j.niveau_equipe && <span style={s.stat}>{j.niveau_equipe}</span>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      <span style={s.stat}>⚽ <span style={s.statVal}>{j.buts_total ?? 0}</span> buts</span>
                      <span style={s.stat}>🎯 <span style={s.statVal}>{j.passes_decisives ?? 0}</span> passes</span>
                      <span style={s.stat}>📋 <span style={s.statVal}>{j.matchs_officiel ?? 0}</span> matchs</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={s.btn('green')} onClick={() => setJoueurSelectionne(j)}>Profil complet</button>
                      <button style={s.btn()} onClick={() => { setOnglet('videos') }}>🎬 Vidéos</button>
                      <button style={s.btn()} onClick={() => { setMessageActif(j); setOnglet('messages') }}>💬</button>
                      <button style={s.btn('red')} onClick={() => toggleSelection(j)}>−</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ VIDÉOS ═══ */}
        {onglet === 'videos' && (
          <div>
            <div style={s.box}>
              <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#4ade80' }}>🎬 Vidéos de match</p>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Uniquement les joueurs de votre shortlist avec des vidéos disponibles</p>
            </div>
            {selections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
                <p style={{ fontSize: '2rem' }}>🎬</p>
                <p>Ajoutez des joueurs à votre shortlist pour accéder à leurs vidéos.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {selections.filter(j => j.clip_url || j.video_url).map(j => (
                  <div key={j.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
                    <video src={j.clip_url || j.video_url} controls style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', background: '#000' }} />
                    <div style={{ padding: '12px' }}>
                      <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '14px' }}>{j.prenom} {j.nom}</p>
                      <p style={{ color: '#4ade80', fontSize: '13px', margin: '0 0 8px' }}>{j.poste} · {j.categorie}</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={s.btn('green')} onClick={() => setJoueurSelectionne(j)}>Profil</button>
                        <button style={s.btn()} onClick={() => { setMessageActif(j); setOnglet('messages') }}>💬 Contacter</button>
                      </div>
                    </div>
                  </div>
                ))}
                {selections.filter(j => j.clip_url || j.video_url).length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#555' }}>
                    <p style={{ fontSize: '2rem' }}>📹</p>
                    <p>Aucune vidéo disponible pour vos joueurs shortlistés.</p>
                    <p style={{ fontSize: '13px' }}>Les vidéos apparaîtront ici quand les joueurs les uploadent.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══ MESSAGES ═══ */}
        {onglet === 'messages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', minHeight: '500px' }}>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #222' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#4ade80', fontSize: '14px' }}>💬 Conversations</p>
              </div>
              {selections.length > 0 && (
                <div style={{ padding: '8px', borderBottom: '1px solid #1a1a1a' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#555', padding: '0 4px' }}>SHORTLIST</p>
                  {selections.map(j => (
                    <div key={j.id} onClick={() => setMessageActif(j)}
                      style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', background: messageActif?.id === j.id ? '#4ade8010' : 'transparent', marginBottom: '2px' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{j.prenom} {j.nom}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#4ade80' }}>{j.poste}</p>
                    </div>
                  ))}
                </div>
              )}
              {conversations.length === 0 && selections.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                  <p>Ajoutez des joueurs à votre shortlist pour les contacter.</p>
                </div>
              )}
            </div>

            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              {messageActif ? (
                <>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ ...s.avatar, width: '36px', height: '36px', fontSize: '14px' }}>{messageActif.prenom?.[0]}{messageActif.nom?.[0]}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '15px' }}>{messageActif.prenom} {messageActif.nom}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: '#4ade80' }}>{messageActif.poste} · Plan PRO ✓</p>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                    {conversations.find(c => c.otherId === messageActif.id)?.msgs
                      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                      .map((m, i) => (
                        <div key={i} style={s.msgBubble(m.sender_id === userId)}>{m.content}</div>
                      ))}
                  </div>
                  <div style={{ padding: '1rem', borderTop: '1px solid #222', display: 'flex', gap: '8px' }}>
                    <input style={{ ...s.input, flex: 1 }} placeholder={`Message à ${messageActif.prenom}...`} value={newMessage}
                      onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && envoyerMessage()} />
                    <button style={s.btn('green')} onClick={envoyerMessage}>Envoyer</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '2rem' }}>💬</p>
                  <p>Sélectionnez un joueur de votre shortlist pour le contacter</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL PROFIL */}
      {joueurSelectionne && (
        <div style={s.modal} onClick={() => setJoueurSelectionne(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ ...s.avatar, width: '56px', height: '56px', fontSize: '22px' }}>{joueurSelectionne.prenom?.[0]}{joueurSelectionne.nom?.[0]}</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{joueurSelectionne.prenom} {joueurSelectionne.nom}</h2>
                  <p style={{ margin: '4px 0 0', color: '#4ade80', fontSize: '14px' }}>{joueurSelectionne.poste}</p>
                </div>
              </div>
              <button onClick={() => setJoueurSelectionne(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {[['📍 Région', joueurSelectionne.region], ['⚽ Catégorie', joueurSelectionne.categorie], ['🦵 Pied fort', joueurSelectionne.pied], ['🏟️ Niveau', joueurSelectionne.niveau_equipe], ['🏆 Club', joueurSelectionne.club]].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{label}</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{val}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginBottom: '10px' }}>📊 Statistiques</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
              {[['Matchs officiels', joueurSelectionne.matchs_officiel ?? 0], ['Matchs amicaux', joueurSelectionne.matchs_amical ?? 0], ['Minutes jouées', joueurSelectionne.minutes_jouees ?? 0], ['Buts total', joueurSelectionne.buts_total ?? 0], ['Passes décisives', joueurSelectionne.passes_decisives ?? 0], ['Clean sheets', joueurSelectionne.cleansheets ?? 0]].map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#4ade80' }}>{val}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>{label}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #222' }}>
              <button style={s.btn(isSelected(joueurSelectionne.id) ? 'red' : 'green')} onClick={() => toggleSelection(joueurSelectionne)}>
                {isSelected(joueurSelectionne.id) ? '− Retirer de la shortlist' : '+ Ajouter à la shortlist'}
              </button>
              <button style={s.btn()} onClick={() => { setJoueurSelectionne(null); setMessageActif(joueurSelectionne); setOnglet('messages') }}>
                💬 Envoyer un message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}