import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Spinner } from './components/ui/Primitives'
import { useAuth } from './store/auth'
import Login from './pages/Login'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Shipments = lazy(() => import('./pages/Shipments'))
const ShipmentDetail = lazy(() => import('./pages/ShipmentDetail'))
const Alerts = lazy(() => import('./pages/Alerts'))
const Analytics = lazy(() => import('./pages/Analytics'))
const UploadPage = lazy(() => import('./pages/UploadPage'))
const Products = lazy(() => import('./pages/Products'))
const Facilities = lazy(() => import('./pages/Facilities'))

function Protected({ children }) {
  const { token, initialized } = useAuth()
  if (!initialized) return <Spinner label="Preparing your workspace…" />
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { bootstrap } = useAuth()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/shipments/:id" element={<ShipmentDetail />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/products" element={<Products />} />
          <Route path="/facilities" element={<Facilities />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
