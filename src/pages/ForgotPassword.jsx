import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors, alpha } from '../tokens'

function ForgotPassword() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) { setErreur(t('auth_saisis_email', lang)); return }
    setLoading(true)
    setErreur('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'https://digital-football-accademy.vercel.app/reset-password',
    })
    setLoading(false)
    if (error) { setErreur(error.message); return }
    setSent(true)
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{t('auth_mdp_oublie', lang)}</h1>
          <p style={{ color: colors.text.dim, fontSize: '14px', marginTop: '4px' }}>
            {t('auth_lien_reinit_desc', lang)}
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>📧</p>
            <p style={{ fontWeight: 700, marginBottom: '8px' }}>{t('auth_email_envoye', lang)}</p>
            <p style={{ color: colors.text.dim, fontSize: '14px', marginBottom: '2rem' }}>
              {t('auth_verifie_boite_mail', lang)}
            </p>
            <span onClick={() => navigate('/login')} style={{ color: colors.accent.green, fontSize: '14px', cursor: 'pointer' }}>
              {t('auth_retour_connexion', lang)}
            </span>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('aff_email', lang)}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="ton@email.com"
                style={{ width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem' }}>{erreur}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', background: colors.accent.green, color: colors.background.base, border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '1rem' }}
            >
              {loading ? t('etat_envoi_cours', lang) : t('auth_envoyer_lien', lang)}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: colors.text.dim }}>
              <span onClick={() => navigate('/login')} style={{ color: colors.text.faint, cursor: 'pointer' }}>
                {t('auth_retour_connexion', lang)}
              </span>
            </p>
          </>
        )}

      </div>
    </div>
  )
}

export default ForgotPassword
