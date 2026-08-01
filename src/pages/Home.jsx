import { useNavigate } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
import { t, LANGS } from '../lib/translations'

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

const etapesClub = [
  { num: 'ÉTAPE 1', titre: "Tu t'inscris", desc: 'Crée ton espace club selon ta taille' },
  { num: 'ÉTAPE 2', titre: 'Tu organises', desc: 'Invite gratuitement tes éducateurs, dirigeants et secrétaires' },
  { num: 'ÉTAPE 3', titre: 'Tu gères', desc: 'Budget, sponsors, multi-équipes, tout au même endroit' },
  { num: 'ÉTAPE 4', titre: 'Tu te développes', desc: 'Connecte tes éducateurs et scouts aux joueurs pour trouver le bon profil' },
]

function EtapesSection({ badge, titre, etapes, color }) {
  return (
    <section style={{ padding: '5rem 2rem', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: `${color}15`, border: `1px solid ${color}40`, color, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{badge}</div>
      <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '3rem' }}>{titre}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        {etapes.map(step => (
          <div key={step.num} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '1.5rem', textAlign: 'left' }}>
            <div style={{ width: '44px', height: '44px', background: `${color}15`, border: `1px solid ${color}40`, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800, color, marginBottom: '1rem' }}>{step.num.match(/\d+/)?.[0]}</div>
            <div style={{ fontSize: '11px', color, fontWeight: 700, marginBottom: '6px' }}>{step.num}</div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>{step.titre}</h3>
            <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Home() {
  const navigate = useNavigate()
  const { lang, setLang } = useLang()
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <div className="nav-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="#comment" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>{t('home_comment_marche', lang)}</a>
          <span onClick={() => navigate('/offres')} style={{ color: '#666', fontSize: '14px', cursor: 'pointer' }}>{t('home_offres', lang)}</span>
          <span onClick={() => navigate('/jogabonito')} style={{ color: '#666', fontSize: '14px', cursor: 'pointer' }}>Jogabonito</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ background: lang === l.code ? '#4ade8020' : 'transparent', border: `1px solid ${lang === l.code ? '#4ade80' : '#2a2a2a'}`, borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', fontSize: '12px' }}>
                {l.flag}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>{t('auth_connexion_titre', lang)}</button>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('home_commencer', lang)}</button>
        </div>
      </nav>
      <style>{`@media (max-width: 768px) { .nav-links { display: none !important; } }`}</style>

      <section style={{ padding: '5rem 2rem 3rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1.5rem', letterSpacing: '1px', fontWeight: 600 }}>{t('home_badge_plateforme', lang)}</div>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.25rem', letterSpacing: '-2px' }}>{t('home_hero_titre_1', lang)}<br /><span style={{ color: '#4ade80' }}>{t('home_hero_titre_2', lang)}</span><br />{t('home_hero_titre_3', lang)}</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '2.5rem', lineHeight: 1.7 }}>{t('home_hero_desc', lang)}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>{t('home_envoyer_video', lang)}</button>
          <button onClick={() => navigate('/jogabonito')} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade8040', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>{t('home_voir_jogabonito', lang)}</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          {[{ num: '500+', label: t('home_stat_joueurs_analyses', lang) }, { num: '98%', label: t('home_stat_satisfaction', lang) }, { num: '50+', label: t('home_stat_clubs_partenaires', lang) }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 800 }}>{s.num}</div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#0f0f0f', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#f9731615', border: '1px solid #f9731640', color: '#f97316', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{t('home_nouveau', lang)}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.75rem' }}>{t('home_tiktok_football', lang)}</h2>
        <p style={{ fontSize: '16px', color: '#666', maxWidth: '480px', margin: '0 auto 3rem' }}>{t('home_tiktok_desc', lang)}</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '2.5rem', alignItems: 'center' }}>
          {[{ nom: 'Karim A.', poste: 'Attaquant', scale: 0.8, opacity: 0.5 }, { nom: 'Lucas M.', poste: 'Milieu', scale: 1, opacity: 1, featured: true }, { nom: 'Yanis B.', poste: 'Defenseur', scale: 0.8, opacity: 0.5 }].map((j, i) => (
            <div key={i} onClick={() => navigate('/jogabonito')} style={{ width: j.featured ? '160px' : '120px', height: j.featured ? '280px' : '210px', background: '#1a1a1a', border: j.featured ? '2px solid #4ade80' : '1px solid #222', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px', position: 'relative', overflow: 'hidden', cursor: 'pointer', opacity: j.opacity, transform: `scale(${j.scale})` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 2 }}>▶</div>
              <div style={{ position: 'relative', zIndex: 3 }}><p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>{j.nom}</p><p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4ade80' }}>{j.poste}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/jogabonito')} style={{ background: '#f97316', color: '#fff', border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>{t('home_voir_jogabonito', lang)}</button>
      </section>

      <section id="comment" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{t('home_processus', lang)}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '3rem' }}>{t('home_comment_marche', lang)}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {[{ num: '1', emoji: '📝', titre: t('home_etape1_titre', lang), desc: t('home_etape1_desc', lang) }, { num: '2', emoji: '🎬', titre: t('home_etape2_titre', lang), desc: t('home_etape2_desc', lang) }, { num: '3', emoji: '🔍', titre: t('home_etape3_titre', lang), desc: t('home_etape3_desc', lang) }, { num: '4', emoji: '🚀', titre: t('home_etape4_titre', lang), desc: t('home_etape4_desc', lang) }].map(step => (
            <div key={step.num} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '1.5rem', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '1rem' }}>{step.emoji}</div>
              <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, marginBottom: '6px' }}>{t('home_etape', lang)} {step.num}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>{step.titre}</h3>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: 'center', paddingBottom: '3rem', background: '#0f0f0f', paddingTop: '3rem' }}>
        <button onClick={() => navigate('/offres')} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade8040', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Voir les tarifs joueur</button>
      </div>

      <EtapesSection badge="TARIFS ÉDUCATEURS" titre="Développe tes joueurs" etapes={etapesEducateur} color="#60a5fa" />
      <div style={{ textAlign: 'center', paddingBottom: '3rem' }}>
        <button onClick={() => navigate('/offres')} style={{ background: 'transparent', color: '#60a5fa', border: '1px solid #60a5fa40', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Voir les tarifs éducateur</button>
      </div>

      <EtapesSection badge="SCOUTS / RECRUTEURS" titre="Trouve tes prochains talents" etapes={etapesRecruteur} color="#f97316" />
      <div style={{ textAlign: 'center', paddingBottom: '3rem' }}>
        <button onClick={() => navigate('/offres')} style={{ background: 'transparent', color: '#f97316', border: '1px solid #f9731640', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Voir les tarifs recruteur</button>
      </div>

      <EtapesSection badge="CLUBS" titre="Gérez votre club de A à Z" etapes={etapesClub} color="#4ade80" />
      <div style={{ textAlign: 'center', paddingBottom: '3rem' }}>
        <button onClick={() => navigate('/offres')} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade8040', padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Voir les tarifs club</button>
      </div>

      <section style={{ background: '#0f0f0f', padding: '5rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '1rem' }}>{t('home_pret_niveau_sup', lang)}</h2>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>{t('home_creer_mon_profil', lang)}</button>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>{t('auth_connexion_titre', lang)}</button>
        </div>
      </section>

      <section style={{ padding: '5rem 2rem', textAlign: 'center', background: '#0a0a0a' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{t('register_gratuit', lang)}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.75rem' }}>{t('home_rejoins_communaute', lang)}</h2>
        <p style={{ color: '#666', fontSize: '16px', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          {t('home_suis_talents_desc', lang)}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
            {t('home_creer_compte_fan_gratuit', lang)}
          </button>
          <button onClick={() => navigate('/jogabonito')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>
            {t('home_voir_jogabonito_dabord', lang)}
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', flexWrap: 'wrap' }}>
          {[['⚽', t('home_reels_foot_direct', lang)], ['❤️', t('home_like_commente', lang)], ['🔔', t('home_suis_talents', lang)]].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555' }}>
              <span style={{ fontSize: '20px' }}>{icon}</span> {label}
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[[t('recrut_feed', lang), '/feed'], ['Jogabonito', '/jogabonito'], [t('home_cgu', lang), '/cgu'], [t('home_inscription', lang), '/register']].map(([label, path]) => (<span key={label} onClick={() => navigate(path)} style={{ color: '#555', fontSize: '13px', cursor: 'pointer' }}>{label}</span>))}
        </div>
        <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>2025 Digital Football</p>
      </footer>
    </div>
  )
}
export default Home
