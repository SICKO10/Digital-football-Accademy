import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { STRIPE_LINKS, STRIPE_LINKS_EDU, STRIPE_LINKS_RECRUTEUR, stripeUrl } from '../lib/stripeLinks'
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
      color: colors.accent.purpleLight, badge: t('regchoix_sur_devis', lang), contact: true,
      features: [t('reginsc_feat_club_1', lang), t('reginsc_feat_club_2', lang), t('reginsc_feat_club_3', lang), t('reginsc_feat_club_4', lang)],
    },
  ]

  // Présélection depuis un lien externe (ex: page Offres) : /register?profil=joueur_pro&cycle=annuel
  // Club exclu : plus de compte à créer pour ce profil, cf. onClick des cartes plus bas.
  const [searchParams] = useSearchParams()
  const profilPresélectionné = PROFILS.find(pr => pr.id === searchParams.get('profil') && !pr.contact) || null

  const [etape, setEtape] = useState(profilPresélectionné ? 2 : 1) // 1 = choix profil | 2 = formulaire
  const [profilChoisi, setProfil] = useState(profilPresélectionné)
  const [cycle, setCycle] = useState(searchParams.get('cycle') === 'annuel' ? 'annuel' : 'mensuel')

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const inscrire = async () => {
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
      })
      if (profilErr) console.error('Erreur création profil (le trigger auto devrait prendre le relais):', profilErr)
    }

    setLoading(false)

    if (profilChoisi.stripeMensuel) {
      const lien = cycle === 'annuel' ? profilChoisi.stripeAnnuel : profilChoisi.stripeMensuel
      window.open(stripeUrl(lien, userId, email), '_blank')
      navigate('/login')
    } else {
      navigate('/dashboard')
    }
  }

  const cardsProfil = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {PROFILS.map(p => (
        <button key={p.id}
          onClick={() => {
            // Club : pas de création de compte — vente humaine via le
            // formulaire de contact de la page Offres (voir demandes_club).
            if (p.contact) { navigate('/offres'); return }
            setProfil(p); setCycle('mensuel'); setEtape(2)
          }}
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

      {profilChoisi && (
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
          {profilChoisi.id === 'club' && (
            <div style={{ background: '#a78bfa10', border: '1px solid #a78bfa25', borderRadius: '10px', padding: '12px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.accent.purpleLight, margin: 0, lineHeight: 1.6 }}>{t('reginsc_club_info', lang)}</p>
            </div>
          )}

          <button onClick={inscrire} disabled={loading}
            style={{
              width: '100%',
              background: profilChoisi.color || colors.accent.green,
              color: profilChoisi.id === 'joueur_starter' ? colors.text.primary : colors.black,
              border: 'none', borderRadius: '12px', padding: '14px',
              fontSize: '15px', fontWeight: 800,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif', marginTop: '18px',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}>
            {loading
              ? t('register_creation_cours', lang)
              : profilChoisi.contact
                ? t('reginsc_btn_contact', lang)
                : profilChoisi.stripeMensuel
                  ? t('reginsc_btn_payer', lang)
                  : t('reginsc_btn_gratuit', lang)
            }
          </button>

          <p style={{ textAlign: 'center', fontSize: '11px', color: colors.border.strong, marginTop: '14px', lineHeight: 1.6 }}>
            {t('register_jai_lu_accepte', lang)}{' '}
            <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.text.disabled }}>{t('register_cgu_reglement', lang)}</a>.
          </p>
        </div>
      )}
    </div>
  )
}
