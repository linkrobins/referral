<?php

namespace LinkRobins\Referral\Notification;

use Flarum\Notification\Blueprint\BlueprintInterface;
use Flarum\User\User;

class UserReferredNotification implements BlueprintInterface
{
    public function __construct(
        public readonly User $newUser,
        public readonly User $referrer
    ) {}

    public function getSubject(): User { return $this->newUser; }
    public function getFromUser(): User { return $this->newUser; }
    public function getData(): mixed { return null; }
    public static function getType(): string { return 'referral_user_referred'; }
    public static function getSubjectModel(): string { return User::class; }
}
