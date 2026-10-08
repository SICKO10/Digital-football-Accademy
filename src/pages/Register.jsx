import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { STRIPE_LINKS, STRIPE_LINKS_EDU, STRIPE_LINKS_RECRUTEUR, STRIPE_LINKS_CLUB, PALIERS_QUOTA_EQUIPES, stripeUrl } from '../lib/stripeLinks'
import { colors, alpha } from '../tokens'

const PILLS = ['500+ joueurs', '50+ clubs', 'Scouts actifs']

// Détecte un signUp() qui échoue parce que l'email a déjà un compte — deux
// signaux possibles côté Supabase : soit une erreur explicite ("User already
// registered", selon la version/config du projet), soit — quand "Confirm
// email" est activé — un succès silencieux avec data.user.identities vide,
// mécanisme volontaire de Supabase pour empêcher l'énumération d'emails.
function emailDejaUtilise(error, data) {
  if (error) return /already registered|already exists|already been registered/i.test(error.message)
  return !!data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
}

// Un même email n'a qu'un seul compte (profiles.plan est une valeur unique) —
// un rôle supplémentaire (éducateur, parent, staff club...) se greffe sur ce
// compte existant via une invitation (cf. lib/multiRole.js et les boutons de
// bascule sur les 4 dashboards), jamais en recréant un compte ici.
function messageEmailExistant(navigate) {
  return (
    <>
      Un compte existe déjà avec cette adresse email.{' '}
      <button type="button" onClick={() => navigate('/login')}
        style={{ background: 'transparent', border: 'none', color: colors.accent.green, textDecoration: 'underline', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '13px', padding: 0 }}>
        Connecte-toi
      </button>{' '}
      pour y accéder. Besoin d'un rôle supplémentaire (éducateur, parent...) ? Il doit être ajouté à ce compte via une invitation, pas en créant un nouveau compte.
    </>
  )
}

const SPLIT_MEDIA_QUERY = `
  @media (max-width: 768px) {
    .register-left { display: none !important; }
    .register-right { width: 100% !important; max-width: 540px !important; flex: none !important; margin: 0 auto; }
    .register-mobile-logo { display: block !important; }
  }
`

