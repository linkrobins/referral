<?php

namespace LinkRobins\Referral;

use Flarum\Foundation\AbstractServiceProvider;

class ReferralServiceProvider extends AbstractServiceProvider
{
    public function register(): void
    {
        // Request-scoped: one instance per request, cleared between requests
        // on persistent runtimes via forgetScopedInstances(). This replaces the
        // old process-lived static property that misattributed referrals under
        // FrankenPHP/Swoole/RoadRunner.
        $this->container->scoped(PendingReferralState::class);
    }
}
