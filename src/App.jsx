import { Routes, Route } from 'react-router-dom'
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

function App() {
  return (
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
    </Routes>
  )
}

export default App