import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'

function RegisterRecruteur() {
  const navigate = useNavigate()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [club, setClub] = useState('')
  const [typeCompte, setTypeCompte] = useState('club')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [cguAcceptees, setCguAcceptees] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setErreur('')

    if (!prenom || !nom || !club || !email || !password) {
      setErreur('Veuillez remplir tous les champs')
      setLoading(false)
      return
    }

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
      poste: typeCompte,
      plan: 'pending',
      analyses_restantes: 0,
      abonnement_actif: false,
      club,
    })

    setLoading(false)

    try {
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan: 'recruteur' })
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
      <div style={{background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', width:'100%', maxWidth:'480px'}}>

        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>Espace Recruteur</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>Acces a la base de joueurs et aux profils</p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginBottom:'1.5rem'}}>
          {[
            {id:'club', label:'🏟️ Club'},
            {id:'agent', label:'🤝 Agent'},
          ].map(t => (
            <div key={t.id} onClick={() => setTypeCompte(t.id)} style={{border: typeCompte === t.id ? '2px solid #4ade80' : '1px solid #333', borderRadius:'10px', padding:'1rem', cursor:'pointer', background: typeCompte === t.id ? '#4ade8010' : 'transparent', textAlign:'center'}}>
              <div style={{fontWeight:'700', fontSize:'15px'}}>{t.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Prenom</label>
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Jean"
                style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
              />
            </div>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Nom</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Dupont"
                style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
              />
            </div>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>
              {typeCompte === 'club' ? 'Nom du club' : 'Nom de l agence'}
            </label>
            <input
              value={club}
              onChange={(e) => setClub(e.target.value)}
              placeholder={typeCompte === 'club' ? 'Ex: AS Monaco' : 'Ex: Sport Management'}
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Email professionnel</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@monclub.com"
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimum 6 caracteres"
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>
        </div>

        {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center', marginTop:'1rem'}}>{erreur}</p>}

        <div style={{background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'1rem', marginTop:'1.5rem', marginBottom:'1rem'}}>
          <p style={{fontSize:'13px', color:'#aaa', margin:0}}>✅ Acces illimite aux profils joueurs PRO</p>
          <p style={{fontSize:'13px', color:'#aaa', margin:'6px 0 0 0'}}>✅ Filtres par age, poste, region, caracteristiques</p>
          <p style={{fontSize:'13px', color:'#aaa', margin:'6px 0 0 0'}}>✅ Messagerie avec les joueurs</p>
          <p style={{fontSize:'13px', color:'#aaa', margin:'6px 0 0 0'}}>✅ Acces au feed video des joueurs</p>
        </div>

        <label style={{display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'1rem', cursor:'pointer'}}>
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
          style={{width:'100%', background: (!cguAcceptees || loading) ? '#333' : '#4ade80', color: (!cguAcceptees || loading) ? '#666' : '#0a0a0a', border:'none', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor: (!cguAcceptees || loading) ? 'not-allowed' : 'pointer'}}
        >
          {loading ? 'Creation...' : 'Creer mon compte et payer'}
        </button>

        <p style={{fontSize:'12px', color:'#555', textAlign:'center', marginTop:'1rem'}}>
          Tu seras redirige vers Stripe pour finaliser le paiement annuel
        </p>

        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'1rem'}}>
          <span onClick={() => navigate('/login')} style={{color:'#4ade80', cursor:'pointer'}}>
            Deja un compte ? Se connecter
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

export default RegisterRecruteur