// Étape 2, tous profils (cf. SplitRegisterLayout) : grille 2 colonnes sur
// desktop, pitch de gauche masqué sur mobile (formulaire seul, pleine
// largeur). .reg2-input:focus en CSS pur : un style inline ne peut pas
// cibler :focus, cf. convention déjà utilisée ailleurs dans le projet pour
// les états que l'inline style ne couvre pas (hover, focus...).
const SPLIT2_MEDIA_QUERY = `
  @media (max-width: 768px) {
    .reg2-grid { display: block !important; }
    .reg2-left { display: none !important; }
  }
  .reg2-input:focus { border-color: ${colors.accent.green} !important; }
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

  // ?redirect=/chemin (ex. retour vers /lier-tournoi/... après inscription
  // depuis un lien joueur, cf. LierTournoi.jsx) — un chemin relatif interne
  // uniquement, jamais une URL externe (open redirect).
  const redirectBrut = searchParams.get('redirect')
  const redirectApres = redirectBrut && redirectBrut.startsWith('/') && !redirectBrut.startsWith('//') ? redirectBrut : null

  // color: colors.accent.green partout (profil historiquement différencié
  // par couleur — bleu éducateur, orange scout, violet club — unifié en vert
  // sur l'ensemble du parcours d'inscription pour une identité visuelle
  // cohérente, cf. PITCH_PAR_PROFIL ci-dessous pour le même principe côté
  // panneau vitrine). Les dashboards eux-mêmes gardent leurs couleurs
  // distinctes, seul le parcours d'inscription est concerné.
  const PROFILS = [
    {
      id: 'joueur_starter', label: t('regchoix_starter_titre', lang), desc: t('reginsc_starter_desc', lang),
      gratuit: true, color: colors.accent.green,
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
      color: colors.accent.green, badge: 'Dès 10€/mois',
      stripeMensuel: STRIPE_LINKS_EDU.edu_mensuel, stripeAnnuel: STRIPE_LINKS_EDU.edu_annuel,
      features: [t('reginsc_feat_edu_1', lang), t('reginsc_feat_edu_2', lang), t('reginsc_feat_edu_3', lang), t('reginsc_feat_edu_4', lang), t('reginsc_feat_edu_5', lang)],
    },
    {
      id: 'scout', label: t('regchoix_scout_titre', lang), desc: t('reginsc_scout_desc', lang),
      color: colors.accent.green, badge: 'Dès 10€/mois',
      stripeMensuel: STRIPE_LINKS_RECRUTEUR.mensuel, stripeAnnuel: STRIPE_LINKS_RECRUTEUR.annuel,
      features: [t('reginsc_feat_scout_1', lang), t('reginsc_feat_scout_2', lang), t('reginsc_feat_scout_3', lang), t('reginsc_feat_scout_4', lang)],
    },
    {
      id: 'club', label: t('regchoix_club_titre', lang), desc: t('reginsc_club_desc', lang),
      color: colors.accent.green, badge: 'Dès 50€/mois', assistant: true,
      features: [t('reginsc_feat_club_1', lang), t('reginsc_feat_club_2', lang), t('reginsc_feat_club_3', lang), t('reginsc_feat_club_4', lang)],
    },
  ]

  // Panneau vitrine (colonne gauche, cf. SplitRegisterLayout) par profil —
  // titre + features avec icône. Les features réutilisent le texte déjà
  // traduit de PROFILS[].features ci-dessus (reginsc_feat_*), seules les
  // icônes et le titre leur sont propres ici.
  const PITCH_PAR_PROFIL = {
    joueur_starter: {
      titre: t('reginsc_pitch_titre_starter', lang),
      badge: t('reginsc_pitch_badge_gratuit', lang),
      features: [
        { icon: '📝', label: t('reginsc_feat_starter_1', lang) },
        { icon: '🤝', label: t('reginsc_feat_starter_2', lang) },
        { icon: '💬', label: t('reginsc_feat_starter_3', lang) },
        { icon: '👀', label: t('reginsc_feat_starter_4', lang) },
      ],
    },
    joueur_pro: {
      titre: t('reginsc_pitch_titre_pro', lang),
      badge: t('reginsc_edu_pitch_badge', lang),
      features: [
        { icon: '✅', label: t('reginsc_feat_pro_1', lang) },
        { icon: '📰', label: t('reginsc_feat_pro_2', lang) },
        { icon: '🔍', label: t('reginsc_feat_pro_3', lang) },
        { icon: '📹', label: t('reginsc_feat_pro_4', lang) },
        { icon: '🎥', label: t('reginsc_feat_pro_5', lang) },
      ],
    },
    educateur: {
      titre: t('reginsc_edu_pitch_titre', lang),
      badge: t('reginsc_edu_pitch_badge', lang),
      features: [
        { icon: '📅', label: t('reginsc_edu_pitch_feat1', lang) },
        { icon: '🎯', label: t('reginsc_edu_pitch_feat2', lang) },
        { icon: '📊', label: t('reginsc_edu_pitch_feat3', lang) },
        { icon: '🧠', label: t('reginsc_edu_pitch_feat4', lang) },
        { icon: '📹', label: t('reginsc_edu_pitch_feat5', lang) },
      ],
    },
    scout: {
      titre: t('reginsc_pitch_titre_scout', lang),
      badge: t('reginsc_edu_pitch_badge', lang),
      features: [
        { icon: '🔎', label: t('reginsc_feat_scout_1', lang) },
        { icon: '🎯', label: t('reginsc_feat_scout_2', lang) },
        { icon: '⭐', label: t('reginsc_feat_scout_3', lang) },
        { icon: '💬', label: t('reginsc_feat_scout_4', lang) },
      ],
    },
    club: {
      titre: t('reginsc_pitch_titre_club', lang),
      badge: t('reginsc_edu_pitch_badge', lang),
      features: [
        { icon: '👥', label: t('reginsc_feat_club_1', lang) },
        { icon: '📊', label: t('reginsc_feat_club_2', lang) },
        { icon: '🏆', label: t('reginsc_feat_club_3', lang) },
        { icon: '💶', label: t('reginsc_feat_club_4', lang) },
      ],
    },
  }

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
    if (emailDejaUtilise(error, data)) { setErreur(messageEmailExistant(navigate)); setLoading(false); return }
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
      navigate(signInErr ? '/login' : (redirectApres || '/dashboard'))
    } else {
      navigate(redirectApres || '/dashboard')
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
          onMouseEnter={e => { e.currentTarget.style.borderColor = colors.accent.green; e.currentTarget.style.background = colors.accent.green + alpha.faint }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = colors.background.raised; e.currentTarget.style.background = colors.background.surface }}>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>{p.label}</span>
              {p.badge && (
                <span style={{
                  background: colors.accent.green + alpha.subtle, color: colors.accent.green,
                  border: `1px solid ${colors.accent.green}35`,
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

  // ── Étape 1 : choix du profil, en split-screen (fond uni, pas de photo) ──
  if (etape === 1) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: colors.background.base, color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>
        <style>{SPLIT_MEDIA_QUERY}</style>

        {/* ── Colonne gauche — vitrine, cachée sur mobile ── */}
        <div className="register-left" style={{
          flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '3rem',
          background: colors.background.base,
        }}>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>

          <div>
            <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', margin: 0 }}>Rejoins la communauté.</h2>
            <p style={{ color: colors.text.dim, fontSize: '15px', marginTop: '12px' }}>Joueur, éducateur, recruteur ou club — ta place est ici.</p>
          </div>

          <div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {PILLS.map(pill => (
                <span key={pill} style={{ background: colors.accent.green + alpha.faint, border: `1px solid ${colors.accent.green}30`, borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: colors.text.dim }}>
                  {pill}
                </span>
              ))}
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.accent.green + alpha.faint, border: `1px solid ${colors.accent.green}30`, borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: colors.text.dim }}>
              🔒 {t('reginsc_edu_pitch_badge', lang)}
            </span>
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

  // ── Étape 2 : panneau 2 colonnes, commun à tous les profils ──
  // Club garde son wizard 3 étapes (ClubWizard) tel quel, affiché dans la
  // même colonne droite que les autres profils (color=vert désormais, cf.
  // PROFILS ci-dessus — ClubWizard n'a pas été modifié, seule la couleur
  // reçue en prop change son rendu interne). Les autres profils utilisent
  // ProfilFormPanel, qui réutilise exactement la même logique/les mêmes
  // champs que l'ancien formulaire centré (aucun changement de state/handler).
  return (
    <SplitRegisterLayout pitch={PITCH_PAR_PROFIL[profilChoisi.id]} lang={lang}>
      {profilChoisi.id === 'club' ? (
        <ClubWizard color={colors.accent.green} navigate={navigate} palierInitial={searchParams.get('palier') || ''} cycleInitial={searchParams.get('cycle') === 'annuel' ? 'annuel' : 'mensuel'} redirectApres={redirectApres} />
      ) : (
        <ProfilFormPanel
          profilChoisi={profilChoisi} cycle={cycle} setCycle={setCycle}
          prenom={prenom} setPrenom={setPrenom} nom={nom} setNom={setNom}
          email={email} setEmail={setEmail} password={password} setPassword={setPassword}
          rgpdAccepted={rgpdAccepted} setRgpdAccepted={setRgpdAccepted}
          erreur={erreur} loading={loading} inscrire={inscrire}
          lang={lang} setEtape={setEtape}
        />
      )}
    </SplitRegisterLayout>
  )
}

// Coquille commune à l'étape 2, pour tous les profils (y compris club) :
// colonne gauche vitrine (titre + features + badge, cf. pitch) masquée sur
// mobile, colonne droite = card sombre centrée contenant le formulaire
// (children). Ne connaît rien du contenu du formulaire lui-même — ProfilFormPanel
// et ClubWizard sont interchangeables tant qu'ils tiennent dans une largeur
// de 420px.
function SplitRegisterLayout({ pitch, lang, children }) {
  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, fontFamily: 'Inter, sans-serif' }}>
      <style>{SPLIT2_MEDIA_QUERY}</style>
      <div className="reg2-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh' }}>

        {/* ── Colonne gauche — vitrine, masquée sur mobile ── */}
        <div className="reg2-left" style={{ background: colors.background.base, padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: colors.text.primary }}>
            Digital<span style={{ color: colors.accent.green }}>Football</span>
          </div>

          <div>
            <h2 style={{ color: colors.text.primary, fontWeight: 800, fontSize: '28px', lineHeight: 1.3, margin: '0 0 32px', letterSpacing: '-0.5px' }}>
              {pitch.titre}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {pitch.features.map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ color: colors.text.secondary, fontSize: '15px', fontWeight: 600 }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p style={{ color: colors.text.dim, fontSize: '13px', margin: '0 0 14px' }}>{t('reginsc_edu_pitch_social', lang)}</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.accent.green + alpha.faint, border: `1px solid ${colors.accent.green}30`, borderRadius: '20px', padding: '8px 16px', fontSize: '12px', color: colors.text.dim }}>
              🔒 {pitch.badge}
            </span>
          </div>
        </div>

        {/* ── Colonne droite — contenu (formulaire ou wizard club) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: colors.background.surface, borderRadius: '16px', padding: '40px', boxSizing: 'border-box' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Formulaire d'inscription — tous profils sauf club (qui utilise ClubWizard,
// à 3 étapes). Repose entièrement sur l'état et la logique de Register()
// (inscrire, setEtape...), passés en props — ne duplique aucune logique
// métier, uniquement l'affichage. Rendu à l'intérieur de SplitRegisterLayout.
function ProfilFormPanel({ profilChoisi, cycle, setCycle, prenom, setPrenom, nom, setNom, email, setEmail, password, setPassword, rgpdAccepted, setRgpdAccepted, erreur, loading, inscrire, lang, setEtape }) {
  const champStyle = {
    width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`,
    borderRadius: '10px', color: colors.text.primary, padding: '0 14px', height: '48px',
    fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
  const labelStyle = { display: 'block', fontSize: '12px', color: colors.text.faint, marginBottom: '6px', fontWeight: 600 }
  const champ = (label, value, onChange, props = {}) => (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <input className="reg2-input" value={value} onChange={onChange} style={champStyle} {...props} />
    </div>
  )

  // Même texte d'info par profil que l'ancien formulaire centré (un seul
  // paragraphe, contenu inchangé) — juste restylé en vert pour rester
  // cohérent avec le reste du panneau au lieu de sa couleur dédiée d'origine.
  const INFO_PAR_PROFIL = {
    joueur_pro: t('reginsc_pro_info', lang),
    joueur_starter: t('reginsc_starter_info', lang),
    scout: t('reginsc_scout_info', lang),
    educateur: t('reginsc_educateur_info', lang),
  }
  const infoTexte = INFO_PAR_PROFIL[profilChoisi.id]

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ color: colors.text.primary, fontWeight: 800, fontSize: '20px', margin: '0 0 4px' }}>{t('register_creer_compte', lang)}</p>
        <p style={{ fontSize: '12px', color: colors.text.disabled, margin: 0 }}>
          {`${t('reginsc_inscription_prefix', lang)} ${profilChoisi.label}`}{' '}
          <button type="button" onClick={() => setEtape(1)}
            style={{ background: 'transparent', border: 'none', color: colors.accent.green, cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif', textDecoration: 'underline', padding: 0 }}>
            {t('reginsc_changer', lang)}
          </button>
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {champ(t('equipe_prenom', lang) + ' *', prenom, e => setPrenom(e.target.value))}
          {champ(t('equipe_nom', lang), nom, e => setNom(e.target.value))}
        </div>
        {champ(t('aff_email', lang) + ' *', email, e => setEmail(e.target.value), { type: 'email' })}
        {champ(t('reginsc_mdp_placeholder', lang) + ' *', password, e => setPassword(e.target.value), { type: 'password' })}
      </div>

      {profilChoisi.stripeMensuel && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
          {[
            { key: 'mensuel', titre: t('reginsc_cycle_mensuel_titre', lang), prix: '10€/mois', desc: t('reginsc_cycle_mensuel_desc', lang) },
            { key: 'annuel', titre: t('reginsc_cycle_annuel_titre', lang), prix: '100€/an', desc: t('reginsc_cycle_annuel_desc', lang), badge: t('reginsc_cycle_2mois_offerts', lang) },
          ].map(opt => (
            <button key={opt.key} type="button" onClick={() => setCycle(opt.key)}
              style={{
                flex: 1, textAlign: 'left', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: cycle === opt.key ? colors.accent.green + alpha.subtle : colors.background.base,
                border: `2px solid ${cycle === opt.key ? colors.accent.green : colors.border.faint}`,
                borderRadius: '10px', padding: '12px 14px', position: 'relative',
              }}>
              {opt.badge && (
                <span style={{ position: 'absolute', top: '-9px', right: '10px', background: colors.accent.green, color: colors.black, fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '20px' }}>{opt.badge}</span>
              )}
              <p style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: cycle === opt.key ? colors.accent.green : colors.text.primary }}>{opt.titre}</p>
              <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '15px', color: colors.text.primary }}>{opt.prix}</p>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: colors.text.dim, lineHeight: 1.4 }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      )}

      {erreur && (
        <p style={{ color: '#f87171', fontSize: '13px', marginTop: '14px', textAlign: 'center' }}>{erreur}</p>
      )}

      {infoTexte && (
        <div style={{ background: colors.accent.green + alpha.faint, border: `1px solid ${colors.accent.green}25`, borderRadius: '10px', padding: '12px 14px', marginTop: '14px' }}>
          <p style={{ fontSize: '12px', color: colors.accent.green, margin: 0, lineHeight: 1.6 }}>{infoTexte}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '18px' }}>
        <input type="checkbox" id="rgpd-reg2" checked={rgpdAccepted} onChange={e => setRgpdAccepted(e.target.checked)}
          style={{ marginTop: '3px', accentColor: colors.accent.green, cursor: 'pointer' }} />
        <label htmlFor="rgpd-reg2" style={{ fontSize: '11px', color: colors.text.disabled, lineHeight: 1.5, cursor: 'pointer' }}>
          J'accepte les{' '}
          <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.accent.green, textDecoration: 'underline' }}>
            Conditions Générales d'Utilisation
          </a>
          {profilChoisi.stripeMensuel && (
            <>
              {' '}et les{' '}
              <a href="/cgv" target="_blank" rel="noreferrer" style={{ color: colors.accent.green, textDecoration: 'underline' }}>
                Conditions Générales de Vente
              </a>
            </>
          )}
          {' '}et la{' '}
          <a href="/confidentialite" target="_blank" rel="noreferrer" style={{ color: colors.accent.green, textDecoration: 'underline' }}>
            Politique de Confidentialité
          </a>. Mes données sont traitées conformément au RGPD.
        </label>
      </div>

      <button onClick={inscrire} disabled={loading || !rgpdAccepted}
        style={{
          width: '100%', height: '52px', background: colors.accent.green, color: colors.background.base,
          border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 800,
          cursor: (loading || !rgpdAccepted) ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif', marginTop: '18px',
          opacity: (loading || !rgpdAccepted) ? 0.5 : 1, transition: 'opacity 0.15s',
        }}>
        {loading
          ? t('register_creation_cours', lang)
          : profilChoisi.stripeMensuel
            ? t('reginsc_btn_payer', lang)
            : t('reginsc_btn_gratuit', lang)
        }
      </button>
    </>
  )
}

