import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
// Sous-ensemble dédié (23 clés, pas les ~1000+ de translations.js) — cf.
// commentaire en tête de lib/translationsHome.js. Home.jsx est la seule page
// importée statiquement dans App.jsx (pas de lazy()), donc la seule dont les
// imports finissent dans le bundle "index" chargé par tout visiteur.
import { t, LANGS } from '../lib/translationsHome'
import { colors, alpha } from '../tokens'
import { supabase } from '../supabase'
import NewsletterForm from '../components/NewsletterForm'
import HeroDashboardsPreview from '../components/HeroDashboardsPreview'

const etapesEducateur = [
  { num: 'ÉTAPE 1', titre: "Tu t'inscris", desc: 'Crée ton profil éducateur en 2 minutes' },
  { num: 'ÉTAPE 2', titre: 'Tu construis ton équipe', desc: "Invite gratuitement tes joueurs avec un code d'équipe" },
  { num: 'ÉTAPE 3', titre: 'Tu analyses', desc: 'Suis les présences, stats et progrès de chaque joueur' },
  { num: 'ÉTAPE 4', titre: 'Tu développes', desc: 'Prépare tes séances, analyse, tactique et connecte tes joueurs' },
]

const etapesRecruteur = [
  { num: 'ÉTAPE 1', titre: "Tu t'inscris", desc: 'Crée ton profil scout en 2 minutes' },
  { num: 'ÉTAPE 2', titre: 'Tu cherches', desc: 'Filtre les joueurs par poste, niveau, région' },
  { num: 'ÉTAPE 3', titre: 'Tu analyses', desc: 'Consulte les stats et vidéos des joueurs' },
  { num: 'ÉTAPE 4', titre: 'Tu recrutes', desc: "Contacte directement les talents qui t'intéressent" },
]

