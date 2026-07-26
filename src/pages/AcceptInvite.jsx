import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// Style partagé pour les différents écrans de cette page — fonction, pas un
// composant, pour ne pas être remonté à chaque render.
const conteneur = (children) => (
  <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
      </div>
      {children}
    </div>
  </div>
)

function AcceptInvite() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  // Chemin B (nouveau, prioritaire) : ?code=<uuid> — notre propre token, stocké
  // dans la table `invitations`, insensible aux scanners de liens (Outlook Safe
  // Links, Gmail, Apple Mail...) puisqu'une simple lecture ne le consomme jamais ;
  // seule la création de compte (avec mot de passe choisi par l'utilisateur) le
  // fait. Chemin A (legacy) : ?token_hash=...&type=... ou #access_token=... — les
  // invitations envoyées avant la bascule vers le Chemin B continuent de marcher.
  const [codeB] = useState(() => new URLSearchParams(window.location.search).get('code'))

  // ── Chemin B : aperçu de l'invitation (lecture seule côté serveur, ne consomme
  // rien — peut être pré-chargée sans risque par un scanner de liens) ──
  const [previewB, setPreviewB] = useState(null)
  const [statutB, setStatutB] = useState(codeB ? 'chargement' : null) // 'chargement' | 'pret' | 'erreur'

  useEffect(() => {
    if (!codeB) return
    const charger = async () => {
      const { data, error } = await supabase.functions.invoke('accepter-invitation', {
        body: { action: 'lire', token: codeB },
      })
      if (error || data?.error) {
        setErreur(data?.error || error?.message || 'Invitation introuvable.')
        setStatutB('erreur')
        return
      }
      setPreviewB(data)
      setStatutB('pret')
    }
    charger()
  }, [codeB])

  const soumettreB = async () => {
    if (password.length < 6) { setErreur('Le mot de passe doit contenir au moins 6 caractères'); return }
    if (password !== confirm) { setErreur('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    setErreur('')
    try {
      const { data, error } = await supabase.functions.invoke('accepter-invitation', {
        body: { action: 'accepter', token: codeB, password },
      })
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Erreur inconnue')

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: data.email, password })
      if (signInErr) throw signInErr

      navigate(data.role === 'dirigeant' ? '/dashboard-dirigeant' : '/dashboard-joueur')
    } catch (err) {
      console.error('[AcceptInvite/B]', err)
      setErreur(err?.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  // ── Chemin A (legacy) — inchangé : magic link Supabase, échange différé au clic ──
  const [verif, setVerif] = useState(false) // échange du token en cours (après clic)
  const [ready, setReady] = useState(false)
  const [readyMeta, setReadyMeta] = useState(null)
  // Lecture pure des paramètres du lien (query string + hash), une seule fois à
  // l'initialisation du state — jamais dans un effet qui appellerait Supabase.
  const [params] = useState(() => {
    const url = new URL(window.location.href)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return {
      token_hash: url.searchParams.get('token_hash'),
      type: url.searchParams.get('type') || hashParams.get('type') || 'invite',
      access_token: hashParams.get('access_token'),
      refresh_token: hashParams.get('refresh_token'),
    }
  })
  // Supabase ajoute directement l'erreur réelle dans le hash de l'URL quand le lien est
  // expiré/invalide (#error=...&error_code=...&error_description=...) — lu une seule fois,
  // à l'initialisation du state (pas dans un effet), pour l'afficher immédiatement.
  const hashErrorInitial = (() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const hashError = hashParams.get('error_description') || hashParams.get('error')
    return hashError ? decodeURIComponent(hashError.replace(/\+/g, ' ')) : ''
  })()
  const [lienExpire, setLienExpire] = useState(!!hashErrorInitial)
  const [lienExpireDetail, setLienExpireDetail] = useState(hashErrorInitial)

  // Étape 1, déclenchée par le clic utilisateur : échange le token du lien contre
  // une vraie session. C'est ici (et seulement ici) que le lien à usage unique est
  // consommé — jamais automatiquement au chargement de la page.
  const finaliserSession = async () => {
    if (!params || verif) return
    setVerif(true)
    setErreur('')
    try {
      let session = null
      if (params.token_hash) {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: params.token_hash, type: params.type })
        if (error) throw error
        session = data.session
      } else if (params.access_token) {
        const { data, error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token })
        if (error) throw error
        session = data.session
      } else {
        throw new Error('Lien invalide ou incomplet.')
      }
      if (!session?.user) throw new Error('Session introuvable.')
      setReady(true)
      setReadyMeta(session.user.user_metadata || {})
    } catch (err) {
      console.error('[AcceptInvite/A]', err)
      setLienExpireDetail(err?.message || err?.error_description || 'Lien invalide ou expiré.')
      setLienExpire(true)
    } finally {
      setVerif(false)
    }
  }

  const handleSubmit = async () => {
    if (password.length < 8) { setErreur('Le mot de passe doit contenir au moins 8 caractères'); return }
    if (password !== confirm) { setErreur('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    setErreur('')

    try {
      const { data: { user }, error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError || !user) throw new Error(pwError?.message || 'Erreur de session')

      const meta = user.user_metadata || {}
      const clubId = meta.club_id
      const educateurId = meta.educateur_id
      const equipeJoueurId = meta.equipe_joueur_id

      if (clubId) {
        // Invitation staff
        const { data: profilExistant, error: errProfilSelect } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
        if (errProfilSelect) throw new Error(errProfilSelect.message)
        if (!profilExistant) {
          const { error: errProfilInsert } = await supabase.from('profiles').insert({ id: user.id, email: user.email, plan: 'fan' })
          if (errProfilInsert) throw new Error(errProfilInsert.message)
        }
        const { data: staffExistant, error: errStaffSelect } = await supabase.from('staff_club').select('id').eq('club_id', clubId).eq('user_id', user.id).maybeSingle()
        if (errStaffSelect) throw new Error(errStaffSelect.message)
        if (!staffExistant) {
          const { error: errStaffInsert } = await supabase.from('staff_club').insert({ club_id: clubId, user_id: user.id, role: meta.role_invite || 'secretaire' })
          if (errStaffInsert) throw new Error(errStaffInsert.message)
        }
        navigate('/club')
        return
      }

      if (meta.role === 'dirigeant' && educateurId) {
        // Invitation dirigeant
        const { data: profilExistant, error: errProfilSelect } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
        if (errProfilSelect) throw new Error(errProfilSelect.message)
        if (!profilExistant) {
          const { error: errProfilInsert } = await supabase.from('profiles').insert({ id: user.id, email: user.email, plan: 'fan' })
          if (errProfilInsert) throw new Error(errProfilInsert.message)
        }
        const { error: errDirigeantUpdate } = await supabase
          .from('dirigeant_acces')
          .update({ dirigeant_id: user.id, statut: 'accepte' })
          .eq('educateur_id', educateurId)
          .eq('email', user.email)
        if (errDirigeantUpdate) throw new Error(errDirigeantUpdate.message)
        navigate('/dashboard-dirigeant')
        return
      }

      if (educateurId && equipeJoueurId) {
        // Invitation joueur
        const { data: profilExistant, error: errProfilSelect } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
        if (errProfilSelect) throw new Error(errProfilSelect.message)
        if (!profilExistant) {
          const { error: errProfilInsert } = await supabase.from('profiles').insert({ id: user.id, email: user.email, prenom: meta.prenom || '', nom: meta.nom || '', plan: meta.plan || 'fan' })
          if (errProfilInsert) throw new Error(errProfilInsert.message)
        }
        const { data: affiliationExistante, error: errAffSelect } = await supabase.from('affiliations').select('id').eq('joueur_id', user.id).eq('educateur_id', educateurId).maybeSingle()
        if (errAffSelect) throw new Error(errAffSelect.message)
        if (!affiliationExistante) {
          const { error: errAffInsert } = await supabase.from('affiliations').insert({ joueur_id: user.id, educateur_id: educateurId, equipe_joueur_id: equipeJoueurId, statut: 'accepte' })
          if (errAffInsert) throw new Error(errAffInsert.message)
        }
        const { error: errEquipeUpdate } = await supabase.from('equipe_joueurs').update({ joueur_id: user.id }).eq('id', equipeJoueurId)
        if (errEquipeUpdate) throw new Error(errEquipeUpdate.message)
        navigate('/dashboard-joueur')
        return
      }

      navigate('/')
    } catch (err) {
      console.error('[AcceptInvite/A]', err)
      setErreur(err?.message || err?.error_description || JSON.stringify(err) || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const estInvitationJoueur = !!(readyMeta?.educateur_id && readyMeta?.equipe_joueur_id)
  const estInvitationDirigeant = readyMeta?.role === 'dirigeant' && !!readyMeta?.educateur_id

  // ══════════════════════════════════════════════════════════════════════════
  // Rendu — Chemin B (?code=UUID)
  // ══════════════════════════════════════════════════════════════════════════
  if (codeB) {
    if (statutB === 'chargement') return conteneur(
      <p style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>Vérification en cours...</p>
    )

    if (statutB === 'erreur') return conteneur(
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '1.5rem' }}>{erreur}</p>
        <button
          onClick={() => navigate('/')}
          style={{ width: '100%', background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          Retour à l'accueil
        </button>
      </div>
    )

    // statutB === 'pret'
    return conteneur(
      <>
        <h1 style={{ fontSize: '22px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
          {previewB?.role === 'joueur' ? '⚽ Rejoins ton équipe !' : '👔 Rejoins le staff !'}
        </h1>
        <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>
          {previewB?.nomEdu ? `${previewB.nomEdu} t'invite à rejoindre ${previewB.club || 'le club'}${previewB.categorie ? ` (${previewB.categorie})` : ''}.` : 'Crée ton mot de passe pour activer ton compte.'}
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Email</label>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: '#888', fontSize: '14px' }}>
            {previewB?.email}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '6px' }}>Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && soumettreB()}
              placeholder="Répète le mot de passe"
              style={{ width: '100%', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem' }}>{erreur}</p>}

        <button
          onClick={soumettreB}
          disabled={loading}
          style={{ width: '100%', background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
        >
          {loading ? 'Création du compte...' : previewB?.role === 'joueur' ? "Rejoindre l'équipe" : 'Rejoindre en tant que dirigeant'}
        </button>
      </>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Rendu — Chemin A (legacy, magic link Supabase)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            Digital<span style={{ color: '#4ade80' }}>Football</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{!ready ? 'Finaliser ton invitation' : estInvitationJoueur ? 'Rejoindre ton équipe' : estInvitationDirigeant ? 'Rejoindre en tant que dirigeant' : 'Rejoindre le staff du club'}</h1>
        </div>

        {lienExpire ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '0.5rem' }}>
              Une erreur s'est produite, contacte ton éducateur.
            </p>
            {lienExpireDetail && (
              <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
                {lienExpireDetail}
              </p>
            )}
            <button
              onClick={() => navigate('/')}
              style={{ width: '100%', background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              Retour à l'accueil
            </button>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '1.5rem' }}>
              Clique sur le bouton ci-dessous pour finaliser ton invitation.
            </p>
            <button
              onClick={finaliserSession}
              disabled={verif || !params}
              style={{ width: '100%', background: '#4ade80', color: '#0a0a0a', border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: verif || !params ? 0.7 : 1 }}
            >
              {verif ? 'Vérification...' : "⚽ Finaliser mon invitation"}
            </button>
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
              {loading ? 'Finalisation...' : estInvitationJoueur ? 'Rejoindre l\'équipe' : estInvitationDirigeant ? 'Rejoindre en tant que dirigeant' : 'Rejoindre le club'}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default AcceptInvite
