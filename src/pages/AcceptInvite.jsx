import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors, alpha } from '../tokens'

// Style partagé pour les différents écrans de cette page — fonction, pas un
// composant, pour ne pas être remonté à chaque render.
const conteneur = (children) => (
  <div style={{ minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
          Digital<span style={{ color: colors.accent.green }}>Football</span>
        </div>
      </div>
      {children}
    </div>
  </div>
)

function AcceptInvite() {
  const navigate = useNavigate()
  const { lang } = useLang()
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
        setErreur(data?.error || error?.message || t('invite_invitation_introuvable', lang))
        setStatutB('erreur')
        return
      }
      setPreviewB(data)
      setStatutB('pret')
    }
    charger()
  }, [codeB])

  const soumettreB = async () => {
    if (password.length < 6) { setErreur(t('auth_mdp_min_6', lang)); return }
    if (password !== confirm) { setErreur(t('auth_mdp_ne_correspondent_pas', lang)); return }
    setLoading(true)
    setErreur('')
    try {
      const { data, error } = await supabase.functions.invoke('accepter-invitation', {
        body: { action: 'accepter', token: codeB, password },
      })
      if (error || data?.error) throw new Error(data?.error || error?.message || t('invite_erreur_inconnue', lang))

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: data.email, password })
      if (signInErr) throw signInErr

      navigate(data.role === 'dirigeant' ? '/dashboard-dirigeant' : data.role === 'parent' ? '/dashboard-parent' : data.role === 'club' ? '/club' : data.role === 'educateur' ? '/educateur' : '/dashboard-joueur')
    } catch (err) {
      console.error('[AcceptInvite/B]', err)
      setErreur(err?.message || t('invite_erreur_inconnue', lang))
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
        throw new Error(t('invite_lien_invalide_incomplet', lang))
      }
      if (!session?.user) throw new Error(t('auth_session_introuvable', lang))
      setReady(true)
      setReadyMeta(session.user.user_metadata || {})
    } catch (err) {
      console.error('[AcceptInvite/A]', err)
      setLienExpireDetail(err?.message || err?.error_description || t('auth_lien_invalide_expire', lang))
      setLienExpire(true)
    } finally {
      setVerif(false)
    }
  }

  const handleSubmit = async () => {
    if (password.length < 8) { setErreur(t('auth_mdp_min_8', lang)); return }
    if (password !== confirm) { setErreur(t('auth_mdp_ne_correspondent_pas', lang)); return }
    setLoading(true)
    setErreur('')

    try {
      const { data: { user }, error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError || !user) throw new Error(pwError?.message || t('invite_erreur_session', lang))

      const meta = user.user_metadata || {}
      const clubId = meta.club_id
      const educateurId = meta.educateur_id
      const equipeJoueurId = meta.equipe_joueur_id

      if (clubId) {
        // Invitation staff — profil minimal, le vrai rôle vit dans staff_club.
        // 'dirigeant' car la CHECK constraint sur profiles.plan n'autorise que
        // joueur_starter/joueur_pro/educateur/scout/club/dirigeant ('fan' est
        // rejeté, vérifié directement contre la base).
        const { data: profilExistant, error: errProfilSelect } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
        if (errProfilSelect) throw new Error(errProfilSelect.message)
        if (!profilExistant) {
          const { error: errProfilInsert } = await supabase.from('profiles').insert({ id: user.id, email: user.email, plan: 'dirigeant' })
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
          const { error: errProfilInsert } = await supabase.from('profiles').insert({ id: user.id, email: user.email, plan: 'dirigeant' })
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
      setErreur(err?.message || err?.error_description || JSON.stringify(err) || t('invite_erreur_inconnue', lang))
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
      <p style={{ color: colors.text.dim, fontSize: '14px', textAlign: 'center' }}>{t('invite_verification_en_cours', lang)}</p>
    )

    if (statutB === 'erreur') return conteneur(
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '1.5rem' }}>{erreur}</p>
        <button
          onClick={() => navigate('/')}
          style={{ width: '100%', background: 'transparent', color: colors.text.secondary, border: '1px solid #333', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          {t('invite_retour_accueil', lang)}
        </button>
      </div>
    )

    // statutB === 'pret'
    return conteneur(
      <>
        <h1 style={{ fontSize: '22px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
          {previewB?.role === 'joueur' ? t('invite_rejoins_equipe_titre', lang) : previewB?.role === 'parent' ? t('invite_rejoins_famille_titre', lang) : previewB?.role === 'club' ? t('invite_club_titre', lang) : previewB?.role === 'educateur' ? '🎓 Rejoins le club !' : t('invite_rejoins_staff_titre', lang)}
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>
          {previewB?.role === 'club'
            ? t('invite_template_club', lang)
            : previewB?.role === 'educateur'
              ? `${previewB.club || 'Un club'} t'invite à le rejoindre en tant qu'éducateur sur Digital Football.`
              : previewB?.nomEdu && previewB.role === 'parent'
                ? t('invite_template_parent', lang).replace('{nom}', previewB.nomEdu)
                : previewB?.nomEdu
                  ? t('invite_template', lang)
                      .replace('{nom}', previewB.nomEdu)
                      .replace('{club}', previewB.club || t('invite_le_club', lang))
                      .replace('{cat}', previewB.categorie ? ` (${previewB.categorie})` : '')
                  : t('invite_cree_mdp_activer', lang)}
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('aff_email', lang)}</label>
          <div style={{ background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: colors.text.muted, fontSize: '14px' }}>
            {previewB?.email}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('auth_mot_de_passe', lang)}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('invite_6_car_min', lang)}
              style={{ width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('auth_confirmer_mdp', lang)}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && soumettreB()}
              placeholder={t('auth_repete_mdp', lang)}
              style={{ width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem' }}>{erreur}</p>}

        <button
          onClick={soumettreB}
          disabled={loading}
          style={{ width: '100%', background: colors.accent.green, color: colors.background.base, border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
        >
          {loading ? t('invite_creation_compte_cours', lang) : previewB?.role === 'joueur' ? t('invite_rejoindre_equipe', lang) : previewB?.role === 'parent' ? t('invite_acceder_profil', lang) : previewB?.role === 'club' ? t('invite_acceder_espace_club', lang) : t('invite_rejoindre_dirigeant', lang)}
        </button>
      </>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Rendu — Chemin A (legacy, magic link Supabase)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: colors.background.surface, border: '1px solid #222', borderRadius: '16px', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{!ready ? t('invite_finaliser_invitation_titre', lang) : estInvitationJoueur ? t('invite_rejoindre_ton_equipe', lang) : estInvitationDirigeant ? t('invite_rejoindre_dirigeant', lang) : t('invite_rejoindre_staff_club', lang)}</h1>
        </div>

        {lienExpire ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ff4444', fontSize: '14px', marginBottom: '0.5rem' }}>
              {t('invite_erreur_contacte_educateur', lang)}
            </p>
            {lienExpireDetail && (
              <p style={{ color: '#f87171', fontSize: '12px', marginBottom: '1.5rem', wordBreak: 'break-word' }}>
                {lienExpireDetail}
              </p>
            )}
            <button
              onClick={() => navigate('/')}
              style={{ width: '100%', background: 'transparent', color: colors.text.secondary, border: '1px solid #333', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
            >
              {t('invite_retour_accueil', lang)}
            </button>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: colors.text.secondary, fontSize: '13px', marginBottom: '1.5rem' }}>
              {t('invite_clique_finaliser', lang)}
            </p>
            <button
              onClick={finaliserSession}
              disabled={verif || !params}
              style={{ width: '100%', background: colors.accent.green, color: colors.background.base, border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', opacity: verif || !params ? 0.7 : 1 }}
            >
              {verif ? t('auth_verification_cours', lang) : t('invite_finaliser_mon_invitation', lang)}
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: colors.text.secondary, fontSize: '13px', textAlign: 'center', marginBottom: '1.5rem' }}>
              {t('invite_choisis_mdp', lang)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('auth_mot_de_passe', lang)}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth_8_caracteres_min', lang)}
                  style={{ width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: colors.text.secondary, display: 'block', marginBottom: '6px' }}>{t('auth_confirmer_mdp', lang)}</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t('auth_repete_mdp', lang)}
                  style={{ width: '100%', background: colors.background.raised, border: '1px solid #333', borderRadius: '8px', padding: '10px 12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {erreur && <p style={{ color: '#ff4444', fontSize: '13px', textAlign: 'center', marginBottom: '1rem' }}>{erreur}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ width: '100%', background: colors.accent.green, color: colors.background.base, border: 'none', padding: '13px', borderRadius: '8px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}
            >
              {loading ? t('invite_finalisation_cours', lang) : estInvitationJoueur ? t('invite_rejoindre_equipe', lang) : estInvitationDirigeant ? t('invite_rejoindre_dirigeant', lang) : t('invite_rejoindre_club', lang)}
            </button>
          </>
        )}

      </div>
    </div>
  )
}

export default AcceptInvite
