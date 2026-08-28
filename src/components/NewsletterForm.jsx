import { useState } from 'react'
import { supabase } from '../supabase'
import { colors } from '../tokens'

export default function NewsletterForm({ source = 'home' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error' | 'duplicate'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setStatus('loading')

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email, source }])

    if (error) {
      if (error.code === '23505') setStatus('duplicate')
      else setStatus('error')
    } else {
      setStatus('success')
      setEmail('')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '420px', width: '100%' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border.default}`,
            background: colors.background.surface,
            color: colors.text.primary,
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          style={{
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            background: colors.accent.green,
            color: colors.background.base,
            fontWeight: 700,
            fontSize: '14px',
            cursor: status === 'loading' ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {status === 'loading' ? '...' : status === 'success' ? '✓ Inscrit !' : "S'inscrire"}
        </button>
      </div>
      {status === 'duplicate' && <p style={{ color: colors.accent.orange, fontSize: '13px', margin: 0 }}>Cet email est déjà inscrit.</p>}
      {status === 'error' && <p style={{ color: colors.accent.red, fontSize: '13px', margin: 0 }}>Une erreur est survenue. Réessaie.</p>}
      {status === 'success' && <p style={{ color: colors.accent.green, fontSize: '13px', margin: 0 }}>Bienvenue dans l'écosystème !</p>}
    </form>
  )
}
