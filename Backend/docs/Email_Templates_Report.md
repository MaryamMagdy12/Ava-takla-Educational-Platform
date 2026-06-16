Here is a consolidated **report of all automated emails** sent by the Mini Educational Platform backend (Laravel). All messages are **plain text** (no HTML layout). Configure delivery via `MAIL_*` in `Backend/.env`.

**ملاحظة:** كلمات مرور الطلاب والعائلات والمتعلّمين **لا تُرسل بالبريد** — تُعرض مرة واحدة فقط في لوحة الإدارة عند الإنشاء أو إعادة التعيين.

**Total automated emails: 4**

---

## 1. Student password reset OTP (مدرسة الشمامسة — إعادة تعيين كلمة المرور)

**Mailable (`StudentPasswordResetOtpMail.php`)**
**Template (`resources/views/mail/student-password-reset-otp.blade.php`)**

| الحقل | القيمة |
|-------|--------|
| متى تُرسل | عند طلب الطالب إعادة تعيين كلمة المرور — `POST /auth/student/password-reset/request` |
| المستلم | بريد الطالب (`students.email`) |
| عنوان الرسالة (Subject) | Your password reset code |
| صلاحية الرمز | 15 دقيقة |

**Subject (ثابت):**
- Your password reset code

**Body template (قالب النص):**
Hello {{ $studentName }},

Use this one-time code to reset your password (valid for 15 minutes):

{{ $otpCode }}

If you did not request this, ignore this email.

**Example (مثال جاهز):**
Hello Ahmed Mark,

Use this one-time code to reset your password (valid for 15 minutes):

482913

If you did not request this, ignore this email.

**Variables:**
- `{{ $studentName }}` — اسم الطالب الكامل
- `{{ $otpCode }}` — رمز OTP من 6 أرقام

---

## 2. Special learner — email verification / login OTP (الدورات المتخصصة — رمز التحقق)

**Mailable (`SpecialLearnerVerifyEmailOtpMail.php`)**
**Template (`resources/views/mail/special-learner-verify-email-otp.blade.php`)**

| الحقل | القيمة |
|-------|--------|
| متى تُرسل | بعد التسجيل (`POST /auth/special/register`)، إعادة إرسال التحقق، أو عند تسجيل الدخول (OTP بعد كلمة المرور) |
| المستلم | بريد المتعلّم |
| عنوان الرسالة (Subject) | Verify your email — specialized courses |
| صلاحية الرمز | 15 دقيقة |

**Subject (ثابت):**
- Verify your email — specialized courses

**Body template (قالب النص):**
Hello {{ $learnerName }},

Your email verification code is: {{ $otpCode }}

It expires in 15 minutes.

If you did not register, ignore this message.

**Example (مثال جاهز):**
Hello Sara George,

Your email verification code is: 591204

It expires in 15 minutes.

If you did not register, ignore this message.

**Variables:**
- `{{ $learnerName }}` — الاسم الكامل للمتعلّم
- `{{ $otpCode }}` — رمز OTP من 6 أرقام

---

## 3. Special learner — church activation reminder (تذكير تفعيل الكنيسة)

**Mailable (`SpecialLearnerChurchReminderMail.php`)**
**Template (`resources/views/mail/special-learner-church-reminder.blade.php`)**

| الحقل | القيمة |
|-------|--------|
| متى تُرسل | بعد التحقق من البريد وإنشاء الحساب بحالة `inactive` (في انتظار تفعيل الكنيسة) |
| المستلم | بريد المتعلّم |
| عنوان الرسالة (Subject) | Your specialized courses account — church activation |

**Subject (ثابت):**
- Your specialized courses account — church activation

**Body template (قالب النص):**
Hello {{ $learnerName }},

Your email is verified and your account has been created.

Your sign-in passwords will be issued when the church office activates your account on the platform. Please contact the church to complete activation.

After activation, you will receive your temporary and permanent passwords from the church (they are not sent by email before activation).

Thank you.

**Example (مثال جاهز):**
Hello Sara George,

