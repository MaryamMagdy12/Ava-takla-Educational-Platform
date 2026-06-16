<?php

namespace Tests\Feature;

use App\Models\AttemptQuestion;
use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Level;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Student;
use App\Models\Track;
use App\Support\ApiErrorCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExamAttemptSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_resume_blocks_finished_attempt(): void
    {
        [$student, $attempt] = $this->seedSubmittedAttempt();
        Sanctum::actingAs($student);

        $response = $this->getJson('/api/student/attempts/'.$attempt->id);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', ApiErrorCode::EXAM_ATTEMPT_FINISHED)
            ->assertJsonMissingPath('data.questions');
    }

    public function test_submit_rejects_invalid_option_id(): void
    {
        [$student, $attempt] = $this->seedInProgressAttempt();
        Sanctum::actingAs($student);

        $attemptQuestion = AttemptQuestion::query()->where('exam_attempt_id', $attempt->id)->firstOrFail();
        $wrongOptionId = QuestionOption::query()
            ->where('question_id', '!=', $attemptQuestion->question_id)
            ->value('id');

        $this->assertNotNull($wrongOptionId);

        $response = $this->postJson('/api/student/attempts/'.$attempt->id.'/submit', [
            'answers' => [
                [
                    'question_id' => $attemptQuestion->question_id,
                    'selected_option_id' => $wrongOptionId,
                ],
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', ApiErrorCode::EXAM_INVALID_ANSWER);
    }

    /**
     * @return array{0: Student, 1: ExamAttempt}
     */
    private function seedSubmittedAttempt(): array
    {
        [$student, $attempt] = $this->seedInProgressAttempt();
        $attempt->update([
            'status' => 'submitted',
            'submitted_at' => now(),
            'score' => 0,
            'total_questions' => 1,
        ]);

        return [$student, $attempt->fresh()];
    }

    /**
     * @return array{0: Student, 1: ExamAttempt}
     */
    private function seedInProgressAttempt(): array
    {
        $track = Track::query()->create([
            'name' => 'Track A',
            'admin_interface' => 'student',
            'status' => 'active',
        ]);
        $level = Level::query()->create([
            'track_id' => $track->id,
            'name' => 'Level 1',
            'code_prefix' => 'Lv1@',
            'admin_interface' => 'student',
            'status' => 'active',
        ]);
        $course = Course::query()->create([
            'name' => 'Course 1',
            'admin_interface' => 'student',
            'track_id' => $track->id,
            'status' => 'active',
        ]);
        $student = Student::query()->create([
            'level_id' => $level->id,
            'track_id' => $track->id,
            'full_name' => 'Test Student',
            'student_unique_id' => 'ABCD1234',
            'serial_number' => 1,
            'password' => 'temp-pass-1',
            'status' => 'active',
            'must_change_password' => false,
        ]);
        $exam = Exam::query()->create([
            'course_id' => $course->id,
            'track_id' => $track->id,
            'admin_interface' => 'student',
            'title' => 'Exam 1',
            'duration_minutes' => 30,
            'question_count' => 1,
            'available_from' => now()->subHour(),
            'available_to' => now()->addHour(),
            'status' => 'published',
        ]);
        $question = Question::query()->create([
            'course_id' => $course->id,
            'track_id' => $track->id,
            'question_text' => 'Q1',
            'question_type' => 'mcq',
            'difficulty' => 'easy',
            'status' => 'active',
        ]);
        $correct = QuestionOption::query()->create([
            'question_id' => $question->id,
            'option_text' => 'A',
            'is_correct' => true,
        ]);
        QuestionOption::query()->create([
            'question_id' => $question->id,
            'option_text' => 'B',
            'is_correct' => false,
        ]);
        $otherQuestion = Question::query()->create([
            'course_id' => $course->id,
            'track_id' => $track->id,
            'question_text' => 'Q2',
            'question_type' => 'mcq',
            'difficulty' => 'easy',
            'status' => 'active',
        ]);
        QuestionOption::query()->create([
            'question_id' => $otherQuestion->id,
            'option_text' => 'X',
            'is_correct' => true,
        ]);
        $attempt = ExamAttempt::query()->create([
            'exam_id' => $exam->id,
            'student_id' => $student->id,
            'started_at' => now(),
            'allowed_end_time' => now()->addMinutes(30),
            'status' => 'in_progress',
        ]);
        AttemptQuestion::query()->create([
            'exam_attempt_id' => $attempt->id,
            'question_id' => $question->id,
            'order_no' => 1,
            'option_display_order' => [$correct->id],
            'correct_option_id' => $correct->id,
        ]);

        return [$student, $attempt];
    }
}
