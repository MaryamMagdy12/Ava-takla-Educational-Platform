import { Navigate, Route, Routes } from "react-router-dom";
import { useAdminAuth } from "./context/AdminAuthContext";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import InterfaceGate from "./components/routing/InterfaceGate";
import {
  GaAdminInterface,
  SpecialAdminInterface,
  StudentAdminInterface,
} from "./components/layout/InterfaceShells";
import AdminRootPage from "./pages/AdminRootPage";
import SessionRestoringFallback from "./components/auth/SessionRestoringFallback";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import LevelsPage from "./pages/LevelsPage";
import CreateLevelPage from "./pages/CreateLevelPage";
import TracksPage from "./pages/TracksPage";
import CreateTrackPage from "./pages/CreateTrackPage";
import CoursesPage from "./pages/CoursesPage";
import CreateCoursePage from "./pages/CreateCoursePage";
import StudentsPage from "./pages/StudentsPage";
import AddStudentPage from "./pages/AddStudentPage";
import EditStudentPage from "./pages/EditStudentPage";
import ExamsPage from "./pages/ExamsPage";
import CreateExamPage from "./pages/CreateExamPage";
import QuestionBankPage from "./pages/QuestionBankPage";
import AddQuestionPage from "./pages/AddQuestionPage";
import LibraryPage from "./pages/LibraryPage";
import AddBookPage from "./pages/AddBookPage";
import AddLecturePage from "./pages/AddLecturePage";
import AddAdminPage from "./pages/AddAdminPage";
import AdminsPage from "./pages/AdminsPage";
import GaDashboardPage from "./pages/GaDashboardPage";
import GaFamiliesPage from "./pages/GaFamiliesPage";
import AddGaFamilyPage from "./pages/AddGaFamilyPage";
import GaCompetitionsPage from "./pages/GaCompetitionsPage";
import SpecialDashboardPage from "./pages/SpecialDashboardPage";
import SpecialLearnersPage from "./pages/SpecialLearnersPage";
import GaCompetitionEditorPage from "./pages/GaCompetitionEditorPage";
import GaFamilyExamsPage from "./pages/GaFamilyExamsPage";
import GaFamilyExamEditorPage from "./pages/GaFamilyExamEditorPage";
import GaExamQuestionsDashboardPage from "./pages/GaExamQuestionsDashboardPage";
import LmsExamQuestionsPage from "./pages/LmsExamQuestionsPage";
import GaExamQuestionsAddDashboardPage from "./pages/GaExamQuestionsAddDashboardPage";
import GaExamQuestionsViewDashboardPage from "./pages/GaExamQuestionsViewDashboardPage";
import GaCompetitionQuestionsAddDashboardPage from "./pages/GaCompetitionQuestionsAddDashboardPage";
import GaCompetitionQuestionsViewDashboardPage from "./pages/GaCompetitionQuestionsViewDashboardPage";
import GaCompetitionPartsDashboardPage from "./pages/GaCompetitionPartsDashboardPage";
import GaLibraryPage from "./pages/GaLibraryPage";
import GaAddLecturePage from "./pages/GaAddLecturePage";
import QuestionnairesPage from "./pages/QuestionnairesPage";
import QuestionnaireEditorPage from "./pages/QuestionnaireEditorPage";
import QuestionnaireDetailsPage from "./pages/QuestionnaireDetailsPage";
import AttendanceTakePage from "./pages/AttendanceTakePage";
import AttendanceReportsPage from "./pages/AttendanceReportsPage";

