<?php

namespace LinkRobins\Referral;

use Flarum\Database\AbstractModel;
use Flarum\User\User;

/**
 * @property int    $id
 * @property int    $user_id
 * @property string $code
 * @property int    $uses
 */
class InviteCode extends AbstractModel
{
    protected $table = 'referral_invite_codes';

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public static function generateCode(): string
    {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code  = '';
        for ($i = 0; $i < 8; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $code;
    }

    public static function getOrCreateForUser(User $user): self
    {
        $existing = static::where('user_id', $user->id)->first();
        if ($existing) return $existing;

        $code = static::generateCode();
        // Ensure uniqueness
        while (static::where('code', $code)->exists()) {
            $code = static::generateCode();
        }

        $invite          = new static();
        $invite->user_id = $user->id;
        $invite->code    = $code;
        $invite->uses    = 0;
        $invite->save();

        return $invite;
    }
}
