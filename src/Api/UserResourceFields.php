<?php

namespace LinkRobins\Referral\Api;

use Flarum\Api\Schema\Attribute;
use Flarum\Api\Schema\Relationship\ToMany;
use Flarum\Api\Schema\Relationship\ToOne;
use Flarum\User\User;
use LinkRobins\Referral\EligibilityChecker;
use LinkRobins\Referral\InviteCode;
use LinkRobins\Referral\ReferralRelation;

class UserResourceFields
{
    public function __construct(
        protected EligibilityChecker $eligibility
    ) {}

    public function __invoke(): array
    {
        return [
            // Read the denormalised counter off the loaded users row rather
            // than issuing a COUNT() per serialized user (this attribute is
            // shown on every UserCard, including post authors on a discussion,
            // so the old query was an N+1). Maintained in RecordReferral.
            Attribute::make('referralCount')
                ->get(fn (User $user) => (int) ($user->referral_count ?? 0)),

            // Whether this user is allowed a personal invite code (admin rules:
            // groups / min posts / account age / whitelist). Only meaningful to
            // the user themselves, so it is gated to self like the code itself.
            Attribute::make('referralEligible')
                ->visible(fn (User $user, $context) => $context->getActor()->id === $user->id)
                ->get(fn (User $user) => $this->eligibility->isEligible($user)),

            // The invite code is private to its owner and getOrCreate writes a
            // row on first read, so only resolve it for the user themselves --
            // never for the many users serialized as post authors. Returns null
            // for users who don't meet the eligibility rules, so no row is
            // written for them either.
            Attribute::make('referralCode')
                ->visible(fn (User $user, $context) => $context->getActor()->id === $user->id)
                ->get(fn (User $user) => $this->eligibility->isEligible($user)
                    ? InviteCode::getOrCreateForUser($user)->code
                    : null),

            // The referral graph (who referred whom) is private to the user
            // and admins; not exposed for arbitrary users via ?include=.
            ToOne::make('referredBy')
                ->type('users')
                ->includable()
                ->visible(fn (User $user, $context) => $context->getActor()->id === $user->id || $context->getActor()->isAdmin())
                ->get(function (User $user) {
                    $rel = ReferralRelation::where('user_id', $user->id)->first();
                    return $rel ? $rel->referrer : null;
                }),

            ToMany::make('referredUsers')
                ->type('users')
                ->includable()
                ->visible(fn (User $user, $context) => $context->getActor()->id === $user->id || $context->getActor()->isAdmin())
                ->get(function (User $user) {
                    return ReferralRelation::where('referred_by_user_id', $user->id)
                        ->with('user')
                        ->get()
                        ->map(fn ($r) => $r->user)
                        ->filter();
                }),
        ];
    }
}
