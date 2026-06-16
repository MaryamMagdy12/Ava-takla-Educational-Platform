<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AttendanceSavedParentMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  list<array{name: string, code: string, state: string}>  $lines
     */
    public function __construct(
        public string $parentGreeting,
        public string $heldOn,
        public string $levelLabel,
        public ?string $sessionTitle,
        public ?string $sessionNotes,
        public array $lines,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'إشعار حضور — '.$this->levelLabel.' — '.$this->heldOn,
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'mail.attendance-saved-parent',
        );
    }
}