// Section "Une plateforme. Trois univers." — textes via t('profils_*_<id>')
// dans translationsHome.js, label réutilisé depuis hero_preview_nav_<id>.
// Destinations : /register?profil=joueur_starter présélectionne bien l'offre
// gratuite (PROFILS.find dans Register.jsx → étape 2 directe). Offres.jsx
// n'a aucun mécanisme de présélection (ni paramètre, ni ancre lue au
// chargement), donc éducateur et club pointent simplement vers /offres.
const profilsCards = [
  { id: 'joueur', color: colors.accent.green, route: '/register?profil=joueur_starter',
    icon: <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></> },
  { id: 'educateur', color: colors.accent.blue, route: '/offres',
    icon: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><path d="M9 11h6M9 15h4" /></> },
  { id: 'club', color: colors.accent.purpleLight, route: '/offres',
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" /> },
]

const cardVars = c => ({
  '--pc': c, '--pc-border': c + '45', '--pc-border-cta': c + '55', '--pc-border-hover': c + '90',
  '--pc-glow': c + '24', '--pc-shadow': c + '70', '--pc-bg': c + '1a', '--pc-bg-hover': c + '2e',
})

// Hover/focus/responsive impossibles en style inline — même approche que
// HDP_STYLE (HeroDashboardsPreview). Couleur de profil passée en variable CSS
// (--pc + déclinaisons hex+alpha, cf. cardVars) pour une seule règle par
// état — pas de color-mix(), absent de Safari < 16.2. Tablette : 2 colonnes,
// la 3e carte centrée à largeur identique plutôt qu'étirée sur la ligne.
const PROFILS_STYLE = `
  .pc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; }
  .pc-card { position: relative; display: flex; flex-direction: column; overflow: hidden;
    background: linear-gradient(180deg, ${colors.background.surfaceAlt} 0%, ${colors.background.sunken} 100%);
    border: 1px solid var(--pc-border); border-radius: 18px; padding: 1.75rem 1.5rem 1.5rem;
    transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
  .pc-card::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
    background: radial-gradient(ellipse 80% 45% at 50% 0%, var(--pc-glow) 0%, transparent 70%);
    transition: opacity 0.25s ease; }
  .pc-card > * { position: relative; }
  .pc-cta { margin-top: auto; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
    padding: 12px 18px; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: Inter, sans-serif; cursor: pointer;
    color: var(--pc); background: var(--pc-bg); border: 1px solid var(--pc-border-cta);
    transition: background 0.2s ease, border-color 0.2s ease; }
  .pc-cta svg { transition: transform 0.2s ease; }
  .pc-cta:focus-visible { outline: 2px solid var(--pc); outline-offset: 3px; }
  @media (hover: hover) and (pointer: fine) {
    .pc-card:hover { transform: translateY(-4px); border-color: var(--pc-border-hover);
      box-shadow: 0 18px 40px -18px var(--pc-shadow); }
    .pc-card:hover::before { opacity: 1; }
    .pc-cta:hover { background: var(--pc-bg-hover); border-color: var(--pc-border-hover); }
    .pc-cta:hover svg { transform: translateX(3px); }
  }
  @media (max-width: 960px) {
    .pc-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .pc-card:last-child { grid-column: 1 / -1; justify-self: center; width: calc(50% - 0.625rem); }
  }
  @media (max-width: 640px) {
    .pc-grid { grid-template-columns: minmax(0, 1fr); gap: 1rem; }
    .pc-card:last-child { width: auto; justify-self: stretch; }
    .pc-card { padding: 1.5rem 1.25rem 1.25rem; }
    .pc-section { padding-left: 1rem !important; padding-right: 1rem !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pc-card, .pc-card::before, .pc-cta, .pc-cta svg { transition: none !important; }
    .pc-card:hover, .pc-cta:hover svg { transform: none !important; }
  }
`

const etapesClub = [
  { num: 'ÉTAPE 1', titre: "Tu t'inscris", desc: 'Crée ton espace club selon ta taille' },
  { num: 'ÉTAPE 2', titre: 'Tu organises', desc: 'Invite gratuitement tes éducateurs, dirigeants et secrétaires' },
  { num: 'ÉTAPE 3', titre: 'Tu gères', desc: 'Budget, sponsors, multi-équipes, tout au même endroit' },
  { num: 'ÉTAPE 4', titre: 'Tu te développes', desc: 'Connecte tes éducateurs et scouts aux joueurs pour trouver le bon profil' },
]

function EtapesSection({ badge, titre, etapes, color, ctaLabel, onCta }) {
  const [hoveredCard, setHoveredCard] = useState(null)
  return (
    <section style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: `${color}15`, border: `1px solid ${color}40`, color, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{badge}</div>
      <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '3rem' }}>{titre}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        {etapes.map(step => {
          const id = `etape-${step.num}`
          const hovered = hoveredCard === id
          return (
            <div key={step.num}
              onMouseEnter={() => setHoveredCard(id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ background: colors.background.surface, border: `1px solid ${hovered ? color : '#222'}`, borderRadius: '14px', padding: '1.5rem', textAlign: 'left', transform: hovered ? 'translateY(-1px)' : 'none', transition: 'all 0.15s ease' }}>
              <div style={{ width: '44px', height: '44px', background: `${color}15`, border: `1px solid ${color}40`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color, marginBottom: '1rem' }}>{step.num.match(/\d+/)?.[0]}</div>
              <div style={{ fontSize: '11px', color, fontWeight: 700, marginBottom: '6px' }}>{step.num}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>{step.titre}</h3>
              <p style={{ fontSize: '13px', color: colors.text.dim, lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          )
        })}
      </div>
      {ctaLabel && (
        <button onClick={onCta} style={{ background: 'transparent', color, border: `1px solid ${color}40`, padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '3rem', fontFamily: 'Inter, sans-serif' }}>
          {ctaLabel}
        </button>
      )}
    </section>
  )
}

// Recruteur retiré de la communication grand public (onglet + cartes
// profilsCards ci-dessous) — la vitrine met désormais en avant 3 univers
// (joueur/éducateur/club). Le profil recruteur reste entièrement
// fonctionnel : route /recruteur, inscription /register?profil=scout et
// etapesRecruteur/TAB_CONFIG.recruteur plus bas ne sont pas touchés, juste
// devenus inatteignables depuis ces deux listes.
const TABS = [
  { id: 'joueur', label: 'Joueur', color: colors.accent.green },
  { id: 'educateur', label: 'Éducateur', color: colors.accent.blue },
  { id: 'club', label: 'Club', color: colors.accent.purpleLight },
]

function Home() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  const [heroCta1Hover, setHeroCta1Hover] = useState(false)
  const [heroCta2Hover, setHeroCta2Hover] = useState(false)
  const [tabActif, setTabActif] = useState('joueur')
  const [checkingSession, setCheckingSession] = useState(true)

  // Home est le start_url de la PWA — sans ce check, un utilisateur déjà
  // connecté (session persistée par défaut dans localStorage par le client
  // Supabase) revoyait la page marketing à chaque réouverture de l'app au
  // lieu d'atterrir directement sur son espace. /dashboard réutilise la
  // logique de routage déjà centralisée dans SmartDashboard (App.jsx).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { navigate('/dashboard', { replace: true }); return }
      setCheckingSession(false)
    })
  }, [navigate])

  if (checkingSession) return null

  // Données du tab "joueur" : dépend de t()/lang, donc construit ici plutôt
  // qu'en constante de module comme etapesEducateur/etapesRecruteur/etapesClub
  // (qui, eux, sont en français en dur — incohérence déjà présente avant ce
  // changement, pas introduite ici).
  const etapesJoueur = [
    { num: 'ÉTAPE 1', titre: t('home_etape1_titre', lang), desc: t('home_etape1_desc', lang) },
    { num: 'ÉTAPE 2', titre: t('home_etape2_titre', lang), desc: t('home_etape2_desc', lang) },
    { num: 'ÉTAPE 3', titre: t('home_etape3_titre', lang), desc: t('home_etape3_desc', lang) },
    { num: 'ÉTAPE 4', titre: t('home_etape4_titre', lang), desc: t('home_etape4_desc', lang) },
  ]
  const TAB_CONFIG = {
    joueur: { badge: t('home_processus', lang), titre: t('home_comment_marche', lang), etapes: etapesJoueur, color: colors.accent.green, ctaLabel: 'Voir les tarifs joueur' },
    educateur: { badge: 'TARIFS ÉDUCATEURS', titre: 'Développe tes joueurs', etapes: etapesEducateur, color: colors.accent.blue, ctaLabel: 'Voir les tarifs éducateur' },
    recruteur: { badge: 'SCOUTS / RECRUTEURS', titre: 'Trouve tes prochains talents', etapes: etapesRecruteur, color: colors.accent.orange, ctaLabel: 'Voir les tarifs recruteur' },
    club: { badge: 'CLUBS', titre: 'Gérez votre club de A à Z', etapes: etapesClub, color: colors.accent.purpleLight, ctaLabel: 'Voir les tarifs club' },
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.background.base, color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(1rem + env(safe-area-inset-top, 0px)) 2rem 1rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }} className="navbar-home">
        <div className="navbar-logo" style={{ fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
        <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="#comment" style={{ color: colors.text.dim, textDecoration: 'none', fontSize: '14px' }}>{t('home_comment_marche', lang)}</a>
          <span onClick={() => navigate('/offres')} style={{ color: colors.text.dim, fontSize: '14px', cursor: 'pointer' }}>{t('home_offres', lang)}</span>
          <span onClick={() => navigate('/comment-financer')} style={{ color: colors.text.dim, fontSize: '14px', cursor: 'pointer' }}>{t('home_financement', lang)}</span>
          <span onClick={() => navigate('/jogabonito')} style={{ color: colors.text.dim, fontSize: '14px', cursor: 'pointer' }}>Jogabonito</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ background: lang === l.code ? colors.accent.green + alpha.soft : 'transparent', border: `1px solid ${lang === l.code ? colors.accent.green : colors.border.default}`, borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                {l.flag}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button className="navbar-cta-btn" onClick={() => navigate('/login')} style={{ background: 'transparent', color: colors.text.secondary, border: '1px solid #333', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{t('auth_connexion_titre', lang)}</button>
          <button className="navbar-cta-btn" onClick={() => navigate('/register')} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }}>{t('home_commencer', lang)}</button>
        </div>
      </nav>
      <style>{`
        @media (max-width: 768px) { .nav-links { display: none !important; } }
        @media (max-width: 400px) {
          .navbar-home { padding-left: 1rem !important; padding-right: 1rem !important; gap: 8px; }
          .navbar-logo { font-size: 15px !important; }
          .navbar-cta-btn { padding: 7px 12px !important; font-size: 12.5px !important; }
        }
      `}</style>

      {/* maxWidth élargi de 800px à 1400px (strictement pour laisser la place
          à HeroDashboardsPreview et sa composition en profondeur). Badge/H1/
          CTA non affectés (largeur naturelle ou saut de ligne explicite) ;
          le sous-titre récupère son propre maxWidth 800px ci-dessous pour
          garder exactement le même retour à la ligne qu'avant. */}
      <section style={{ position: 'relative', padding: '3.5rem 2rem 3rem', textAlign: 'center', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '480px', background: 'radial-gradient(ellipse 60% 40% at 50% 50%, #4ade8018 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'inline-block', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1.5rem', letterSpacing: '1px', fontWeight: 600 }}>NOUVEAU · SAISON 2025/2026</div>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.25rem', letterSpacing: '-2px' }}>L'écosystème numérique<br/>du <span style={{ color: colors.accent.green }}>football amateur.</span></h1>
        <p style={{ fontSize: 'clamp(0.95rem, 3.5vw, 1.125rem)', color: colors.text.dim, maxWidth: '800px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>Dashboard stats, causerie tactique, feed vidéo — une seule plateforme pour joueurs, éducateurs et clubs.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/register')}
            onMouseEnter={() => setHeroCta1Hover(true)}
            onMouseLeave={() => setHeroCta1Hover(false)}
            style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', transform: heroCta1Hover ? 'translateY(-2px)' : 'none', boxShadow: heroCta1Hover ? '0 8px 20px #4ade8040' : 'none', fontFamily: 'Inter, sans-serif' }}>
            {t('home_envoyer_video', lang)}
          </button>
          <button
            onClick={() => navigate('/jogabonito')}
            onMouseEnter={() => setHeroCta2Hover(true)}
            onMouseLeave={() => setHeroCta2Hover(false)}
            style={{ background: 'transparent', color: colors.accent.green, border: '1px solid #4ade8040', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', transform: heroCta2Hover ? 'translateY(-2px)' : 'none', boxShadow: heroCta2Hover ? '0 8px 20px #4ade8020' : 'none', fontFamily: 'Inter, sans-serif' }}>
            {t('home_voir_jogabonito', lang)}
          </button>
        </div>

        <HeroDashboardsPreview lang={lang} />
      </section>

      <section className="pc-section" aria-labelledby="profils-titre" style={{ padding: '4rem 2rem', maxWidth: '1120px', margin: '0 auto' }}>
        <style>{PROFILS_STYLE}</style>
        <h2 id="profils-titre" style={{ textAlign: 'center', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 0.75rem' }}>{t('profils_section_titre', lang)}</h2>
        <p style={{ textAlign: 'center', color: colors.text.dim, fontSize: '15px', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 2.75rem' }}>
          {t('profils_section_soustitre', lang)}
        </p>
        <div className="pc-grid">
          {profilsCards.map(card => (
            <article key={card.id} className="pc-card" style={cardVars(card.color)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                <div aria-hidden="true" style={{ width: '40px', height: '40px', flexShrink: 0, borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: card.color + alpha.subtle, border: `1px solid ${card.color}${alpha.light}`, color: card.color }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{card.icon}</svg>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: card.color }}>{t(`hero_preview_nav_${card.id}`, lang)}</span>
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: 800, lineHeight: 1.3, letterSpacing: '-0.2px', margin: '0 0 0.75rem', color: colors.text.primary }}>{t(`profils_titre_${card.id}`, lang)}</h3>
              <p style={{ fontSize: '14px', color: colors.text.dim, lineHeight: 1.65, margin: '0 0 1.25rem' }}>{t(`profils_desc_${card.id}`, lang)}</p>
              <ul style={{ listStyle: 'none', padding: '1.25rem 0 0', margin: '0 0 1.75rem', borderTop: `1px solid ${colors.border.subtle}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3].map(n => (
                  <li key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13.5px', lineHeight: 1.5, color: colors.text.secondary }}>
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    {t(`profils_feat_${card.id}_${n}`, lang)}
                  </li>
                ))}
              </ul>
              <button type="button" className="pc-cta" onClick={() => navigate(card.route)}>
                {t(`profils_cta_${card.id}`, lang)}
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section style={{ background: '#0f0f0f', padding: '3.5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: colors.accent.orange + alpha.subtle, border: '1px solid #f9731640', color: colors.accent.orange, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{t('home_nouveau', lang)}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.75rem' }}>{t('home_tiktok_football', lang)}</h2>
        <p style={{ fontSize: '16px', color: colors.text.dim, maxWidth: '480px', margin: '0 auto 3rem' }}>{t('home_tiktok_desc', lang)}</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '2.5rem', alignItems: 'center' }}>
          {[{ nom: 'Karim A.', poste: 'Attaquant', scale: 0.8, opacity: 0.5 }, { nom: 'Lucas M.', poste: 'Milieu', scale: 1, opacity: 1, featured: true }, { nom: 'Yanis B.', poste: 'Defenseur', scale: 0.8, opacity: 0.5 }].map((j, i) => (
            <div key={i} onClick={() => navigate('/jogabonito')} style={{ width: j.featured ? '160px' : '120px', height: j.featured ? '280px' : '210px', background: colors.background.raised, border: j.featured ? '2px solid #4ade80' : '1px solid #222', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px', position: 'relative', overflow: 'hidden', cursor: 'pointer', opacity: j.opacity, transform: `scale(${j.scale})` }}>
              <svg style={{ position: 'absolute', inset: 0, opacity: 0.06 }} viewBox="0 0 160 280" xmlns="http://www.w3.org/2000/svg"><circle cx="80" cy="140" r="50" fill="none" stroke="white" strokeWidth="1.5" /><line x1="0" y1="140" x2="160" y2="140" stroke="white" strokeWidth="1" /></svg>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 2 }}>▶</div>
              <div style={{ position: 'relative', zIndex: 3 }}><p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>{j.nom}</p><p style={{ margin: '2px 0 0', fontSize: '10px', color: colors.accent.green }}>{j.poste}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/jogabonito')} style={{ background: colors.accent.orange, color: colors.text.primary, border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('home_voir_jogabonito', lang)}</button>
      </section>

      {/* Emplacement réservé à la future section premium "Digital Football en
          action" (vrais dashboards Joueur/Éducateur/Club) — pas développée
          pour l'instant. L'ancienne section témoignages a été retirée : ses
          citations n'étaient rattachées à aucun utilisateur réel ni source
          vérifiable (pas de nom, pas de table Supabase), décision du
          2026-10-08. */}

      <section id="comment" style={{ padding: '3.5rem 2rem 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {TABS.map(tabItem => {
            const actif = tabActif === tabItem.id
            return (
              <button key={tabItem.id} onClick={() => setTabActif(tabItem.id)}
                style={{
                  background: actif ? tabItem.color + alpha.subtle : 'transparent',
                  border: `1px solid ${actif ? tabItem.color : '#222'}`,
                  color: actif ? tabItem.color : colors.text.faint,
                  borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                {tabItem.label}
              </button>
            )
          })}
        </div>
      </section>

      <EtapesSection {...TAB_CONFIG[tabActif]} onCta={() => navigate('/offres')} />

      <section style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', background: colors.background.surface, border: '1px solid #1a1a1a', borderRadius: '20px', padding: '2.5rem 2rem' }}>
          <div style={{ display: 'inline-block', background: colors.accent.green + alpha.subtle, border: '1px solid #4ade8040', color: colors.accent.green, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', letterSpacing: '1px', fontWeight: 600 }}>POUR LES CLUBS</div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 800, marginBottom: '0.75rem' }}>Comment financer l'abonnement de votre club ?</h2>
          <p style={{ color: colors.text.dim, fontSize: '14px', lineHeight: 1.7, marginBottom: '1.75rem' }}>
            Licence, sponsoring local, subventions... découvrez 6 stratégies concrètes et un calculateur pour couvrir l'outil sans impact sur les familles.
          </p>
          <button onClick={() => navigate('/comment-financer')} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '13px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Voir le guide de financement →</button>
        </div>
      </section>

      <section style={{ position: 'relative', overflow: 'hidden', background: '#0f0f0f', padding: '3.5rem 2rem', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: '-1px', left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #4ade8040, transparent)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 100%, #4ade8014 0%, transparent 70%)', pointerEvents: 'none' }} />
        <h2 style={{ position: 'relative', zIndex: 1, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '1rem' }}>Prêt à rejoindre l'écosystème ?</h2>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ background: colors.accent.green, color: colors.black, border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>Créer mon profil</button>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: colors.text.secondary, border: '1px solid #333', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>{t('auth_connexion_titre', lang)}</button>
        </div>
      </section>

      <section style={{ padding: '80px 24px', background: colors.background.sunken, textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <p style={{ color: colors.accent.green, fontSize: '13px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Newsletter</p>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: colors.text.primary, marginBottom: '12px' }}>
            Les actus du football digital, chaque semaine.
          </h2>
          <p style={{ color: colors.text.faint, fontSize: '15px', marginBottom: '32px' }}>
            Analyses, nouveautés plateforme, conseils carrière — directement dans ta boîte mail.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <NewsletterForm source="home_page" />
          </div>
          <p style={{ color: colors.border.strong, fontSize: '12px', marginTop: '16px' }}>
            Pas de spam. Désabonnement en 1 clic. Données protégées RGPD.
          </p>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>
        <p style={{ fontSize: '13px', color: colors.text.faint, marginBottom: '16px' }}>La plateforme qui connecte les talents du football.</p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          {/* TikTok/LinkedIn retirés : aucune URL officielle de la marque
              trouvée ailleurs dans le projet (seulement du code générique de
              détection de lien TikTok dans Feed/Jogabonito/Upload, sans
              rapport avec un compte Digital Football) — à remettre dès que
              ces comptes existent réellement. */}
          {[['Instagram', 'https://www.instagram.com/digitalfootball10/']].map(([reseau, url]) => (
            <a key={reseau} href={url} target={url === '#' ? undefined : '_blank'} rel={url === '#' ? undefined : 'noopener noreferrer'} style={{ color: colors.text.faint, fontSize: '13px', textDecoration: 'none' }}>{reseau}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[[t('recrut_feed', lang), '/feed'], ['Jogabonito', '/jogabonito'], [t('home_cgu', lang), '/cgu'], [t('home_cgv', lang), '/cgv'], [t('home_inscription', lang), '/register']].map(([label, path]) => (<span key={label} onClick={() => navigate(path)} style={{ color: colors.text.faint, fontSize: '13px', cursor: 'pointer' }}>{label}</span>))}
        </div>
        <p style={{ color: colors.border.strong, fontSize: '12px', margin: 0 }}>2025 Digital Football</p>
      </footer>
    </div>
  )
}
export default Home
