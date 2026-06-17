import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setErreur('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErreur('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data: profil } = await supabase
      .from('profiles')
      .select('plan, abonnement_actif')
      .eq('id', user.id)
      .single()

    setLoading(false)

    if (profil?.plan === 'recruteur') {
      navigate('/club')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', width:'100%', maxWidth:'400px'}}>

        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>Connexion</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>Acces a ton espace joueur</p>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="motdepasse"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>
        </div>

        {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center', marginTop:'1rem'}}>{erreur}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{width:'100%', background:'#4ade80', color:'#0a0a0a', border:'none', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor:'pointer', marginTop:'1.5rem'}}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'1.5rem'}}>
          Pas encore de compte ?{' '}
          <span onClick={() => navigate('/register')} style={{color:'#4ade80', cursor:'pointer'}}>
            S inscrire
          </span>
        </p>
        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'0.5rem'}}>
          <span onClick={() => navigate('/')} style={{color:'#555', cursor:'pointer'}}>
            Retour accueil
          </span>
        </p>

      </div>
    </div>
  )
}

export default Login
