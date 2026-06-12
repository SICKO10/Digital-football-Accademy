import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardJoueur from './pages/DashboardJoueur'
import DashboardCoach from './pages/DashboardCoach'
import Upload from './pages/Upload'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<DashboardJoueur />} />
      <Route path="/coach" element={<DashboardCoach />} />
      <Route path="/upload" element={<Upload />} />
    </Routes>
  )
}

export default Appimport Feed from './pages/Feed'
<Route path="/feed" element={<Feed />} />
import UploadClip from './pages/UploadClip'
<Route path="/upload-clip" element={<UploadClip />} />