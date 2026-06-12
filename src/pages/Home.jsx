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
          <a href="#comment" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Comment ca marche</a>
          <a href="#offres" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Offres</a>
          <a href="#feed" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Feed</a>
          <a href="#recruteurs" style={{color:'#aaa', textDecoration:'none', fontSize:'14px'}}>Recruteurs</a>
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
          Plateforme n1 d analyse video football
        </div>
        <h1 style={{fontSize:'56px', fontWeight:'700', lineHeight:'1.1', marginBottom:'1.5rem'}}>
          Progresse.<br/>
          <span style={{color:'#4ade80'}}>Sois vu.</span><br/>
          Signe.
        </h1>
        <p style={{fontSize:'18px', color:'#888', maxWidth:'480px', margin:'0 auto 2.5rem', lineHeight:'1.7'}}>
          Envoie ta video de match, recois une analyse personnalisee par un expert. Expose ton talent aux clubs et agents.
        </p>
        <div style={{display:'flex', gap:'1rem', justifyContent:'center'}}>
          <button onClick={() => navigate('/register')} style={{background:'#4ade80', color:'#0a0a0a', border:'none', padding:'14px 32px', borderRadius:'8px', fontSize:'16px', fontWeight:'600', cursor:'pointer'}}>
            Envoyer ma video
          </button>
          <button onClick={() => document.getElementById('offres').scrollIntoView({behavior:'smooth'})} style={{background:'transparent', color:'white', border:'1px solid #444', padding:'14px 32px', borderRadius:'8px', fontSize:'16px', cursor:'pointer'}}>
            Voir les offres
          </button>
        </div>
        <div style={{display:'flex', justifyContent:'center', gap:'4rem', marginTop:'4rem', paddingTop:'2rem', borderTop:'1px solid #1a1a1a'}}>
          {[{num:'500+', label:'Joueurs analyses'}, {num:'98%', label:'Satisfaction'}, {num:'50+', label:'Clubs partenaires'}].map(s => (
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontSize:'28px', fontWeight:'700'}}>{s.num}</div>
              <div style={{fontSize:'13px', color:'#555', marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* COMMENT CA MARCHE */}
      <section id="comment" style={{background:'#0f0f0f', padding:'5rem 2rem', textAlign:'center'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>PROCESSUS</p>
        <h2 style={{fontSize:'36px', fontWeight:'700', marginBottom:'3rem'}}>Comment ca marche</h2>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'1.5rem', maxWidth:'900px', margin:'0 auto'}}>
          {[
            {num:'1', titre:"Tu t inscris", desc:'Choisis ton abonnement et cree ton profil joueur'},
            {num:'2', titre:'Tu envoies ta video', desc:'Upload ton match depuis ton espace personnel'},
            {num:'3', titre:'On analyse', desc:'Notre expert decortique ta video avec commentaires vocaux'},
            {num:'4', titre:'Tu progresses', desc:'Recois ton analyse et sois visible des recruteurs'},
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

      {/* OFFRES JOUEURS */}
      <section id="offres" style={{padding:'5rem 2rem', textAlign:'center', background:'#0a0a0a'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>TARIFS JOUEURS</p>
        <h2 style={{fontSize:'36px', fontWeight:'700', marginBottom:'0.5rem'}}>Choisis ton niveau</h2>
        <p style={{color:'#666', fontSize:'14px', marginBottom:'2rem'}}>Analyses personnalisees par un expert avec retour vocal</p>

        {/* CODE PROMO */}
        <div style={{background:'linear-gradient(135deg, #4ade8020, #4ade8005)', border:'1px solid #4ade8044', borderRadius:'12px', padding:'1rem 1.5rem', maxWidth:'700px', margin:'0 auto 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            <span style={{fontSize:'24px'}}>🎯</span>
            <div style={{textAlign:'left'}}>
              <p style={{fontSize:'14px', fontWeight:'700'}}>Code promo de lancement</p>
              <p style={{fontSize:'13px', color:'#aaa'}}>Utilise le code <strong style={{color:'#4ade80'}}>GAME</strong> pour les prix de lancement</p>
            </div>
          </div>
          <div style={{background:'#4ade80', color:'#0a0a0a', fontWeight:'800', fontSize:'18px', padding:'8px 20px', borderRadius:'8px', letterSpacing:'2px'}}>
            GAME
          </div>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'1.5rem', maxWidth:'700px', margin:'0 auto'}}>

          {/* STARTER */}
          <div style={{background:'#111', border:'1px solid #2a2a2a', borderRadius:'12px', padding:'2rem', textAlign:'left', position:'relative'}}>
            <div style={{position:'absolute', top:'-12px', left:'20px', background:'#ef4444', color:'white', fontSize:'11px', fontWeight:'700', padding:'3px 10px', borderRadius:'20px'}}>
              LIMITE
            </div>
            <h3 style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>Starter</h3>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
              <span style={{fontSize:'14px', color:'#555', textDecoration:'line-through'}}>59€/mois</span>
              <span style={{background:'#ef444420', color:'#ef4444', fontSize:'11px', padding:'2px 6px', borderRadius:'10px', fontWeight:'600'}}>-15%</span>
            </div>
            <div style={{fontSize:'32px', fontWeight:'700', margin:'0.25rem 0'}}>49,99€ <span style={{fontSize:'16px', color:'#555', fontWeight:'400'}}>/mois</span></div>
            <p style={{fontSize:'12px', color:'#4ade80', marginBottom:'1rem'}}>Avec le code GAME</p>
            <p style={{fontSize:'13px', color:'#555', marginBottom:'1.5rem'}}>Pour progresser regulierement</p>
            <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'10px', marginBottom:'2rem'}}>
              {["2 analyses video / mois", "Retour vocal de l expert", "Espace client dedie"].map(f => (
                <li key={f} style={{fontSize:'14px', color:'#aaa', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{color:'#4ade80'}}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')} style={{width:'100%', padding:'12px', borderRadius:'8px', border:'1px solid #333', background:'transparent', color:'white', fontSize:'14px', cursor:'pointer'}}>
              Commencer
            </button>
          </div>

          {/* PRO */}
          <div style={{background:'#111', border:'2px solid #4ade80', borderRadius:'12px', padding:'2rem', textAlign:'left', position:'relative'}}>
            <div style={{position:'absolute', top:'-12px', left:'20px', background:'#ef4444', color:'white', fontSize:'11px', fontWeight:'700', padding:'3px 10px', borderRadius:'20px'}}>
              LIMITE
            </div>
            <div style={{display:'inline-block', background:'#4ade8020', color:'#4ade80', fontSize:'11px', padding:'3px 10px', borderRadius:'20px', marginBottom:'0.75rem'}}>
              Le plus populaire
            </div>
            <h3 style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>Pro</h3>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
              <span style={{fontSize:'14px', color:'#555', textDecoration:'line-through'}}>99€/mois</span>
              <span style={{background:'#ef444420', color:'#ef4444', fontSize:'11px', padding:'2px 6px', borderRadius:'10px', fontWeight:'600'}}>-19%</span>
            </div>
            <div style={{fontSize:'32px', fontWeight:'700', margin:'0.25rem 0'}}>79,99€ <span style={{fontSize:'16px', color:'#555', fontWeight:'400'}}>/mois</span></div>
            <p style={{fontSize:'12px', color:'#4ade80', marginBottom:'1rem'}}>Avec le code GAME</p>
            <p style={{fontSize:'13px', color:'#555', marginBottom:'1.5rem'}}>Pour se faire reperer</p>
            <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'10px', marginBottom:'2rem'}}>
              {["3 analyses video / mois", "Compile personnalisee", "Profil visible recruteurs", "Reseau clubs & agents"].map(f => (
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

      {/* OFFRE RECRUTEURS */}
      <section id="recruteurs" style={{padding:'5rem 2rem', textAlign:'center', background:'#0f0f0f'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>RECRUTEURS & CLUBS</p>
        <h2 style={{fontSize:'36px', fontWeight:'700', marginBottom:'0.5rem'}}>Acces Professionnel</h2>
        <p style={{color:'#666', fontSize:'14px', marginBottom:'3rem'}}>Pour les clubs, agents et recruteurs qui cherchent des talents</p>
        <div style={{maxWidth:'500px', margin:'0 auto', position:'relative'}}>
          <div style={{position:'absolute', top:'-16px', right:'20px', background:'#ef4444', color:'white', fontSize:'12px', fontWeight:'700', padding:'4px 12px', borderRadius:'20px', zIndex:1}}>
            -60% LIMITE
          </div>
          <div style={{background:'#111', border:'2px solid #4ade80', borderRadius:'16px', padding:'2.5rem', textAlign:'left'}}>
            <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.5rem'}}>
              <div style={{fontSize:'32px'}}>🏆</div>
              <div>
                <h3 style={{fontSize:'22px', fontWeight:'700'}}>Acces Recruteur</h3>
                <p style={{fontSize:'13px', color:'#666'}}>Abonnement annuel — par saison</p>
              </div>
            </div>
            <div style={{marginBottom:'1.5rem'}}>
              <div style={{display:'flex', alignItems:'center', gap:'1rem', marginBottom:'4px'}}>
                <span style={{fontSize:'18px', color:'#555', textDecoration:'line-through'}}>500€/an</span>
                <div style={{background:'#ef444420', color:'#ef4444', fontSize:'12px', padding:'2px 8px', borderRadius:'20px', fontWeight:'600'}}>Offre de lancement</div>
              </div>
              <div style={{fontSize:'42px', fontWeight:'700', color:'#4ade80'}}>
                200€ <span style={{fontSize:'18px', color:'#555', fontWeight:'400'}}>/an</span>
              </div>
              <p style={{fontSize:'13px', color:'#ef4444', marginTop:'4px'}}>Offre limitee — places disponibles</p>
            </div>
            <ul style={{listStyle:'none', display:'flex', flexDirection:'column', gap:'12px', marginBottom:'2rem'}}>
              {[
                "Acces complet a la base de joueurs",
                "Moteur de recherche par profil & poste",
                "Voir les clips et compilations",
                "Messagerie directe avec les joueurs",
                "Filtres avances (age, region, niveau)",
                "Alertes nouveaux profils",
                "Support prioritaire"
              ].map(f => (
                <li key={f} style={{fontSize:'14px', color:'#aaa', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{color:'#4ade80', fontSize:'16px'}}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => navigate('/register')} style={{width:'100%', padding:'14px', borderRadius:'8px', border:'none', background:'#4ade80', color:'#0a0a0a', fontSize:'15px', fontWeight:'700', cursor:'pointer'}}>
              Commencer pour 200€/an
            </button>
            <p style={{fontSize:'12px', color:'#555', textAlign:'center', marginTop:'1rem'}}>
              Facturation annuelle — Acces immediat
            </p>
          </div>
        </div>
      </section>

      {/* FEED SOCIAL */}
      <section id="feed" style={{background:'#0a0a0a', padding:'5rem 2rem', textAlign:'center'}}>
        <p style={{color:'#4ade80', fontSize:'12px', letterSpacing:'2px', marginBottom:'0.5rem'}}>RESEAU SOCIAL</p>
        <h2 style={{fontSize:'36px', fontWeight:'700', marginBottom:'0.5rem'}}>Le Feed des Talents</h2>
        <p style={{color:'#666', fontSize:'14px', maxWidth:'500px', margin:'0 auto 3rem'}}>
          Expose tes meilleurs clips. Clubs et agents consultent le feed chaque semaine pour denicher les prochains talents.
        </p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px', maxWidth:'500px', margin:'0 auto 2rem'}}>
          {[
            {nom:'Karim A.', poste:'Attaquant', ville:'Lyon'},
            {nom:'Lucas M.', poste:'Milieu', ville:'Paris'},
            {nom:'Yanis B.', poste:'Defenseur', ville:'Marseille'},
          ].map(j => (
            <div key={j.nom} style={{background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'10px', aspectRatio:'9/16', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'10px', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'36px', height:'36px', background:'#ffffff22', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px'}}>▶</div>
              <div style={{fontSize:'11px', fontWeight:'600', color:'white'}}>{j.nom}</div>
              <div style={{fontSize:'10px', color:'#4ade80'}}>{j.poste} · {j.ville}</div>
            </div>
          ))}
        </div>
        <div style={{background:'#111', border:'1px solid #222', borderRadius:'12px', padding:'1.5rem', maxWidth:'400px', margin:'0 auto'}}>
          <p style={{fontSize:'14px', color:'#aaa', marginBottom:'1rem'}}>Le feed arrive bientot</p>
          <p style={{fontSize:'13px', color:'#555'}}>Inscris-toi maintenant pour etre parmi les premiers joueurs visibles</p>
          <button onClick={() => navigate('/register')} style={{marginTop:'1rem', background:'#4ade80', color:'#0a0a0a', border:'none', padding:'10px 24px', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer'}}>
            Rejoindre la liste d attente
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid #1a1a1a', padding:'2rem', textAlign:'center', background:'#0a0a0a'}}>
        <p style={{color:'#444', fontSize:'13px'}}>© 2024 Digital Football — Tous droits reserves</p>
      </footer>

    </div>
  )
}

export default Home