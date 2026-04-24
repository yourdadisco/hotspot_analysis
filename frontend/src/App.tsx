import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import BusinessConfig from './pages/BusinessConfig'
import ModelConfig from './pages/ModelConfig'
import HotspotDetail from './pages/HotspotDetail'
import Settings from './pages/Settings'
import Favorites from './pages/Favorites'
import ToastContainer from './components/ToastContainer'

// 私有路由组件
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('access_token')
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="business" element={<BusinessConfig />} />
            <Route path="model-config" element={<ModelConfig />} />
            <Route path="hotspots/:id" element={<HotspotDetail />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App