Your email is verified and your account has been created.

Your sign-in passwords will be issued when the church office activates your account on the platform. Please contact the church to complete activation.

After activation, you will receive your temporary and permanent passwords from the church (they are not sent by email before activation).

Thank you.

**Variables:**
- `{{ $learnerName }}` — الاسم الكامل للمتعلّم

---

## 4. Attendance saved — parent notification (إشعار ولي الأمر — الحضور)

**Mailable (`AttendanceSavedParentMail.php`)**
**Template (`resources/views/mail/attendance-saved-parent.blade.php`)**
**Service (`AttendanceParentNotifier.php`)**

| الحقل | القيمة |
|-------|--------|
| متى تُرسل | بعد حفظ الحضور من لوحة الإدارة (عند `attendance.notify_parents=true`) |
| المستلم | بريد ولي الأمر (`students.parent_email`) — رسالة واحدة لكل بريد (قد تشمل أكثر من طالب) |
| عنوان الرسالة (Subject) | تسجيل الحضور — {المرحلة} — {التاريخ} |

**Subject (ديناميكي):**
- تسجيل الحضور — المرحلة الثانية — 2026-06-16

**Body template (قالب النص):**
{{ $parentGreeting }}

تم حفظ حضور اليوم في مدرسة الشمامسة .

التاريخ: {{ $heldOn }}
المرحلة / الفصل: {{ $levelLabel }}
[عنوان الحصة: {{ $sessionTitle }} — إن وُجد]

تفاصيل الطالب/الطلاب المرتبطين بحسابكم:
- {{ $line['name'] }} (كود الطالب: {{ $line['code'] }}): {{ $line['state'] }}
[... يتكرر لكل طالب ...]

[ملاحظات المعلّم: {{ $sessionNotes }} — إن وُجدت]

هذه رسالة تلقائية بعد حفظ الحضور. إذا كان لديكم استفسار، يرجى التواصل مع إدارة المدرسة.

**Example (مثال جاهز):**
عزيزي ولي الأمر محمد،

تم حفظ حضور اليوم في مدرسة الشمامسة .

التاريخ: 2026-06-16
المرحلة / الفصل: المرحلة الثانية
عنوان الحصة: حصة الأحد

تفاصيل الطالب/الطلاب المرتبطين بحسابكم:
- Peter Mark (كود الطالب: 56780012): حاضر
- John Mark (كود الطالب: 56780013): غائب

ملاحظات المعلّم: تأخر ١٠ دقائق

هذه رسالة تلقائية بعد حفظ الحضور. إذا كان لديكم استفسار، يرجى التواصل مع إدارة المدرسة.

**Variables:**
- `{{ $parentGreeting }}` — تحية ولي الأمر (مثال: عزيزي ولي الأمر محمد،)
- `{{ $heldOn }}` — تاريخ الحصة
- `{{ $levelLabel }}` — اسم المرحلة/المسار
- `{{ $sessionTitle }}` — عنوان الحصة (اختياري)
- `{{ $sessionNotes }}` — ملاحظات المعلّم (اختياري)
- `{{ $line['name'] }}` / `code` / `state` — لكل طالب (حاضر / غائب)

---

## ملخص — رسائل لا تُرسل بالبريد

المنصة **لا ترسل** بالبريد الإلكتروني:
- كلمات مرور الطلاب عند الإنشاء أو إعادة التعيين (تُعرض في لوحة الإدارة فقط)
- كلمات مرور عائلات الجمعية العامة (Ga#…)
- كلمات مرور المتعلّمين في الدورات المتخصصة (بعد تفعيل الكنيسة)
- إشعارات تسجيل دخول المشرفين أو تغيير كلمات مرور الحسابات الأخرى

---
**Source paths (Backend):**
- `app/Mail/` — 4 Mailable classes
- `resources/views/mail/` — 4 Blade text templates
- `app/Services/StudentPasswordResetService.php`
- `app/Services/SpecialLearnerVerificationService.php`
- `app/Services/AttendanceParentNotifier.php`
