import { useNavigate } from 'react-router-dom'
import { useLang } from '../hooks/useLang'
import { t, LANGS } from '../lib/translations'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
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
          <a href="#offres" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>{t('home_offres', lang)}</a>
          <span onClick={() => navigate('/offres')} style={{ color: '#666', fontSize: '14px', cursor: 'pointer' }}>{t('offres_nav_tarifs', lang)}</span>
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

      <section id="offres" style={{ background: '#0f0f0f', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{t('home_tarifs_joueurs', lang)}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.5rem' }}>{t('home_choisis_niveau', lang)}</h2>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '2.5rem' }}>{t('home_analyses_perso_desc', lang)}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '680px', margin: '0 auto' }}>

          {/* STARTER */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2rem', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>{t('home_limite', lang)}</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Starter</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: '#555', textDecoration: 'line-through' }}>59,99EUR{t('home_mois_suffix', lang)}</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>-15%</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>49,99EUR <span style={{ fontSize: '15px', color: '#555', fontWeight: 400 }}>{t('home_mois_suffix', lang)}</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[t('home_starter_feature1', lang), t('home_starter_feature2', lang), t('home_starter_feature3', lang)].map(f => (<li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#4ade80' }}>✓</span> {f}</li>))}
            </ul>
            <a href={STRIPE_LINKS.starter} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: 'white', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>{t('home_commencer', lang)}</a>
          </div>

          {/* PRO */}
          <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '2rem', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>{t('home_limite', lang)}</div>
            <div style={{ background: '#4ade8020', color: '#4ade80', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px', fontWeight: 600 }}>{t('home_plus_populaire', lang)}</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Pro</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: '#555', textDecoration: 'line-through' }}>99,99EUR{t('home_mois_suffix', lang)}</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>-19%</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>79,99EUR <span style={{ fontSize: '15px', color: '#555', fontWeight: 400 }}>{t('home_mois_suffix', lang)}</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[t('home_pro_feature1', lang), t('home_pro_feature2', lang), t('home_pro_feature3', lang), t('home_pro_feature4', lang), t('home_pro_feature5', lang)].map(f => (<li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#4ade80' }}>✓</span> {f}</li>))}
            </ul>
            <a href={STRIPE_LINKS.pro} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>{t('home_commencer', lang)}</a>
          </div>
        </div>
      </section>

      <section id="recruteurs" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>{t('home_recruteurs_clubs_badge', lang)}</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.5rem' }}>{t('home_acces_professionnel', lang)}</h2>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '3rem' }}>{t('home_pour_clubs_desc', lang)}</p>
        <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-14px', right: '20px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', zIndex: 1 }}>{t('home_offre_limitee_pct', lang)}</div>
          <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '2.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '40px' }}>🏆</div>
              <div><h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{t('home_acces_recruteur', lang)}</h3><p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>{t('home_abonnement_annuel', lang)}</p></div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px', color: '#555', textDecoration: 'line-through' }}>500EUR{t('home_an_suffix', lang)}</span>
                <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>{t('home_offre_lancement', lang)}</span>
              </div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#4ade80', lineHeight: 1.1 }}>200EUR <span style={{ fontSize: '18px', color: '#555', fontWeight: 400 }}>{t('home_an_suffix', lang)}</span></div>
              <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '4px' }}>{t('home_offre_limitee_places', lang)}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '2rem' }}>
              {[t('home_rec_feature1', lang), t('home_rec_feature2', lang), t('home_rec_feature3', lang), t('home_rec_feature4', lang), t('home_rec_feature5', lang), t('home_rec_feature6', lang), t('home_rec_feature7', lang), t('home_rec_feature8', lang)].map(f => (<div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa' }}><span style={{ color: '#4ade80' }}>✓</span> {f}</div>))}
            </div>
            <button onClick={() => navigate('/register-recruteur')} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>{t('home_commencer_pour', lang)} 200EUR{t('home_an_suffix', lang)}</button>
            <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '10px' }}>{t('home_facturation_annuelle', lang)}</p>
          </div>
        </div>
      </section>

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
