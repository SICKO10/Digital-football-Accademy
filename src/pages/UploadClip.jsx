import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

function UploadClip() {
  const navigate = useNavigate()
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [fichier, setFichier] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleUpload = async () => {
    if (!fichier || !titre) {
      setErreur('Remplis le titre et selectionne une video')
      return
    }

    setLoading(true)
    setErreur('')

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) { navigate('/login'); return }

    const nomNettoye = fichier.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nomFichier = `${user.id}/${Date.now()}_${nomNettoye}`

    const { error: uploadError } = await supabase.storage
      .from('clips')
      .upload(nomFichier, fichier)

    if (uploadError) {
      setErreur('Erreur upload: ' + uploadError.message)
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase.from('clips').insert({
      joueur_id: user.id,
      titre,
      description,
      video_url: nomFichier,
      vues: 0,
    })

    if (dbError) {
      setErreur('Erreur: ' + dbError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/feed')
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif'}}>

      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 2rem', borderBottom:'1px solid #222'}}>
        <div style={{fontSize:'18px', fontWeight:'700'}}>
          Digital<span style={{color:'#4ade80'}}>Football</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={{background:'transparent', color:'#666', border:'1px solid #333', padding:'6px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer'}}>
          Retour dashboard
        </button>
      </nav>

      <div style={{maxWidth:'600px', margin:'0 auto', padding:'2rem'}}>
        <div style={{marginBottom:'2rem'}}>
          <h1 style={{fontSize:'24px', fontWeight:'700', marginBottom:'0.5rem'}}>Partager un clip</h1>
          <p style={{color:'#666', fontSize:'14px'}}>Ton clip sera visible sur le feed public — montre ton talent !</p>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1.25rem'}}>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Titre du clip</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Mon but de la semaine" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}/>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Decris ton clip..." rows={3} style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none', resize:'vertical'}}/>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Ta video</label>
            <div style={{background:'#1a1a1a', border:'2px dashed #333', borderRadius:'8px', padding:'2rem', textAlign:'center', cursor:'pointer'}} onClick={() => document.getElementById('clipInput').click()}>
              {fichier ? (
                <div>
                  <p style={{color:'#4ade80', fontSize:'14px', fontWeight:'600'}}>✓ {fichier.name}</p>
                  <p style={{color:'#666', fontSize:'12px', marginTop:'4px'}}>{(fichier.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <p style={{fontSize:'32px', marginBottom:'8px'}}>🎬</p>
                  <p style={{color:'#aaa', fontSize:'14px'}}>Clique pour selectionner ton clip</p>
                  <p style={{color:'#555', fontSize:'12px', marginTop:'4px'}}>MP4, MOV — Max 100MB</p>
                </div>
              )}
            </div>
            <input id="clipInput" type="file" accept="video/*" onChange={e => setFichier(e.target.files[0])} style={{display:'none'}}/>
          </div>

          {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center'}}>{erreur}</p>}

          <button onClick={handleUpload} disabled={loading} style={{width:'100%', background:'#4ade80', color:'#0a0a0a', border:'none', padding:'14px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Publication en cours...' : 'Publier mon clip'}
          </button>

        </div>
      </div>
    </div>
  )
}

export default UploadClip