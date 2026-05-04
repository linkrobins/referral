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
            Attribute::make('referralCount')
                ->get(fn (User $user) => ReferralRelation::where('referred_by_user_id', $user->id)->count()),

            Attribute::make('referralCode')
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
