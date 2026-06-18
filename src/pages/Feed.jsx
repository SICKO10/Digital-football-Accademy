import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Feed() {
  const navigate = useNavigate()
  const [joueursPro, setJoueursPro] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [selections, setSelections] = useState([])
  const [filtrePoste, setFiltrePoste] = useState('Tous')
  const [filtreCategorie, setFiltreCategorie] = useState('Toutes')
  const [vue, setVue] = useState('joueurs')
  const [joueurModal, setJoueurModal] = useState(null)

  const POSTES = ['Tous', 'Gardien', 'Défenseur', 'Milieu', 'Attaquant']
  const CATEGORIES = ['Toutes', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'Senior']

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfil(p)
      if (p?.plan === 'recruteur') {
        const saved = localStorage.getItem('df_selections_' + user.id)
        if (saved) setSelections(JSON.parse(saved))
      }
    }

    const { data: joueursData } = await supabase
      .from('profiles')
      .select('*')
      .eq('plan', 'pro')
      .eq('abonnement_actif', true)
      .order('created_at', { ascending: false })

    setJoueursPro(joueursData || [])
    setLoading(false)
  }

  const toggleSelection = (joueur) => {
    if (!user || profil?.plan !== 'recruteur') { navigate('/register-recruteur'); return }
    const exists = selections.find(s => s.id === joueur.id)
    const newSel = exists ? selections.filter(s => s.id !== joueur.id) : [...selections, joueur]
    setSelections(newSel)
    localStorage.setItem('df_selections_' + user.id, JSON.stringify(newSel))
  }

  const isSelected = (id) => selections.some(s => s.id === id)

  const isVeo = (url) => url && url.includes('veo.co')
  const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'))
  const isCloudinary = (url) => url && url.includes('cloudinary.com')

  const joueursFiltres = joueursPro.filter(j => {
    if (filtrePoste !== 'Tous' && j.poste !== filtrePoste) return false
    if (filtreCategorie !== 'Toutes' && j.categorie !== filtreCategorie) return false
    return true
  })

  // Joueurs avec une vidéo pour l'onglet clips
  const joueursAvecClip = joueursPro.filter(j => j.clip_url)

  const s = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #222', position: 'sticky', top: 0, background: '#0a0a0aee', zIndex: 100 },
    container: { maxWidth: '1100px', margin: '0 auto', padding: '2rem' },
    select: { background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '13px' },
    card: (sel) => ({ background: '#111', border: sel ? '2px solid #4ade80' : '1px solid #222', borderRadius: '12px', overflow: 'hidden', position: 'relative' }),
    btn: (v) => ({ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, background: v === 'green' ? '#4ade80' : v === 'red' ? '#ef444420' : '#1a1a1a', color: v === 'green' ? '#000' : v === 'red' ? '#ef4444' : '#ccc' }),
    stat: { background: '#1a1a1a', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#ccc', display: 'inline-block', margin: '2px' },
    statVal: { color: '#4ade80', fontWeight: 700 },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modalBox: { background: '#111', border: '1px solid #333', borderRadius: '16px', padding: '2rem', maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto' },
  }

  if (loading) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#4ade80' }}>Chargement...</p>
    </div>
  )

  const isRecruteur = profil?.plan === 'recruteur'

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div onClick={() => navigate('/')} style={{ fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {user ? (
            <button onClick={() => navigate(isRecruteur ? '/club' : '/dashboard')}
              style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
              {isRecruteur ? 'Scout Center' : 'Mon espace'}
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: 'white', border: '1px solid #444', padding: '8px 20px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Connexion</button>
              <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Rejoindre</button>
            </>
          )}
        </div>
      </nav>

      <div style={s.container}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#4ade80', fontSize: '12px', letterSpacing: '2px', marginBottom: '0.5rem' }}>SCOUT CENTER</p>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '0.5rem' }}>Les talents du moment ⚽</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            {isRecruteur
              ? `${selections.length} joueur${selections.length > 1 ? 's' : ''} dans votre shortlist`
              : 'Découvrez les joueurs PRO de la plateforme'}
          </p>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', justifyContent: 'center' }}>
          <button style={{ ...s.btn(vue === 'joueurs' ? 'green' : ''), padding: '10px 24px' }} onClick={() => setVue('joueurs')}>
            👤 Profils ({joueursPro.length})
          </button>
          <button style={{ ...s.btn(vue === 'clips' ? 'green' : ''), padding: '10px 24px' }} onClick={() => setVue('clips')}>
            🎬 Vidéos ({joueursAvecClip.length})
          </button>
        </div>

        {/* FILTRES */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={s.select} value={filtrePoste} onChange={e => setFiltrePoste(e.target.value)}>
            {POSTES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select style={s.select} value={filtreCategorie} onChange={e => setFiltreCategorie(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <span style={{ fontSize: '13px', color: '#555' }}>
            {vue === 'joueurs' ? joueursFiltres.length : joueursAvecClip.length} résultat{(vue === 'joueurs' ? joueursFiltres.length : joueursAvecClip.length) > 1 ? 's' : ''}
          </span>
          {isRecruteur && selections.length > 0 && (
            <button style={{ ...s.btn('green'), marginLeft: 'auto' }} onClick={() => navigate('/club')}>
              📋 Shortlist ({selections.length})
            </button>
          )}
        </div>

        {/* VUE JOUEURS */}
        {vue === 'joueurs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {joueursFiltres.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#555' }}>
                <p style={{ fontSize: '2rem' }}>🔍</p>
                <p>Aucun joueur avec ces critères</p>
              </div>
            ) : joueursFiltres.map(j => (
              <div key={j.id} style={s.card(isSelected(j.id))}>
                {isSelected(j.id) && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#4ade8020', color: '#4ade80', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', border: '1px solid #4ade8040' }}>✓ Shortlist</div>
                )}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                      {j.prenom?.[0]}{j.nom?.[0]}
                    </div>
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
                    {j.region && <span style={s.stat}>{j.region}</span>}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                    <span style={s.stat}>⚽ <span style={s.statVal}>{j.buts_total ?? 0}</span> buts</span>
                    <span style={s.stat}>🎯 <span style={s.statVal}>{j.passes_decisives ?? 0}</span> passes</span>
                    <span style={s.stat}>📋 <span style={s.statVal}>{j.matchs_officiel ?? 0}</span> matchs</span>
                  </div>

                  {j.clip_url && (
                    <div style={{ marginBottom: '12px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#4ade8010', border: '1px solid #4ade8030', color: '#4ade80', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>
                        🎬 Vidéo disponible
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button style={s.btn('green')} onClick={() => setJoueurModal(j)}>Voir profil</button>
                    {isRecruteur ? (
                      <button style={s.btn(isSelected(j.id) ? 'red' : '')} onClick={() => toggleSelection(j)}>
                        {isSelected(j.id) ? '− Retirer' : '+ Shortlist'}
                      </button>
                    ) : (
                      <button style={s.btn()} onClick={() => navigate('/register-recruteur')}>🔍 Recruteur</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VUE CLIPS / VIDÉOS */}
        {vue === 'clips' && (
          joueursAvecClip.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#555' }}>
              <p style={{ fontSize: '3rem' }}>🎬</p>
              <p style={{ fontSize: '16px', marginBottom: '8px' }}>Aucune vidéo pour le moment</p>
              <p style={{ fontSize: '13px' }}>Les joueurs PRO partagent leurs clips depuis leur dashboard</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {joueursAvecClip.map(j => (
                <div key={j.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' }}>

                  {/* Lecteur vidéo */}
                  <div style={{ background: '#000', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {isCloudinary(j.clip_url) ? (
                      <video
                        src={j.clip_url}
                        controls
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <a href={j.clip_url} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: '#fff', textDecoration: 'none' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#4ade8020', border: '2px solid #4ade8060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                          ▶
                        </div>
                        <span style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>
                          {isVeo(j.clip_url) ? 'Ouvrir sur Veo' : isYoutube(j.clip_url) ? 'Ouvrir sur YouTube' : 'Voir la vidéo'}
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Infos joueur */}
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#4ade8015', border: '1px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#4ade80', flexShrink: 0 }}>
                        {j.prenom?.[0]}{j.nom?.[0]}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '15px' }}>{j.prenom} {j.nom}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#4ade80' }}>{j.poste} {j.categorie ? `· ${j.categorie}` : ''}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                      {j.club && <span style={s.stat}>{j.club}</span>}
                      {j.region && <span style={s.stat}>{j.region}</span>}
                      <span style={s.stat}>⚽ <span style={s.statVal}>{j.buts_total ?? 0}</span></span>
                      <span style={s.stat}>🎯 <span style={s.statVal}>{j.passes_decisives ?? 0}</span></span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={s.btn('green')} onClick={() => setJoueurModal(j)}>Voir profil complet</button>
                      {isRecruteur && (
                        <button style={s.btn(isSelected(j.id) ? 'red' : '')} onClick={() => toggleSelection(j)}>
                          {isSelected(j.id) ? '− Retirer' : '+ Shortlist'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* MODAL PROFIL */}
      {joueurModal && (
        <div style={s.modal} onClick={() => setJoueurModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#4ade8015', border: '2px solid #4ade8060', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#4ade80' }}>
                  {joueurModal.prenom?.[0]}{joueurModal.nom?.[0]}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>{joueurModal.prenom} {joueurModal.nom}</h2>
                  <p style={{ margin: '4px 0 0', color: '#4ade80', fontSize: '14px' }}>{joueurModal.poste}</p>
                </div>
              </div>
              <button onClick={() => setJoueurModal(null)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
              {[['📍 Région', joueurModal.region], ['⚽ Catégorie', joueurModal.categorie], ['🦵 Pied', joueurModal.pied], ['🏟️ Niveau', joueurModal.niveau_equipe], ['🏆 Club', joueurModal.club]].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px 14px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{label}</p>
                  <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '14px' }}>{val}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginBottom: '10px' }}>📊 Stats</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
              {[['Matchs officiels', joueurModal.matchs_officiel ?? 0], ['Minutes jouées', joueurModal.minutes_jouees ?? 0], ['Buts total', joueurModal.buts_total ?? 0], ['Passes décisives', joueurModal.passes_decisives ?? 0], ['Matchs amicaux', joueurModal.matchs_amical ?? 0], ['Clean sheets', joueurModal.cleansheets ?? 0]].map(([label, val]) => (
                <div key={label} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#4ade80' }}>{val}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#666' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Vidéo dans la modal */}
            {joueurModal.clip_url && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '13px', color: '#4ade80', fontWeight: 600, marginBottom: '10px' }}>🎬 Vidéo</p>
                {isCloudinary(joueurModal.clip_url) ? (
                  <video src={joueurModal.clip_url} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '240px', background: '#000' }} />
                ) : (
                  <a href={joueurModal.clip_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, textDecoration: 'none' }}>
                    🎬 {isVeo(joueurModal.clip_url) ? 'Voir sur Veo' : isYoutube(joueurModal.clip_url) ? 'Voir sur YouTube' : 'Voir la vidéo'}
                  </a>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', paddingTop: '1rem', borderTop: '1px solid #222' }}>
              {isRecruteur ? (
                <button style={s.btn(isSelected(joueurModal.id) ? 'red' : 'green')} onClick={() => toggleSelection(joueurModal)}>
                  {isSelected(joueurModal.id) ? '− Retirer de la shortlist' : '+ Ajouter à la shortlist'}
                </button>
              ) : !user ? (
                <button style={s.btn('green')} onClick={() => navigate('/register-recruteur')}>🔍 Accès recruteur</button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '2rem', textAlign: 'center', marginTop: '3rem' }}>
        <p style={{ color: '#444', fontSize: '13px' }}>2025 Digital Football</p>
      </footer>
    </div>
  )
}

export default Feed
