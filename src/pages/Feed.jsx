import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function Feed() {
  const navigate = useNavigate()
  const [clips, setClips] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [commentaire, setCommentaire] = useState({})
  const [showComments, setShowComments] = useState({})
  const [commentaires, setCommentaires] = useState({})

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
    getClips()
  }, [])

  const getClips = async () => {
    const { data } = await supabase
      .from('clips')
      .select('*, profiles(prenom, nom, poste)')
      .order('created_at', { ascending: false })
    setClips(data || [])
    setLoading(false)
  }

  const handleLike = async (clipId) => {
    if (!user) { navigate('/register'); return }
    const { data: existing } = await supabase
      .from('likes')
      .select('id')
      .eq('clip_id', clipId)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      await supabase.from('likes').delete().eq('id', existing.id)
    } else {
      await supabase.from('likes').insert({ clip_id: clipId, user_id: user.id })
    }
    getClips()
  }

  const getCommentaires = async (clipId) => {
    const { data } = await supabase
      .from('commentaires')
      .select('*')
      .eq('clip_id', clipId)
      .order('created_at', { ascending: true })
    setCommentaires(prev => ({ ...prev, [clipId]: data || [] }))
  }

  const toggleComments = (clipId) => {
    setShowComments(prev => ({ ...prev, [clipId]: !prev[clipId] }))
    if (!showComments[clipId]) getCommentaires(clipId)
  }

  const envoyerCommentaire = async (clipId) => {
    if (!user) { navigate('/register'); return }
    if (!commentaire[clipId]) return
    await supabase.from('commentaires').insert({
      clip_id: clipId,
      user_id: user.id,
      texte: commentaire[clipId],
      auteur: user.email.split('@')[0]
    })
    setCommentaire(prev => ({ ...prev, [clipId]: '' }))
    getCommentaires(clipId)
  }

  const partager = (plateforme, clip) => {
    const url = encodeURIComponent(`https://digital-football-accademy.vercel.app/feed`)
    const texte = encodeURIComponent(`Regarde ce clip de ${clip.profiles?.prenom} sur Digital Football !`)
    const liens = {
      whatsapp: `https://wa.me/?text=${texte}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${texte}`,
      twitter: `https://twitter.com/intent/tweet?text=${texte}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    }
    window.open(liens[plateforme], '_blank')
  }

  if (loading) {
    return (
      <div style={{minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{animation:'spin 1s linear infinite', fontSize:'48px'}}>⚽</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif'}}>

      {/* NAVBAR */}
      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 2rem', borderBottom:'1px solid #222', position:'sticky', top:0, background:'#0a0a0aee', zIndex:100}}>
        <div onClick={() => navigate('/')} style={{fontSize:'18px', fontWeight:'700', cursor:'pointer'}}>
          Digital<span style={{color:'#4ade80'}}>Football</span>
        </div>
        <div style={{display:'flex', gap:'1rem'}}>
          {user ? (
            <button onClick={() => navigate('/dashboard')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'8px 20px', borderRadius:'8px', fontWeight:'600', cursor:'pointer'}}>
              Mon espace
            </button>
          ) : (
            <>
              <button onClick={() => navigate('/login')} style={{background:'transparent', color:'white', border:'1px solid #444', padding:'8px 20px', borderRadius:'8px', fontSize:'14px', cursor:'pointer'}}>
                Connexion
              </button>
              <button onClick={() => navigate('/register')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'8px 20px', borderRadius:'8px', fontWeight:'600', cursor:'pointer'}}>
                Rejoindre
              </button>
            </>
          )}
        </div>
      </nav>

      {/* HEADER */}
      <div style={{textAlign:'center', padding:'2rem 2rem 1rem'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>FEED</p>
        <h1 style={{fontSize:'28px', fontWeight:'700', marginBottom:'0.5rem'}}>Les clips du moment</h1>
        <p style={{color:'#666', fontSize:'14px'}}>Decouvre les talents de la plateforme</p>
      </div>

      {/* CLIPS */}
      <div style={{maxWidth:'600px', margin:'0 auto', padding:'1rem 2rem'}}>

        {clips.length === 0 ? (
          <div style={{textAlign:'center', padding:'4rem 0'}}>
            <p style={{fontSize:'48px', marginBottom:'1rem'}}>🎬</p>
            <p style={{color:'#666', fontSize:'16px', marginBottom:'0.5rem'}}>Aucun clip pour le moment</p>
            <p style={{color:'#555', fontSize:'14px', marginBottom:'2rem'}}>Sois le premier a partager ton talent !</p>
            <button onClick={() => navigate('/register')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'12px 28px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Rejoindre Digital Football
            </button>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
            {clips.map(clip => (
              <div key={clip.id} style={{background:'#111', border:'1px solid #222', borderRadius:'16px', overflow:'hidden'}}>

                {/* VIDEO */}
                <div style={{background:'#1a1a1a', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center', position:'relative'}}>
                  <video
                    src={`https://ogxladkyvcnhwctyiknu.supabase.co/storage/v1/object/public/clips/${clip.video_url}`}
                    controls
                    style={{width:'100%', height:'100%', objectFit:'cover'}}
                  />
                </div>

                {/* INFOS */}
                <div style={{padding:'1rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem'}}>
                    <div>
                      <h3 style={{fontSize:'16px', fontWeight:'700', marginBottom:'2px'}}>{clip.titre}</h3>
                      <p style={{fontSize:'13px', color:'#4ade80'}}>
                        {clip.profiles?.prenom} {clip.profiles?.nom} — {clip.profiles?.poste}
                      </p>
                    </div>
                    <div style={{fontSize:'12px', color:'#555'}}>
                      {new Date(clip.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>

                  {clip.description && (
                    <p style={{fontSize:'13px', color:'#888', marginBottom:'1rem'}}>{clip.description}</p>
                  )}

                  {/* ACTIONS */}
                  <div style={{display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap'}}>
                    
                    {/* LIKE */}
                    <button onClick={() => handleLike(clip.id)} style={{background:'#1a1a1a', border:'1px solid #333', color:'white', padding:'8px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px'}}>
                      ❤️ Like
                    </button>

                    {/* COMMENTAIRE */}
                    <button onClick={() => toggleComments(clip.id)} style={{background:'#1a1a1a', border:'1px solid #333', color:'white', padding:'8px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px'}}>
                      💬 Commenter
                    </button>

                    {/* PARTAGER */}
                    <div style={{display:'flex', gap:'6px', marginLeft:'auto'}}>
                      <button onClick={() => partager('whatsapp', clip)} style={{background:'#25D36620', border:'1px solid #25D36640', color:'#25D366', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:'600'}}>
                        WhatsApp
                      </button>
                      <button onClick={() => partager('telegram', clip)} style={{background:'#0088cc20', border:'1px solid #0088cc40', color:'#0088cc', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:'600'}}>
                        Telegram
                      </button>
                      <button onClick={() => partager('facebook', clip)} style={{background:'#1877F220', border:'1px solid #1877F240', color:'#1877F2', padding:'8px 12px', borderRadius:'8px', fontSize:'12px', cursor:'pointer', fontWeight:'600'}}>
                        Facebook
                      </button>
                    </div>
                  </div>

                  {/* COMMENTAIRES */}
                  {showComments[clip.id] && (
                    <div style={{marginTop:'1rem', borderTop:'1px solid #222', paddingTop:'1rem'}}>
                      <div style={{display:'flex', flexDirection:'column', gap:'0.75rem', marginBottom:'1rem'}}>
                        {(commentaires[clip.id] || []).length === 0 ? (
                          <p style={{fontSize:'13px', color:'#555'}}>Aucun commentaire — sois le premier !</p>
                        ) : (
                          (commentaires[clip.id] || []).map(c => (
                            <div key={c.id} style={{background:'#1a1a1a', borderRadius:'8px', padding:'0.75rem'}}>
                              <p style={{fontSize:'12px', color:'#4ade80', marginBottom:'4px', fontWeight:'600'}}>{c.auteur}</p>
                              <p style={{fontSize:'13px', color:'#aaa'}}>{c.texte}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div style={{display:'flex', gap:'0.5rem'}}>
                        <input
                          value={commentaire[clip.id] || ''}
                          onChange={e => setCommentaire(prev => ({ ...prev, [clip.id]: e.target.value }))}
                          placeholder={user ? "Ton commentaire..." : "Connecte-toi pour commenter"}
                          disabled={!user}
                          onKeyDown={e => e.key === 'Enter' && envoyerCommentaire(clip.id)}
                          style={{flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'8px 12px', color:'white', fontSize:'13px', outline:'none'}}
                        />
                        <button onClick={() => envoyerCommentaire(clip.id)} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'8px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer'}}>
                          Envoyer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid #1a1a1a', padding:'2rem', textAlign:'center', marginTop:'3rem'}}>
        <p style={{color:'#444', fontSize:'13px'}}>© 2024 Digital Football</p>
      </footer>

    </div>
  )
}

export default Feed