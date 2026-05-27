<?php

namespace LinkRobins\Referral;

use Flarum\User\Event\Registered;
use Illuminate\Contracts\Events\Dispatcher;

class RecordReferral
{
    public static ?int $pendingInviteId = null;

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

        try {
            $invite = InviteCode::find($inviteId);
            if (!$invite) return;

            $referrer = $invite->user;
            if (!$referrer || $referrer->id === $user->id) return;

            if (ReferralRelation::where('user_id', $user->id)->exists()) return;

            $rel                      = new ReferralRelation();
            $rel->user_id             = $user->id;
            $rel->referred_by_user_id = $referrer->id;
            $rel->save();

            // Keep the denormalised referral_count cache on the referrer in
            // sync (read by the referralCount API attribute to avoid an
            // N+1 COUNT() per serialized user).
            $referrer->increment('referral_count');

            $invite->increment('uses');
        } catch (\Throwable $e) {
            resolve(\Psr\Log\LoggerInterface::class)->warning('[linkrobins/referral] failed to record referral', ['exception' => $e]);
        }
    }
}
