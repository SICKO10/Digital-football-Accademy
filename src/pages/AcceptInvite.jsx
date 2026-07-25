import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function AcceptInvite() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [ready, setReady] = useState(false)
  const [readyMeta, setReadyMeta] = useState(null)

  useEffect(() => {
    // Supabase échange automatiquement les tokens du hash URL au chargement.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setReady(true)
        setReadyMeta(session.user.user_metadata || {})
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    if (password.length < 8) { setErreur('Le mot de passe doit contenir au moins 8 caractères'); return }
    if (password !== confirm) { setErreur('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    setErreur('')

    const { data: { user }, error: pwError } = await supabase.auth.updateUser({ password })
    if (pwError || !user) { setLoading(false); setErreur(pwError?.message || 'Erreur de session'); return }

    const meta = user.user_metadata || {}
    const clubId = meta.club_id
    const educateurId = meta.educateur_id
    const equipeJoueurId = meta.equipe_joueur_id

    if (clubId) {
      // Invitation staff
      const { data: profilExistant } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!profilExistant) {
        await supabase.from('profiles').insert({ id: user.id, email: user.email, plan: 'fan' })
      }
      const { data: staffExistant } = await supabase.from('staff_club').select('id').eq('club_id', clubId).eq('user_id', user.id).maybeSingle()
      if (!staffExistant) {
        await supabase.from('staff_club').insert({ club_id: clubId, user_id: user.id, role: meta.role_invite || 'secretaire' })
      }
      setLoading(false)
      navigate('/club')
      return
    }

    if (educateurId && equipeJoueurId) {
      // Invitation joueur
      const { data: profilExistant } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      if (!profilExistant) {
        await supabase.from('profiles').insert({ id: user.id, email: user.email, prenom: meta.prenom || '', nom: meta.nom || '', plan: meta.plan || 'fan' })
      }
      const { data: affiliationExistante } = await supabase.from('affiliations').select('id').eq('joueur_id', user.id).eq('educateur_id', educateurId).maybeSingle()
      if (!affiliationExistante) {
        await supabase.from('affiliations').insert({ joueur_id: user.id, educateur_id: educateurId, equipe_joueur_id: equipeJoueurId, statut: 'accepte' })
      }
      await supabase.from('equipe_joueurs').update({ joueur_id: user.id }).eq('id', equipeJoueurId)
      setLoading(false)
      navigate('/dashboard-joueur')
      return
    }

    setLoading(false)
    navigate('/')
  }

  const estInvitationJoueur = !!(readyMeta?.educateur_id && readyMeta?.equipe_joueur_id)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            Digital<span style={{ color: '#4ade80' }}>Football</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{estInvitationJoueur ? 'Rejoindre ton équipe' : 'Rejoindre le staff du club'}</h1>
        </div>

        {!ready ? (
          <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
            <p>Vérification de l'invitation en cours...</p>
            <p style={{ fontSize: '12px', marginTop: '1rem', color: '#444' }}>
              Si cette page reste bloquée, le lien est peut-être expiré.
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>
              Choisis un mot de passe pour finaliser ton accès.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="Répète le mot de passe"
                  style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem' }}>{erreur}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              {loading ? 'Finalisation...' : estInvitationJoueur ? 'Rejoindre l\'équipe' : 'Rejoindre le club'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default AcceptInvite
