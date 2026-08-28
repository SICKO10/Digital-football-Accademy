import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { STRIPE_LINKS, STRIPE_LINKS_EDU, STRIPE_LINKS_RECRUTEUR, STRIPE_LINKS_CLUB, PALIERS_QUOTA_EQUIPES, stripeUrl } from '../lib/stripeLinks'
import { colors } from '../tokens'

const PILLS = ['500+ joueurs', '50+ clubs', 'Scouts actifs']

const SPLIT_MEDIA_QUERY = `
  @media (max-width: 768px) {
    .register-left { display: none !important; }
    .register-right { width: 100% !important; max-width: 540px !important; flex: none !important; margin: 0 auto; }
    .register-mobile-logo { display: block !important; }
  }
`

export default function Register() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [searchParams] = useSearchParams()

  // Lien de parrainage (?ref=<uuid du parrain>, cf. ParrainageWidget.jsx) —
  // validé au format UUID ici (pas juste "présent") pour limiter le risque
  // qu'un paramètre trafiqué/tronqué dans l'URL fasse échouer l'upsert du
  // profil plus bas. Un id bien formé mais inexistant reste possible (lien
  // copié puis compte supprimé entretemps) : la FK profiles.parrain_id le
  // rejettera alors, et cet upsert échouera comme n'importe quelle autre
  // erreur déjà tolérée ici (juste loggée, le trigger reste le filet de
  // sécurité pour les champs qu'il couvre).
  const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const refBrut = searchParams.get('ref')
  const refParrainId = refBrut && REGEX_UUID.test(refBrut) ? refBrut : null

  const PROFILS = [
    {
      id: 'joueur_starter', label: t('regchoix_starter_titre', lang), desc: t('reginsc_starter_desc', lang),
      gratuit: true, color: colors.text.muted,
      features: [t('reginsc_feat_starter_1', lang), t('reginsc_feat_starter_2', lang), t('reginsc_feat_starter_3', lang), t('reginsc_feat_starter_4', lang)],
    },
    {
      id: 'joueur_pro', label: t('regchoix_pro_titre', lang), desc: t('reginsc_pro_desc', lang),
      color: colors.accent.green, badge: 'Dès 10€/mois',
      stripeMensuel: STRIPE_LINKS.starter, stripeAnnuel: STRIPE_LINKS.pro,
      features: [t('reginsc_feat_pro_1', lang), t('reginsc_feat_pro_2', lang), t('reginsc_feat_pro_3', lang), t('reginsc_feat_pro_4', lang), t('reginsc_feat_pro_5', lang)],
    },
    {
      id: 'educateur', label: t('regchoix_educateur_titre', lang), desc: t('reginsc_educateur_desc', lang),
      color: colors.accent.blue, badge: 'Dès 10€/mois',
      stripeMensuel: STRIPE_LINKS_EDU.edu_mensuel, stripeAnnuel: STRIPE_LINKS_EDU.edu_annuel,
      features: [t('reginsc_feat_edu_1', lang), t('reginsc_feat_edu_2', lang), t('reginsc_feat_edu_3', lang), t('reginsc_feat_edu_4', lang), t('reginsc_feat_edu_5', lang)],
    },
    {
      id: 'scout', label: t('regchoix_scout_titre', lang), desc: t('reginsc_scout_desc', lang),
      color: colors.accent.orange, badge: 'Dès 10€/mois',
      stripeMensuel: STRIPE_LINKS_RECRUTEUR.mensuel, stripeAnnuel: STRIPE_LINKS_RECRUTEUR.annuel,
      features: [t('reginsc_feat_scout_1', lang), t('reginsc_feat_scout_2', lang), t('reginsc_feat_scout_3', lang), t('reginsc_feat_scout_4', lang)],
    },
    {
      id: 'club', label: t('regchoix_club_titre', lang), desc: t('reginsc_club_desc', lang),
      color: colors.accent.purpleLight, badge: 'Dès 50€/mois', assistant: true,
      features: [t('reginsc_feat_club_1', lang), t('reginsc_feat_club_2', lang), t('reginsc_feat_club_3', lang), t('reginsc_feat_club_4', lang)],
    },
  ]

  // Présélection depuis un lien externe (ex: page Offres) : /register?profil=joueur_pro&cycle=annuel
  const profilPresélectionné = PROFILS.find(pr => pr.id === searchParams.get('profil')) || null

  const [etape, setEtape] = useState(profilPresélectionné ? 2 : 1) // 1 = choix profil | 2 = formulaire
  const [profilChoisi, setProfil] = useState(profilPresélectionné)
  const [cycle, setCycle] = useState(searchParams.get('cycle') === 'annuel' ? 'annuel' : 'mensuel')

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [rgpdAccepted, setRgpdAccepted] = useState(false)

  const inscrire = async () => {
    if (!rgpdAccepted) return
    if (!prenom.trim() || !email.trim() || !password.trim()) {
      setErreur(t('reginsc_champs_obligatoires', lang))
      return
    }
    if (password.length < 6) {
      setErreur(t('reginsc_mdp_min_6', lang))
      return
    }
    setLoading(true)
    setErreur('')

    // "scout" est à la fois le libellé marketing ET la valeur stockée dans
    // profiles.plan — la CHECK constraint côté base n'autorise que
    // 'joueur_starter' | 'joueur_pro' | 'educateur' | 'scout' | 'club' | 'dirigeant'
    // ('recruteur' est rejeté, vérifié directement contre la base).
    const plan = profilChoisi.id

    // Passé en metadata pour que le trigger on_auth_user_created (voir
    // supabase_profil_auto_creation.sql) puisse créer la ligne profiles
    // même si signUp() ne renvoie pas de session active (confirmation email
    // requise) — l'upsert ci-dessous ne s'exécuterait pas dans ce cas.
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { prenom: prenom.trim(), nom: nom.trim(), plan } },
    })
    if (error) { setErreur(error.message); setLoading(false); return }

    const userId = data.user?.id
    if (userId) {
      const { error: profilErr } = await supabase.from('profiles').upsert({
        id: userId,
        prenom: prenom.trim(),
        nom: nom.trim(),
        email: email.trim().toLowerCase(),
        plan,
        abonnement_actif: !!profilChoisi.gratuit,
        abonnement_debut: profilChoisi.gratuit ? new Date().toISOString() : null,
        ...(refParrainId ? { parrain_id: refParrainId } : {}),
      })
      if (profilErr) console.error('Erreur création profil (le trigger auto devrait prendre le relais):', profilErr)
    }

    setLoading(false)

    if (profilChoisi.stripeMensuel) {
      const lien = cycle === 'annuel' ? profilChoisi.stripeAnnuel : profilChoisi.stripeMensuel
      window.open(stripeUrl(lien, userId, email), '_blank')
      // signUp() ne garantit pas de session active (même problème résolu dans
      // AcceptInvite.jsx après création de compte) — reconnexion explicite
      // avec le mot de passe qu'on vient de saisir, pour atterrir directement
      // sur le dashboard déjà connecté plutôt que de repasser par /login.
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      navigate(signInErr ? '/login' : '/dashboard')
    } else {
      navigate('/dashboard')
    }
  }

  const cardsProfil = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {PROFILS.map(p => (
        <button key={p.id}
          onClick={() => { setProfil(p); setCycle('mensuel'); setEtape(2) }}
          style={{
            background: colors.background.surface, border: '1px solid #1a1a1a',
            borderRadius: '14px', padding: '16px 18px',
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            color: colors.text.primary, textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '14px',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.background = p.color + '08' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.background.raised; e.currentTarget.style.background = colors.background.surface }}>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>{p.label}</span>
              {p.badge && (
                <span style={{
                  background: p.color + '18', color: p.color,
                  border: `1px solid ${p.color}35`,
                  fontSize: '10px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '20px',
                }}>{p.badge}</span>
              )}
            </div>
            <p style={{ fontSize: '12px', color: colors.text.faint, margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
          </div>

          <span style={{ color: colors.border.default, fontSize: '20px', flexShrink: 0 }}>›</span>
        </button>
      ))}
    </div>
  )

  // ── Étape 1 : choix du profil, en split-screen (même structure que Login.jsx) ──
  if (etape === 1) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
        <style>{SPLIT_MEDIA_QUERY}</style>

        {/* ── Colonne gauche — vitrine, cachée sur mobile ── */}
        <div className="register-left" style={{
          flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem',
          backgroundImage: 'url(https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80)',
          backgroundSize: 'cover', backgroundPosition: 'center',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(6,26,14,0.92) 0%, rgba(10,32,16,0.88) 100%)' }} />

          <div style={{ position: 'relative', fontSize: '20px', fontWeight: 800 }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>

          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Rejoins la communauté.</h2>
            <p style={{ color: colors.text.dim, fontSize: '15px', marginTop: '12px' }}>Joueur, éducateur, recruteur ou club — ta place est ici.</p>
          </div>

          <div style={{ position: 'relative', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {PILLS.map(pill => (
              <span key={pill} style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: colors.text.dim }}>
                {pill}
              </span>
            ))}
          </div>
        </div>

        {/* ── Colonne droite — cards de profil ── */}
        <div className="register-right" style={{ flex: 'none', width: '540px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <div className="register-mobile-logo" style={{ display: 'none', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                <span style={{ color: colors.accent.green }}>Digital</span>Football
              </div>
              <p style={{ fontSize: '13px', color: colors.text.disabled, margin: 0 }}>{t('reginsc_quel_profil', lang)}</p>
            </div>

            {cardsProfil}

            <p style={{ textAlign: 'center', fontSize: '13px', color: colors.text.disabled, marginTop: '20px' }}>
              {t('register_deja_compte', lang)}{' '}
              <button onClick={() => navigate('/login')}
                style={{ background: 'transparent', border: 'none', color: colors.accent.green, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                {t('auth_se_connecter', lang)}
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Étape 2 : formulaire, layout centré inchangé (pas de split-screen) ──
  return (
    <div style={{
      background: colors.background.base, minHeight: '100vh', color: colors.text.primary,
      fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '40px 16px 60px',
    }}>

      <div style={{ marginBottom: '40px', textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <p style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px', margin: 0 }}>
          <span style={{ color: colors.accent.green }}>Digital</span>Football
        </p>
        <p style={{ fontSize: '12px', color: colors.text.disabled, margin: '4px 0 0' }}>
          {`${t('reginsc_inscription_prefix', lang)} ${profilChoisi?.label}`}
        </p>
      </div>

      {profilChoisi?.id === 'club' && (
        <ClubWizard color={profilChoisi.color} navigate={navigate} palierInitial={searchParams.get('palier') || ''} cycleInitial={searchParams.get('cycle') === 'annuel' ? 'annuel' : 'mensuel'} />
      )}

      {profilChoisi && profilChoisi.id !== 'club' && (
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: profilChoisi.color + '10',
            border: `1px solid ${profilChoisi.color}30`,
            borderRadius: '12px', padding: '12px 16px', marginBottom: '24px',
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: '14px', margin: 0, color: profilChoisi.color }}>{profilChoisi.label}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                {profilChoisi.features.slice(0, 2).map(f => (
                  <span key={f} style={{ fontSize: '10px', color: colors.text.faint, background: colors.background.surface, padding: '2px 7px', borderRadius: '20px', border: '1px solid #1a1a1a' }}>{f}</span>
                ))}
                {profilChoisi.features.length > 2 && (
                  <span style={{ fontSize: '10px', color: colors.text.disabled }}>+{profilChoisi.features.length - 2}</span>
                )}
              </div>
            </div>
            <button onClick={() => setEtape(1)}
              style={{ background: 'transparent', border: 'none', color: colors.text.disabled, cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif', textDecoration: 'underline', flexShrink: 0 }}>
              {t('reginsc_changer', lang)}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder={t('equipe_prenom', lang) + ' *'} value={prenom} onChange={e => setPrenom(e.target.value)}
                style={{ flex: 1, background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
              <input placeholder={t('equipe_nom', lang)} value={nom} onChange={e => setNom(e.target.value)}
                style={{ flex: 1, background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
            </div>
            <input placeholder={t('aff_email', lang) + ' *'} type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <input placeholder={t('reginsc_mdp_placeholder', lang)} type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>

          {profilChoisi.stripeMensuel && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              {[
                { key: 'mensuel', titre: t('reginsc_cycle_mensuel_titre', lang), prix: '10€/mois', desc: t('reginsc_cycle_mensuel_desc', lang) },
                { key: 'annuel', titre: t('reginsc_cycle_annuel_titre', lang), prix: '100€/an', desc: t('reginsc_cycle_annuel_desc', lang), badge: t('reginsc_cycle_2mois_offerts', lang) },
              ].map(opt => (
                <button key={opt.key} type="button" onClick={() => setCycle(opt.key)}
                  style={{
                    flex: 1, textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: cycle === opt.key ? profilChoisi.color + '15' : colors.background.surface,
                    border: `2px solid ${cycle === opt.key ? profilChoisi.color : colors.border.faint}`,
                    borderRadius: '10px', padding: '12px 14px', position: 'relative',
                  }}>
                  {opt.badge && (
                    <span style={{ position: 'absolute', top: '-9px', right: '10px', background: colors.accent.green, color: colors.black, fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>{opt.badge}</span>
                  )}
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: cycle === opt.key ? profilChoisi.color : colors.text.primary }}>{opt.titre}</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '15px', color: colors.text.primary }}>{opt.prix}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: colors.text.dim, lineHeight: 1.4 }}>{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {erreur && (
            <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{erreur}</p>
          )}

          {profilChoisi.id === 'joueur_pro' && (
            <div style={{ background: '#4ade8010', border: '1px solid #4ade8025', borderRadius: '10px', padding: '12px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.accent.green, margin: 0, lineHeight: 1.6 }}>{t('reginsc_pro_info', lang)}</p>
            </div>
          )}
          {profilChoisi.id === 'joueur_starter' && (
            <div style={{ background: '#ffffff05', border: '1px solid #1f1f1f', borderRadius: '10px', padding: '12px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.text.faint, margin: 0, lineHeight: 1.6 }}>{t('reginsc_starter_info', lang)}</p>
            </div>
          )}
          {profilChoisi.id === 'scout' && (
            <div style={{ background: '#f9731610', border: '1px solid #f9731625', borderRadius: '10px', padding: '12px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.accent.orange, margin: 0, lineHeight: 1.6 }}>{t('reginsc_scout_info', lang)}</p>
            </div>
          )}
          {profilChoisi.id === 'educateur' && (
            <div style={{ background: '#60a5fa10', border: '1px solid #60a5fa25', borderRadius: '10px', padding: '12px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.accent.blue, margin: 0, lineHeight: 1.6 }}>{t('reginsc_educateur_info', lang)}</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '18px' }}>
            <input
              type="checkbox"
              id="rgpd"
              checked={rgpdAccepted}
              onChange={e => setRgpdAccepted(e.target.checked)}
              style={{ marginTop: '3px', accentColor: colors.accent.green, cursor: 'pointer' }}
            />
            <label htmlFor="rgpd" style={{ fontSize: '13px', color: colors.text.dim, lineHeight: 1.5, cursor: 'pointer' }}>
              J'accepte les{' '}
              <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.accent.green, textDecoration: 'underline' }}>
                Conditions Générales d'Utilisation
              </a>{' '}
              et la{' '}
              <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.accent.green, textDecoration: 'underline' }}>
                Politique de Confidentialité
              </a>
              . Mes données sont traitées conformément au RGPD.
            </label>
          </div>

          <button onClick={inscrire} disabled={loading || !rgpdAccepted}
            style={{
              width: '100%',
              background: profilChoisi.color || colors.accent.green,
              color: profilChoisi.id === 'joueur_starter' ? colors.text.primary : colors.black,
              border: 'none', borderRadius: '12px', padding: '14px',
              fontSize: '15px', fontWeight: 800,
              cursor: (loading || !rgpdAccepted) ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif', marginTop: '14px',
              opacity: (loading || !rgpdAccepted) ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}>
            {loading
              ? t('register_creation_cours', lang)
              : profilChoisi.stripeMensuel
                ? t('reginsc_btn_payer', lang)
                : t('reginsc_btn_gratuit', lang)
            }
          </button>
        </div>
      )}
    </div>
  )
}

// Inscription club en 3 étapes : compte (identité + nom du club), 3
// disponibilités pour le rendez-vous de démarrage, puis choix de la formule
// (par nombre d'équipes, cf. PALIERS_QUOTA_EQUIPES) avant redirection Stripe
// — remplace l'ancien flux "formulaire de contact → email manuel sous
// 24-48h" (cf. Offres.jsx, désormais limité aux questions).
function ClubWizard({ color, navigate, palierInitial, cycleInitial }) {
  const [etape, setEtape] = useState(1) // 1 = compte, 2 = disponibilités, 3 = formule + paiement
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [nomClub, setNomClub] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [userId, setUserId] = useState(null)
  const [dispos, setDispos] = useState(['', '', ''])
  const [palier, setPalier] = useState(palierInitial || '')
  const [cycle, setCycle] = useState(cycleInitial || 'mensuel')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)
  const [rgpdAccepted, setRgpdAccepted] = useState(false)

  const inputStyle = { background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const btnStyle = (desactive) => ({
    width: '100%', background: color, color: colors.black, border: 'none', borderRadius: '12px', padding: '14px',
    fontSize: '15px', fontWeight: 800, cursor: desactive ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
    marginTop: '18px', opacity: desactive ? 0.6 : 1, transition: 'opacity 0.15s',
  })

  const creerCompte = async () => {
    if (!rgpdAccepted) return
    if (!prenom.trim() || !nom.trim() || !nomClub.trim() || !email.trim() || !password.trim()) {
      setErreur('Tous les champs sont obligatoires.')
      return
    }
    if (password.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    setErreur('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { prenom: prenom.trim(), nom: nom.trim(), plan: 'club' } },
    })
    if (error) { setErreur(error.message); setLoading(false); return }
    const uid = data.user?.id
    if (uid) {
      const { error: profilErr } = await supabase.from('profiles').upsert({
        id: uid, prenom: prenom.trim(), nom: nom.trim(), email: email.trim().toLowerCase(),
        plan: 'club', club: nomClub.trim(), abonnement_actif: false,
      })
      if (profilErr) console.error('Erreur création profil club (le trigger auto devrait prendre le relais):', profilErr)
    }
    setUserId(uid)
    setLoading(false)
    setEtape(2)
  }

  const validerDispos = async () => {
    const remplies = dispos.map(d => d.trim()).filter(Boolean)
    if (remplies.length === 0) {
      setErreur('Indiquez au moins une disponibilité.')
      return
    }
    setErreur('')
    setLoading(true)
    const { error } = await supabase.from('demandes_club').insert({
      prenom: prenom.trim(), nom: nom.trim(), email: email.trim().toLowerCase(), nom_club: nomClub.trim(),
      type: 'demarrage', statut: 'nouveau',
      message: `Disponibilités pour le démarrage :\n${remplies.map((d, i) => `${i + 1}. ${d}`).join('\n')}`,
    })
    setLoading(false)
    // Une erreur ici (table demandes_club indisponible, réseau...) ne doit pas
    // bloquer un compte déjà créé et un club déjà prêt à payer — juste loggée.
    if (error) console.error('Erreur enregistrement disponibilités démarrage:', error)
    setEtape(3)
  }

  const payer = async () => {
    if (!palier) { setErreur('Choisissez une formule.'); return }
    const p = STRIPE_LINKS_CLUB[palier]
    const lien = p?.[cycle]
    if (!lien) return
    setLoading(true)
    window.open(stripeUrl(lien, userId, email), '_blank')
    // signUp() ne garantit pas de session active — reconnexion explicite avec
    // le mot de passe qu'on vient de saisir (même pattern que inscrire()
    // ci-dessus), pour atterrir directement sur le dashboard déjà connecté.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    navigate(signInErr ? '/login' : '/dashboard')
  }

  return (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ flex: 1, height: '4px', borderRadius: '2px', background: n <= etape ? color : colors.background.raised }} />
        ))}
      </div>

      {etape === 1 && (
        <>
          <p style={{ fontWeight: 800, fontSize: '15px', margin: '0 0 4px' }}>Créer votre compte club</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 16px' }}>Étape 1/3 — vos informations et celles de votre club.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input placeholder="Prénom *" value={prenom} onChange={e => setPrenom(e.target.value)} style={inputStyle} />
              <input placeholder="Nom *" value={nom} onChange={e => setNom(e.target.value)} style={inputStyle} />
            </div>
            <input placeholder="Nom du club *" value={nomClub} onChange={e => setNomClub(e.target.value)} style={inputStyle} />
            <input placeholder="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            <input placeholder="Mot de passe *" type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '14px' }}>
            <input
              type="checkbox"
              id="rgpd-club"
              checked={rgpdAccepted}
              onChange={e => setRgpdAccepted(e.target.checked)}
              style={{ marginTop: '3px', accentColor: color, cursor: 'pointer' }}
            />
            <label htmlFor="rgpd-club" style={{ fontSize: '13px', color: colors.text.dim, lineHeight: 1.5, cursor: 'pointer' }}>
              J'accepte les{' '}
              <a href="/cgu" target="_blank" rel="noreferrer" style={{ color, textDecoration: 'underline' }}>
                Conditions Générales d'Utilisation
              </a>{' '}
              et la{' '}
              <a href="/cgu" target="_blank" rel="noreferrer" style={{ color, textDecoration: 'underline' }}>
                Politique de Confidentialité
              </a>
              . Mes données sont traitées conformément au RGPD.
            </label>
          </div>
          {erreur && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{erreur}</p>}
          <button onClick={creerCompte} disabled={loading || !rgpdAccepted} style={btnStyle(loading || !rgpdAccepted)}>
            {loading ? 'Création...' : 'Continuer'}
          </button>
        </>
      )}

      {etape === 2 && (
        <>
          <p style={{ fontWeight: 800, fontSize: '15px', margin: '0 0 4px' }}>Planifiez votre démarrage</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 16px' }}>
            Étape 2/3 — indiquez 3 créneaux dans la semaine où votre équipe est disponible, pour caler votre accompagnement de lancement.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[0, 1, 2].map(i => (
              <input key={i} placeholder={`Disponibilité ${i + 1} — ex. Lundi 14h-16h`} value={dispos[i]}
                onChange={e => setDispos(prev => prev.map((d, idx) => idx === i ? e.target.value : d))} style={inputStyle} />
            ))}
          </div>
          {erreur && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{erreur}</p>}
          <button onClick={validerDispos} disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Envoi...' : 'Continuer'}
          </button>
        </>
      )}

      {etape === 3 && (
        <>
          <p style={{ fontWeight: 800, fontSize: '15px', margin: '0 0 4px' }}>Choisissez votre formule</p>
          <p style={{ fontSize: '12px', color: colors.text.faint, margin: '0 0 16px' }}>Étape 3/3 — selon le nombre d'équipes de votre club.</p>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {['mensuel', 'annuel'].map(c => (
              <button key={c} type="button" onClick={() => setCycle(c)}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${cycle === c ? color : '#2a2a2a'}`, background: cycle === c ? color + '15' : colors.background.surface, color: cycle === c ? color : colors.text.faint, fontWeight: cycle === c ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}>
                {c === 'mensuel' ? 'Mensuel' : 'Annuel — 2 mois offerts'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(PALIERS_QUOTA_EQUIPES).map(([key, quota]) => {
              const p = STRIPE_LINKS_CLUB[key]
              if (!p) return null
              return (
                <button key={key} type="button" onClick={() => setPalier(key)}
                  style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: palier === key ? color + '15' : colors.background.surface, border: `2px solid ${palier === key ? color : colors.border.faint}`, borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: palier === key ? color : colors.text.primary }}>Jusqu'à {quota} équipes</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '15px', color: colors.text.primary }}>{cycle === 'annuel' ? p.annuelPrix : p.mensuelPrix}</p>
                </button>
              )
            })}
          </div>
          {erreur && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{erreur}</p>}
          <button onClick={payer} disabled={loading || !palier} style={btnStyle(loading || !palier)}>
            {loading ? 'Redirection...' : 'Payer et accéder à mon dashboard'}
          </button>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: '11px', color: colors.border.strong, marginTop: '14px', lineHeight: 1.6 }}>
        En continuant, vous acceptez nos{' '}
        <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.text.disabled }}>CGU</a>.
      </p>
    </div>
  )
}
