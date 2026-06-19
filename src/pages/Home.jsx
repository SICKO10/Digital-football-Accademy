import { useNavigate } from 'react-router-dom'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
  recruteur: 'https://buy.stripe.com/test_3cI5kE7IwfVL1uabms4ko02',
}

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAVBAR MOBILE ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
            Connexion
          </button>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Commencer
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '3rem 1.25rem 2.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1.5rem', letterSpacing: '1px', fontWeight: 600 }}>
          PLATEFORME N°1 D'ANALYSE VIDÉO FOOTBALL
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.25rem', letterSpacing: '-2px' }}>
          Progresse.<br />
          <span style={{ color: '#4ade80' }}>Sois vu.</span><br />
          Signe.
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '2rem', lineHeight: 1.7 }}>
          Envoie ta vidéo de match, reçois une analyse personnalisée par un expert. Expose ton talent aux clubs et agents.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            Envoyer ma vidéo ⚽
          </button>
          <button onClick={() => navigate('/reels')} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade8040', padding: '15px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer', width: '100%' }}>
            🎬 Voir les Reels
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #1a1a1a' }}>
          {[{ num: '500+', label: 'Joueurs analysés' }, { num: '98%', label: 'Satisfaction' }, { num: '50+', label: 'Clubs' }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REELS PREVIEW ── */}
      <section style={{ background: '#0f0f0f', padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#f9731615', border: '1px solid #f9731640', color: '#f97316', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>NOUVEAU</div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '0.75rem' }}>Le TikTok du Football ⚡</h2>
        <p style={{ fontSize: '15px', color: '#666', marginBottom: '2rem', lineHeight: 1.6 }}>
          Clips courts, format vertical. Swipe entre les vidéos et découvre les meilleurs talents du moment.
        </p>

        {/* Mockup Reels */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '2rem', alignItems: 'center' }}>
          {[
            { initiales: 'KA', nom: 'Karim A.', poste: 'Attaquant', scale: 0.8, opacity: 0.5 },
            { initiales: 'LM', nom: 'Lucas M.', poste: 'Milieu', scale: 1, opacity: 1, featured: true },
            { initiales: 'YB', nom: 'Yanis B.', poste: 'Défenseur', scale: 0.8, opacity: 0.5 },
          ].map((j, i) => (
            <div key={i} onClick={() => navigate('/reels')}
              style={{ width: j.featured ? '130px' : '95px', height: j.featured ? '230px' : '175px', background: '#1a1a1a', border: j.featured ? '2px solid #4ade80' : '1px solid #222', borderRadius: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px', position: 'relative', overflow: 'hidden', cursor: 'pointer', opacity: j.opacity, transform: `scale(${j.scale})` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', zIndex: 2 }}>▶</div>
              {j.featured && (
                <div style={{ position: 'absolute', top: '10px', right: '8px', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '16px' }}>❤️</div><div style={{ fontSize: '9px', color: '#fff' }}>248</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '16px' }}>💬</div><div style={{ fontSize: '9px', color: '#fff' }}>12</div></div>
                </div>
              )}
              <div style={{ position: 'relative', zIndex: 3 }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700 }}>{j.nom}</p>
                <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#4ade80' }}>{j.poste}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/reels')}
          style={{ background: '#f97316', color: '#fff', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          🎬 Voir les Reels
        </button>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section id="comment" style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>PROCESSUS</div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '2rem' }}>Comment ça marche</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { num: '1', emoji: '📝', titre: "Tu t'inscris", desc: 'Choisis ton abonnement et crée ton profil joueur en 2 minutes' },
            { num: '2', emoji: '🎬', titre: 'Tu envoies ta vidéo', desc: 'Upload ton match ou colle un lien TikTok / Veo / YouTube' },
            { num: '3', emoji: '🔍', titre: 'On analyse', desc: 'Notre expert décortique ta vidéo avec commentaires vocaux Loom' },
            { num: '4', emoji: '🚀', titre: 'Tu progresses', desc: 'Reçois ton analyse et sois visible des recruteurs partout en France' },
          ].map(step => (
            <div key={step.num} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '1.25rem', textAlign: 'left', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ width: '44px', height: '44px', background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {step.emoji}
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, marginBottom: '4px' }}>ÉTAPE {step.num}</div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px', margin: '0 0 4px' }}>{step.titre}</h3>
                <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OFFRES JOUEURS ── */}
      <section id="offres" style={{ background: '#0f0f0f', padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>TARIFS JOUEURS</div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '0.5rem' }}>Choisis ton niveau</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '1.5rem' }}>Analyses personnalisées par un expert avec retour vocal</p>

        {/* Code promo */}
        <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>Code promo de lancement</p>
            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Code <strong style={{ color: '#4ade80' }}>GAMETIME</strong></p>
          </div>
          <div style={{ background: '#4ade80', color: '#0a0a0a', fontWeight: 800, fontSize: '14px', padding: '6px 14px', borderRadius: '8px', letterSpacing: '1px', flexShrink: 0 }}>GAMETIME</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* STARTER */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '1.5rem', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>LIMITÉ</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Starter</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: '#555', textDecoration: 'line-through' }}>59€/mois</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>-15%</span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, marginBottom: '12px' }}>49,99€ <span style={{ fontSize: '15px', color: '#555', fontWeight: 400 }}>/mois</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['2 analyses vidéo / mois', 'Retour vocal de l\'expert', 'Espace client dédié'].map(f => (
                <li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#4ade80' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href={STRIPE_LINKS.starter} target="_blank" rel="noreferrer"
              style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: 'white', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
              Commencer
            </a>
          </div>

          {/* PRO */}
          <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '1.5rem', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>LIMITÉ</div>
            <div style={{ background: '#4ade8020', color: '#4ade80', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px', fontWeight: 600 }}>⭐ Le plus populaire</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Pro</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: '#555', textDecoration: 'line-through' }}>99€/mois</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>-19%</span>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 800, marginBottom: '12px' }}>79,99€ <span style={{ fontSize: '15px', color: '#555', fontWeight: 400 }}>/mois</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['3 analyses vidéo / mois', 'Compile personnalisée', 'Profil visible recruteurs', 'Réseau clubs & agents', '🎬 Accès Reels & Feed social'].map(f => (
                <li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#4ade80' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href={STRIPE_LINKS.pro} target="_blank" rel="noreferrer"
              style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
              Commencer →
            </a>
          </div>
        </div>
      </section>

      {/* ── RECRUTEURS ── */}
      <section id="recruteurs" style={{ padding: '3rem 1.25rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>RECRUTEURS & CLUBS</div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '0.5rem' }}>Accès Professionnel</h2>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '2rem' }}>Pour les clubs, agents et recruteurs</p>

        <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '1.5rem', textAlign: 'left', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', right: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>-60% LIMITÉ</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '36px' }}>🏆</div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Accès Recruteur</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>Abonnement annuel</p>
            </div>
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px', color: '#555', textDecoration: 'line-through' }}>500€/an</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>Offre lancement</span>
            </div>
            <div style={{ fontSize: '42px', fontWeight: 800, color: '#4ade80', lineHeight: 1.1 }}>200€ <span style={{ fontSize: '16px', color: '#555', fontWeight: 400 }}>/an</span></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
            {['Accès complet base joueurs', 'Recherche par profil & poste', 'Voir clips & compilations', 'Messagerie directe joueurs', 'Contact coach expert', 'Filtres avancés'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#aaa' }}>
                <span style={{ color: '#4ade80' }}>✓</span> {f}
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/register-recruteur')}
            style={{ width: '100%', padding: '15px', borderRadius: '12px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
            Commencer pour 200€/an →
          </button>
          <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '10px' }}>Facturation annuelle — Accès immédiat</p>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ background: '#0f0f0f', padding: '3rem 1.25rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '1rem' }}>Prêt à passer au niveau supérieur ? 🚀</h2>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '2rem', lineHeight: 1.6 }}>
          Rejoins des centaines de joueurs qui ont déjà fait analyser leurs vidéos et signé dans des clubs.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => navigate('/register')}
            style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
            Créer mon profil gratuitement
          </button>
          <button onClick={() => navigate('/login')}
            style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '15px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>
            J'ai déjà un compte
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[['Feed', '/feed'], ['Reels', '/reels'], ['Connexion', '/login'], ['Inscription', '/register']].map(([label, path]) => (
            <span key={label} onClick={() => navigate(path)} style={{ color: '#555', fontSize: '13px', cursor: 'pointer' }}>{label}</span>
          ))}
        </div>
        <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>© 2025 Digital Football</p>
      </footer>

      {/* ── CSS RESPONSIVE ── */}
      <style>{`
        @media (min-width: 768px) {
          nav { padding: 1rem 2rem !important; }
          section { padding-left: 2rem !important; padding-right: 2rem !important; }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  )
}

export default Home
