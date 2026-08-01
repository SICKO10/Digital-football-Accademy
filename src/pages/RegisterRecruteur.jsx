import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../supabase'
import { useLang } from '../hooks/useLang'
import { t } from '../lib/translations'
import { STRIPE_LINKS_EDU, STRIPE_LINKS_RECRUTEUR, stripeUrl } from '../lib/stripeLinks'

function RegisterRecruteur() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [club, setClub] = useState('')
  // 'scout' est la valeur stockée dans profiles.plan (la CHECK constraint
  // côté base rejette 'recruteur' — vérifié directement contre la base).
  const [typeCompte, setTypeCompte] = useState('scout')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')
  const [cguAcceptees, setCguAcceptees] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setErreur('')

    if (!prenom || !nom || !club || !email || !password) {
      setErreur(t('register_veuillez_remplir', lang))
      setLoading(false)
      return
    }

    // Passé en metadata pour que le trigger on_auth_user_created (voir
    // supabase_profil_auto_creation.sql) puisse créer la ligne profiles
    // même si signUp() ne renvoie pas de session active (confirmation email
    // requise) — l'upsert ci-dessous ne s'exécuterait pas dans ce cas.
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { prenom, nom, plan: typeCompte, club } },
    })

    if (error) {
      setErreur(error.message)
      setLoading(false)
      return
    }

    const { error: profilErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email,
      prenom,
      nom,
      poste: typeCompte,
      plan: typeCompte, // 'scout' | 'club' | 'educateur'
      analyses_restantes: 0,
      abonnement_actif: false,
      club,
    })
    if (profilErr) console.error('Erreur création profil (le trigger auto devrait prendre le relais):', profilErr)

    setLoading(false)

    const lien = typeCompte === 'educateur' ? STRIPE_LINKS_EDU.edu_mensuel : STRIPE_LINKS_RECRUTEUR.mensuel
    window.open(stripeUrl(lien, data.user.id, email), '_blank')
    navigate('/login')
  }

  return (
    <div style={{minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'sans-serif', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'#111', border:'1px solid #222', borderRadius:'16px', padding:'2.5rem', width:'100%', maxWidth:'480px'}}>

        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <div style={{fontSize:'20px', fontWeight:'700', marginBottom:'8px'}}>
            Digital<span style={{color:'#4ade80'}}>Football</span>
          </div>
          <h1 style={{fontSize:'24px', fontWeight:'700'}}>{t('register_espace_recruteur', lang)}</h1>
          <p style={{color:'#666', fontSize:'14px', marginTop:'4px'}}>{t('register_acces_base_joueurs', lang)}</p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.75rem', marginBottom:'1.5rem'}}>
          {[
            {id:'scout', label:`🔍 ${t('register_scout_agent', lang)}`, desc:t('register_recherche_joueurs', lang)},
            {id:'club',      label:`🏟️ ${t('profil_club_label', lang)}`, desc:t('register_gestion_club', lang)},
            {id:'educateur', label:`🎓 ${t('register_educateur_type', lang)}`, desc:t('register_suivi_effectif', lang)},
          ].map(typeItem => (
            <div key={typeItem.id}
              onClick={() => typeItem.id === 'club' ? navigate('/offres') : setTypeCompte(typeItem.id)}
              style={{border: typeCompte === typeItem.id ? '2px solid #4ade80' : '1px solid #333', borderRadius:'10px', padding:'0.75rem', cursor:'pointer', background: typeCompte === typeItem.id ? '#4ade8010' : 'transparent', textAlign:'center'}}>
              <div style={{fontWeight:'700', fontSize:'13px'}}>{typeItem.label}</div>
              <div style={{color:'#666', fontSize:'11px', marginTop:'4px'}}>{typeItem.desc}</div>
            </div>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem'}}>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('equipe_prenom', lang)}</label>
              <input
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Jean"
                style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
              />
            </div>
            <div>
              <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('equipe_nom', lang)}</label>
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
              {typeCompte === 'club' ? t('register_nom_du_club', lang) : typeCompte === 'educateur' ? t('register_nom_club_structure', lang) : t('register_nom_agence', lang)}
            </label>
            <input
              value={club}
              onChange={(e) => setClub(e.target.value)}
              placeholder={typeCompte === 'club' ? 'Ex: AS Monaco' : typeCompte === 'educateur' ? 'Ex: AS Bondy' : 'Ex: Sport Management'}
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('register_email_professionnel', lang)}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@monclub.com"
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>

          <div>
            <label style={{fontSize:'13px', color:'#aaa', display:'block', marginBottom:'6px'}}>{t('auth_mot_de_passe', lang)}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('register_min_6_caracteres', lang)}
              style={{width:'100%', background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'10px 12px', color:'white', fontSize:'14px', boxSizing:'border-box'}}
            />
          </div>
        </div>

        {erreur && <p style={{color:'#ff4444', fontSize:'13px', textAlign:'center', marginTop:'1rem'}}>{erreur}</p>}

        <div style={{background:'#1a1a1a', border:'1px solid #333', borderRadius:'8px', padding:'1rem', marginTop:'1.5rem', marginBottom:'1rem'}}>
          <p style={{fontSize:'13px', color:'#aaa', margin:0}}>✅ {t('register_acces_illimite', lang)}</p>
          <p style={{fontSize:'13px', color:'#aaa', margin:'6px 0 0 0'}}>✅ {t('register_filtres_age', lang)}</p>
          <p style={{fontSize:'13px', color:'#aaa', margin:'6px 0 0 0'}}>✅ {t('register_messagerie_joueurs', lang)}</p>
          <p style={{fontSize:'13px', color:'#aaa', margin:'6px 0 0 0'}}>✅ {t('register_acces_feed', lang)}</p>
        </div>

        <label style={{display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'1rem', cursor:'pointer'}}>
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
          style={{width:'100%', background: (!cguAcceptees || loading) ? '#333' : '#4ade80', color: (!cguAcceptees || loading) ? '#666' : '#0a0a0a', border:'none', padding:'13px', borderRadius:'8px', fontSize:'15px', fontWeight:'700', cursor: (!cguAcceptees || loading) ? 'not-allowed' : 'pointer'}}
        >
          {loading ? t('register_creation_cours', lang) : t('register_creer_compte_payer', lang)}
        </button>

        <p style={{fontSize:'12px', color:'#555', textAlign:'center', marginTop:'1rem'}}>
          {t('register_redirige_stripe_annuel', lang)}
        </p>

        <p style={{textAlign:'center', fontSize:'13px', color:'#666', marginTop:'1rem'}}>
          <span onClick={() => navigate('/login')} style={{color:'#4ade80', cursor:'pointer'}}>
            {t('register_deja_compte_connecter', lang)}
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

export default RegisterRecruteur
