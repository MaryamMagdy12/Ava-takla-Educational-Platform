<?php

use App\Http\Controllers\Api\Admin\AdminController;
use App\Http\Controllers\Api\Admin\AdminProfileController;
use App\Http\Controllers\Api\Admin\AttemptController;
use App\Http\Controllers\Api\Admin\BookController as AdminBookController;
use App\Http\Controllers\Api\Admin\CourseController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\ExamController;
use App\Http\Controllers\Api\Admin\GaCompetitionController;
use App\Http\Controllers\Api\Admin\GaCompetitionBankController;
use App\Http\Controllers\Api\Admin\GaFamilyExamController;
use App\Http\Controllers\Api\Admin\GaFamilyController;
use App\Http\Controllers\Api\Admin\GaLectureController;
use App\Http\Controllers\Api\Admin\SpecialLearnerController;
use App\Http\Controllers\Api\Admin\LectureController as AdminLectureController;
use App\Http\Controllers\Api\Admin\LevelAttendanceController;
use App\Http\Controllers\Api\Admin\LevelTrackController;
use App\Http\Controllers\Api\Admin\QuestionController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\Admin\StudentQuestionnaireController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Family\FamilyGaLectureController;
use App\Http\Controllers\Api\Family\FamilyCompetitionController;
use App\Http\Controllers\Api\Family\FamilyExamController;
use App\Http\Controllers\Api\Family\FamilyQuestionnaireController;
use App\Http\Controllers\Api\Special\SpecialQuestionnaireController;
use App\Http\Controllers\Api\Student\BookController as StudentBookController;
use App\Http\Controllers\Api\Student\DashboardController as StudentDashboardController;
use App\Http\Controllers\Api\Student\ExamController as StudentExamController;
use App\Http\Controllers\Api\Student\LectureController as StudentLectureController;
use App\Http\Controllers\Api\Student\ProfileController;
use App\Http\Controllers\Api\Student\StudentQuestionnaireController as StudentStudentQuestionnaireController;
use App\Http\Controllers\Api\Public\GaFamilyCatalogController;
use App\Http\Controllers\Api\Special\SpecialCatalogController;
use App\Http\Controllers\Api\Special\SpecialExamAttemptController;
use App\Http\Controllers\Api\Special\SpecialProfileController;
use Illuminate\Support\Facades\Route;

/** Public catalogs (no auth) — Specialized + GA marketing content */
Route::get('/special/courses', [SpecialCatalogController::class, 'index']);
Route::get('/special/courses/{course}', [SpecialCatalogController::class, 'show'])->whereNumber('course');
Route::get('/ga/catalog/courses', [GaFamilyCatalogController::class, 'courses']);
Route::get('/ga/catalog/published-lectures', [GaFamilyCatalogController::class, 'publishedGaLectures']);
Route::get('/ga/catalog/exam-previews', [GaFamilyCatalogController::class, 'examPreviews']);

/** When APP_DEBUG=true: open GET /api/_dev/php-upload-limits in the browser to see limits for this PHP SAPI (must match upload requests). */
if (config('app.debug')) {
    Route::get('/_dev/php-upload-limits', function () {
        return response()->json([
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size'),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'sapi' => PHP_SAPI,
        ]);
    });
}

Route::prefix('auth')->middleware('throttle:auth-login')->group(function () {
    Route::post('/admin/login', [AuthController::class, 'adminLogin']);
    Route::post('/student/login', [AuthController::class, 'studentLogin']);
    Route::post('/family/login', [AuthController::class, 'familyLogin']);
    Route::post('/special/register', [AuthController::class, 'specialRegister']);
    Route::post('/special/register/google', [AuthController::class, 'specialRegisterWithGoogle']);
    Route::post('/special/login', [AuthController::class, 'specialLogin']);
    Route::post('/special/login/google', [AuthController::class, 'specialLoginWithGoogle']);
});