// Inscription club en 3 étapes : compte (identité + nom du club), 3
// disponibilités pour le rendez-vous de démarrage, puis choix de la formule
// (par nombre d'équipes, cf. PALIERS_QUOTA_EQUIPES) avant redirection Stripe
// — remplace l'ancien flux "formulaire de contact → email manuel sous
// 24-48h" (cf. Offres.jsx, désormais limité aux questions). Rendu à
// l'intérieur de SplitRegisterLayout (cf. Register()) — inchangé par
// rapport à avant, seule la couleur reçue en prop (désormais toujours verte)
// a changé.
function ClubWizard({ color, navigate, palierInitial, cycleInitial, redirectApres }) {
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

  const inputStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }
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
    if (emailDejaUtilise(error, data)) { setErreur(messageEmailExistant(navigate)); setLoading(false); return }
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
    navigate(signInErr ? '/login' : (redirectApres || '/dashboard'))
  }

  return (
    <div style={{ width: '100%' }}>
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
              et les{' '}
              <a href="/cgv" target="_blank" rel="noreferrer" style={{ color, textDecoration: 'underline' }}>
                Conditions Générales de Vente
              </a>{' '}
              et la{' '}
              <a href="/confidentialite" target="_blank" rel="noreferrer" style={{ color, textDecoration: 'underline' }}>
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
        <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.text.disabled }}>CGU</a>{' '}
        et nos{' '}
        <a href="/cgv" target="_blank" rel="noreferrer" style={{ color: colors.text.disabled }}>CGV</a>.
      </p>
    </div>
  )
}
