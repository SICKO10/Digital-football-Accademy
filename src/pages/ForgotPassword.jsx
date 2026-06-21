import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleSubmit = async () => {
    if (!email.trim()) { setErreur('Saisis ton adresse email'); return }
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            Digital<span style={{ color: '#4ade80' }}>Football</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>Mot de passe oublié</h1>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
            Un lien de réinitialisation sera envoyé à ton email
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 1rem' }}>📧</p>
            <p style={{ fontWeight: 700, marginBottom: '8px' }}>Email envoyé !</p>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '2rem' }}>
              Vérifie ta boîte mail et clique sur le lien pour réinitialiser ton mot de passe.
            </p>
            <span onClick={() => navigate('/login')} style={{ color: '#4ade80', fontSize: '14px', cursor: 'pointer' }}>
              ← Retour à la connexion
            </span>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="ton@email.com"
                style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem' }}>{erreur}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '1rem' }}
            >
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: '#666' }}>
              <span onClick={() => navigate('/login')} style={{ color: '#555', cursor: 'pointer' }}>
                ← Retour à la connexion
              </span>
            </p>
          </>
        )}

      </div>
    </div>
  )
}

export default ForgotPassword