Route::prefix('special')->middleware('throttle:special-email-verify')->group(function () {
    Route::post('/verify-email', [AuthController::class, 'specialVerifyEmail']);
    Route::post('/resend-verification', [AuthController::class, 'specialResendVerification']);
    Route::post('/verify-login', [AuthController::class, 'specialVerifyLogin']);
    Route::post('/resend-login-otp', [AuthController::class, 'specialResendLoginOtp']);
});

Route::prefix('auth')->middleware('throttle:student-otp')->group(function () {
    Route::post('/student/password-reset/request', [AuthController::class, 'studentPasswordResetRequest']);
});

Route::post('/auth/student/password-reset/verify', [AuthController::class, 'studentPasswordResetVerify'])
    ->middleware('throttle:student-otp-verify');

Route::middleware(['auth:sanctum', 'active_api_user', 'check.user.activity', 'throttle:api-authenticated'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/student/change-password', [AuthController::class, 'studentChangePassword'])->middleware('role:student');
    Route::post('/family/change-password', [AuthController::class, 'familyChangePassword'])->middleware('role:ga_family');
    Route::post('/special/change-password', [AuthController::class, 'specialChangePassword'])->middleware('role:special_learner');

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/profile', [AdminProfileController::class, 'show']);
        Route::patch('/profile', [AdminProfileController::class, 'update']);
        Route::get('/dashboard/interfaces', [AdminDashboardController::class, 'interfaces']);

        Route::middleware('super.admin')->group(function () {
            Route::apiResource('admins', AdminController::class)->only(['index', 'store', 'update', 'destroy']);
        });

        Route::middleware('admin.interface:student')->group(function () {
            Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
            Route::get('/dashboard/student', [AdminDashboardController::class, 'studentDashboard']);

            Route::get('/students', [StudentController::class, 'index']);
            Route::post('/students', [StudentController::class, 'store']);
            Route::post('/students/import', [StudentController::class, 'import']);
            Route::post('/students/import-with-defaults', [StudentController::class, 'importWithDefaults']);
            Route::get('/students/credential-exports/{token}', [StudentController::class, 'downloadCredentialsExport']);
            Route::get('/students/{student}', [StudentController::class, 'show']);
            Route::put('/students/{student}', [StudentController::class, 'update']);
            Route::patch('/students/{student}/toggle-status', [StudentController::class, 'toggleStatus']);
            Route::post('/students/{student}/reset-password', [StudentController::class, 'resetPassword']);
            Route::delete('/students/{student}', [StudentController::class, 'destroy']);

            Route::middleware('lms.scope:student')->group(function () {
                Route::get('/tracks', [LevelTrackController::class, 'tracks']);
                Route::post('/tracks', [LevelTrackController::class, 'storeTrack']);
                Route::put('/tracks/{track}', [LevelTrackController::class, 'updateTrack']);
                Route::delete('/tracks/{track}', [LevelTrackController::class, 'destroyTrack']);
                Route::get('/levels', [LevelTrackController::class, 'levels']);
                Route::post('/levels', [LevelTrackController::class, 'storeLevel']);
                Route::put('/levels/{level}', [LevelTrackController::class, 'updateLevel']);
                Route::delete('/levels/{level}', [LevelTrackController::class, 'destroyLevel']);

                Route::prefix('attendance')->group(function () {
                    Route::get('/levels/{level}/board', [LevelAttendanceController::class, 'board']);
                    Route::post('/sessions/bulk', [LevelAttendanceController::class, 'storeSessionsBulk']);
                    Route::post('/sessions', [LevelAttendanceController::class, 'storeSession']);
                    Route::get('/sessions', [LevelAttendanceController::class, 'indexSessions']);
                    Route::get('/sessions/{level_attendance_session}', [LevelAttendanceController::class, 'showSession']);
                    Route::get('/points', [LevelAttendanceController::class, 'points']);
                });

                Route::apiResource('courses', CourseController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::apiResource('books', AdminBookController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::post('/books/{book}/assign', [AdminBookController::class, 'assignToStudent']);
                Route::post('/books/{book}/unassign', [AdminBookController::class, 'unassignFromStudent']);
                Route::get('/lectures/{lecture}/preview', [AdminLectureController::class, 'preview']);
                Route::apiResource('lectures', AdminLectureController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::post('/lectures/{lecture}/assign', [AdminLectureController::class, 'assignToStudent']);
                Route::post('/lectures/{lecture}/unassign', [AdminLectureController::class, 'unassignFromStudent']);

                Route::get('/questions', [QuestionController::class, 'index']);
                Route::post('/questions', [QuestionController::class, 'store']);
                Route::post('/questions/import', [QuestionController::class, 'import']);
                Route::post('/questions/import-for-course-track', [QuestionController::class, 'importForCourseTrack']);
                Route::get('/questions/{question}', [QuestionController::class, 'show']);
                Route::put('/questions/{question}', [QuestionController::class, 'update']);
                Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);
                Route::post('/questions/{question}/options', [QuestionController::class, 'storeOption']);
                Route::put('/questions/{question}/options/{option}', [QuestionController::class, 'updateOption']);
                Route::delete('/questions/{question}/options/{option}', [QuestionController::class, 'destroyOption']);

                Route::apiResource('exams', ExamController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
                Route::post('/exams/{exam}/publish', [ExamController::class, 'publish']);
                Route::post('/exams/{exam}/unpublish', [ExamController::class, 'unpublish']);
                Route::post('/exams/{exam}/assign', [ExamController::class, 'assignToStudent']);
                Route::post('/exams/{exam}/unassign', [ExamController::class, 'unassignFromStudent']);
                Route::get('/attempts', [AttemptController::class, 'index']);
                Route::get('/attempts/{attempt}', [AttemptController::class, 'show']);
                Route::post('/attempts/{attempt}/reset', [AttemptController::class, 'reset']);
            });

            Route::middleware('questionnaire.scope:student')->group(function () {
                Route::get('/questionnaires', [StudentQuestionnaireController::class, 'index']);
                Route::post('/questionnaires', [StudentQuestionnaireController::class, 'store']);
                Route::get('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'show']);
                Route::put('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'update']);
                Route::delete('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'destroy']);
                Route::post('/questionnaires/{student_questionnaire}/questions', [StudentQuestionnaireController::class, 'storeQuestion']);
                Route::put('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}', [StudentQuestionnaireController::class, 'updateQuestion']);
                Route::post('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options', [StudentQuestionnaireController::class, 'storeOption']);
                Route::put('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options/{student_questionnaire_option}', [StudentQuestionnaireController::class, 'updateOption']);
                Route::get('/questionnaires/{student_questionnaire}/details', [StudentQuestionnaireController::class, 'details']);

                Route::get('/student-questionnaires', [StudentQuestionnaireController::class, 'index']);
                Route::post('/student-questionnaires', [StudentQuestionnaireController::class, 'store']);
                Route::get('/student-questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'show']);
                Route::put('/student-questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'update']);
                Route::delete('/student-questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'destroy']);
                Route::post('/student-questionnaires/{student_questionnaire}/questions', [StudentQuestionnaireController::class, 'storeQuestion']);
                Route::put('/student-questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}', [StudentQuestionnaireController::class, 'updateQuestion']);
                Route::post('/student-questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options', [StudentQuestionnaireController::class, 'storeOption']);
                Route::put('/student-questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options/{student_questionnaire_option}', [StudentQuestionnaireController::class, 'updateOption']);
            });
        });

        Route::middleware('admin.interface:general_assembly')->prefix('general-assembly')->group(function () {
            Route::get('/dashboard', [AdminDashboardController::class, 'generalAssemblyDashboard']);

            Route::get('/families', [GaFamilyController::class, 'index']);
            Route::post('/families', [GaFamilyController::class, 'store']);
            Route::get('/families/{ga_family}', [GaFamilyController::class, 'show']);
            Route::put('/families/{ga_family}', [GaFamilyController::class, 'update']);
            Route::delete('/families/{ga_family}', [GaFamilyController::class, 'destroy']);
            Route::patch('/families/{ga_family}/toggle-status', [GaFamilyController::class, 'toggleStatus']);
            Route::post('/families/{ga_family}/reset-password', [GaFamilyController::class, 'resetPassword']);
            Route::get('/families/{ga_family}/exam-attempts', [GaFamilyController::class, 'examAttempts']);
            Route::get('/families/{ga_family}/competition-attempts', [GaFamilyController::class, 'competitionAttempts']);

            Route::get('/competitions', [GaCompetitionController::class, 'index']);
            Route::post('/competitions', [GaCompetitionController::class, 'store']);
            Route::get('/competitions/{ga_competition}', [GaCompetitionController::class, 'show']);
            Route::put('/competitions/{ga_competition}', [GaCompetitionController::class, 'update']);
            Route::delete('/competitions/{ga_competition}', [GaCompetitionController::class, 'destroy']);
            Route::post('/competitions/{ga_competition}/topics', [GaCompetitionController::class, 'storeTopic']);
            Route::put('/competitions/{ga_competition}/topics/{ga_competition_topic}', [GaCompetitionController::class, 'updateTopic']);
            Route::delete('/competitions/{ga_competition}/topics/{ga_competition_topic}', [GaCompetitionController::class, 'destroyTopic']);
            Route::post('/competitions/{ga_competition}/questions', [GaCompetitionController::class, 'storeQuestion']);
            Route::put('/competitions/{ga_competition}/questions/{ga_competition_question}', [GaCompetitionController::class, 'updateQuestion']);
            Route::delete('/competitions/{ga_competition}/questions/{ga_competition_question}', [GaCompetitionController::class, 'destroyQuestion']);
            Route::post('/competitions/{ga_competition}/questions/{ga_competition_question}/options', [GaCompetitionController::class, 'storeOption']);
            Route::put('/competitions/{ga_competition}/questions/{ga_competition_question}/options/{ga_competition_option}', [GaCompetitionController::class, 'updateOption']);
            Route::delete('/competitions/{ga_competition}/questions/{ga_competition_question}/options/{ga_competition_option}', [GaCompetitionController::class, 'destroyOption']);
            Route::post('/competitions/{ga_competition}/rules', [GaCompetitionController::class, 'storeRule']);
            Route::put('/competitions/{ga_competition}/rules/{ga_competition_question_rule}', [GaCompetitionController::class, 'updateRule']);
            Route::delete('/competitions/{ga_competition}/rules/{ga_competition_question_rule}', [GaCompetitionController::class, 'destroyRule']);
            Route::get('/competitions/{ga_competition}/attempts', [GaCompetitionController::class, 'attempts']);
            Route::get('/competitions/{ga_competition}/attempts/{ga_competition_attempt}', [GaCompetitionController::class, 'attemptDetails']);
            Route::post('/competition-attempts/{ga_competition_attempt}/verify', [GaCompetitionController::class, 'verifyAttempt']);
            Route::post('/competitions/{ga_competition}/import-bank-parts', [GaCompetitionBankController::class, 'importIntoCompetition']);

            Route::get('/competition-bank/parts', [GaCompetitionBankController::class, 'parts']);
            Route::post('/competition-bank/parts', [GaCompetitionBankController::class, 'storePart']);
            Route::put('/competition-bank/parts/{ga_competition_part_bank}', [GaCompetitionBankController::class, 'updatePart']);
            Route::delete('/competition-bank/parts/{ga_competition_part_bank}', [GaCompetitionBankController::class, 'destroyPart']);
            Route::get('/competition-bank/questions', [GaCompetitionBankController::class, 'questions']);
            Route::post('/competition-bank/questions', [GaCompetitionBankController::class, 'storeQuestion']);
            Route::put('/competition-bank/questions/{ga_competition_question_bank}', [GaCompetitionBankController::class, 'updateQuestion']);
            Route::delete('/competition-bank/questions/{ga_competition_question_bank}', [GaCompetitionBankController::class, 'destroyQuestion']);
            Route::post('/competition-bank/questions/import', [GaCompetitionBankController::class, 'importQuestions']);
            Route::post('/competition-bank/questions/{ga_competition_question_bank}/options', [GaCompetitionBankController::class, 'storeOption']);
            Route::put('/competition-bank/questions/{ga_competition_question_bank}/options/{ga_competition_option_bank}', [GaCompetitionBankController::class, 'updateOption']);
            Route::delete('/competition-bank/questions/{ga_competition_question_bank}/options/{ga_competition_option_bank}', [GaCompetitionBankController::class, 'destroyOption']);

            Route::get('/family-exams', [GaFamilyExamController::class, 'index']);
            Route::post('/family-exams', [GaFamilyExamController::class, 'store']);
            Route::get('/family-exams/{ga_family_exam}', [GaFamilyExamController::class, 'show']);
            Route::put('/family-exams/{ga_family_exam}', [GaFamilyExamController::class, 'update']);
            Route::delete('/family-exams/{ga_family_exam}', [GaFamilyExamController::class, 'destroy']);
            Route::post('/family-exams/{ga_family_exam}/questions', [GaFamilyExamController::class, 'storeQuestion']);
            Route::post('/family-exams/{ga_family_exam}/questions/import', [GaFamilyExamController::class, 'importQuestions']);
            Route::put('/family-exams/{ga_family_exam}/questions/{ga_family_exam_question}', [GaFamilyExamController::class, 'updateQuestion']);
            Route::delete('/family-exams/{ga_family_exam}/questions/{ga_family_exam_question}', [GaFamilyExamController::class, 'destroyQuestion']);
            Route::post('/family-exams/{ga_family_exam}/questions/{ga_family_exam_question}/options', [GaFamilyExamController::class, 'storeOption']);
            Route::put('/family-exams/{ga_family_exam}/questions/{ga_family_exam_question}/options/{ga_family_exam_question_option}', [GaFamilyExamController::class, 'updateOption']);
            Route::delete('/family-exams/{ga_family_exam}/questions/{ga_family_exam_question}/options/{ga_family_exam_question_option}', [GaFamilyExamController::class, 'destroyOption']);
            Route::post('/family-exams/{ga_family_exam}/rules', [GaFamilyExamController::class, 'storeRule']);
            Route::put('/family-exams/{ga_family_exam}/rules/{ga_family_exam_question_rule}', [GaFamilyExamController::class, 'updateRule']);
            Route::delete('/family-exams/{ga_family_exam}/rules/{ga_family_exam_question_rule}', [GaFamilyExamController::class, 'destroyRule']);
            Route::get('/family-exams/{ga_family_exam}/attempts', [GaFamilyExamController::class, 'attempts']);
            Route::get('/family-exams/{ga_family_exam}/attempts/{ga_family_exam_attempt}', [GaFamilyExamController::class, 'attemptDetails']);
            Route::post('/family-exams/{ga_family_exam}/attempts/{ga_family_exam_attempt}/reset', [GaFamilyExamController::class, 'resetAttempt']);

            Route::get('/family-exam-question-bank/questions', [GaFamilyExamController::class, 'questionBankQuestions']);
            Route::post('/family-exam-question-bank/questions', [GaFamilyExamController::class, 'storeQuestionBankQuestion']);
            Route::post('/family-exam-question-bank/questions/import', [GaFamilyExamController::class, 'importQuestionBankQuestions']);
            Route::put('/family-exam-question-bank/questions/{ga_family_exam_question}', [GaFamilyExamController::class, 'updateQuestionBankQuestion']);
            Route::delete('/family-exam-question-bank/questions/{ga_family_exam_question}', [GaFamilyExamController::class, 'destroyQuestionBankQuestion']);
            Route::post('/family-exam-question-bank/questions/{ga_family_exam_question}/options', [GaFamilyExamController::class, 'storeQuestionBankOption']);
            Route::put('/family-exam-question-bank/questions/{ga_family_exam_question}/options/{ga_family_exam_question_option}', [GaFamilyExamController::class, 'updateQuestionBankOption']);
            Route::delete('/family-exam-question-bank/questions/{ga_family_exam_question}/options/{ga_family_exam_question_option}', [GaFamilyExamController::class, 'destroyQuestionBankOption']);

            Route::get('/lectures', [GaLectureController::class, 'index']);
            Route::post('/lectures', [GaLectureController::class, 'store']);
            Route::get('/lectures/{ga_lecture}', [GaLectureController::class, 'show']);
            Route::put('/lectures/{ga_lecture}', [GaLectureController::class, 'update']);
            Route::delete('/lectures/{ga_lecture}', [GaLectureController::class, 'destroy']);

            Route::middleware('questionnaire.scope:general_assembly')->group(function () {
                Route::get('/questionnaires', [StudentQuestionnaireController::class, 'index']);
                Route::post('/questionnaires', [StudentQuestionnaireController::class, 'store']);
                Route::get('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'show']);
                Route::put('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'update']);
                Route::delete('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'destroy']);
                Route::post('/questionnaires/{student_questionnaire}/questions', [StudentQuestionnaireController::class, 'storeQuestion']);
                Route::put('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}', [StudentQuestionnaireController::class, 'updateQuestion']);
                Route::post('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options', [StudentQuestionnaireController::class, 'storeOption']);
                Route::put('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options/{student_questionnaire_option}', [StudentQuestionnaireController::class, 'updateOption']);
                Route::get('/questionnaires/{student_questionnaire}/details', [StudentQuestionnaireController::class, 'details']);
            });
        });

        Route::middleware('admin.interface:special')->group(function () {
            Route::get('/dashboard/special', [AdminDashboardController::class, 'specialDashboard']);

            Route::get('/special-learners', [SpecialLearnerController::class, 'index']);
            Route::get('/special-learners/{special_learner}', [SpecialLearnerController::class, 'show']);
            Route::put('/special-learners/{special_learner}', [SpecialLearnerController::class, 'update']);
            Route::delete('/special-learners/{special_learner}', [SpecialLearnerController::class, 'destroy']);
            Route::patch('/special-learners/{special_learner}/toggle-status', [SpecialLearnerController::class, 'toggleStatus']);
            Route::post('/special-learners/{special_learner}/reset-password', [SpecialLearnerController::class, 'resetPassword']);

            Route::prefix('special-lms')->middleware('lms.scope:special')->group(function () {
                Route::get('/tracks', [LevelTrackController::class, 'tracks']);
                Route::post('/tracks', [LevelTrackController::class, 'storeTrack']);
                Route::put('/tracks/{track}', [LevelTrackController::class, 'updateTrack']);
                Route::delete('/tracks/{track}', [LevelTrackController::class, 'destroyTrack']);
                Route::get('/levels', [LevelTrackController::class, 'levels']);
                Route::post('/levels', [LevelTrackController::class, 'storeLevel']);
                Route::put('/levels/{level}', [LevelTrackController::class, 'updateLevel']);
                Route::delete('/levels/{level}', [LevelTrackController::class, 'destroyLevel']);

                Route::apiResource('courses', CourseController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::apiResource('books', AdminBookController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::post('/books/{book}/assign', [AdminBookController::class, 'assignToStudent']);
                Route::post('/books/{book}/unassign', [AdminBookController::class, 'unassignFromStudent']);
                Route::get('/lectures/{lecture}/preview', [AdminLectureController::class, 'preview']);
                Route::apiResource('lectures', AdminLectureController::class)->only(['index', 'store', 'update', 'destroy']);
                Route::post('/lectures/{lecture}/assign', [AdminLectureController::class, 'assignToStudent']);
                Route::post('/lectures/{lecture}/unassign', [AdminLectureController::class, 'unassignFromStudent']);

                Route::get('/questions', [QuestionController::class, 'index']);
                Route::post('/questions', [QuestionController::class, 'store']);
                Route::post('/questions/import', [QuestionController::class, 'import']);
                Route::post('/questions/import-for-course-track', [QuestionController::class, 'importForCourseTrack']);
                Route::get('/questions/{question}', [QuestionController::class, 'show']);
                Route::put('/questions/{question}', [QuestionController::class, 'update']);
                Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);
                Route::post('/questions/{question}/options', [QuestionController::class, 'storeOption']);
                Route::put('/questions/{question}/options/{option}', [QuestionController::class, 'updateOption']);
                Route::delete('/questions/{question}/options/{option}', [QuestionController::class, 'destroyOption']);

                Route::apiResource('exams', ExamController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
                Route::post('/exams/{exam}/publish', [ExamController::class, 'publish']);
                Route::post('/exams/{exam}/unpublish', [ExamController::class, 'unpublish']);
                Route::post('/exams/{exam}/assign', [ExamController::class, 'assignToStudent']);
                Route::post('/exams/{exam}/unassign', [ExamController::class, 'unassignFromStudent']);
                Route::get('/attempts', [AttemptController::class, 'index']);
                Route::get('/attempts/{attempt}', [AttemptController::class, 'show']);
                Route::post('/attempts/{attempt}/reset', [AttemptController::class, 'reset']);

                Route::middleware('questionnaire.scope:special')->group(function () {
                    Route::get('/questionnaires', [StudentQuestionnaireController::class, 'index']);
                    Route::post('/questionnaires', [StudentQuestionnaireController::class, 'store']);
                    Route::get('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'show']);
                    Route::put('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'update']);
                    Route::delete('/questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'destroy']);
                    Route::post('/questionnaires/{student_questionnaire}/questions', [StudentQuestionnaireController::class, 'storeQuestion']);
                    Route::put('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}', [StudentQuestionnaireController::class, 'updateQuestion']);
                    Route::post('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options', [StudentQuestionnaireController::class, 'storeOption']);
                    Route::put('/questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options/{student_questionnaire_option}', [StudentQuestionnaireController::class, 'updateOption']);
                    Route::get('/questionnaires/{student_questionnaire}/details', [StudentQuestionnaireController::class, 'details']);

                    Route::get('/student-questionnaires', [StudentQuestionnaireController::class, 'index']);
                    Route::post('/student-questionnaires', [StudentQuestionnaireController::class, 'store']);
                    Route::get('/student-questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'show']);
                    Route::put('/student-questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'update']);
                    Route::delete('/student-questionnaires/{student_questionnaire}', [StudentQuestionnaireController::class, 'destroy']);
                    Route::post('/student-questionnaires/{student_questionnaire}/questions', [StudentQuestionnaireController::class, 'storeQuestion']);
                    Route::put('/student-questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}', [StudentQuestionnaireController::class, 'updateQuestion']);
                    Route::post('/student-questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options', [StudentQuestionnaireController::class, 'storeOption']);
                    Route::put('/student-questionnaires/{student_questionnaire}/questions/{student_questionnaire_question}/options/{student_questionnaire_option}', [StudentQuestionnaireController::class, 'updateOption']);
                });
            });
        });
    });

    Route::prefix('student')->middleware('role:student')->group(function () {
        Route::get('/dashboard', [StudentDashboardController::class, 'summary']);
        Route::get('/dashboard/exam-history', [StudentDashboardController::class, 'examHistory']);
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::get('/books', [StudentBookController::class, 'myBooks']);
        Route::get('/books/{book}/view', [StudentBookController::class, 'view']);
        Route::get('/lectures', [StudentLectureController::class, 'myLectures']);
        Route::get('/lectures/{lecture}/view', [StudentLectureController::class, 'view']);
        Route::get('/exams', [StudentExamController::class, 'availableExams']);
        Route::get('/exams/{exam}/attempt', [StudentExamController::class, 'myAttempt']);
        Route::post('/exams/{exam}/start', [StudentExamController::class, 'start']);
        Route::get('/attempts/{attempt}', [StudentExamController::class, 'resume']);
        Route::post('/attempts/{attempt}/submit', [StudentExamController::class, 'submit'])->middleware('throttle:exam-submit');
        Route::get('/attempts/{attempt}/result', [StudentExamController::class, 'result']);

        Route::get('/questionnaires', [StudentStudentQuestionnaireController::class, 'index']);
        Route::post('/questionnaires/{student_questionnaire}/start', [StudentStudentQuestionnaireController::class, 'start']);
        Route::get('/questionnaire-responses/{student_questionnaire_response}', [StudentStudentQuestionnaireController::class, 'resume']);
        Route::patch('/questionnaire-responses/{student_questionnaire_response}/answers', [StudentStudentQuestionnaireController::class, 'saveAnswers']);
        Route::post('/questionnaire-responses/{student_questionnaire_response}/submit', [StudentStudentQuestionnaireController::class, 'submit'])->middleware('throttle:exam-submit');
    });

    Route::prefix('family')->middleware('role:ga_family')->group(function () {
        Route::get('/ga-lectures/{ga_lecture}/view', [FamilyGaLectureController::class, 'view']);
        Route::get('/competitions', [FamilyCompetitionController::class, 'index']);
        Route::post('/competitions/{ga_competition}/start', [FamilyCompetitionController::class, 'start']);
        Route::get('/competition-attempts/{ga_competition_attempt}', [FamilyCompetitionController::class, 'resume']);
        Route::post('/competition-attempts/{ga_competition_attempt}/submit', [FamilyCompetitionController::class, 'submit'])->middleware('throttle:exam-submit');
        Route::get('/competition-attempts/{ga_competition_attempt}/result', [FamilyCompetitionController::class, 'result']);
        Route::get('/exams', [FamilyExamController::class, 'index']);
        Route::get('/exams/{ga_family_exam}/attempt', [FamilyExamController::class, 'myAttempt']);
        Route::post('/exams/{ga_family_exam}/start', [FamilyExamController::class, 'start']);
        Route::get('/exam-attempts/{ga_family_exam_attempt}', [FamilyExamController::class, 'resume']);
        Route::post('/exam-attempts/{ga_family_exam_attempt}/submit', [FamilyExamController::class, 'submit'])->middleware('throttle:exam-submit');
        Route::get('/exam-attempts/{ga_family_exam_attempt}/result', [FamilyExamController::class, 'result']);

        Route::get('/questionnaires', [FamilyQuestionnaireController::class, 'index']);
        Route::post('/questionnaires/{student_questionnaire}/start', [FamilyQuestionnaireController::class, 'start']);
        Route::get('/questionnaire-responses/{student_questionnaire_response}', [FamilyQuestionnaireController::class, 'resume']);
        Route::patch('/questionnaire-responses/{student_questionnaire_response}/answers', [FamilyQuestionnaireController::class, 'saveAnswers']);
        Route::post('/questionnaire-responses/{student_questionnaire_response}/submit', [FamilyQuestionnaireController::class, 'submit'])->middleware('throttle:exam-submit');
    });

    Route::prefix('special')->middleware('role:special_learner')->group(function () {
        Route::get('/me', [SpecialProfileController::class, 'show']);
        Route::patch('/me', [SpecialProfileController::class, 'update']);
        Route::get('/exams', [SpecialExamAttemptController::class, 'index']);
        Route::get('/exams/{exam}/attempt', [SpecialExamAttemptController::class, 'myAttempt']);
        Route::post('/exams/{exam}/start', [SpecialExamAttemptController::class, 'start']);
        Route::get('/attempts/{attempt}', [SpecialExamAttemptController::class, 'resume']);
        Route::post('/attempts/{attempt}/submit', [SpecialExamAttemptController::class, 'submit'])->middleware('throttle:exam-submit');
        Route::get('/attempts/{attempt}/result', [SpecialExamAttemptController::class, 'result']);
        Route::get('/questionnaires', [SpecialQuestionnaireController::class, 'index']);
        Route::post('/questionnaires/{student_questionnaire}/start', [SpecialQuestionnaireController::class, 'start']);
        Route::get('/questionnaire-responses/{student_questionnaire_response}', [SpecialQuestionnaireController::class, 'resume']);
        Route::patch('/questionnaire-responses/{student_questionnaire_response}/answers', [SpecialQuestionnaireController::class, 'saveAnswers']);
        Route::post('/questionnaire-responses/{student_questionnaire_response}/submit', [SpecialQuestionnaireController::class, 'submit'])->middleware('throttle:exam-submit');
    });
});