function LoginRoute() {
  const { isAuthenticated, isRestoringSession, login, loginLoading, loginError } = useAdminAuth();
  if (isRestoringSession) {
    return <SessionRestoringFallback />;
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <LoginPage onLogin={login} loading={loginLoading} error={loginError} />;
}

function App() {
  const { isAuthenticated } = useAdminAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AdminRootPage />} />

        <Route element={<InterfaceGate iface="student" />}>
          <Route path="/interface/student" element={<StudentAdminInterface />}>
            <Route index element={<DashboardPage />} />
            <Route path="tracks" element={<TracksPage />} />
            <Route path="tracks/new" element={<CreateTrackPage />} />
            <Route path="tracks/:id/edit" element={<CreateTrackPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/new" element={<CreateCoursePage />} />
            <Route path="courses/:id/edit" element={<CreateCoursePage />} />
            <Route path="levels" element={<LevelsPage />} />
            <Route path="levels/new" element={<CreateLevelPage />} />
            <Route path="levels/:id/edit" element={<CreateLevelPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="students/new" element={<AddStudentPage />} />
            <Route path="students/:id/edit" element={<EditStudentPage />} />
            <Route path="attendance/take" element={<AttendanceTakePage />} />
            <Route path="attendance/reports" element={<AttendanceReportsPage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/new" element={<CreateExamPage />} />
            <Route path="exams/:examId/questions" element={<LmsExamQuestionsPage />} />
            <Route path="exams/:id/edit" element={<CreateExamPage />} />
            <Route path="question-bank" element={<QuestionBankPage />} />
            <Route path="add-question/:id" element={<AddQuestionPage />} />
            <Route path="add-question" element={<AddQuestionPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/books/new" element={<AddBookPage />} />
            <Route path="library/lectures/new" element={<AddLecturePage />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="admins/new" element={<AddAdminPage />} />
            <Route path="admins/:id/edit" element={<AddAdminPage />} />
            <Route path="questionnaires" element={<QuestionnairesPage />} />
            <Route path="questionnaires/new" element={<QuestionnaireEditorPage />} />
            <Route path="questionnaires/:id/edit" element={<QuestionnaireEditorPage />} />
            <Route path="questionnaires/:id/details" element={<QuestionnaireDetailsPage />} />
            <Route path="*" element={<Navigate to="/interface/student" replace />} />
          </Route>
        </Route>

        <Route element={<InterfaceGate iface="general_assembly" />}>
          <Route path="/interface/general-assembly" element={<GaAdminInterface />}>
            <Route index element={<GaDashboardPage />} />
            <Route path="families" element={<GaFamiliesPage />} />
            <Route path="families/new" element={<AddGaFamilyPage />} />
            <Route path="competitions" element={<GaCompetitionsPage />} />
            <Route path="competitions/parts-dashboard" element={<GaCompetitionPartsDashboardPage />} />
            <Route path="competitions/questions-dashboard" element={<Navigate to="/interface/general-assembly/competitions/questions-view-dashboard" replace />} />
            <Route path="competitions/questions-add-dashboard" element={<GaCompetitionQuestionsAddDashboardPage />} />
            <Route path="competitions/questions-view-dashboard" element={<GaCompetitionQuestionsViewDashboardPage />} />
            <Route path="competitions/new" element={<GaCompetitionEditorPage />} />
            <Route path="competitions/:id/edit" element={<GaCompetitionEditorPage />} />
            <Route path="family-exams" element={<GaFamilyExamsPage />} />
            <Route path="family-exams/exam-questions" element={<GaExamQuestionsDashboardPage />} />
            <Route path="family-exams/:examId/questions" element={<GaExamQuestionsDashboardPage />} />
            <Route path="family-exams/dashboard" element={<Navigate to="/interface/general-assembly/family-exams" replace />} />
            <Route path="family-exams/questions-dashboard" element={<Navigate to="/interface/general-assembly/family-exams/questions-view-dashboard" replace />} />
            <Route path="family-exams/questions-add-dashboard" element={<GaExamQuestionsAddDashboardPage />} />
            <Route path="family-exams/questions-view-dashboard" element={<GaExamQuestionsViewDashboardPage />} />
            <Route path="family-exams/new" element={<GaFamilyExamEditorPage />} />
            <Route path="family-exams/:id/edit" element={<GaFamilyExamEditorPage />} />
            <Route path="library" element={<GaLibraryPage />} />
            <Route path="library/lectures/new" element={<GaAddLecturePage />} />
            <Route path="lectures" element={<Navigate to="/interface/general-assembly/library" replace />} />
            <Route path="lectures/manage" element={<Navigate to="/interface/general-assembly/library/lectures/new" replace />} />
            <Route path="questionnaires" element={<QuestionnairesPage />} />
            <Route path="questionnaires/new" element={<QuestionnaireEditorPage />} />
            <Route path="questionnaires/:id/edit" element={<QuestionnaireEditorPage />} />
            <Route path="questionnaires/:id/details" element={<QuestionnaireDetailsPage />} />
            <Route path="*" element={<Navigate to="/interface/general-assembly" replace />} />
          </Route>
        </Route>

        <Route element={<InterfaceGate iface="special" />}>
          <Route path="/interface/special" element={<SpecialAdminInterface />}>
            <Route index element={<SpecialDashboardPage />} />
            <Route path="learners" element={<SpecialLearnersPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/new" element={<CreateCoursePage />} />
            <Route path="courses/:id/edit" element={<CreateCoursePage />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/new" element={<CreateExamPage />} />
            <Route path="exams/:examId/questions" element={<LmsExamQuestionsPage />} />
            <Route path="exams/:id/edit" element={<CreateExamPage />} />
            <Route path="question-bank" element={<QuestionBankPage />} />
            <Route path="add-question/:id" element={<AddQuestionPage />} />
            <Route path="add-question" element={<AddQuestionPage />} />
            <Route path="library" element={<LibraryPage />} />
            <Route path="library/books/new" element={<AddBookPage />} />
            <Route path="library/lectures/new" element={<AddLecturePage />} />
            <Route path="questionnaires" element={<QuestionnairesPage />} />
            <Route path="questionnaires/new" element={<QuestionnaireEditorPage />} />
            <Route path="questionnaires/:id/edit" element={<QuestionnaireEditorPage />} />
            <Route path="questionnaires/:id/details" element={<QuestionnaireDetailsPage />} />
            <Route path="*" element={<Navigate to="/interface/special" replace />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
