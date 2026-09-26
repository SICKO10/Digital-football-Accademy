import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase } from './supabase'
import { COACH_ADMIN_EMAILS } from './lib/coachAdmin'
import InstallAppBanner from './components/InstallAppBanner'
import { ThemeProvider } from './lib/ThemeProvider'

// Chargement à la demande de chaque page — sans ça, Vite regroupait tout
// (dont les 3 dashboards, plusieurs milliers de lignes chacun) dans un seul
// bundle de ~3.7 Mo téléchargé même pour afficher juste la page d'accueil ou
// l'écran de connexion. Home reste en import statique : c'est la toute
// première page vue par un visiteur non connecté, pas la peine de lui
// imposer même le petit coût d'un aller-retour réseau supplémentaire.
import Home from './pages/Home'
const Offres = lazy(() => import('./pages/Offres'))
const RegisterChoix = lazy(() => import('./pages/RegisterChoix'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const RegisterRecruteur = lazy(() => import('./pages/RegisterRecruteur'))
const DashboardJoueur = lazy(() => import('./pages/DashboardJoueur'))
const DashboardCoach = lazy(() => import('./pages/DashboardCoach'))
const DashboardScoutClub = lazy(() => import('./pages/DashboardScoutClub'))
const DashboardClub = lazy(() => import('./pages/DashboardClub'))
const DashboardRecruteur = lazy(() => import('./pages/DashboardRecruteur'))
const DashboardEducateur = lazy(() => import('./pages/DashboardEducateur'))
const DashboardDirigeant = lazy(() => import('./pages/DashboardDirigeant'))
const DashboardParent = lazy(() => import('./pages/DashboardParent'))
const Upload = lazy(() => import('./pages/Upload'))
const Feed = lazy(() => import('./pages/Feed'))
const UploadClip = lazy(() => import('./pages/UploadClip'))
const Jogabonito = lazy(() => import('./pages/Jogabonito'))
const UploadReel = lazy(() => import('./pages/UploadReel'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'))
const CGU = lazy(() => import('./pages/CGU'))
const CommentFinancer = lazy(() => import('./pages/CommentFinancer'))
const PolitiqueConfidentialite = lazy(() => import('./pages/PolitiqueConfidentialite'))
const ClubPublic = lazy(() => import('./pages/ClubPublic'))
const PartenairePublic = lazy(() => import('./pages/PartenairePublic'))
const TactipadPublic = lazy(() => import('./pages/TactipadPublic'))
const TournoiPublic = lazy(() => import('./pages/TournoiPublic'))
const TournoiInscription = lazy(() => import('./pages/TournoiInscription'))
const TournoiVote = lazy(() => import('./pages/TournoiVote'))
const LierTournoi = lazy(() => import('./pages/LierTournoi'))

function ChargementPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ width: '32px', height: '32px', border: '3px solid #1a1a1a', borderTopColor: '#4ade80', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}

function SmartDashboard() {
  const [dest, setDest] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDest('/login'); return }
      // Comptes coach analyseur reconnus par email — la contrainte CHECK de
      // profiles.plan n'autorise pas la valeur 'coach', cf. lib/coachAdmin.js.
      if (COACH_ADMIN_EMAILS.includes(user.email)) { setDest('/coach'); return }
      Promise.all([
        supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
        supabase.from('staff_club').select('club_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('dirigeant_acces').select('id').eq('dirigeant_id', user.id).eq('statut', 'accepte').maybeSingle(),
        supabase.from('parents_acces').select('id').eq('parent_id', user.id).eq('statut', 'accepte').maybeSingle(),
        supabase.from('club_educateurs').select('id').eq('educateur_id', user.id).eq('statut', 'accepte').maybeSingle(),
      ]).then(([{ data: profil }, { data: staff }, { data: dirigeant }, { data: parentAcces }, { data: educateurClub }]) => {
        // Membre du staff d'un club (rôle géré et détecté par DashboardClub lui-même)
        if (staff) { setDest('/club'); return }
        // Dirigeant délégué par un éducateur (plan reste 'fan', accès géré par dirigeant_acces)
        if (dirigeant) { setDest('/dashboard-dirigeant'); return }
        // Parent d'un joueur (plan reste 'fan' aussi, accès géré par parents_acces)
        if (parentAcces) { setDest('/dashboard-parent'); return }
        // Éducateur affilié à un club (club_educateurs) — vérifié en plus de
        // profiles.plan : un compte qui existait déjà avant d'accepter
        // l'invitation (ex. joueur) peut avoir un plan resté désynchronisé,
        // cf. bug maxime.bertrand96@outlook.fr (sept. 2026).
        if (educateurClub) { setDest('/educateur'); return }
        const plan = profil?.plan
        if (plan === 'educateur') setDest('/educateur')
        else if (plan === 'scout') setDest('/recruteur')
        else if (plan === 'club') setDest('/club')
        else if (plan === 'coach') setDest('/coach')
        else setDest('/dashboard-joueur')
      })
    })
  }, [])
  if (!dest) return null
  return <Navigate to={dest} replace />
}

function App() {
  return (
    <ThemeProvider>
    <Router>
      <Suspense fallback={<ChargementPage />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/offres" element={<Offres />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-choix" element={<RegisterChoix />} />
        <Route path="/register-recruteur" element={<RegisterRecruteur />} />
        <Route path="/dashboard" element={<SmartDashboard />} />
        <Route path="/dashboard-joueur" element={<DashboardJoueur />} />
        <Route path="/coach" element={<DashboardCoach />} />
        <Route path="/scout-club" element={<DashboardScoutClub />} />
        <Route path="/club" element={<DashboardClub />} />
        <Route path="/recruteur" element={<DashboardRecruteur />} />
        <Route path="/educateur" element={<DashboardEducateur />} />
        <Route path="/dashboard-dirigeant" element={<DashboardDirigeant />} />
        <Route path="/dashboard-parent" element={<DashboardParent />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/upload-clip" element={<UploadClip />} />
        <Route path="/jogabonito" element={<Jogabonito />} />
        <Route path="/upload-reel" element={<UploadReel />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/cgu" element={<CGU />} />
        <Route path="/comment-financer" element={<CommentFinancer />} />
        <Route path="/confidentialite" element={<PolitiqueConfidentialite />} />
        <Route path="/clubs/:id" element={<ClubPublic />} />
        <Route path="/partenaire/:token" element={<PartenairePublic />} />
        <Route path="/tactipad/:slug" element={<TactipadPublic />} />
        <Route path="/tournoi/:code" element={<TournoiPublic />} />
        <Route path="/tournoi/:code/inscription" element={<TournoiInscription />} />
        <Route path="/tournoi/:code/voter/:inscriptionCode" element={<TournoiVote />} />
        <Route path="/lier-tournoi/:code/:prenom/:nom" element={<LierTournoi />} />
      </Routes>
      </Suspense>
      <InstallAppBanner />
    </Router>
    </ThemeProvider>
  )
}

export default App
