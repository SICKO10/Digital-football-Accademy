import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'

function Register() {
  const navigate = useNavigate()
  const { lang } = useLang()
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
        setErreur(t('register_err_paiement_creation', lang))
      }
    } catch (err) {
      setErreur(t('register_err_paiement_connexion', lang))
    }
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', width:'100%', maxWidth:'460px'}}>

        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>{t('register_creer_compte', lang)}</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>{t('register_commence_progresser', lang)}</p>
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
            <div style={{fontWeight:'700', fontSize:'15px'}}>{t('register_compte_fan', lang)}</div>
            <div style={{fontSize:'13px', color:'#666', marginTop:'2px'}}>{t('register_fan_desc', lang)}</div>
          </div>
          <div style={{background:'#4ade8020', color:'#4ade80', fontSize:'12px', fontWeight:'700', padding:'4px 10px', borderRadius:'20px'}}>{t('register_gratuit', lang)}</div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('equipe_prenom', lang)}</label>
              <input value={prenom} onChange={(e) => setPrenom(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))} placeholder="Kevin" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
            </div>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('equipe_nom', lang)}</label>
              <input value={nom} onChange={(e) => setNom(e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1))} placeholder="Dupont" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
            </div>
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('aff_email', lang)}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('auth_mot_de_passe', lang)}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('register_min_6_caracteres', lang)} style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}} />
          </div>

          {plan !== 'fan' && (
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('equipe_poste', lang)}</label>
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
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'8px'}}>{t('jp_points_forts', lang)}</label>
              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                {caracteristiquesParPoste[poste].map(c => {
                  const selected = pointsForts.includes(c)
                  const disabled = !selected && pointsForts.length >= 4
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
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'8px'}}>{t('jp_ameliorer', lang)}</label>
              <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                {caracteristiquesParPoste[poste].map(c => {
                  const selected = aAmeliorer.includes(c)
                  const disabled = !selected && aAmeliorer.length >= 4
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
            {t('register_jai_lu_accepte', lang)}{' '}
            <span
              onClick={(e) => { e.preventDefault(); window.open('/cgu', '_blank') }}
              style={{color:'#4ade80', cursor:'pointer', textDecoration:'underline'}}
            >
              {t('register_cgu_reglement', lang)}
            </span>
            {t('register_pas_remboursement', lang)}
          </span>
        </label>

        <button
          onClick={handleRegister}
          disabled={loading || !cguAcceptees}
          style={{width:'100%', background: (!cguAcceptees || loading) ? '#333' : '#4ade80', color: (!cguAcceptees || loading) ? '#666' : '#0a0a0a', border:'none', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor: (!cguAcceptees || loading) ? 'not-allowed' : 'pointer', marginTop:'1rem'}}
        >
          {loading ? t('register_creation_cours', lang) : plan === 'fan' ? t('register_creer_compte_gratuit', lang) : t('register_creer_compte_payer', lang)}
        </button>

        {plan !== 'fan' && (
          <p style={{fontSize:'12px', color:'#555', textAlign:'center', marginTop:'1rem'}}>
            {t('register_redirige_stripe', lang)}
          </p>
        )}

        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'1.5rem'}}>
          {t('register_deja_compte', lang)}{' '}
          <span onClick={() => navigate('/login')} style={{color:'#4ade80', cursor:'pointer'}}>
            {t('auth_se_connecter', lang)}
          </span>
        </p>
        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'0.5rem'}}>
          <span onClick={() => navigate('/')} style={{color:'#555', cursor:'pointer'}}>
            {t('auth_retour_accueil', lang)}
          </span>
        </p>

      </div>
    </div>
  )
}

export default Register
