<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SpecialLearnerChurchReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $learnerName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'حساب الدورات المتخصصة — في انتظار تفعيل الكنيسة',
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.special-learner-church-reminder',
        );
    }
}
