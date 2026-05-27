<?php

namespace LinkRobins\Referral\Api;

use Flarum\Api\Schema\Attribute;
use Flarum\Api\Schema\Relationship\ToMany;
use Flarum\Api\Schema\Relationship\ToOne;
use Flarum\User\User;
use LinkRobins\Referral\InviteCode;
use LinkRobins\Referral\ReferralRelation;

class UserResourceFields
{
    public function __invoke(): array
    {
        return [
            // Read the denormalised counter off the loaded users row rather
            // than issuing a COUNT() per serialized user (this attribute is
            // shown on every UserCard, including post authors on a discussion,
            // so the old query was an N+1). Maintained in RecordReferral.
            Attribute::make('referralCount')
                ->get(fn (User $user) => (int) ($user->referral_count ?? 0)),

            // The invite code is private to its owner and getOrCreate writes a
            // row on first read, so only resolve it for the user themselves or
            // an admin -- never for the many users serialized as post authors.
            Attribute::make('referralCode')
                ->visible(fn (User $user, $context) => $context->getActor()->id === $user->id)
                ->get(fn (User $user) => InviteCode::getOrCreateForUser($user)->code),

            ToOne::make('referredBy')
                ->type('users')
                ->includable()
                ->get(function (User $user) {
                    $rel = ReferralRelation::where('user_id', $user->id)->first();
                    return $rel ? $rel->referrer : null;
                }),

            ToMany::make('referredUsers')
                ->type('users')
                ->includable()
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
