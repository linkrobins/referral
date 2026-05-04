<?php

namespace LinkRobins\Referral;

use Flarum\Notification\NotificationSyncer;
use Flarum\User\Event\Registered;
use Illuminate\Contracts\Events\Dispatcher;
use LinkRobins\Referral\Notification\UserReferredNotification;

class RecordReferral
{
    /** @var int|null Passed from ValidateInviteCode via static to avoid Eloquent saving it as a column */
    public static ?int $pendingInviteId = null;

    public function __construct(
        protected NotificationSyncer $notifications
    ) {}

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Registered::class, [$this, 'handle']);
    }

    public function handle(Registered $event): void
    {
        $user     = $event->user;
        $inviteId = static::$pendingInviteId;
        static::$pendingInviteId = null; 

        if (!$inviteId) return;

        $invite = InviteCode::find($inviteId);
        if (!$invite) return;

        $referrer = $invite->user;
        if (!$referrer || $referrer->id === $user->id) return;

        if (ReferralRelation::where('user_id', $user->id)->exists()) return;

        $rel                      = new ReferralRelation();
        $rel->user_id             = $user->id;
        $rel->referred_by_user_id = $referrer->id;
        $rel->save();

        $invite->increment('uses');

        $this->notifications->sync(
            new UserReferredNotification($user, $referrer),
            [$referrer]
        );
    }
}
