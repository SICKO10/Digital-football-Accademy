import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, signOutSafe } from '../supabase'
import { colors } from '../tokens'
import DashboardJoueur from './DashboardJoueur'

// Dashboard parent : le vrai DashboardJoueur.jsx, rendu pour le joueur qui a
// invité ce parent (cf. parents_acces), en lecture seule — même principe que
// DashboardDirigeant.jsx qui rend DashboardEducateur.jsx avec un
// educateurIdOverride. Garantit une présentation strictement identique à ce
// que voit le joueur lui-même (stats saisies à la main pour un joueur
// autonome, ou données club pour un joueur affilié — les deux cas sont gérés
// par DashboardJoueur.jsx lui-même, pas de logique à dupliquer ici).
// Sécurité en écriture : DashboardJoueur.jsx neutralise chaque fonction
// d'écriture avec `if (readOnly) return`, ET toutes les requêtes utilisent
// l'id du JOUEUR (joueurIdOverride), pas celui du parent connecté — même si
// un guard était oublié, la RLS (auth.uid() = id du joueur) rejetterait
// l'écriture, le parent n'étant jamais authentifié en tant que son enfant.
export default function DashboardParent() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [acces, setAcces] = useState(null) // { joueur_id }
  const [joueurNom, setJoueurNom] = useState('')
  const [profilParent, setProfilParent] = useState(null)
  const [formParent, setFormParent] = useState({ prenom: '', nom: '', telephone: '', email: '', profession: '' })
  const [savingProfil, setSavingProfil] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: accesData } = await supabase
        .from('parents_acces').select('joueur_id, permissions')
        .eq('parent_id', user.id).eq('statut', 'accepte').maybeSingle()
      if (!accesData) { navigate('/'); return }
      setAcces(accesData)

      const [{ data: pp }, { data: joueurProfil }] = await Promise.all([
        supabase.from('profil_parent').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('prenom, nom').eq('id', accesData.joueur_id).maybeSingle(),
      ])

      setProfilParent(pp)
      setJoueurNom(joueurProfil ? `${joueurProfil.prenom || ''} ${joueurProfil.nom || ''}`.trim() : '')
      setFormParent({
        prenom: pp?.prenom || '', nom: pp?.nom || '', telephone: pp?.telephone || '',
        email: pp?.email || user.email || '', profession: pp?.profession || '',
      })
      setLoading(false)
    }
    init()
  }, [])

  const sauvegarderProfilParent = async () => {
    const { prenom, nom, telephone, email, profession } = formParent
    if (!prenom || !nom || !telephone || !email || !profession) return
    setSavingProfil(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('profil_parent').upsert({
      user_id: user.id, joueur_id: acces.joueur_id,
      prenom, nom, telephone, email, profession,
      profil_complet: true,
    }, { onConflict: 'user_id' })
    setSavingProfil(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setProfilParent(p => ({ ...(p || {}), prenom, nom, telephone, email, profession, profil_complet: true }))
  }

  const handleLogout = async () => { await signOutSafe(); navigate('/login') }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: colors.accent.green, fontFamily: 'Inter, sans-serif' }}>Chargement...</p>
    </div>
  )

  const profilIncomplet = !profilParent?.profil_complet
  const champsRequis = ['prenom', 'nom', 'telephone', 'email', 'profession']
  const formValide = champsRequis.every(c => formParent[c]?.trim())
  const inputStyle = { width: '100%', background: colors.background.raised, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '10px 14px', color: colors.text.primary, fontSize: '14px', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }

  if (profilIncomplet) {
    return (
      <div style={{ minHeight: '100vh', background: colors.background.base, position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '20px', padding: '32px', maxWidth: '460px', width: '100%' }}>
          <h2 style={{ fontWeight: 800, marginBottom: '8px', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}>👋 Bienvenue sur Digital Football</h2>
          <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '24px', fontFamily: 'Inter, sans-serif' }}>
            Avant d'accéder au profil de {joueurNom || 'votre enfant'}, merci de compléter votre profil. Ces informations sont transmises au club.
          </p>
          {[
            { label: 'Prénom', champ: 'prenom', type: 'text' },
            { label: 'Nom', champ: 'nom', type: 'text' },
            { label: 'Téléphone', champ: 'telephone', type: 'tel' },
            { label: 'Email', champ: 'email', type: 'email' },
            { label: 'Profession', champ: 'profession', type: 'text' },
          ].map(({ label, champ, type }) => (
            <div key={champ} style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '6px', fontFamily: 'Inter, sans-serif' }}>{label}</label>
              <input type={type} value={formParent[champ]} onChange={e => setFormParent(prev => ({ ...prev, [champ]: e.target.value }))} style={inputStyle} />
            </div>
          ))}
          <button onClick={sauvegarderProfilParent} disabled={!formValide || savingProfil}
            style={{ width: '100%', background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '10px', padding: '14px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', fontFamily: 'Inter, sans-serif', marginTop: '8px', opacity: formValide ? 1 : 0.4 }}>
            {savingProfil ? 'Enregistrement...' : '✅ Confirmer mon profil'}
          </button>
          <p style={{ color: colors.text.ghost, fontSize: '11px', textAlign: 'center', marginTop: '12px', fontFamily: 'Inter, sans-serif' }}>Tous les champs sont obligatoires</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '8px 14px', color: '#666', fontSize: '11px', textAlign: 'center', fontFamily: 'Inter, sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
        <span>👁️ Vue en lecture seule — Profil de {joueurNom}</span>
        <span onClick={handleLogout} style={{ color: colors.text.faint, cursor: 'pointer', textDecoration: 'underline' }}>Déconnexion</span>
      </div>
      <DashboardJoueur joueurIdOverride={acces.joueur_id} readOnly />
    </div>
  )
}
