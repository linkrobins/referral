<?php

namespace LinkRobins\Referral;

use Flarum\Foundation\ValidationException;
use Flarum\Settings\SettingsRepositoryInterface;
use Flarum\User\Event\Saving;
use Flarum\User\User;
use Illuminate\Contracts\Events\Dispatcher;

class ValidateInviteCode
{
    public function __construct(
        protected SettingsRepositoryInterface $settings
    ) {}

    public function subscribe(Dispatcher $events): void
    {
        $events->listen(Saving::class, [$this, 'handle']);
    }

    public function handle(Saving $event): void
    {
        $user     = $event->user;
        $required = (bool) $this->settings->get('linkrobins-referral.require_referral', false);

        if ($user->exists) return;

        $code = trim($_COOKIE['referral_code'] ?? '');

        if ($required && !$code) {
            throw new ValidationException([
                'inviteCode' => [app('translator')->trans('linkrobins-referral.validation.required')],
            ]);
        }

        if ($code) {
            $invite = InviteCode::where('code', strtoupper($code))->first();
            if (!$invite) {
                throw new ValidationException([
                    'inviteCode' => [app('translator')->trans('linkrobins-referral.validation.invalid')],
                ]);
            }
            RecordReferral::$pendingInviteId = $invite->id;
        }
    }
}
