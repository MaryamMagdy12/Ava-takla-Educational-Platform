import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ForcePasswordRoute, ProtectedRoute } from './components/RouteGuards'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ForcePasswordChangePage from './pages/ForcePasswordChangePage'
import DashboardPage from './pages/DashboardPage'
import ExamsPage from './pages/ExamsPage'
import ExamAttemptPage from './pages/ExamAttemptPage'
import BooksPage from './pages/BooksPage'
import LecturesPage from './pages/LecturesPage'
import QuestionnairesPage from './pages/QuestionnairesPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import { ToastProvider } from './components/ui/ToastProvider'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ForcePasswordChangePage />} />

      <Route
        element={
          <ProtectedRoute>
            <ForcePasswordRoute>
              <Layout />
            </ForcePasswordRoute>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/DashboardPage" element={<DashboardPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/ExamsPage" element={<ExamsPage />} />
        <Route path="/exams/:id" element={<ExamAttemptPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/BooksPage" element={<BooksPage />} />
        <Route path="/lectures" element={<LecturesPage />} />
        <Route path="/LecturesPage" element={<LecturesPage />} />
        <Route path="/questionnaires" element={<QuestionnairesPage />} />
        <Route path="/QuestionnairesPage" element={<QuestionnairesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/ProfilePage" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    document.documentElement.lang = 'ar'
    document.documentElement.dir = 'rtl'
  }, [])

  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  )
}
