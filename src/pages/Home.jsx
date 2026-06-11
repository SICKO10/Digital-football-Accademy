import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif'}}>

      {/* NAVBAR */}
      <nav style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'1rem 2rem', borderBottom:'1px solid #222', position:'sticky', top:0, background:'#0a0a0aee', zIndex:100}}>
        <div style={{fontSize:'18px', fontWeight:'600'}}>
          Digital<span style={{color:'#4ade80'}}>Football</span>
        </div>
        <div style={{display:'flex', gap:'2rem'}}>
          <a href="#comment" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Comment ça marche</a>
          <a href="#offres" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Offres</a>
          <a href="#feed" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Feed</a>
        </div>
        <div style={{display:'flex', gap:'1rem'}}>
          <button onClick={() => navigate('/login')} style={{background:'transparent', color:'white', border:'1px solid #444', padding:'8px 20px', borderRadius:'8px', fontSize:'14px', cursor:'pointer'}}>
            Connexion
          </button>
          <button onClick={() => navigate('/register')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'8px 20px', borderRadius:'8px', fontWeight:'600', cursor:'pointer'}}>
            Commencer
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{textAlign:'center', padding:'6rem 2rem 4rem'}}>
        <div style={{display:'inline-block', background:'#1a1a1a', border:'1px solid #333', color:'#4ade80', fontSize:'12px', padding:'4px 14px', borderRadius:'20px', marginBottom:'1.5rem'}}>
          Plateforme n°1 d'analyse vidéo football
        </div>
        <h1 style={{fontSize:'56px', fontWeight:'700', lineHeight:'1.1', marginBottom:'1.5rem'}}>
          Progresse.<br/>
          <span style={{color:'#4ade80'}}>Sois vu.</span><br/>
          Signe.
        </h1>
        <p style={{fontSize:'18px', color:'#888', maxWidth:'480px', margin:'0 auto 2.5rem', lineHeight:'1.7'}}>
          Envoie ta vidéo de match, reçois une analyse personnalisée par un expert. Expose ton talent aux clubs et agents.
        </p>
        <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
          <button onClick={() => navigate('/register')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'14px 32px', borderRadius:'8px', fontSize:'16px', fontWeight:'600', cursor:'pointer'}}>
            Envoyer ma vidéo
          </button>
          <button onClick={() => { document.getElementById('offres').scrollIntoView({behavior:'smooth'}) }} style={{background:'transparent', color:'white', border:'1px solid #444', padding:'14px 32px', borderRadius:'8px', fontSize:'16px', cursor:'pointer'}}>
            Voir les offres
          </button>
        </div>

        {/* STATS */}
        <div style={{display:'flex', justifyContent:'center', gap:'4rem', marginTop:'4rem', paddingTop:'2rem', borderTop:'1px solid #1a1a1a'}}>
          {[{num:'500+', label:'Joueurs analysés'}, {num:'98%', label:'Satisfaction'}, {num:'50+', label:'Clubs partenaires'}].map(s => (
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontSize:'28px', fontWeight:'700', color:'white'}}>{s.num}</div>
              <div style={{fontSize:'13px', color:'#555', marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section id="comment" style={{background:'#0f0f0f', padding:'5rem 2rem', textAlign:'center'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>PROCESSUS</p>
        <h2 style={{fontSize:'36px', fontWeight:'700', marginBottom:'3rem'}}>Comment ça marche</h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'1.5rem', maxWidth:'900px', margin:'0 auto'}}>
          {[
            {num:'1', titre:"Tu t'inscris", desc:'Choisis ton abonnement et crée ton profil joueur'},
            {num:'2', titre:'Tu envoies ta vidéo', desc:'Upload ton match depuis ton espace personnel'},
            {num:'3', titre:'On analyse', desc:'Notre expert décortique ta vidéo avec commentaires vocaux'},
            {num:'4', titre:'Tu progresses', desc:'Reçois ton analyse et sois visible des recruteurs'},
          ].map((step) => (
            <div key={step.num} style={{background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'12px', padding:'1.5rem'}}>
              <div style={{width:'36px', height:'36px', background:'#4ade8020', border:'1px solid #4ade8044', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem', color:'#4ade80', fontWeight:'700'}}>
                {step.num}
              </div>
              <h3 style={{fontSize:'14px', fontWeight:'600', marginBottom:'8px'}}>{step.titre}</h3>
              <p style={{fontSize:'13px', color:'#666', lineHeight:'1.5'}}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OFFRES */}
      <section id="offres" style={{padding:'5rem 2rem', textAlign:'center'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>TARIFS</p>
        <h2 style={{fontSize:'36px', fontWeight:'700', marginBottom:'3rem'}}>Choisis ton niveau</h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'1.5rem', maxWidth:'700px', margin:'0 auto'}}>
          <div style={{background:'#111', border:'1px solid #2a2a2a', borderRadius:'12px', padding:'2rem', textAlign:'left'}}>
            <h3 style={{fontSize:'20px', fontWeight:'700', marginBottom:'4px'}}>Starter</h3>
            <div style={{fontSize:'32px', fontWeight:'700', margin:'0.5rem 0'}}>49,99€ <span style={{fontSize:'16px', color:'#555', fontWeight:'400'}}>/mois</span></div>
            <p style={{fontSize:'13px', color:'#555', marginBottom:'1.5rem'}}>Pour progresser régulièrement</p>
            <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'10px', marginBottom:'2rem'}}>
              {["2 analyses vidéo / mois", "Retour vocal de l'expert", "Espace client dédié"].map(f => (
                <li key={f} style={{fontSize:'14px', color:'#aaa', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{color:'#4ade80'}}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #333', background:'transparent', color:'white', fontSize:'14px', cursor:'pointer'}}>
              Commencer
            </button>
          </div>
          <div style={{background:'#111', border:'2px solid #4ade80', borderRadius:'12px', padding:'2rem', textAlign:'left'}}>
            <div style={{display:'inline-block', background:'#4ade8020', color:'#4ade80', fontSize:'11px', padding:'3px 10px', borderRadius:'20px', marginBottom:'0.75rem'}}>
              Le plus populaire
            </div>
            <h3 style={{fontSize:'20px', fontWeight:'700', marginBottom:'4px'}}>Pro</h3>
            <div style={{fontSize:'32px', fontWeight:'700', margin:'0.5rem 0'}}>79,99€ <span style={{fontSize:'16px', color:'#555', fontWeight:'400'}}>/mois</span></div>
            <p style={{fontSize:'13px', color:'#555', marginBottom:'1.5rem'}}>Pour se faire repérer</p>
            <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'10px', marginBottom:'2rem'}}>
              {["3 analyses vidéo / mois", "Compile personnalisée", "Profil visible recruteurs", "Réseau clubs & agents"].map(f => (
                <li key={f} style={{fontSize:'14px', color:'#aaa', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{color:'#4ade80'}}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'none', background:'#4ade80', color:'#0a0a0a', fontSize:'14px', fontWeight:'600', cursor:'pointer'}}>
              Commencer
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid #1a1a1a', padding:'2rem', textAlign:'center'}}>
        <p style={{color:'#444', fontSize:'13px'}}>© 2024 Digital Football — Tous droits réservés</p>
      </footer>

    </div>
  )
}

export default Home