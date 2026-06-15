import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

const STRIPE_LINKS = {
  starter: 'https://buy.stripe.com/test_eVq6oI2occJz0q68ag4ko00',
  pro: 'https://buy.stripe.com/test_3cIeVe4wk7pfdcSaio4ko01',
  recruteur: 'https://buy.stripe.com/test_3cI5kE7IwfVL1uabms4ko02',
}

function Register() {
  const navigate = useNavigate()
  const [plan, setPlan] = useState('pro')
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [poste, setPoste] = useState('Attaquant')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  const handleRegister = async () => {
    setLoading(true)
    setErreur('')

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setErreur(error.message)
      setLoading(false)
      return
    }

         await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        prenom,
        nom,
        poste,
        plan: 'pending',
        analyses_restantes: 0,
        abonnement_actif: false,
      })


    setLoading(false)
    window.location.href = STRIPE_LINKS[plan]
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem'}}>
      <div style={{background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', width:'100%', maxWidth:'480px'}}>

        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>Creer mon compte</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>Commence a progresser aujourd hui</p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.5rem'}}>
          {[
            {id:'starter', nom:'Starter', prix:'49,99€/mois'},
            {id:'pro', nom:'Pro', prix:'79,99€/mois'},
          ].map(p => (
            <div key={p.id} onClick={() => setPlan(p.id)} style={{border: plan === p.id ? '2px solid #4ade80' : '1px solid #333', borderRadius:'10px', padding:'1rem', textAlign:'center', cursor:'pointer', background: plan === p.id ? '#4ade8010' : 'transparent'}}>
              <div style={{fontWeight:'700', fontSize:'15px'}}>{p.nom}</div>
              <div style={{fontSize:'13px', color:'#666', marginTop:'2px'}}>{p.prix}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Prenom</label>
              <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Kevin" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}/>
            </div>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Nom</label>
              <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}/>
            </div>
          </div>
          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}/>
          </div>
          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="minimum 6 caracteres" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}/>
          </div>
          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Poste</label>
            <select value={poste} onChange={e => setPoste(e.target.value)} style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 14px', color:'white', fontSize:'14px', outline:'none'}}>
              <option>Gardien</option>
              <option>Defenseur</option>
              <option>Milieu</option>
              <option>Attaquant</option>
            </select>
          </div>

          {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center'}}>{erreur}</p>}

          <button onClick={handleRegister} disabled={loading} style={{width:'100%', background:'#4ade80', color:'#0a0a0a', border:'none', padding:'12px', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer', marginTop:'0.5rem', opacity: loading ? 0.7 : 1}}>
            {loading ? 'Creation...' : 'Creer mon compte et payer'}
          </button>

          <p style={{fontSize:'12px', color:'#555', textAlign:'center'}}>
            Tu seras redirige vers Stripe pour finaliser le paiement
          </p>
        </div>

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