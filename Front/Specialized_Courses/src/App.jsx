import { Navigate, Route, Routes } from 'react-router-dom'
import ScAuthenticatedLayout from './components/sc-layout/ScAuthenticatedLayout.jsx'
import ScHomePage from './pages/ScHomePage.jsx'
import ScProgramsPage from './pages/ScProgramsPage.jsx'
import ScCourseDetailPage from './pages/ScCourseDetailPage.jsx'
import ScLoginPage from './pages/ScLoginPage.jsx'
import ScRegisterPage from './pages/ScRegisterPage.jsx'
import ScVerifyEmailPage from './pages/ScVerifyEmailPage.jsx'
import ScPendingActivationPage from './pages/ScPendingActivationPage.jsx'
import ScVerifyLoginOtpPage from './pages/ScVerifyLoginOtpPage.jsx'
import ScChangePasswordPage from './pages/ScChangePasswordPage.jsx'
import ScExamsPage from './pages/ScExamsPage.jsx'
import ScExamAttemptPage from './pages/ScExamAttemptPage.jsx'
import ScQuestionnairesPage from './pages/ScQuestionnairesPage.jsx'
import ScProfilePage from './pages/ScProfilePage.jsx'
import { ToastProvider } from './components/ui/ToastProvider.jsx'

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<ScLoginPage />} />
        <Route path="/register" element={<ScRegisterPage />} />
        <Route path="/verify-email" element={<ScVerifyEmailPage />} />
        <Route path="/account-pending" element={<ScPendingActivationPage />} />
        <Route path="/verify-login" element={<ScVerifyLoginOtpPage />} />
        <Route element={<ScAuthenticatedLayout />}>
          <Route path="/change-password" element={<ScChangePasswordPage />} />
          <Route path="/" element={<ScHomePage />} />
          <Route path="/exams" element={<ScExamsPage />} />
          <Route path="/exams/:id" element={<ScExamAttemptPage />} />
          <Route path="/courses" element={<ScProgramsPage />} />
          <Route path="/courses/:slug" element={<ScCourseDetailPage />} />
          <Route path="/questionnaires" element={<ScQuestionnairesPage />} />
          <Route path="/profile" element={<ScProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
