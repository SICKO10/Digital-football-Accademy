import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const POSTES = ['Tous', 'Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant']
const CATEGORIES = ['Toutes', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'Seniors']
const REGIONS = ['Toutes', 'Île-de-France', 'PACA', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Bretagne', 'Normandie', 'Hauts-de-France', 'Grand Est', 'Pays de la Loire', 'Centre-Val de Loire', 'Bourgogne-Franche-Comté', 'Corse', 'DOM-TOM']
const PIEDS = ['Tous', 'Droit', 'Gauche', 'Les deux']

const ONGLETS = [
  { id: 'joueurs', label: '⚽ Joueurs', icon: '👥' },
  { id: 'feed', label: '🎬 Feed Vidéo', icon: '🎬' },
  { id: 'messages', label: '💬 Messages', icon: '💬' },
  { id: 'selections', label: '📋 Mes Sélections', icon: '📋' },
]

export default function DashboardClub() {
  const navigate = useNavigate()
  const [recruteur, setRecruteur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('joueurs')

  // Filtres
  const [filtrePoste, setFiltrePoste] = useState('Tous')
  const [filtreCategorie, setFiltreCategorie] = useState('Toutes')
  const [filtreRegion, setFiltreRegion] = useState('Toutes')
  const [filtrePied, setFiltrePied] = useState('Tous')
  const [recherche, setRecherche] = useState('')

  // Données
  const [joueurs, setJoueurs] = useState([])
  const [joueursFiltres, setJoueursFiltres] = useState([])
  const [joueurSelectionne, setJoueurSelectionne] = useState(null)
  const [selections, setSelections] = useState({}) // { 'U14': [id1, id2], 'Seniors': [...] }
  const [messages, setMessages] = useState([])
  const [messageActif, setMessageActif] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [conversations, setConversations] = useState([])
  const [loadingJoueurs, setLoadingJoueurs] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    appliquerFiltres()
  }, [joueurs, filtrePoste, filtreCategorie, filtreRegion, filtrePied, recherche])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile || profile.plan !== 'recruteur' || !profile.abonnement_actif) {
      navigate('/login')
      return
    }

    setRecruteur(profile)
    await chargerJoueurs()
    await chargerConversations(user.id)
    chargerSelections()
    setLoading(false)
  }

  async function chargerJoueurs() {
    setLoadingJoueurs(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('plan', 'pro')
      .eq('abonnement_actif', true)

    if (data) setJoueurs(data)
    setLoadingJoueurs(false)
  }

  async function chargerConversations(userId) {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(prenom, nom), receiver:profiles!messages_receiver_id_fkey(prenom, nom)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (data) {
      // Grouper par conversation
      const convMap = {}
      data.forEach(msg => {
        const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id
        const otherName = msg.sender_id === userId
          ? `${msg.receiver?.prenom} ${msg.receiver?.nom}`
          : `${msg.sender?.prenom} ${msg.sender?.nom}`
        if (!convMap[otherId]) convMap[otherId] = { otherId, otherName, messages: [], lastMsg: msg }
        convMap[otherId].messages.push(msg)
      })
      setConversations(Object.values(convMap))
      setMessages(data)
    }
  }

  function chargerSelections() {
    const saved = localStorage.getItem('df_selections')
    if (saved) setSelections(JSON.parse(saved))
  }

  function sauvegarderSelections(newSel) {
    setSelections(newSel)
    localStorage.setItem('df_selections', JSON.stringify(newSel))
  }

  function ajouterSelection(joueurId, categorie) {
    const newSel = { ...selections }
    if (!newSel[categorie]) newSel[categorie] = []
    if (!newSel[categorie].includes(joueurId)) {
      newSel[categorie] = [...newSel[categorie], joueurId]
      sauvegarderSelections(newSel)
    }
  }

  function retirerSelection(joueurId, categorie) {
    const newSel = { ...selections }
    if (newSel[categorie]) {
      newSel[categorie] = newSel[categorie].filter(id => id !== joueurId)
      sauvegarderSelections(newSel)
    }
  }

  function estSelectionne(joueurId) {
    return Object.values(selections).some(arr => arr.includes(joueurId))
  }

  function appliquerFiltres() {
    let res = [...joueurs]
    if (filtrePoste !== 'Tous') res = res.filter(j => j.poste === filtrePoste)
    if (filtreCategorie !== 'Toutes') res = res.filter(j => j.categorie === filtreCategorie)
    if (filtreRegion !== 'Toutes') res = res.filter(j => j.region === filtreRegion)
    if (filtrePied !== 'Tous') res = res.filter(j => j.pied === filtrePied)
    if (recherche.trim()) {
      const q = recherche.toLowerCase()
      res = res.filter(j =>
        `${j.prenom} ${j.nom}`.toLowerCase().includes(q) ||
        (j.poste || '').toLowerCase().includes(q)
      )
    }
    setJoueursFiltres(res)
  }

  async function envoyerMessage(receiverId) {
    if (!newMessage.trim() || !recruteur) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
      created_at: new Date().toISOString()
    })
    setNewMessage('')
    await chargerConversations(user.id)
  }

  const styles = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' },
    navbar: { background: '#111', borderBottom: '1px solid #222', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' },
    logo: { color: '#4ade80', fontWeight: 700, fontSize: '1.2rem', cursor: 'pointer' },
    userInfo: { display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '14px', color: '#999' },
    badge: { background: '#4ade8020', color: '#4ade80', border: '1px solid #4ade8040', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 },
    container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
    tabs: { display: 'flex', gap: '4px', background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '4px', marginBottom: '2rem' },
    tab: (active) => ({
      flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'all 0.2s',
      background: active ? '#4ade80' : 'transparent', color: active ? '#000' : '#888'
    }),
    filtersBox: { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' },
    filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
    select: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px' },
    input: { width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
    label: { fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' },
    card: (selected) => ({
      background: '#111', border: selected ? '1px solid #4ade80' : '1px solid #222',
      borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s',
      position: 'relative'
    }),
    cardName: { fontWeight: 600, fontSize: '16px', marginBottom: '4px', color: '#fff' },
    cardPoste: { color: '#4ade80', fontSize: '13px', marginBottom: '12px' },
    statRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' },
    stat: { background: '#1a1a1a', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#ccc' },
    statVal: { color: '#4ade80', fontWeight: 600 },
    btn: (variant = 'primary') => ({
      padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
      background: variant === 'primary' ? '#4ade80' : variant === 'danger' ? '#ef444420' : '#1a1a1a',
      color: variant === 'primary' ? '#000' : variant === 'danger' ? '#ef4444' : '#ccc',
      transition: 'all 0.2s'
    }),
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modalBox: { background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' },
    sectionTitle: { fontSize: '18px', fontWeight: 700, color: '#4ade80', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '12px' },
    msgBubble: (mine) => ({
      maxWidth: '70%', padding: '10px 14px', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      background: mine ? '#4ade80' : '#1a1a1a', color: mine ? '#000' : '#fff',
      fontSize: '14px', alignSelf: mine ? 'flex-end' : 'flex-start', marginBottom: '8px'
    }),
  }

  if (loading) return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚽</div>
        <p style={{ color: '#4ade80' }}>Chargement...</p>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      {/* NAVBAR */}
      <nav style={styles.navbar}>
        <span style={styles.logo} onClick={() => navigate('/')}>⚽ Digital Football</span>
        <div style={styles.userInfo}>
          <span>{recruteur?.club || recruteur?.prenom}</span>
          <span style={styles.badge}>🔍 Recruteur</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate('/') }}
            style={{ ...styles.btn('ghost'), padding: '6px 12px', fontSize: '12px' }}
          >Déconnexion</button>
        </div>
      </nav>

      <div style={styles.container}>
        {/* HEADER */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
            Bonjour, <span style={{ color: '#4ade80' }}>{recruteur?.club || recruteur?.prenom}</span> 👋
          </h1>
          <p style={{ color: '#666', marginTop: '6px', fontSize: '14px' }}>
            {joueurs.length} joueur{joueurs.length > 1 ? 's' : ''} PRO disponible{joueurs.length > 1 ? 's' : ''} dans la base
          </p>
        </div>

        {/* ONGLETS */}
        <div style={styles.tabs}>
          {ONGLETS.map(o => (
            <button key={o.id} style={styles.tab(onglet === o.id)} onClick={() => setOnglet(o.id)}>
              {o.label}
            </button>
          ))}
        </div>

        {/* ═══ ONGLET JOUEURS ═══ */}
        {onglet === 'joueurs' && (
          <>
            <div style={styles.filtersBox}>
              <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '14px', color: '#4ade80' }}>🔍 Filtres</p>
              <div style={styles.filtersGrid}>
                <div>
                  <label style={styles.label}>Recherche</label>
                  <input style={styles.input} placeholder="Nom, poste..." value={recherche} onChange={e => setRecherche(e.target.value)} />
                </div>
                <div>
                  <label style={styles.label}>Poste</label>
                  <select style={styles.select} value={filtrePoste} onChange={e => setFiltrePoste(e.target.value)}>
                    {POSTES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Catégorie d'âge</label>
                  <select style={styles.select} value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Région</label>
                  <select style={styles.select} value={filtreRegion} onChange={e => setFiltreRegion(e.target.value)}>
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Pied fort</label>
                  <select style={styles.select} value={filtrePied} onChange={e => setFiltrePied(e.target.value)}>
                    {PIEDS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ margin: '1rem 0 0', fontSize: '13px', color: '#666' }}>
                {joueursFiltres.length} résultat{joueursFiltres.length > 1 ? 's' : ''}
              </p>
            </div>

            {loadingJoueurs ? (
              <p style={{ textAlign: 'center', color: '#4ade80', padding: '3rem' }}>Chargement des joueurs...</p>
            ) : joueursFiltres.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
                <p style={{ fontSize: '2rem' }}>🔍</p>
                <p>Aucun joueur trouvé avec ces filtres.</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {joueursFiltres.map(joueur => (
                  <div key={joueur.id} style={styles.card(estSelectionne(joueur.id))} onClick={() => setJoueurSelectionne(joueur)}>
                    {estSelectionne(joueur.id) && (
                      <span style={{ position: 'absolute', top: '12px', right: '12px', background: '#4ade8020', color: '#4ade80', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', border: '1px solid #4ade8040' }}>✓ Sélectionné</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                        {(joueur.prenom?.[0] || '?')}{(joueur.nom?.[0] || '')}
                      </div>
                      <div>
                        <p style={styles.cardName}>{joueur.prenom} {joueur.nom}</p>
                        <p style={styles.cardPoste}>{joueur.poste || 'Poste non renseigné'}</p>
                      </div>
                    </div>
                    <div style={styles.statRow}>
                      {joueur.categorie && <span style={styles.stat}><span style={styles.statVal}>{joueur.categorie}</span></span>}
                      {joueur.region && <span style={styles.stat}>{joueur.region}</span>}
                      {joueur.pied && <span style={styles.stat}>Pied {joueur.pied.toLowerCase()}</span>}
                    </div>
                    <div style={styles.statRow}>
                      <span style={styles.stat}>⚽ <span style={styles.statVal}>{joueur.buts_total ?? 0}</span> buts</span>
                      <span style={styles.stat}>🎯 <span style={styles.statVal}>{joueur.passes_decisives ?? 0}</span> passes</span>
                      <span style={styles.stat}>📋 <span style={styles.statVal}>{joueur.matchs_officiel ?? 0}</span> matchs</span>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <button style={styles.btn('primary')} onClick={e => { e.stopPropagation(); setJoueurSelectionne(joueur) }}>Voir profil</button>
                      <button style={styles.btn()} onClick={e => { e.stopPropagation(); setOnglet('messages'); setMessageActif(joueur) }}>💬</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ ONGLET FEED ═══ */}
        {onglet === 'feed' && (
          <div>
            <p style={styles.sectionTitle}>🎬 Feed vidéo — clips des joueurs PRO</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {joueurs.filter(j => j.clip_url).map(j => (
                <div key={j.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
                  <video src={j.clip_url} controls style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', background: '#000' }} />
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontWeight: 600, margin: '0 0 4px', fontSize: '14px' }}>{j.prenom} {j.nom}</p>
                    <p style={{ color: '#4ade80', fontSize: '13px', margin: 0 }}>{j.poste}</p>
                  </div>
                </div>
              ))}
              {joueurs.filter(j => j.clip_url).length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#555' }}>
                  <p style={{ fontSize: '2rem' }}>🎬</p>
                  <p>Aucun clip disponible pour l'instant.</p>
                  <p style={{ fontSize: '13px' }}>Les joueurs PRO peuvent uploader leurs clips depuis leur dashboard.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ONGLET MESSAGES ═══ */}
        {onglet === 'messages' && (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', minHeight: '500px' }}>
            {/* Liste conversations */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid #222' }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#4ade80', fontSize: '14px' }}>💬 Conversations</p>
              </div>
              {conversations.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                  <p>Aucune conversation.</p>
                  <p>Envoyez un message depuis la fiche d'un joueur.</p>
                </div>
              ) : (
                conversations.map(conv => (
                  <div key={conv.otherId}
                    onClick={() => setMessageActif({ id: conv.otherId, prenom: conv.otherName.split(' ')[0], nom: conv.otherName.split(' ').slice(1).join(' ') })}
                    style={{ padding: '12px 1rem', borderBottom: '1px solid #1a1a1a', cursor: 'pointer', background: messageActif?.id === conv.otherId ? '#4ade8010' : 'transparent' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{conv.otherName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.lastMsg?.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Zone message */}
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
              {messageActif ? (
                <>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#4ade8015', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 700 }}>
                      {messageActif.prenom?.[0]}{messageActif.nom?.[0]}
                    </div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{messageActif.prenom} {messageActif.nom}</p>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                    {messages
                      .filter(m => m.sender_id === messageActif.id || m.receiver_id === messageActif.id)
                      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                      .map((m, i) => {
                        const mine = m.sender_id !== messageActif.id
                        return <div key={i} style={styles.msgBubble(mine)}>{m.content}</div>
                      })}
                  </div>
                  <div style={{ padding: '1rem', borderTop: '1px solid #222', display: 'flex', gap: '8px' }}>
                    <input
                      style={{ ...styles.input, flex: 1 }}
                      placeholder={`Message à ${messageActif.prenom}...`}
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && envoyerMessage(messageActif.id)}
                    />
                    <button style={styles.btn('primary')} onClick={() => envoyerMessage(messageActif.id)}>Envoyer</button>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ fontSize: '2rem' }}>💬</p>
                  <p>Sélectionnez une conversation ou cliquez sur 💬 dans la fiche d'un joueur</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ONGLET SÉLECTIONS ═══ */}
        {onglet === 'selections' && (
          <div>
            <p style={styles.sectionTitle}>📋 Mes sélections par catégorie</p>
            {CATEGORIES.filter(c => c !== 'Toutes').map(cat => {
              const ids = selections[cat] || []
              const joueursCateg = joueurs.filter(j => ids.includes(j.id))
              return (
                <div key={cat} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{cat}</h3>
                    <span style={{ background: '#4ade8020', color: '#4ade80', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', border: '1px solid #4ade8040' }}>{joueursCateg.length} joueur{joueursCateg.length > 1 ? 's' : ''}</span>
                  </div>
                  {joueursCateg.length === 0 ? (
                    <p style={{ color: '#555', fontSize: '13px', padding: '1rem', background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
                      Aucun joueur en {cat} — ajoutez-en depuis l'onglet Joueurs.
                    </p>
                  ) : (
                    <div style={styles.grid}>
                      {joueursCateg.map(j => (
                        <div key={j.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{j.prenom} {j.nom}</p>
                            <p style={{ margin: '2px 0 0', color: '#4ade80', fontSize: '13px' }}>{j.poste}</p>
                          </div>
                          <button style={styles.btn('danger')} onClick={() => retirerSelection(j.id, cat)}>Retirer</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ MODAL FICHE JOUEUR ═══ */}
      {joueurSelectionne && (
        <div style={styles.modal} onClick={() => setJoueurSelectionne(null)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#4ade80' }}>
                  {joueurSelectionne.prenom?.[0]}{joueurSelectionne.nom?.[0]}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{joueurSelectionne.prenom} {joueurSelectionne.nom}</h2>
                  <p style={{ margin: '4px 0 0', color: '#4ade80', fontSize: '14px' }}>{joueurSelectionne.poste}</p>
                </div>
              </div>
              <button onClick={() => setJoueurSelectionne(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Infos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {[
                ['📍 Région', joueurSelectionne.region],
                ['⚽ Catégorie', joueurSelectionne.categorie],
                ['🦵 Pied fort', joueurSelectionne.pied],
                ['🏟️ Niveau', joueurSelectionne.niveau_equipe],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{label}</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{val}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginBottom: '10px' }}>📊 Statistiques</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
              {[
                ['Matchs officiels', joueurSelectionne.matchs_officiel ?? 0],
                ['Matchs amicaux', joueurSelectionne.matchs_amical ?? 0],
                ['Minutes jouées', joueurSelectionne.minutes_jouees ?? 0],
                ['Buts total', joueurSelectionne.buts_total ?? 0],
                ['Passes décisives', joueurSelectionne.passes_decisives ?? 0],
                ['Clean sheets', joueurSelectionne.cleansheets ?? 0],
              ].map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#4ade80' }}>{val}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div>
                <label style={{ ...styles.label, marginBottom: '6px' }}>Ajouter à une catégorie :</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {CATEGORIES.filter(c => c !== 'Toutes').map(cat => (
                    <button key={cat}
                      style={styles.btn((selections[cat] || []).includes(joueurSelectionne.id) ? 'primary' : '')}
                      onClick={() => {
                        if ((selections[cat] || []).includes(joueurSelectionne.id)) {
                          retirerSelection(joueurSelectionne.id, cat)
                        } else {
                          ajouterSelection(joueurSelectionne.id, cat)
                        }
                      }}>
                      {(selections[cat] || []).includes(joueurSelectionne.id) ? '✓ ' : ''}{cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #222', display: 'flex', gap: '10px' }}>
              <button style={styles.btn('primary')} onClick={() => {
                setJoueurSelectionne(null)
                setMessageActif(joueurSelectionne)
                setOnglet('messages')
              }}>💬 Envoyer un message</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}