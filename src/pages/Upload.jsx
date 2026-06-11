import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

function Upload() {
  const navigate = useNavigate()
  const [titre, setTitre] = useState('')
  const [poste, setPoste] = useState('Attaquant')
  const [description, setDescription] = useState('')
  const [fichier, setFichier] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleUpload = async () => {
    if (!fichier || !titre) {
      setErreur('Remplis tous les champs et selectionne une video')
      return
    }

    setLoading(true)
    setErreur('')

    const { data: { user } } = await supabase.auth.getUser()

    const nomFichier = `${user.id}/${Date.now()}_${fichier.name}`
    
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(nomFichier, fichier)

    if (uploadError) {
      setErreur('Erreur upload: ' + uploadError.message)
      setLoading(false)
      return
    }

    const { error: dbError } = await supabase.from('demandes').insert({
      joueur_id: user.id,
      titre,
      poste,
      description,
      video_url: nomFichier,
      statut: 'en_attente',
    })

    if (dbError) {
      setErreur('Erreur: ' + dbError.message)
      setLoading(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ analyses_restantes: supabase.rpc('decrement', { x: 1 }) })
      .eq('id', user.id)

    setLoading(false)
    navigate('/dashboard')
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
        <h1 style={{fontSize:'24px', fontWeight:'700', marginBottom:'0.5rem'}}>Envoyer ma video</h1>
        <p style={{color:'#666', fontSize:'14px', marginBottom:'2rem'}}>Notre expert analysera ta video et te fera un retour vocal</p>

        <div style={{display:'flex', flexDirection:'column', gap:'1.25rem'}}>
          
          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Titre du match</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Ex: Match vs Olympique Lyon U19" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}/>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Poste joue</label>
            <select value={poste} onChange={e => setPoste(e.target.value)} style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}>
              <option>Gardien</option>
              <option>Defenseur</option>
              <option>Milieu</option>
              <option>Attaquant</option>
            </select>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Ce que tu veux qu on analyse</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Je veux qu on analyse mes deplacements sans ballon et mes appels..." rows={4} style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none', resize:'vertical'}}/>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Ta video</label>
            <div style={{background:'#1a1a1a', border:'2px dashed #333', borderRadius:'8px', padding:'2rem', textAlign:'center', cursor:'pointer'}} onClick={() => document.getElementById('fileInput').click()}>
              {fichier ? (
                <div>
                  <p style={{color:'#4ade80', fontSize:'14px', fontWeight:'600'}}>✓ {fichier.name}</p>
                  <p style={{color:'#666', fontSize:'12px', marginTop:'4px'}}>{(fichier.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <p style={{fontSize:'32px', marginBottom:'8px'}}>🎬</p>
                  <p style={{color:'#aaa', fontSize:'14px'}}>Clique pour selectionner ta video</p>
                  <p style={{color:'#555', fontSize:'12px', marginTop:'4px'}}>MP4, MOV, AVI — Max 500MB</p>
                </div>
              )}
            </div>
            <input id="fileInput" type="file" accept="video/*" onChange={e => setFichier(e.target.files[0])} style={{display:'none'}}/>
          </div>

          {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center'}}>{erreur}</p>}

          <button onClick={handleUpload} disabled={loading} style={{width:'100%', background:'#4ade80', color:'#0a0a0a', border:'none', padding:'14px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Envoi en cours...' : 'Envoyer ma video'}
          </button>

        </div>
      </div>
    </div>
  )
}

export default Upload