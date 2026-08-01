import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'

function Login() {
  const navigate = useNavigate()
  const { lang } = useLang()
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
      setErreur(t('auth_email_ou_mdp_incorrect', lang))
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data: profil } = await supabase
      .from('profiles')
      .select('plan, abonnement_actif')
      .eq('id', user.id)
      .maybeSingle()

    setLoading(false)

    if (profil?.plan === 'club') {
      navigate('/club')
    } else if (profil?.plan === 'scout') {
      navigate('/recruteur')
    } else if (profil?.plan === 'coach') {
      navigate('/coach')
    } else if (profil?.plan === 'educateur') {
      navigate('/educateur')
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
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>{t('auth_connexion_titre', lang)}</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>{t('auth_acces_espace_joueur', lang)}</p>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('aff_email', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email"
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('auth_mot_de_passe', lang)}</label>
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
          {loading ? t('auth_connexion_cours', lang) : t('auth_se_connecter', lang)}
        </button>

        <p style={{textAlign:'center', fontSize:'13px', marginTop:'1rem'}}>
          <span onClick={() => navigate('/forgot-password')} style={{color:'#666', cursor:'pointer'}}>
            {t('auth_mdp_oublie_question', lang)}
          </span>
        </p>

        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'0.75rem'}}>
          {t('auth_pas_de_compte', lang)}{' '}
          <span onClick={() => navigate('/register')} style={{color:'#4ade80', cursor:'pointer'}}>
            {t('auth_sinscrire', lang)}
          </span>
        </p>
        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'0.5rem'}}>
          <span onClick={() => navigate('/')} style={{color:'#555', cursor:'pointer'}}>
            {t('auth_retour_accueil', lang)}
          </span>
        </p>

      </div>
    </div>
  )
}

export default Login
