<?php

namespace LinkRobins\Referral;

use Flarum\Database\AbstractModel;
use Flarum\User\User;

/**
 * @property int         $id
 * @property int|null    $user_id
 * @property string      $code
 * @property int         $uses
 * @property string|null $label
 * @property \Carbon\Carbon|null $expires_at
 */
class InviteCode extends AbstractModel
{
    protected $table = 'referral_invite_codes';

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * A campaign code is admin-created and not bound to any referring user.
     */
    public function isCampaign(): bool
    {
        return $this->user_id === null;
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
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

    protected static function generateUniqueCode(): string
    {
        $code = static::generateCode();
        while (static::where('code', $code)->exists()) {
            $code = static::generateCode();
        }
        return $code;
    }

    public static function getOrCreateForUser(User $user): self
    {
        $existing = static::where('user_id', $user->id)->first();
        if ($existing) return $existing;

        $invite          = new static();
        $invite->user_id = $user->id;
        $invite->code    = static::generateUniqueCode();
        $invite->uses    = 0;

        try {
            $invite->save();
        } catch (\Throwable $e) {
            // A concurrent request created the row first (the unique user_id
            // index rejects the second insert). Return the existing row instead
            // of surfacing a duplicate-key error to the serializer.
            $existing = static::where('user_id', $user->id)->first();
            if ($existing) return $existing;
            throw $e;
        }

        return $invite;
    }

    public static function createCampaignCode(?string $label, ?\DateTimeInterface $expiresAt): self
    {
        $invite             = new static();
        $invite->user_id    = null;
        $invite->code       = static::generateUniqueCode();
        $invite->uses       = 0;
        $invite->label      = $label;
        $invite->expires_at = $expiresAt;
        $invite->save();

        return $invite;
    }

    /**
     * Shape used by the admin campaign-code endpoints.
     */
    public function toAdminArray(): array
    {
        return [
            'id'        => (int) $this->id,
            'code'      => $this->code,
            'label'     => $this->label,
            'uses'      => (int) $this->uses,
            'expiresAt' => $this->expires_at?->toIso8601String(),
            'expired'   => $this->isExpired(),
        ];
    }
}
