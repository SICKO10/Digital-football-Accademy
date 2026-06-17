import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function DashboardCoach() {
  const navigate = useNavigate()
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loomUrls, setLoomUrls] = useState({})

  useEffect(() => {
    const getDemandes = async () => {
      const { data, error } = await supabase
        .from('demandes')
       .select('*')
        .order('created_at', { ascending: false })

      if (!error) setDemandes(data)
      setLoading(false)
    }
    getDemandes()
  }, [])

  const envoyerAnalyse = async (demandeId, joueurId) => {
    const loomUrl = loomUrls[demandeId]
    if (!loomUrl) return alert('Colle le lien Loom avant de valider')

    await supabase
      .from('demandes')
      .update({ statut: 'analyse', loom_url: loomUrl })
      .eq('id', demandeId)

    await supabase
      .from('profiles')
      .update({ analyses_restantes: supabase.rpc('decrement') })
      .eq('id', joueurId)

    setDemandes(prev => prev.map(d =>
      d.id === demandeId ? { ...d, statut: 'analyse', loom_url: loomUrl } : d
    ))

    alert('Analyse envoyee au joueur !')
  }

  const getStatutColor = (statut) => {
    if (statut === 'en_attente') return '#f59e0b'
    if (statut === 'analyse') return '#4ade80'
    return '#666'
  }

  const getStatutLabel = (statut) => {
    if (statut === 'en_attente') return 'En attente'
    if (statut === 'analyse') return 'Analyse envoyee'
    return statut
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

      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 2rem', borderBottom:'1px solid #222'}}>
        <div style={{fontSize:'18px', fontWeight:'700'}}>
          Digital<span style={{color:'#4ade80'}}>Football</span>
          <span style={{fontSize:'12px', color:'#4ade80', marginLeft:'8px', background:'#4ade8020', padding:'2px 8px', borderRadius:'20px'}}>Coach</span>
        </div>
        <button onClick={() => { supabase.auth.signOut(); navigate('/') }} style={{background:'transparent', color:'#666', border:'1px solid #333', padding:'6px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer'}}>
          Deconnexion
        </button>
      </nav>

      <div style={{maxWidth:'900px', margin:'0 auto', padding:'2rem'}}>

        {/* STATS */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'1rem', marginBottom:'2rem'}}>
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>Total demandes</p>
            <p style={{fontSize:'28px', fontWeight:'700'}}>{demandes.length}</p>
          </div>
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>En attente</p>
            <p style={{fontSize:'28px', fontWeight:'700', color:'#f59e0b'}}>{demandes.filter(d => d.statut === 'en_attente').length}</p>
          </div>
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'8px'}}>Analyses envoyees</p>
            <p style={{fontSize:'28px', fontWeight:'700', color:'#4ade80'}}>{demandes.filter(d => d.statut === 'analyse').length}</p>
          </div>
        </div>

        {/* LISTE DES DEMANDES */}
        <h2 style={{fontSize:'20px', fontWeight:'700', marginBottom:'1.5rem'}}>
          Demandes d analyse
        </h2>

        {demandes.length === 0 ? (
          <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'3rem', textAlign:'center'}}>
            <p style={{fontSize:'48px', marginBottom:'1rem'}}>📭</p>
            <p style={{color:'#666'}}>Aucune demande pour le moment</p>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            {demandes.map(demande => (
              <div key={demande.id} style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem'}}>
                
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1rem'}}>
                  <div>
                    <h3 style={{fontSize:'16px', fontWeight:'700', marginBottom:'4px'}}>{demande.titre}</h3>
                    <p style={{fontSize:'13px', color:'#666'}}>
                      {demande.profiles?.prenom} {demande.profiles?.nom} — {demande.profiles?.email}
                    </p>
                  </div>
                  <span style={{background: getStatutColor(demande.statut) + '20', color: getStatutColor(demande.statut), fontSize:'12px', padding:'4px 10px', borderRadius:'20px', fontWeight:'600'}}>
                    {getStatutLabel(demande.statut)}
                  </span>
                </div>

                <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.75rem', marginBottom:'1rem'}}>
                  <div style={{background:'#1a1a1a', borderRadius:'8px', padding:'0.75rem'}}>
                    <p style={{fontSize:'11px', color:'#555', marginBottom:'2px'}}>Poste</p>
                    <p style={{fontSize:'13px', fontWeight:'600'}}>{demande.poste}</p>
                  </div>
                  <div style={{background:'#1a1a1a', borderRadius:'8px', padding:'0.75rem'}}>
                    <p style={{fontSize:'11px', color:'#555', marginBottom:'2px'}}>Plan</p>
                    <p style={{fontSize:'13px', fontWeight:'600', color:'#4ade80', textTransform:'capitalize'}}>{demande.profiles?.plan}</p>
                  </div>
                  <div style={{background:'#1a1a1a', borderRadius:'8px', padding:'0.75rem'}}>
                    <p style={{fontSize:'11px', color:'#555', marginBottom:'2px'}}>Date</p>
                    <p style={{fontSize:'13px', fontWeight:'600'}}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {demande.description && (
                  <div style={{background:'#1a1a1a', borderRadius:'8px', padding:'0.75rem', marginBottom:'1rem'}}>
                    <p style={{fontSize:'11px', color:'#555', marginBottom:'4px'}}>Ce que le joueur veut analyser</p>
                    <p style={{fontSize:'13px', color:'#aaa'}}>{demande.description}</p>
                  </div>
                )}

                <div style={{display:'flex', gap:'0.75rem', alignItems:'center', marginBottom:'1rem'}}>
                  <a href={demande.video_url} target="_blank" rel="noreferrer" style={{background:'#1a1a1a', color:'#4ade80', border:'1px solid #333', padding:'8px 16px', borderRadius:'8px', fontSize:'13px', textDecoration:'none', cursor:'pointer'}}>
  🎬 Voir la video
</a>
                </div>

                {demande.statut === 'en_attente' && (
                  <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
                    <input
                      placeholder="Colle ton lien Loom ici..."
                      value={loomUrls[demande.id] || ''}
                      onChange={e => setLoomUrls(prev => ({ ...prev, [demande.id]: e.target.value }))}
                      style={{flex:1, background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}
                    />
                    <button onClick={() => envoyerAnalyse(demande.id, demande.joueur_id)} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'10px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap'}}>
                      Envoyer analyse
                    </button>
                  </div>
                )}

                {demande.statut === 'analyse' && demande.loom_url && (
                  <div style={{background:'#4ade8010', border:'1px solid #4ade8033', borderRadius:'8px', padding:'0.75rem'}}>
                    <p style={{fontSize:'12px', color:'#4ade80', marginBottom:'4px'}}>Analyse envoyee</p>
                    <a href={demande.loom_url} target="_blank" rel="noreferrer" style={{fontSize:'13px', color:'#aaa'}}>{demande.loom_url}</a>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardCoach