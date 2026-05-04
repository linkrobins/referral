<?php

namespace LinkRobins\Referral;

use Flarum\Database\AbstractModel;
use Flarum\User\User;

class ReferralRelation extends AbstractModel
{
    protected $table = 'referral_invited_user';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function referrer()
    {
        return $this->belongsTo(User::class, 'referred_by_user_id');
    }
}
