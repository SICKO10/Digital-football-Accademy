import { useNavigate } from 'react-router-dom'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
  recruteur: 'https://buy.stripe.com/test_3cI5kE7IwfVL1uabms4ko02',
}

function Home() {
  const navigate = useNavigate()

  const s = {
    page: { minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' },
    nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 },
    section: (bg) => ({ background: bg || '#0a0a0a', padding: '6rem 2rem' }),
    tag: (color) => ({ display: 'inline-block', background: `${color || '#4ade80'}15`, border: `1px solid ${color || '#4ade80'}40`, color: color || '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '1.5rem' }),
    h2: { fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 700, marginBottom: '1rem' },
    sub: { fontSize: '16px', color: '#666', lineHeight: 1.7, marginBottom: '2.5rem' },
    card: (border) => ({ background: '#111', border: `1px solid ${border || '#222'}`, borderRadius: '16px', padding: '1.5rem' }),
    btnGreen: { background: '#4ade80', color: '#000', border: 'none', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' },
    btnOutline: { background: 'transparent', color: '#fff', border: '1px solid #333', padding: '13px 28px', borderRadius: '10px', fontSize: '15px', cursor: 'pointer' },
    check: { color: '#4ade80', marginRight: '10px', flexShrink: 0 },
  }

  return (
    <div style={s.page}>

      {/* ── NAVBAR ── */}
      <nav style={s.nav}>
        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#comment" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Comment ça marche</a>
          <a href="#offres" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Offres</a>
          <span onClick={() => navigate('/reels')} style={{ color: '#666', textDecoration: 'none', fontSize: '14px', cursor: 'pointer' }}>Reels</span>
          <span onClick={() => navigate('/feed')} style={{ color: '#666', textDecoration: 'none', fontSize: '14px', cursor: 'pointer' }}>Feed</span>
          <a href="#recruteurs" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Recruteurs</a>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/login')} style={s.btnOutline}>Connexion</button>
          <button onClick={() => navigate('/register')} style={s.btnGreen}>Commencer →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ ...s.section(), textAlign: 'center', paddingTop: '7rem', paddingBottom: '5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Glow background */}
        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '300px', background: 'radial-gradient(ellipse, #4ade8015 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={s.tag()}>PLATEFORME N°1 D'ANALYSE VIDÉO FOOTBALL</div>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.5rem', letterSpacing: '-2px' }}>
          Progresse.<br />
          <span style={{ color: '#4ade80' }}>Sois vu.</span><br />
          Signe.
        </h1>
        <p style={{ fontSize: '18px', color: '#666', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Envoie ta vidéo de match, reçois une analyse personnalisée par un expert. Expose ton talent aux clubs et agents.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ ...s.btnGreen, padding: '15px 36px', fontSize: '16px' }}>
            Envoyer ma vidéo ⚽
          </button>
          <button onClick={() => navigate('/reels')} style={{ ...s.btnOutline, padding: '15px 36px', fontSize: '16px', borderColor: '#4ade8040', color: '#4ade80' }}>
            🎬 Voir les Reels
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '5rem', paddingTop: '3rem', borderTop: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          {[{ num: '500+', label: 'Joueurs analysés' }, { num: '98%', label: 'Satisfaction' }, { num: '50+', label: 'Clubs partenaires' }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{s.num}</div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── REELS PREVIEW ── */}
      <section style={{ ...s.section('#0f0f0f'), textAlign: 'center' }}>
        <div style={s.tag('#f97316')}>NOUVEAU</div>
        <h2 style={s.h2}>Le TikTok du Football ⚡</h2>
        <p style={{ ...s.sub, maxWidth: '480px', margin: '0 auto 3rem' }}>
          Clips courts, format vertical. Swipe entre les vidéos et découvre les meilleurs talents du moment.
        </p>

        {/* Mockup Reels */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', marginBottom: '2.5rem' }}>
          {[
            { initiales: 'KA', nom: 'Karim A.', poste: 'Attaquant', ville: 'Lyon', scale: '0.85', opacity: '0.5' },
            { initiales: 'LM', nom: 'Lucas M.', poste: 'Milieu', ville: 'Paris', scale: '1', opacity: '1', featured: true },
            { initiales: 'YB', nom: 'Yanis B.', poste: 'Défenseur', ville: 'Marseille', scale: '0.85', opacity: '0.5' },
          ].map((j, i) => (
            <div key={i} onClick={() => navigate('/reels')} style={{ width: j.featured ? '180px' : '140px', height: j.featured ? '320px' : '250px', background: '#1a1a1a', border: j.featured ? '2px solid #4ade80' : '1px solid #222', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px', position: 'relative', overflow: 'hidden', cursor: 'pointer', opacity: j.opacity, transform: `scale(${j.scale})`, transition: 'transform 0.2s' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)', zIndex: 1 }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>▶</div>
              </div>
              {j.featured && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 3, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px' }}>❤️</div>
                    <div style={{ fontSize: '10px', color: '#fff' }}>248</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px' }}>💬</div>
                    <div style={{ fontSize: '10px', color: '#fff' }}>12</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px' }}>⭐</div>
                  </div>
                </div>
              )}
              <div style={{ position: 'relative', zIndex: 3, marginTop: 'auto' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4ade8020', border: '1px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  {j.initiales}
                </div>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#fff' }}>{j.nom}</p>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4ade80' }}>{j.poste} · {j.ville}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => navigate('/reels')}
          style={{ background: '#f97316', color: '#fff', border: 'none', padding: '13px 32px', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
          🎬 Voir les Reels
        </button>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section id="comment" style={{ ...s.section(), textAlign: 'center' }}>
        <div style={s.tag()}>PROCESSUS</div>
        <h2 style={s.h2}>Comment ça marche</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {[
            { num: '1', emoji: '📝', titre: "Tu t'inscris", desc: 'Choisis ton abonnement et crée ton profil joueur en 2 minutes' },
            { num: '2', emoji: '🎬', titre: 'Tu envoies ta vidéo', desc: 'Upload ton match ou colle un lien TikTok / Veo / YouTube' },
            { num: '3', emoji: '🔍', titre: 'On analyse', desc: 'Notre expert décortique ta vidéo avec commentaires vocaux Loom' },
            { num: '4', emoji: '🚀', titre: 'Tu progresses', desc: 'Reçois ton analyse et sois visible des recruteurs partout en France' },
          ].map(step => (
            <div key={step.num} style={{ ...s.card(), textAlign: 'left' }}>
              <div style={{ width: '40px', height: '40px', background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '1rem' }}>
                {step.emoji}
              </div>
              <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, marginBottom: '6px' }}>ÉTAPE {step.num}</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{step.titre}</h3>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── OFFRES JOUEURS ── */}
      <section id="offres" style={{ ...s.section('#0f0f0f'), textAlign: 'center' }}>
        <div style={s.tag()}>TARIFS JOUEURS</div>
        <h2 style={s.h2}>Choisis ton niveau</h2>
        <p style={{ color: '#666', fontSize: '15px', marginBottom: '1.5rem' }}>Analyses personnalisées par un expert avec retour vocal</p>

        {/* Code promo */}
        <div style={{ background: 'linear-gradient(135deg, #4ade8015, #4ade8005)', border: '1px solid #4ade8040', borderRadius: '12px', padding: '1rem 1.5rem', maxWidth: '680px', margin: '0 auto 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left' }}>
            <span style={{ fontSize: '24px' }}>🎯</span>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px' }}>Code promo de lancement</p>
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Utilise le code <strong style={{ color: '#4ade80' }}>GAMETIME</strong> pour les prix de lancement</p>
            </div>
          </div>
          <div style={{ background: '#4ade80', color: '#0a0a0a', fontWeight: 800, fontSize: '18px', padding: '8px 20px', borderRadius: '8px', letterSpacing: '2px' }}>GAMETIME</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '680px', margin: '0 auto' }}>

          {/* STARTER */}
          <div style={{ ...s.card(), textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>LIMITÉ</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Starter</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: '#555', textDecoration: 'line-through' }}>59€/mois</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>-15%</span>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 800, marginBottom: '4px' }}>49,99€ <span style={{ fontSize: '16px', color: '#555', fontWeight: 400 }}>/mois</span></div>
            <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '1.5rem' }}>Avec le code GAMETIME</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['2 analyses vidéo / mois', 'Retour vocal de l\'expert', 'Espace client dédié'].map(f => (
                <li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center' }}>
                  <span style={s.check}>✓</span> {f}
                </li>
              ))}
            </ul>
            <a href={STRIPE_LINKS.starter} target="_blank" rel="noreferrer"
              style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: 'white', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
              Commencer
            </a>
          </div>

          {/* PRO */}
          <div style={{ ...s.card('#4ade80'), textAlign: 'left', position: 'relative', borderWidth: '2px' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '20px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>LIMITÉ</div>
            <div style={{ background: '#4ade8020', color: '#4ade80', fontSize: '11px', padding: '3px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '10px', fontWeight: 600 }}>⭐ Le plus populaire</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Pro</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', color: '#555', textDecoration: 'line-through' }}>99€/mois</span>
              <span style={{ background: '#ef444420', color: '#ef4444', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>-19%</span>
            </div>
            <div style={{ fontSize: '34px', fontWeight: 800, marginBottom: '4px' }}>79,99€ <span style={{ fontSize: '16px', color: '#555', fontWeight: 400 }}>/mois</span></div>
            <p style={{ fontSize: '12px', color: '#4ade80', marginBottom: '1.5rem' }}>Avec le code GAMETIME</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['3 analyses vidéo / mois', 'Compile personnalisée', 'Profil visible recruteurs', 'Réseau clubs & agents', '🎬 Accès Reels & Feed social'].map(f => (
                <li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center' }}>
                  <span style={s.check}>✓</span> {f}
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
      <section id="recruteurs" style={{ ...s.section(), textAlign: 'center' }}>
        <div style={s.tag()}>RECRUTEURS & CLUBS</div>
        <h2 style={s.h2}>Accès Professionnel</h2>
        <p style={{ ...s.sub, maxWidth: '480px', margin: '0 auto 3rem' }}>Pour les clubs, agents et recruteurs qui cherchent des talents</p>
        <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-14px', right: '20px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', zIndex: 1 }}>-60% LIMITÉ</div>
          <div style={{ ...s.card('#4ade80'), borderWidth: '2px', textAlign: 'left', padding: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '40px' }}>🏆</div>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Accès Recruteur</h3>
                <p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>Abonnement annuel — par saison</p>
              </div>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px', color: '#555', textDecoration: 'line-through' }}>500€/an</span>
                <div style={{ background: '#ef444420', color: '#ef4444', fontSize: '12px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>Offre de lancement</div>
              </div>
              <div style={{ fontSize: '48px', fontWeight: 800, color: '#4ade80', lineHeight: 1.1 }}>200€ <span style={{ fontSize: '18px', color: '#555', fontWeight: 400 }}>/an</span></div>
              <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '4px' }}>Offre limitée — places disponibles</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '2rem' }}>
              {['Accès complet base joueurs', 'Moteur de recherche avancé', 'Voir clips & compilations', 'Messagerie directe joueurs', 'Filtres âge / région / niveau', 'Contact coach expert', 'Alertes nouveaux profils', 'Support prioritaire'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#aaa' }}>
                  <span style={s.check}>✓</span> {f}
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/register-recruteur')}
              style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
              Commencer pour 200€/an →
            </button>
            <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '1rem' }}>Facturation annuelle — Accès immédiat</p>
          </div>
        </div>
      </section>

      {/* ── FEED PREVIEW ── */}
      <section style={{ ...s.section('#0f0f0f'), textAlign: 'center' }}>
        <div style={s.tag()}>RÉSEAU SOCIAL</div>
        <h2 style={s.h2}>Le Feed des Talents ⚽</h2>
        <p style={{ ...s.sub, maxWidth: '480px', margin: '0 auto 3rem' }}>
          Expose tes meilleurs clips. Clubs et agents consultent le feed chaque semaine pour dénicher les prochains talents.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {[
            { initiales: 'KA', nom: 'Karim A.', poste: 'Attaquant', ville: 'Lyon', likes: 48, comments: 6 },
            { initiales: 'LM', nom: 'Lucas M.', poste: 'Milieu', ville: 'Paris', likes: 124, comments: 14 },
            { initiales: 'YB', nom: 'Yanis B.', poste: 'Défenseur', ville: 'Marseille', likes: 37, comments: 3 },
          ].map((j, i) => (
            <div key={i} style={{ width: '180px', background: '#111', border: '1px solid #222', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => navigate('/feed')}>
              <div style={{ height: '200px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ffffff15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>▶</div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4ade8015', border: '1px solid #4ade8040', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: '10px', fontWeight: 700 }}>{j.initiales}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>{j.nom}</p>
                    <p style={{ margin: 0, fontSize: '10px', color: '#4ade80' }}>{j.poste}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#555' }}>
                  <span>❤️ {j.likes}</span>
                  <span>💬 {j.comments}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/feed')} style={s.btnGreen}>Voir le Feed complet</button>
          <button onClick={() => navigate('/reels')} style={{ ...s.btnOutline, borderColor: '#f9731640', color: '#f97316' }}>🎬 Voir les Reels</button>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ ...s.section(), textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ ...s.h2, fontSize: 'clamp(28px, 5vw, 48px)' }}>
            Prêt à passer au niveau supérieur ? 🚀
          </h2>
          <p style={{ ...s.sub, maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            Rejoins des centaines de joueurs qui ont déjà fait analyser leurs vidéos et signé dans des clubs.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{ ...s.btnGreen, padding: '15px 36px', fontSize: '16px' }}>
              Créer mon profil gratuitement
            </button>
            <button onClick={() => navigate('/login')} style={{ ...s.btnOutline, padding: '15px 36px', fontSize: '16px' }}>
              J'ai déjà un compte
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '2rem', textAlign: 'center', background: '#0a0a0a' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
          Digital<span style={{ color: '#4ade80' }}>Football</span>
        </div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[['Feed', '/feed'], ['Reels', '/reels'], ['Connexion', '/login'], ['Inscription', '/register']].map(([label, path]) => (
            <span key={label} onClick={() => navigate(path)} style={{ color: '#555', fontSize: '13px', cursor: 'pointer' }}>{label}</span>
          ))}
        </div>
        <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>© 2025 Digital Football — Tous droits réservés</p>
      </footer>
    </div>
  )
}

export default Home
