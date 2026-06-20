import { useNavigate } from 'react-router-dom'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
}

function Home() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <div style={{ fontSize: '18px', fontWeight: 700 }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="#comment" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Comment ca marche</a>
          <a href="#offres" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Offres</a>
          <span onClick={() => navigate('/jogabonito')} style={{ color: '#666', fontSize: '14px', cursor: 'pointer' }}>Jogabonito</span>
          <span onClick={() => navigate('/feed')} style={{ color: '#666', fontSize: '14px', cursor: 'pointer' }}>Feed</span>
          <a href="#recruteurs" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>Recruteurs</a>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}>Connexion</button>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Commencer</button>
        </div>
      </nav>

      <section style={{ padding: '5rem 2rem 3rem', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1.5rem', letterSpacing: '1px', fontWeight: 600 }}>PLATEFORME N1 ANALYSE VIDEO FOOTBALL</div>
        <h1 style={{ fontSize: 'clamp(42px, 7vw, 72px)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.25rem', letterSpacing: '-2px' }}>Progresse.<br /><span style={{ color: '#4ade80' }}>Sois vu.</span><br />Signe.</h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '2.5rem', lineHeight: 1.7 }}>Envoie ta video de match, recois une analyse personnalisee par un expert. Expose ton talent aux clubs et agents.</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Envoyer ma video</button>
          <button onClick={() => navigate('/jogabonito')} style={{ background: 'transparent', color: '#4ade80', border: '1px solid #4ade8040', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>Voir les Jogabonito</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', marginTop: '4rem', paddingTop: '3rem', borderTop: '1px solid #1a1a1a', flexWrap: 'wrap' }}>
          {[{ num: '500+', label: 'Joueurs analyses' }, { num: '98%', label: 'Satisfaction' }, { num: '50+', label: 'Clubs partenaires' }].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 800 }}>{s.num}</div>
              <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: '#0f0f0f', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#f9731615', border: '1px solid #f9731640', color: '#f97316', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>NOUVEAU</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.75rem' }}>Le TikTok du Football</h2>
        <p style={{ fontSize: '16px', color: '#666', maxWidth: '480px', margin: '0 auto 3rem' }}>Clips courts, format vertical. Swipe entre les videos et decouvre les meilleurs talents du moment.</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '2.5rem', alignItems: 'center' }}>
          {[{ nom: 'Karim A.', poste: 'Attaquant', scale: 0.8, opacity: 0.5 }, { nom: 'Lucas M.', poste: 'Milieu', scale: 1, opacity: 1, featured: true }, { nom: 'Yanis B.', poste: 'Defenseur', scale: 0.8, opacity: 0.5 }].map((j, i) => (
            <div key={i} onClick={() => navigate('/jogabonito')} style={{ width: j.featured ? '160px' : '120px', height: j.featured ? '280px' : '210px', background: '#1a1a1a', border: j.featured ? '2px solid #4ade80' : '1px solid #222', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '12px', position: 'relative', overflow: 'hidden', cursor: 'pointer', opacity: j.opacity, transform: `scale(${j.scale})` }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', zIndex: 2 }}>play</div>
              <div style={{ position: 'relative', zIndex: 3 }}><p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>{j.nom}</p><p style={{ margin: '2px 0 0', fontSize: '10px', color: '#4ade80' }}>{j.poste}</p></div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/jogabonito')} style={{ background: '#f97316', color: '#fff', border: 'none', padding: '14px 36px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>Voir les Jogabonito</button>
      </section>

      <section id="comment" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>PROCESSUS</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '3rem' }}>Comment ca marche</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {[{ num: '1', emoji: '📝', titre: "Tu t'inscris", desc: 'Choisis ton abonnement et cree ton profil en 2 minutes' }, { num: '2', emoji: '🎬', titre: 'Tu envoies ta video', desc: 'Upload ton match ou colle un lien TikTok / Veo / YouTube' }, { num: '3', emoji: '🔍', titre: 'On analyse', desc: 'Notre expert decortique ta video avec commentaires vocaux' }, { num: '4', emoji: '🚀', titre: 'Tu progresses', desc: 'Recois ton analyse et sois visible des recruteurs' }].map(step => (
            <div key={step.num} style={{ background: '#111', border: '1px solid #222', borderRadius: '14px', padding: '1.5rem', textAlign: 'left' }}>
              <div style={{ width: '44px', height: '44px', background: '#4ade8015', border: '1px solid #4ade8040', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '1rem' }}>{step.emoji}</div>
              <div style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, marginBottom: '6px' }}>ETAPE {step.num}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px' }}>{step.titre}</h3>
              <p style={{ fontSize: '13px', color: '#666', lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="offres" style={{ background: '#0f0f0f', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>TARIFS JOUEURS</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.5rem' }}>Choisis ton niveau</h2>
        <div style={{ background: '#4ade8010', border: '1px solid #4ade8030', borderRadius: '12px', padding: '1rem 1.5rem', maxWidth: '680px', margin: '0 auto 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div><p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px' }}>Code promo lancement</p><p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Code GAMETIME</p></div>
          <div style={{ background: '#4ade80', color: '#0a0a0a', fontWeight: 800, fontSize: '16px', padding: '8px 20px', borderRadius: '8px' }}>GAMETIME</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '680px', margin: '0 auto' }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '2rem', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>LIMITE</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Starter</h3>
            <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>49,99EUR <span style={{ fontSize: '15px', color: '#555', fontWeight: 400 }}>/mois</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['2 analyses video / mois', 'Retour vocal expert', 'Espace client dedie'].map(f => (<li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#4ade80' }}>OK</span> {f}</li>))}
            </ul>
            <a href={STRIPE_LINKS.starter} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: '1px solid #333', background: 'transparent', color: 'white', fontSize: '14px', fontWeight: 600, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Commencer</a>
          </div>
          <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '2rem', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', left: '16px', background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>LIMITE</div>
            <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Pro</h3>
            <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>79,99EUR <span style={{ fontSize: '15px', color: '#555', fontWeight: 400 }}>/mois</span></div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['3 analyses video / mois', 'Compile personnalisee', 'Profil visible recruteurs', 'Reseau clubs et agents', 'Acces Jogabonito et Feed social'].map(f => (<li key={f} style={{ fontSize: '14px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#4ade80' }}>OK</span> {f}</li>))}
            </ul>
            <a href={STRIPE_LINKS.pro} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', padding: '13px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '14px', fontWeight: 700, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Commencer</a>
          </div>
        </div>
      </section>

      <section id="recruteurs" style={{ padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#4ade8015', border: '1px solid #4ade8040', color: '#4ade80', fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', fontWeight: 600 }}>RECRUTEURS ET CLUBS</div>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '0.5rem' }}>Acces Professionnel</h2>
        <div style={{ maxWidth: '520px', margin: '3rem auto 0', position: 'relative' }}>
          <div style={{ background: '#111', border: '2px solid #4ade80', borderRadius: '16px', padding: '2.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '40px' }}>🏆</div>
              <div><h3 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Acces Recruteur</h3><p style={{ fontSize: '13px', color: '#666', margin: '4px 0 0' }}>Abonnement annuel</p></div>
            </div>
            <div style={{ fontSize: '48px', fontWeight: 800, color: '#4ade80', marginBottom: '1.5rem' }}>200EUR<span style={{ fontSize: '18px', color: '#555', fontWeight: 400 }}>/an</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '2rem' }}>
              {['Base joueurs complete', 'Recherche avancee', 'Clips et compilations', 'Messagerie directe', 'Contact coach', 'Filtres avances', 'Alertes profils', 'Support prioritaire'].map(f => (<div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa' }}><span style={{ color: '#4ade80' }}>OK</span> {f}</div>))}
            </div>
            <button onClick={() => navigate('/register-recruteur')} style={{ width: '100%', padding: '15px', borderRadius: '10px', border: 'none', background: '#4ade80', color: '#0a0a0a', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Commencer pour 200EUR/an</button>
          </div>
        </div>
      </section>

      <section style={{ background: '#0f0f0f', padding: '5rem 2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, marginBottom: '1rem' }}>Pret a passer au niveau superieur ?</h2>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/register')} style={{ background: '#4ade80', color: '#000', border: 'none', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>Creer mon profil</button>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#aaa', border: '1px solid #333', padding: '15px 36px', borderRadius: '12px', fontSize: '16px', cursor: 'pointer' }}>Connexion</button>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Digital<span style={{ color: '#4ade80' }}>Football</span></div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
          {[['Feed', '/feed'], ['Jogabonito', '/jogabonito'], ['Connexion', '/login'], ['Inscription', '/register']].map(([label, path]) => (<span key={label} onClick={() => navigate(path)} style={{ color: '#555', fontSize: '13px', cursor: 'pointer' }}>{label}</span>))}
        </div>
        <p style={{ color: '#333', fontSize: '12px', margin: 0 }}>2025 Digital Football</p>
      </footer>
    </div>
  )
}
export default Home
