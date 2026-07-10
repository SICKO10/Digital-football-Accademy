import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

function Register() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState('pro')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [poste, setPoste] = useState('Attaquant')
  const [pointsForts, setPointsForts] = useState([])
  const [aAmeliorer, setAAmeliorer] = useState([])
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [cguAcceptees, setCguAcceptees] = useState(false)

  const caracteristiquesParPoste = {
    Gardien: ['Jeu au pied', 'Sortie aérienne', 'Sur sa ligne', 'Penalties', 'Leadership', '1 contre 1', 'Lecture du jeu'],
    Defenseur: ['Impact physique / Duel', 'Jeu aérien', 'Anticipation / Lecture du jeu', 'Relance longue', 'Relance courte', 'Vitesse', 'Gestion infériorité numérique', 'Leadership', 'Centre', '1 contre 1'],
    Milieu: ['Vision du jeu', 'Pressing', 'Passes longues', 'Box-to-box', 'Dribble', 'Récupération', 'Créativité', 'Endurance', 'Pointe basse', "Déséquilibre l'adversaire", 'Vitesse', 'Impact physique / Duel', 'Technique', 'CPA', 'Corner', 'Frappe de loin', 'Finition', 'Centre'],
    Attaquant: ['Finition', 'Vitesse', 'Dribble', 'Jeu dos au but', 'Jeu aérien', 'Appels de balle', 'Technique', 'Pressing', 'CPA', 'Corner', 'Renard des surfaces', 'Profondeur', 'Duel 1 contre 1', 'Frappe de loin'],
  }

  const toggleCaracteristique = (liste, setListe, valeur) => {
    if (liste.includes(valeur)) {
      setListe(liste.filter(v => v !== valeur))
    } else if (liste.length < 2) {
      setListe([...liste, valeur])
    }
  }

  const handleRegister = async () => {
    setLoading(true)
    setErreur('')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { setErreur(error.message); setLoading(false); return }

    if (plan === 'fan') {
      await supabase.from('profiles').insert({
        id: data.user.id, email, prenom, nom,
        plan: 'fan', analyses_restantes: 0, abonnement_actif: true,
      })
      setLoading(false)
      navigate('/jogabonito')
      return
    }

    await supabase.from('profiles').insert({
      id: data.user.id, email, prenom, nom, poste,
      points_forts: pointsForts.join(', '), a_ameliorer: aAmeliorer.join(', '),
      plan: 'pending', analyses_restantes: 0, abonnement_actif: false,
    })

    setLoading(false)

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      })
      const data2 = await response.json()
      if (data2.url) {
        window.location.href = data2.url
      } else {
        setErreur('Erreur lors de la création du paiement')
      }
    } catch (err) {
      setErreur('Erreur lors de la connexion au service de paiement')
    }
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', width:'100%', maxWidth:'460px'}}>

        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>Creer mon compte</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>Commence a progresser aujourd hui</p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'0.75rem'}}>
          {[
            {id:'starter', nom:'Starter', prix:'49,99€/mois'},
            {id:'pro', nom:'Pro', prix:'79,99€/mois'},
          ].map(p => (
            <div key={p.id} onClick={() => setPlan(p.id)} style={{border: plan === p.id ? '2px solid #4ade80' : '1px solid #333', borderRadius:'10px', padding:'1rem', cursor:'pointer', background: plan === p.id ? '#4ade8010' : 'transparent'}}>
              <div style={{fontWeight:'700', fontSize:'15px'}}>{p.nom}</div>
              <div style={{fontSize:'13px', color:'#666', marginTop:'2px'}}>{p.prix}</div>
            </div>
          ))}
        </div>

        <div onClick={() => setPlan('fan')} style={{border: plan === 'fan' ? '2px solid #4ade80' : '1px solid #333', borderRadius:'10px', padding:'1rem', cursor:'pointer', background: plan === 'fan' ? '#4ade8010' : 'transparent', marginBottom:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:'700', fontSize:'15px'}}>Compte Fan</div>
            <div style={{fontSize:'13px', color:'#666', marginTop:'2px'}}>Like, commente les reels Jogabonito</div>
          </div>
          <div style={{background:'#4ade8020', color:'#4ade80', fontSize:'12px', fontWeight:'700', padding:'4px 10px', borderRadius:'20px'}}>GRATUIT</div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Prenom</label>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Kevin" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
            </div>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Nom</label>
              <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
            </div>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="minimum 6 caracteres" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
          </div>

          {plan !== 'fan' && (
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Poste</label>
              <select value={poste} onChange={(e) => setPoste(e.target.value)} style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}>
                <option>Gardien</option>
                <option>Defenseur</option>
                <option>Milieu</option>
                <option>Attaquant</option>
              </select>
            </div>
          )}

          {plan !== 'fan' && (
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'8px'}}>Mes points forts (max 2)</label>
              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                {caracteristiquesParPoste[poste].map(c => {
                  const selected = pointsForts.includes(c)
                  const disabled = !selected && pointsForts.length >= 2
                  return (
                    <div
                      key={c}
                      onClick={() => !disabled && toggleCaracteristique(pointsForts, setPointsForts, c)}
                      style={{
                        padding:'6px 12px', borderRadius:'20px', fontSize:'13px',
                        background: selected ? '#4ade8020' : '#1a1a1a',
                        border: selected ? '1px solid #4ade80' : '1px solid #333',
                        color: selected ? '#4ade80' : disabled ? '#444' : 'white',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      {c}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {plan !== 'fan' && (
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'8px'}}>Ce que je veux améliorer (max 2)</label>
              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                {caracteristiquesParPoste[poste].map(c => {
                  const selected = aAmeliorer.includes(c)
                  const disabled = !selected && aAmeliorer.length >= 2
                  return (
                    <div
                      key={c}
                      onClick={() => !disabled && toggleCaracteristique(aAmeliorer, setAAmeliorer, c)}
                      style={{
                        padding:'6px 12px', borderRadius:'20px', fontSize:'13px',
                        background: selected ? '#4ade8020' : '#1a1a1a',
                        border: selected ? '1px solid #4ade80' : '1px solid #333',
                        color: selected ? '#4ade80' : disabled ? '#444' : 'white',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      {c}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center', marginTop:'1rem'}}>{erreur}</p>}

        <label style={{display:'flex', alignItems:'flex-start', gap:'10px', marginTop:'1.5rem', cursor:'pointer'}}>
          <input
            type="checkbox"
            checked={cguAcceptees}
            onChange={(e) => setCguAcceptees(e.target.checked)}
            style={{marginTop:'2px', accentColor:'#4ade80', width:'16px', height:'16px', flexShrink:0}}
          />
          <span style={{fontSize:'13px', color:'#aaa', lineHeight:'1.5'}}>
            J'ai lu et j'accepte les{' '}
            <span
              onClick={(e) => { e.preventDefault(); window.open('/cgu', '_blank') }}
              style={{color:'#4ade80', cursor:'pointer', textDecoration:'underline'}}
            >
              CGU et le règlement
            </span>
            , notamment l'absence de remboursement en cas de bannissement.
          </span>
        </label>

        <button
          onClick={handleRegister}
          disabled={loading || !cguAcceptees}
          style={{width:'100%', background: (!cguAcceptees || loading) ? '#333' : '#4ade80', color: (!cguAcceptees || loading) ? '#666' : '#0a0a0a', border:'none', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor: (!cguAcceptees || loading) ? 'not-allowed' : 'pointer', marginTop:'1rem'}}
        >
          {loading ? 'Creation...' : plan === 'fan' ? 'Créer mon compte gratuit' : 'Creer mon compte et payer'}
        </button>

        {plan !== 'fan' && (
          <p style={{fontSize:'12px', color:'#555', textAlign:'center', marginTop:'1rem'}}>
            Tu seras redirige vers Stripe pour finaliser le paiement
          </p>
        )}

        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'1.5rem'}}>
          Deja un compte ?{' '}
          <span onClick={() => navigate('/login')} style={{color:'#4ade80', cursor:'pointer'}}>
            Se connecter
          </span>
        </p>
        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'0.5rem'}}>
          <span onClick={() => navigate('/')} style={{color:'#555', cursor:'pointer'}}>
            Retour accueil
          </span>
        </p>

      </div>
    </div>
  )
}

export default Register
