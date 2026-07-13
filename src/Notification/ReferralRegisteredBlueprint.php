<?php

namespace LinkRobins\Referral\Notification;

use Flarum\Database\AbstractModel;
use Flarum\Locale\TranslatorInterface;
use Flarum\Notification\AlertableInterface;
use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\Notification\MailableInterface;
use Flarum\User\User;

/**
 * Sent to the referrer when someone registers with their personal invite
 * code. The subject (and fromUser) is the newly registered member, so the
 * alert shows their avatar and links to their profile. Campaign codes have
 * no referrer and never produce one of these.
 */
class ReferralRegisteredBlueprint implements BlueprintInterface, AlertableInterface, MailableInterface
{
    public function __construct(
        public User $newUser
    ) {
    }

    public function getFromUser(): ?User
    {
        return $this->newUser;
    }

    public function getSubject(): ?AbstractModel
    {
        return $this->newUser;
    }

    public function getData(): array
    {
        return [];
    }

    public function getEmailViews(): array
    {
        return [
            'text' => 'linkrobins-referral::emails.plain.registered',
            'html' => 'linkrobins-referral::emails.html.registered',
        ];
    }

    public function getEmailSubject(TranslatorInterface $translator): string
    {
        return $translator->trans('linkrobins-referral.email.registered_subject', [
            'name' => $this->newUser->display_name,
        ]);
    }

    public static function getType(): string
    {
        return 'linkrobinsReferralRegistered';
    }

    public static function getSubjectModel(): string
    {
        return User::class;
    }
}
