<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SpecialLearnerVerifyEmailOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $learnerName,
        public string $otpCode,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'رمز تأكيد البريد — الدورات المتخصصة',
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.special-learner-verify-email-otp',
        );
    }
}
