import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import RegisterRecruteur from './pages/RegisterRecruteur'
import DashboardJoueur from './pages/DashboardJoueur'
import DashboardCoach from './pages/DashboardCoach'
import DashboardClub from './pages/DashboardClub'
import Upload from './pages/Upload'
import Feed from './pages/Feed'
import UploadClip from './pages/UploadClip'
import Jogabonito from './pages/Jogabonito'
import UploadReel from './pages/UploadReel'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import CGU from './pages/CGU'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-recruteur" element={<RegisterRecruteur />} />
        <Route path="/dashboard" element={<DashboardJoueur />} />
        <Route path="/coach" element={<DashboardCoach />} />
        <Route path="/club" element={<DashboardClub />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/upload-clip" element={<UploadClip />} />
        <Route path="/jogabonito" element={<Jogabonito />} />
        <Route path="/upload-reel" element={<UploadReel />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/cgu" element={<CGU />} />
      </Routes>
    </Router>
  )
}

export default App
