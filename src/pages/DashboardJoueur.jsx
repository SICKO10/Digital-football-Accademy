import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import Loader from '../components/Loader'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
}

function DashboardJoueur() {
  const navigate = useNavigate()
  const [profil, setProfil] = useState(null)
  const [demandes, setDemandes] = useState([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState('dashboard')
  const [stats, setStats] = useState({})
  const [savingStats, setSavingStats] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)

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
      setStats({
        club: data?.club || '',
        niveau_equipe: data?.niveau_equipe || '',
        categorie: data?.categorie || '',
        region: data?.region || '',
        pied: data?.pied || 'droit',
        matchs_officiel: data?.matchs_officiel || 0,
        matchs_amical: data?.matchs_amical || 0,
        minutes_jouees: data?.minutes_jouees || 0,
        buts_pied_droit: data?.buts_pied_droit || 0,
        buts_pied_gauche: data?.buts_pied_gauche || 0,
        buts_tete: data?.buts_tete || 0,
        buts_total: data?.buts_total || 0,
        passes_decisives: data?.passes_decisives || 0,
        cleansheets: data?.cleansheets || 0,
      })
      setDemandes(demandesData || [])
      setLoading(false)
    }
    getProfil()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const handleSaveStats = async () => {
    setSavingStats(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update(stats).eq('id', user.id)
    setSavingStats(false)
    setStatsSaved(true)
    setTimeout(() => setStatsSaved(false), 3000)
  }

  const inputStyle = {
    width: '100%',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '10px 12px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: '13px',
    color: '#aaa',
    display: 'block',
    marginBottom: '6px',
  }

  if (loading) return <Loader />

  if (!profil?.abonnement_actif) {
    return (
      <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{maxWidth:'440px', width:'100%', background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', textAlign:'center'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'22px', fontWeight:'700', marginBottom:'1rem'}}>Abonnement non actif</h1>
          <p style={{fontSize:'14px', color:'#888', marginBottom:'1.5rem'}}>
            Ton inscription a bien ete enregistree, mais ton paiement n'a pas encore ete confirme.
            Choisis ton offre pour activer ton compte.
          </p>
          <div style={{display:'flex', flexDirection:'column', gap:'12px', marginBottom:'1.5rem'}}>
            <button onClick={() => window.location.href = STRIPE_LINKS.starter} style={{background:'transparent', color:'white', border:'1px solid #333', padding:'12px 20px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Activer Starter — 49,99€/mois
            </button>
            <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'12px 20px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
              Activer Pro — 79,99€/mois
            </button>
          </div>
          <span onClick={handleLogout} style={{color:'#666', fontSize:'13px', cursor:'pointer'}}>Deconnexion</span>
        </div>
      </div>
    )
  }

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

        <div style={{display:'flex', gap:'1rem', marginBottom:'2rem', borderBottom:'1px solid #222', paddingBottom:'1rem'}}>
          {['dashboard', 'profil', 'analyses'].map(o => (
            <button key={o} onClick={() => setOnglet(o)} style={{background:'transparent', border:'none', color: onglet === o ? '#4ade80' : '#666', fontSize:'15px', fontWeight: onglet === o ? '700' : '400', cursor:'pointer', paddingBottom:'4px', borderBottom: onglet === o ? '2px solid #4ade80' : '2px solid transparent', textTransform:'capitalize'}}>
              {o === 'dashboard' ? 'Accueil' : o === 'profil' ? 'Mon Profil & Stats' : 'Mes Analyses'}
            </button>
          ))}
        </div>

        {onglet === 'dashboard' && (
          <div>
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
                <button onClick={() => window.location.href = STRIPE_LINKS.pro} style={{background:'transparent', color:'#4ade80', border:'1px solid #4ade80', padding:'12px 28px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer'}}>
                  Passer au plan Pro
                </button>
              </div>
            )}
          </div>
        )}

        {onglet === 'profil' && (
          <div>
            <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem'}}>
              <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'1.5rem'}}>📋 Informations club</h2>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem'}}>
                <div>
                  <label style={labelStyle}>Club actuel</label>
                  <input value={stats.club} onChange={e => setStats({...stats, club: e.target.value})} placeholder="Ex: AS Saint-Etienne" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Niveau de l'equipe</label>
                  <select value={stats.niveau_equipe} onChange={e => setStats({...stats, niveau_equipe: e.target.value})} style={inputStyle}>
                    <option value="">-- Choisir --</option>
                    <option>Ligue 1</option>
                    <option>Ligue 2</option>
                    <option>National</option>
                    <option>Regional 1</option>
                    <option>Regional 2</option>
                    <option>Regional 3</option>
                    <option>Departemental</option>
                    <option>Amateur</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Categorie</label>
                  <select value={stats.categorie} onChange={e => setStats({...stats, categorie: e.target.value})} style={inputStyle}>
                    <option value="">-- Choisir --</option>
                    <option>U13</option>
                    <option>U14</option>
                    <option>U15</option>
                    <option>U16</option>
                    <option>U17</option>
                    <option>U18</option>
                    <option>U19</option>
                    <option>U20</option>
                    <option>U21</option>
                    <option>Senior</option>
                    <option>Veteran</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Region</label>
                  <input value={stats.region} onChange={e => setStats({...stats, region: e.target.value})} placeholder="Ex: Ile-de-France" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Pied fort</label>
                  <select value={stats.pied} onChange={e => setStats({...stats, pied: e.target.value})} style={inputStyle}>
                    <option value="droit">Droit</option>
                    <option value="gauche">Gauche</option>
                    <option value="ambidextre">Ambidextre</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem'}}>
              <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'1.5rem'}}>⚽ Statistiques de matchs</h2>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem'}}>
                <div>
                  <label style={labelStyle}>Matchs officiels</label>
                  <input type="number" min="0" value={stats.matchs_officiel} onChange={e => setStats({...stats, matchs_officiel: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Matchs amicaux</label>
                  <input type="number" min="0" value={stats.matchs_amical} onChange={e => setStats({...stats, matchs_amical: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Minutes jouees</label>
                  <input type="number" min="0" value={stats.minutes_jouees} onChange={e => setStats({...stats, minutes_jouees: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'2rem', marginBottom:'1.5rem'}}>
              <h2 style={{fontSize:'18px', fontWeight:'700', marginBottom:'1.5rem'}}>🥅 Buts & Actions</h2>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', marginBottom:'1rem'}}>
                <div>
                  <label style={labelStyle}>Buts pied droit</label>
                  <input type="number" min="0" value={stats.buts_pied_droit} onChange={e => setStats({...stats, buts_pied_droit: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Buts pied gauche</label>
                  <input type="number" min="0" value={stats.buts_pied_gauche} onChange={e => setStats({...stats, buts_pied_gauche: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Buts de la tete</label>
                  <input type="number" min="0" value={stats.buts_tete} onChange={e => setStats({...stats, buts_tete: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Buts total</label>
                  <input type="number" min="0" value={stats.buts_total} onChange={e => setStats({...stats, buts_total: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Passes decisives</label>
                  <input type="number" min="0" value={stats.passes_decisives} onChange={e => setStats({...stats, passes_decisives: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cleansheets</label>
                  <input type="number" min="0" value={stats.cleansheets} onChange={e => setStats({...stats, cleansheets: parseInt(e.target.value) || 0})} style={inputStyle} />
                </div>
              </div>
            </div>

            <button onClick={handleSaveStats} disabled={savingStats} style={{width:'100%', background:'#4ade80', color:'#0a0a0a', border:'none', padding:'14px', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer'}}>
              {savingStats ? 'Sauvegarde...' : statsSaved ? '✅ Sauvegarde !' : 'Sauvegarder mon profil'}
            </button>
          </div>
        )}

        {onglet === 'analyses' && (
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
        )}

      </div>
    </div>
  )
}

export default DashboardJoueur
