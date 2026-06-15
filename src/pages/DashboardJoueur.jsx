import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Loader from '../components/Loader'

function DashboardJoueur() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getProfil = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: demandesData } = await supabase
        .from('demandes')
        .select('*')
        .eq('joueur_id', user.id)
        .order('created_at', { ascending: false })

      setProfil(data)
      setDemandes(demandesData || [])
      setLoading(false)
    }
    getProfil()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  if (loading) return <Loader />

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif'}}>

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

        <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem'}}>
          <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'0.5rem'}}>Envoyer une video pour analyse</h2>
          <p style={{fontSize:'14px', color:'#666', marginBottom:'1.5rem'}}>Tu as {profil?.analyses_restantes} analyse(s) disponible(s) ce mois</p>
          {profil?.analyses_restantes > 0 ? (
            <button onClick={() => navigate('/upload')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'12px 28px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Envoyer ma video
            </button>
          ) : (
            <div style={{background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'1rem'}}>
              <p style={{fontSize:'14px', color:'#666'}}>Tu as utilise toutes tes analyses ce mois.</p>
            </div>
          )}
        </div>

        {profil?.plan === 'pro' ? (
          <div style={{background:'#111', border:'1px solid #4ade8033', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem'}}>
              <span style={{fontSize:'24px'}}>🎬</span>
              <h2 style={{fontSize:'18px', fontWeight:'700'}}>Publier un clip sur le feed</h2>
            </div>
            <p style={{fontSize:'14px', color:'#666', marginBottom:'1.5rem'}}>Montre ton talent — clubs et agents regardent le feed chaque semaine !</p>
            <button onClick={() => navigate('/upload-clip')} style={{background:'transparent', color:'#4ade80', border:'1px solid #4ade80', padding:'12px 28px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Publier un clip
            </button>
          </div>
        ) : (
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem'}}>
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem'}}>
              <span style={{fontSize:'24px'}}>🔒</span>
              <h2 style={{fontSize:'18px', fontWeight:'700', color:'#666'}}>Publier un clip sur le feed</h2>
            </div>
            <p style={{fontSize:'14px', color:'#666', marginBottom:'1.5rem'}}>Passe au plan Pro pour publier tes clips sur le reseau social et etre vu par les clubs et agents.</p>
            <button onClick={() => navigate('/offres')} style={{background:'transparent', color:'#4ade80', border:'1px solid #4ade80', padding:'12px 28px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Passer au plan Pro
            </button>
          </div>
        )}

        <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem'}}>
          <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'1.5rem'}}>Mes analyses</h2>
          {demandes.length === 0 ? (
            <div style={{textAlign:'center', padding:'3rem 0'}}>
              <p style={{fontSize:'48px', marginBottom:'1rem'}}>🎬</p>
              <p style={{color:'#666', fontSize:'14px'}}>Aucune analyse pour le moment</p>
              <p style={{color:'#555', fontSize:'13px', marginTop:'4px'}}>Envoie ta premiere video pour recevoir ton analyse</p>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
              {demandes.map(demande => (
                <div key={demande.id} style={{background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'10px', padding:'1.25rem'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                    <h3 style={{fontSize:'15px', fontWeight:'600'}}>{demande.titre}</h3>
                    <span style={{background: demande.statut === 'analyse' ? '#4ade8020' : '#f59e0b20', color: demande.statut === 'analyse' ? '#4ade80' : '#f59e0b', fontSize:'12px', padding:'3px 10px', borderRadius:'20px', fontWeight:'600'}}>
                      {demande.statut === 'analyse' ? 'Analyse recue' : 'En attente'}
                    </span>
                  </div>
                  <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>{demande.poste} — {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                  {demande.loom_url && (
                    <a href={demande.loom_url} target="_blank" rel="noreferrer" style={{display:'inline-block', background:'#4ade80', color:'#0a0a0a', padding:'8px 16px', borderRadius:'8px', fontSize:'13px', fontWeight:'600', textDecoration:'none', marginTop:'8px'}}>
                      Voir mon analyse
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default DashboardJoueur