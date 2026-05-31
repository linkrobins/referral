<?php

namespace LinkRobins\Referral;

use Flarum\User\Event\Registered;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\Events\Dispatcher;
use Psr\Log\LoggerInterface;

class RecordReferral
{
    public function __construct(
        protected LoggerInterface $logger,
        protected Container $container
    ) {}

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Registered::class, [$this, 'handle']);
    }

    public function handle(Registered $event): void
    {
        $user  = $event->user;
        $state = $this->container->make(PendingReferralState::class);

        $inviteId = $state->getInviteId();
        $state->setInviteId(null);

        if (!$inviteId) return;

        try {
            $invite = InviteCode::find($inviteId);
            if (!$invite || $invite->isExpired()) return;

            $referrer = $invite->user; // null for admin campaign codes

            if ($referrer) {
                // Self-referral: don't record a relation or count the use.
                if ($referrer->id === $user->id) return;

                if (!ReferralRelation::where('user_id', $user->id)->exists()) {
                    $rel                      = new ReferralRelation();
                    $rel->user_id             = $user->id;
                    $rel->referred_by_user_id = $referrer->id;
                    $rel->save();

                    // Keep the denormalised referral_count cache on the referrer
                    // in sync (read by the referralCount API attribute to avoid
                    // an N+1 COUNT() per serialized user).
                    $referrer->increment('referral_count');
                }
            }

            // Campaign codes have no referrer; we still track total uses.
            $invite->increment('uses');
        } catch (\Throwable $e) {
            $this->logger->warning('[linkrobins/referral] failed to record referral', ['exception' => $e]);
        }
    }
}
