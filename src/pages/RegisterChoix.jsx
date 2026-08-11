import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { colors, alpha } from '../tokens'

// Brouillon — page autonome, non liée au funnel d'inscription principal (/register).
// TODO: remplacer par les vrais Payment Links Stripe avant de la relier au site.
const STRIPE_LINKS = {
  joueur_mensuel: '#todo-stripe-joueur-mensuel',
  edu_mensuel: '#todo-stripe-edu-mensuel',
}
// TODO: remplacer par le vrai lien de formulaire (Tally / Cal.com / Crisp)
const CLUB_CONTACT_URL = '#todo-lien-contact-club'

export default function RegisterChoix() {
  const navigate = useNavigate()
  const { lang } = useLang()

  const PROFILS = [
    { id: 'joueur_starter', emoji: '👟', label: t('regchoix_starter_titre', lang), desc: t('regchoix_starter_desc', lang), badge: null, stripe: null, gratuit: true },
    { id: 'joueur_pro', emoji: '⚽', label: t('regchoix_pro_titre', lang), desc: t('regchoix_pro_desc', lang), badge: '10€/mois', color: colors.accent.green, stripe: 'joueur_mensuel' },
    { id: 'educateur', emoji: '🎓', label: t('regchoix_educateur_titre', lang), desc: t('regchoix_educateur_desc', lang), badge: '10€/mois', color: colors.accent.blue, stripe: 'edu_mensuel' },
    { id: 'scout', emoji: '🔍', label: t('regchoix_scout_titre', lang), desc: t('regchoix_scout_desc', lang), badge: null, color: colors.accent.orange, redirect: '/register-recruteur' },
    { id: 'club', emoji: '🏟️', label: t('regchoix_club_titre', lang), desc: t('regchoix_club_desc', lang), badge: t('regchoix_sur_devis', lang), color: colors.accent.purpleLight, contact: true },
  ]

  const [etape, setEtape] = useState(1) // 1 = choix du profil, 2 = formulaire
  const [profilChoisi, setProfilChoisi] = useState(null)
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const choisirProfil = (p) => {
    if (p.redirect) { navigate(p.redirect); return }
    setProfilChoisi(p)
    setEtape(2)
  }

  const inscrire = async () => {
    if (!prenom.trim() || !email.trim() || !password.trim()) {
      setErreur(t('regchoix_champs_obligatoires', lang))
      return
    }
    setLoading(true)
    setErreur('')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setErreur(error.message); setLoading(false); return }

    const userId = data.user?.id
    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        prenom,
        nom,
        email,
        plan: profilChoisi.id,
        abonnement_actif: !!profilChoisi.gratuit,
        abonnement_debut: profilChoisi.gratuit ? new Date().toISOString() : null,
      })
    }

    setLoading(false)

    if (profilChoisi.contact) {
      window.location.href = CLUB_CONTACT_URL
    } else if (profilChoisi.stripe) {
      window.location.href = STRIPE_LINKS[profilChoisi.stripe]
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{ background: colors.background.base, minHeight: '100vh', color: colors.text.primary, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>

      <div style={{ marginBottom: '36px', textAlign: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          ⚽ <span style={{ color: colors.accent.green }}>Digital</span>Football
        </p>
        <p style={{ fontSize: '12px', color: colors.text.faint }}>
          {etape === 1 ? t('regchoix_quel_profil', lang) : `${t('regchoix_inscription_prefix', lang)} ${profilChoisi?.label}`}
        </p>
      </div>

      {etape === 1 && (
        <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PROFILS.map(p => (
            <button key={p.id}
              onClick={() => choisirProfil(p)}
              style={{
                background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '14px', padding: '18px 20px',
                cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: colors.text.primary, textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: '16px', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = p.color || colors.accent.green}
              onMouseLeave={e => e.currentTarget.style.borderColor = colors.border.faint}>
              <span style={{ fontSize: '28px', flexShrink: 0 }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px' }}>{p.label}</span>
                  {p.badge && (
                    <span style={{ background: (p.color || colors.accent.green) + '20', color: p.color || colors.accent.green, border: `1px solid ${(p.color || colors.accent.green)}40`, fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                      {p.badge}
                    </span>
                  )}
                  {p.gratuit && (
                    <span style={{ background: '#22222250', color: colors.text.faint, border: '1px solid #333', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px' }}>
                      {t('register_gratuit', lang)}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: colors.text.faint, margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
              </div>
              <span style={{ color: colors.border.strong, fontSize: '18px', flexShrink: 0 }}>›</span>
            </button>
          ))}

          <p style={{ textAlign: 'center', fontSize: '13px', color: colors.text.faint, marginTop: '8px' }}>
            {t('register_deja_compte', lang)}{' '}
            <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: 'none', color: colors.accent.green, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              {t('auth_se_connecter', lang)}
            </button>
          </p>
        </div>
      )}

      {etape === 2 && profilChoisi && (
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '12px', padding: '12px 16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '20px' }}>{profilChoisi.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>{profilChoisi.label}</p>
              {profilChoisi.badge && <p style={{ fontSize: '11px', color: colors.text.faint, margin: 0 }}>{profilChoisi.badge}</p>}
            </div>
            <button onClick={() => setEtape(1)}
              style={{ background: 'transparent', border: 'none', color: colors.text.faint, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textDecoration: 'underline' }}>
              {t('regchoix_changer', lang)}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input placeholder={t('equipe_prenom', lang) + ' *'} value={prenom} onChange={e => setPrenom(e.target.value)}
                style={{ flex: 1, background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
              <input placeholder={t('equipe_nom', lang)} value={nom} onChange={e => setNom(e.target.value)}
                style={{ flex: 1, background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
            </div>
            <input placeholder={t('aff_email', lang) + ' *'} type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            <input placeholder={t('auth_mot_de_passe', lang) + ' *'} type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ background: colors.background.surface, border: '1px solid #1f1f1f', borderRadius: '10px', color: colors.text.primary, padding: '12px 14px', fontSize: '14px', fontFamily: 'Inter, sans-serif', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>

          {erreur && <p style={{ color: '#f87171', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>{erreur}</p>}

          {profilChoisi.id === 'joueur_pro' && (
            <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '10px', padding: '10px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.accent.green, margin: 0, lineHeight: 1.6 }}>{t('regchoix_pro_info_6mois', lang)}</p>
            </div>
          )}
          {profilChoisi.id === 'joueur_starter' && (
            <div style={{ background: '#ffffff08', border: '1px solid #222', borderRadius: '10px', padding: '10px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.text.faint, margin: 0, lineHeight: 1.6 }}>{t('regchoix_starter_info_upgrade', lang)}</p>
            </div>
          )}
          {profilChoisi.contact && (
            <div style={{ background: '#a78bfa10', border: '1px solid #a78bfa30', borderRadius: '10px', padding: '10px 14px', marginTop: '14px' }}>
              <p style={{ fontSize: '12px', color: colors.accent.purpleLight, margin: 0, lineHeight: 1.6 }}>{t('regchoix_club_info_contact', lang)}</p>
            </div>
          )}

          <button onClick={inscrire} disabled={loading}
            style={{ width: '100%', background: profilChoisi.color || colors.accent.green, color: colors.black, border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '20px', opacity: loading ? 0.7 : 1 }}>
            {loading ? t('register_creation_cours', lang) : profilChoisi.contact ? t('regchoix_continuer', lang) : profilChoisi.stripe ? t('register_creer_compte_payer', lang) : t('register_creer_compte_gratuit', lang)}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: colors.border.strong, marginTop: '14px' }}>
            {t('register_jai_lu_accepte', lang)}{' '}
            <a href="/cgu" target="_blank" rel="noreferrer" style={{ color: colors.text.faint }}>{t('register_cgu_reglement', lang)}</a>
          </p>
        </div>
      )}
    </div>
  )
}
