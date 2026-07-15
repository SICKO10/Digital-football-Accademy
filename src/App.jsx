import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterRecruteur from './pages/RegisterRecruteur'
import DashboardJoueur from './pages/DashboardJoueur'
import DashboardCoach from './pages/DashboardCoach'
import DashboardClub from './pages/DashboardClub'
import DashboardRecruteur from './pages/DashboardRecruteur'
import DashboardEducateur from './pages/DashboardEducateur'
import Upload from './pages/Upload'
import Feed from './pages/Feed'
import UploadClip from './pages/UploadClip'
import Jogabonito from './pages/Jogabonito'
import UploadReel from './pages/UploadReel'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CGU from './pages/CGU'
import ClubPublic from './pages/ClubPublic'

function SmartDashboard() {
  const [dest, setDest] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDest('/login'); return }
      supabase.from('profiles').select('plan').eq('id', user.id).single().then(({ data }) => {
        const plan = data?.plan
        if (plan === 'educateur') setDest('/educateur')
        else if (plan === 'recruteur') setDest('/recruteur')
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
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-recruteur" element={<RegisterRecruteur />} />
        <Route path="/dashboard" element={<SmartDashboard />} />
        <Route path="/dashboard-joueur" element={<DashboardJoueur />} />
        <Route path="/coach" element={<DashboardCoach />} />
        <Route path="/club" element={<DashboardClub />} />
        <Route path="/recruteur" element={<DashboardRecruteur />} />
        <Route path="/educateur" element={<DashboardEducateur />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/upload-clip" element={<UploadClip />} />
        <Route path="/jogabonito" element={<Jogabonito />} />
        <Route path="/upload-reel" element={<UploadReel />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cgu" element={<CGU />} />
        <Route path="/clubs/:id" element={<ClubPublic />} />
      </Routes>
    </Router>
  )
}

export default App
