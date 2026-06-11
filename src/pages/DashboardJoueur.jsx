import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function DashboardJoueur() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfil(data)
      setLoading(false)
    }

    getProfil()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div style={{minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <p style={{color:'#4ade80', fontFamily:'sans-serif'}}>Chargement...</p>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif'}}>
      
      {/* NAVBAR */}
      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 2rem', borderBottom:'1px solid #222'}}>
        <div style={{fontSize:'18px', fontWeight:'700'}}>
          Digital<span style={{color:'#4ade80'}}>Football</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
          <span style={{fontSize:'14px', color:'#aaa'}}>Bonjour {profil?.prenom} 👋</span>
          <button onClick={handleLogout} style={{background:'transparent', color:'#666', border:'1px solid #333', padding:'6px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer'}}>
            Deconnexion
          </button>
        </div>
      </nav>

      <div style={{maxWidth:'900px', margin:'0 auto', padding:'2rem'}}>
        
        {/* STATS */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginBottom:'2rem'}}>
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>Plan actuel</p>
            <p style={{fontSize:'22px', fontWeight:'700', color:'#4ade80', textTransform:'capitalize'}}>{profil?.plan}</p>
          </div>
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>Analyses restantes</p>
            <p style={{fontSize:'22px', fontWeight:'700'}}>{profil?.analyses_restantes} <span style={{fontSize:'14px', color:'#666'}}>ce mois</span></p>
          </div>
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>Mon poste</p>
            <p style={{fontSize:'22px', fontWeight:'700'}}>{profil?.poste}</p>
          </div>
        </div>

        {/* ENVOYER UNE VIDEO */}
        <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem', marginBottom:'2rem'}}>
          <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'0.5rem'}}>Envoyer une video</h2>
          <p style={{fontSize:'14px', color:'#666', marginBottom:'1.5rem'}}>Tu as {profil?.analyses_restantes} analyse(s) disponible(s) ce mois</p>
          
          {profil?.analyses_restantes > 0 ? (
            <button onClick={() => navigate('/upload')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'12px 28px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Envoyer ma video
            </button>
          ) : (
            <div style={{background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'1rem'}}>
              <p style={{fontSize:'14px', color:'#666'}}>Tu as utilise toutes tes analyses ce mois. Revient le mois prochain ou passe au plan superieur.</p>
            </div>
          )}
        </div>

        {/* MES ANALYSES */}
        <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem'}}>
          <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'1.5rem'}}>Mes analyses</h2>
          <div style={{textAlign:'center', padding:'3rem 0'}}>
            <p style={{fontSize:'48px', marginBottom:'1rem'}}>🎬</p>
            <p style={{color:'#666', fontSize:'14px'}}>Aucune analyse pour le moment</p>
            <p style={{color:'#555', fontSize:'13px', marginTop:'4px'}}>Envoie ta premiere video pour recevoir ton analyse</p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default DashboardJoueur