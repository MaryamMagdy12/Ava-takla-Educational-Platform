import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import GacAuthenticatedLayout from './components/gac-layout/GacAuthenticatedLayout.jsx'
import GacHomePage from './pages/GacHomePage.jsx'
import GacCoursesPage from './pages/GacCoursesPage.jsx'
import GacExamsPage from './pages/GacExamsPage.jsx'
import GacLoginPage from './pages/GacLoginPage.jsx'
import GacChangePasswordPage from './pages/GacChangePasswordPage.jsx'
import GacCompetitionSessionPage from './pages/GacCompetitionSessionPage.jsx'
import GacCompetitionResultPage from './pages/GacCompetitionResultPage.jsx'
import GacFamilyExamsPage from './pages/GacFamilyExamsPage.jsx'
import GacFamilyExamSessionPage from './pages/GacFamilyExamSessionPage.jsx'
import GacFamilyExamResultPage from './pages/GacFamilyExamResultPage.jsx'
import GacQuestionnairesPage from './pages/GacQuestionnairesPage.jsx'
import { ToastProvider } from './components/ui/ToastProvider.jsx'

function RedirectLegacyCompetitionSession() {
  const { competitionId } = useParams()
  return <Navigate to={`/competitions/session/${competitionId}`} replace />
}

function RedirectLegacyCompetitionResult() {
  const { attemptId } = useParams()
  return <Navigate to={`/competitions/result/${attemptId}`} replace />
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<GacLoginPage />} />
        <Route element={<GacAuthenticatedLayout />}>
          <Route path="/change-password" element={<GacChangePasswordPage />} />
          <Route path="/" element={<GacHomePage />} />
          <Route path="/courses" element={<GacCoursesPage />} />
          <Route path="/competitions" element={<GacExamsPage />} />
          <Route path="/competitions/session/:competitionId" element={<GacCompetitionSessionPage />} />
          <Route path="/competitions/result/:attemptId" element={<GacCompetitionResultPage />} />
          <Route path="/exams" element={<GacFamilyExamsPage />} />
          <Route path="/questionnaires" element={<GacQuestionnairesPage />} />
          <Route path="/exams/session/:attemptId" element={<GacFamilyExamSessionPage />} />
          <Route path="/exams/result/:attemptId" element={<GacFamilyExamResultPage />} />
          <Route path="/legacy-exams/session/:competitionId" element={<RedirectLegacyCompetitionSession />} />
          <Route path="/legacy-exams/result/:attemptId" element={<RedirectLegacyCompetitionResult />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ToastProvider>
  )
}
