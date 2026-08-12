import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors } from '../tokens'

const PILLS = ['⚽ 500+ joueurs', '🏟️ 50+ clubs', '🔍 Scouts actifs']

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

  // Focus/blur en mutation DOM directe (pas de state par input) — même
  // convention que Register.jsx (onMouseEnter/onMouseLeave sur les cards profil).
  const focusable = {
    onFocus: e => { e.currentTarget.style.borderColor = colors.accent.green },
    onBlur: e => { e.currentTarget.style.borderColor = '#333' },
  }
  const inputStyle = { width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'sans-serif' }}>
      <style>{`
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; max-width: 480px !important; flex: none !important; margin: 0 auto; }
          .login-mobile-logo { display: block !important; }
        }
      `}</style>

      {/* ── Colonne gauche — vitrine, cachée sur mobile ── */}
      <div className="login-left" style={{ flex: 1, background: 'linear-gradient(160deg, #061a0e 0%, #0a2010 50%, #030d07 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem' }}>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>
          Digital<span style={{ color: colors.accent.green }}>Football</span>
        </div>

        <div>
          <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Ton terrain, ta carrière.</h2>
          <p style={{ color: colors.text.dim, fontSize: '15px', marginTop: '12px' }}>La plateforme qui connecte joueurs, clubs et recruteurs.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {PILLS.map(pill => (
            <span key={pill} style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: colors.text.dim }}>
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* ── Colonne droite — formulaire ── */}
      <div className="login-right" style={{ flex: 'none', width: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div className="login-mobile-logo" style={{ display: 'none', fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Digital<span style={{ color: colors.accent.green }}>Football</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '700' }}>{t('auth_connexion_titre', lang)}</h1>
            <p style={{ color: colors.text.dim, fontSize: '14px', marginTop: '4px' }}>{t('auth_acces_espace_joueur', lang)}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('aff_email', lang)}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email"
                style={inputStyle}
                {...focusable}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('auth_mot_de_passe', lang)}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="motdepasse"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                style={inputStyle}
                {...focusable}
              />
            </div>
          </div>

          {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginTop: '1rem' }}>{erreur}</p>}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: '100%', background: colors.accent.green, color: colors.background.base, border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '1.5rem' }}
          >
            {loading ? t('auth_connexion_cours', lang) : t('auth_se_connecter', lang)}
          </button>

          <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '1rem' }}>
            <span onClick={() => navigate('/forgot-password')} style={{ color: colors.text.dim, cursor: 'pointer' }}>
              {t('auth_mdp_oublie_question', lang)}
            </span>
          </p>

          <p style={{ textAlign: 'center', fontSize: '13px', color: colors.text.dim, marginTop: '0.75rem' }}>
            {t('auth_pas_de_compte', lang)}{' '}
            <span onClick={() => navigate('/register')} style={{ color: colors.accent.green, cursor: 'pointer' }}>
              {t('auth_sinscrire', lang)}
            </span>
          </p>
          <p style={{ textAlign: 'center', fontSize: '13px', color: colors.text.dim, marginTop: '0.5rem' }}>
            <span onClick={() => navigate('/')} style={{ color: colors.text.faint, cursor: 'pointer' }}>
              {t('auth_retour_accueil', lang)}
            </span>
          </p>

        </div>
      </div>
    </div>
  )
}

export default Login
